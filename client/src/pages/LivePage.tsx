import { useEffect, useRef, useState } from "react";
import { CalendarClock, Radio, RefreshCw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useLivePolling } from "../hooks/useLivePolling";
import { useSSE } from "../hooks/useSSE";
import ReasoningPanel from "../components/ReasoningPanel";
import LiveMatchupCard from "../components/LiveMatchupCard";
import { useBracket } from "../context/BracketContext";
import { streamBracketAdapt, startAgentSession, deleteAgentSession } from "../services/api";
import { type Round, ROUND_ORDER } from "../types/tournament";

const PICK_PATTERN = /(?:PICK|UPSET\s+ALERT):\s*(\S+)\s*->\s*(\S+)/gi;

const LivePage = () => {
  const { state, dispatch } = useBracket();
  const { refresh } = useLivePolling(true);
  const [activeRound, setActiveRound] = useState<Round>("Round of 64");
  const [isAdapting, setIsAdapting] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const liveSessionIdRef = useRef<string | null>(null);
  const roundMatchups = state.liveMatchups.filter((m) => m.round === activeRound);
  const liveGames = roundMatchups.filter((m) => m.isLive);
  const completedGames = roundMatchups.filter((m) => m.isComplete);
  const upcomingGames = roundMatchups.filter((m) => !m.isLive && !m.isComplete);
  const roundsWithGames = ROUND_ORDER.filter((r) => state.liveMatchups.some((m) => m.round === r));

  // Keep ref in sync so the unmount cleanup always sees the latest session ID
  useEffect(() => {
    liveSessionIdRef.current = liveSessionId;
  }, [liveSessionId]);

  // Clean up the Agentforce session when the user navigates away
  useEffect(() => {
    return () => {
      if (liveSessionIdRef.current) {
        void deleteAgentSession(liveSessionIdRef.current).catch(console.error);
      }
    };
  }, []);

  const isFallback = state.isLiveFallback;

  const aiTextRef = useRef("");
  const dispatchedPicksRef = useRef<Set<string>>(new Set());

  const { content, isStreaming, error, stream, reset } = useSSE({
    onChunk: (chunk) => {
      const raw = aiTextRef.current + chunk;
      aiTextRef.current = raw
        .replace(/(\.\.\.)(\S)/g, "$1\n\n$2")
        .replace(/([^\n])((?:PICK|UPSET\s+ALERT|REASON):)/gi, "$1\n\n$2");
      const matches = [...aiTextRef.current.matchAll(PICK_PATTERN)];
      for (const match of matches) {
        // Strip all markdown artifacts the agent may wrap around values (* ` [ ])
        const matchupId = match[1].replace(/[*`[\]]/g, "").toLowerCase();
        const winnerId = match[2].replace(/[*`[\]]/g, "");
        if (!dispatchedPicksRef.current.has(matchupId)) {
          dispatchedPicksRef.current.add(matchupId);
          dispatch({ type: "ADD_AI_PICK", payload: { matchupId, winnerId } });
        }
      }
    },
    onDone: () => setIsAdapting(false),
    onError: () => setIsAdapting(false),
  });

  const handleAdapt = async () => {
    reset();
    aiTextRef.current = "";
    dispatchedPicksRef.current.clear();
    setIsAdapting(true);

    try {
      let agentSessionId = liveSessionId;
      if (!agentSessionId) {
        const res = await startAgentSession(uuidv4());
        agentSessionId = res.sessionId;
        setLiveSessionId(agentSessionId);
      }

      const relevantMatchups = state.liveMatchups.filter((m) => m.round === activeRound && m.isComplete);
      const fetchPromise = streamBracketAdapt(
        agentSessionId,
        Date.now(),
        activeRound,
        relevantMatchups,
        state.aiBracket,
      );
      await stream(fetchPromise);
    } catch (err) {
      setIsAdapting(false);
      console.error("Adapt error:", err);
    }
  };

  return (
    <>
      <main className="flex-1 text-white pb-12">
        {/* Header */}
        <div className="max-w-screen-2xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Radio size={22} className="text-orange-400" /> Live Tracking
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {liveGames.length > 0 ? `${liveGames.length} games in progress` : "Polling every 30s for updates"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm font-semibold text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* Round tabs */}
        {roundsWithGames.length > 0 && (
          <div className="max-w-screen-2xl mx-auto px-4 mb-4">
            <div className="flex gap-2 flex-wrap">
              {roundsWithGames.map((r) => {
                const count = state.liveMatchups.filter((m) => m.round === r).length;
                const liveCount = state.liveMatchups.filter((m) => m.round === r && m.isLive).length;
                return (
                  <button
                    key={r}
                    onClick={() => setActiveRound(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors relative ${
                      activeRound === r
                        ? "bg-orange-500 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    {r}
                    <span className={`ml-1.5 text-xs ${activeRound === r ? "text-orange-200" : "text-gray-500"}`}>
                      ({count})
                    </span>
                    {liveCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isFallback && (
          <div className="max-w-screen-2xl mx-auto px-4 mb-4">
            <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-700/50 rounded-xl px-4 py-3">
              <CalendarClock size={18} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-300">No live games right now</p>
                <p className="text-xs text-amber-500 mt-0.5">
                  The {new Date().getFullYear()} NCAA Tournament bracket is loaded, but no games are currently in
                  progress. Live tracking activates automatically once games tip off — this page refreshes every 30
                  seconds.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-screen-2xl mx-auto px-4 flex gap-6">
          {/* Left: Games */}
          <div className="flex-1 min-w-0">
            {liveGames.length > 0 && (
              <section className="mb-8">
                <div className="text-sm font-bold text-green-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  In Progress ({liveGames.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {liveGames.map((m) => (
                    <LiveMatchupCard key={m.id} matchup={m} />
                  ))}
                </div>
              </section>
            )}

            {completedGames.length > 0 && (
              <section className="mb-8">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Final ({completedGames.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {completedGames.map((m) => (
                    <LiveMatchupCard key={m.id} matchup={m} />
                  ))}
                </div>
              </section>
            )}

            {upcomingGames.length > 0 && (
              <section>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Upcoming ({upcomingGames.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcomingGames.map((m) => (
                    <LiveMatchupCard key={m.id} matchup={m} />
                  ))}
                </div>
              </section>
            )}

            {roundMatchups.length === 0 && state.liveMatchups.length > 0 && (
              <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
                No games for this round.
              </div>
            )}

            {state.liveMatchups.length === 0 && (
              <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
                No games found. Live data refreshes every 30 seconds.
              </div>
            )}
          </div>

          {/* Right: AI Adaptation panel */}
          <div className="w-80 xl:w-96 shrink-0 flex flex-col gap-4 sticky top-14 h-[calc(100vh-80px)]">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="text-sm font-bold text-gray-200 mb-3">Round Adaptation</div>
              <p className="text-xs text-gray-400 mb-3">
                {isFallback
                  ? "Use the 2025 tournament results to test Agentforce adaptation — select a completed round and ask the AI to update its picks based on what actually happened."
                  : "Tell Agentforce that a round has completed so it can adapt its remaining picks based on actual results."}
              </p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">Selected round</span>
                <span className="text-xs font-semibold text-orange-400 bg-orange-950/40 border border-orange-800/50 px-2 py-0.5 rounded-lg">
                  {activeRound}
                </span>
              </div>
              <button
                onClick={handleAdapt}
                disabled={isAdapting || isStreaming}
                className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
              >
                {isAdapting || isStreaming ? "Adapting..." : "Adapt AI Picks"}
              </button>
            </div>

            <div className="flex-1 min-h-0">
              <ReasoningPanel content={content} isStreaming={isStreaming} error={error} title="Adaptation Reasoning" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default LivePage;
