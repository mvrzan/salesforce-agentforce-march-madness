import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useLivePolling } from "../hooks/useLivePolling";
import { useSSE } from "../hooks/useSSE";
import ReasoningPanel from "../components/ReasoningPanel";
import { useBracket } from "../context/BracketContext";
import { sendStreamingMessage, startAgentSession } from "../services/api";
import { type Round, ROUND_ORDER, type Matchup, type Bracket } from "../types/tournament";

const buildCurrentPicksSummary = (aiBracket: Bracket | null): string => {
  if (!aiBracket) return "No prior picks on record.";

  const lines: string[] = [];
  for (const round of aiBracket.rounds) {
    const pickedMatchups = round.matchups.filter((m) => m.winner != null);
    if (pickedMatchups.length === 0) continue;
    lines.push(`\n${round.round}:`);
    for (const m of pickedMatchups) {
      const top = m.topTeam ? `(${m.topTeam.seed}) ${m.topTeam.name}` : "TBD";
      const bottom = m.bottomTeam ? `(${m.bottomTeam.seed}) ${m.bottomTeam.name}` : "TBD";
      lines.push(`  ${top} vs ${bottom} → Your pick: ${m.winner?.name}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No prior picks on record.";
};

const ADAPT_PROMPT = (round: Round, matchups: Matchup[], aiBracket: Bracket | null): string => {
  const results = matchups
    .filter((m) => m.isComplete && m.winner)
    .map((m) => `${m.topTeam?.name ?? "TBD"} vs ${m.bottomTeam?.name ?? "TBD"} → Winner: ${m.winner?.name}`)
    .join("\n");

  const picksSummary = buildCurrentPicksSummary(aiBracket);

  return `Here is a summary of your current bracket predictions:
${picksSummary}

Round "${round}" is now complete. Actual results:

${results}

Please analyze the upsets, identify surprises, and adapt your remaining bracket predictions based on what actually happened. Provide updated PICK: [ID] -> [WINNER_ID] entries for any rounds not yet completed.`;
};

const LiveMatchupCard = ({ matchup }: { matchup: Matchup }) => {
  const { topTeam, bottomTeam, topScore, bottomScore, isLive, isComplete, gameTime } = matchup;

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 ${isLive ? "border-green-600 shadow-[0_0_12px_rgba(34,197,94,0.2)]" : "border-gray-700"}`}
    >
      {isLive && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-bold uppercase tracking-wider">Live</span>
          {gameTime && <span className="text-xs text-gray-500 ml-auto">{gameTime}</span>}
        </div>
      )}
      {isComplete && <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Final</div>}
      {!isLive && !isComplete && gameTime && <div className="text-xs text-gray-500 mb-2">{gameTime}</div>}

      <div className="flex flex-col gap-1">
        {[
          { team: topTeam, score: topScore },
          { team: bottomTeam, score: bottomScore },
        ].map(({ team, score }, i) => {
          const isWinner = isComplete && matchup.winner?.id === team?.id;
          const isLoser = isComplete && matchup.winner != null && !isWinner;
          return (
            <div key={i}>
              {i === 1 && <div className="h-px bg-gray-800 my-1" />}
              <div
                className={`flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${
                  isWinner ? "bg-green-950/50 text-white" : isLoser ? "text-gray-600" : "text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {team?.seed && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${isLoser ? "bg-gray-800 text-gray-600" : "bg-gray-700"}`}
                    >
                      {team.seed}
                    </span>
                  )}
                  <span
                    className={`text-sm truncate ${isLoser ? "line-through decoration-gray-600" : isWinner ? "font-bold" : ""}`}
                  >
                    {team?.shortName ?? "TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {score !== undefined && (
                    <span className={`text-sm font-mono ${isWinner ? "font-bold text-green-300" : ""}`}>{score}</span>
                  )}
                  {isWinner && <span className="text-green-400 text-xs">✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PICK_PATTERN = /PICK:\s*(\S+)\s*->\s*(\S+)/g;

const LivePage = () => {
  const { state, dispatch } = useBracket();
  const { refresh } = useLivePolling(true);
  const [activeRound, setActiveRound] = useState<Round>("Round of 64");
  const [isAdapting, setIsAdapting] = useState(false);

  const isFallback = state.isLiveFallback;

  const aiTextRef = useRef("");
  const dispatchedPicksRef = useRef<Set<string>>(new Set());

  const { content, isStreaming, error, stream, reset } = useSSE({
    onChunk: (chunk) => {
      aiTextRef.current += chunk;
      const matches = [...aiTextRef.current.matchAll(PICK_PATTERN)];
      for (const match of matches) {
        const matchupId = match[1];
        const winnerId = match[2];
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
      let agentSessionId = state.aiSessionId;
      if (!agentSessionId) {
        const res = await startAgentSession(uuidv4());
        agentSessionId = res.sessionId;
        dispatch({ type: "SET_AI_SESSION_ID", payload: agentSessionId });
      }

      const relevantMatchups = state.liveMatchups.filter((m) => m.round === activeRound && m.isComplete);
      const prompt = ADAPT_PROMPT(activeRound, relevantMatchups, state.aiBracket);
      const fetchPromise = sendStreamingMessage(agentSessionId, prompt, Date.now());
      await stream(fetchPromise);
    } catch (err) {
      setIsAdapting(false);
      console.error("Adapt error:", err);
    }
  };

  const roundMatchups = state.liveMatchups.filter((m) => m.round === activeRound);
  const liveGames = roundMatchups.filter((m) => m.isLive);
  const completedGames = roundMatchups.filter((m) => m.isComplete);
  const upcomingGames = roundMatchups.filter((m) => !m.isLive && !m.isComplete);

  const roundsWithGames = ROUND_ORDER.filter((r) => state.liveMatchups.some((m) => m.round === r));

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">
      {/* Header */}
      <div className="max-w-screen-2xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">📡 Live Tracking</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {liveGames.length > 0 ? `${liveGames.length} games in progress` : "Polling every 30s for updates"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm font-semibold text-white rounded-xl transition-colors"
          >
            🔄 Refresh
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
            <span className="text-amber-400 text-lg mt-0.5">🗓️</span>
            <div>
              <p className="text-sm font-semibold text-amber-300">Tournament not active</p>
              <p className="text-xs text-amber-500 mt-0.5">
                Showing 2025 NCAA tournament results. Live tracking will begin automatically when the 2026 tournament
                starts in March.
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
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No games for this round.</div>
          )}

          {state.liveMatchups.length === 0 && (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
              No games found. Live data refreshes every 30 seconds.
            </div>
          )}
        </div>

        {/* Right: AI Adaptation panel */}
        <div
          className="w-80 xl:w-96 shrink-0 flex flex-col gap-4"
          style={{ position: "sticky", top: "56px", height: "calc(100vh - 80px)" }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <div className="text-sm font-bold text-gray-200 mb-3">Round Adaptation</div>
            <p className="text-xs text-gray-400 mb-3">
              {isFallback
                ? "Use the 2025 tournament results to test Agentforce adaptation — select a completed round and ask the AI to update its picks based on what actually happened."
                : "Tell Agentforce that a round has completed so it can adapt its remaining picks based on actual results."}
            </p>
            <select
              value={activeRound}
              onChange={(e) => setActiveRound(e.target.value as Round)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-orange-500"
            >
              {ROUND_ORDER.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
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
    </div>
  );
};

export default LivePage;
