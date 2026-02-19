import { useState } from "react";
import { useLivePolling } from "../hooks/useLivePolling";
import { useSSE } from "../hooks/useSSE";
import ReasoningPanel from "../components/ReasoningPanel";
import { useBracket } from "../context/BracketContext";
import { sendStreamingMessage } from "../services/api";
import { type Round, ROUND_ORDER, type Matchup } from "../types/tournament";

const ADAPT_PROMPT = (round: Round, matchups: Matchup[]): string => {
  const results = matchups
    .filter((m) => m.isComplete && m.winner)
    .map((m) => `${m.topTeam?.name ?? "TBD"} vs ${m.bottomTeam?.name ?? "TBD"} → Winner: ${m.winner?.name}`)
    .join("\n");

  return `Round "${round}" is complete. Actual results:\n\n${results}\n\nPlease analyze the upsets, identify surprises, and adapt your bracket predictions for remaining rounds. Provide updated PICK: [ID] -> [WINNER_ID] entries.`;
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
        <div
          className={`flex items-center justify-between gap-2 ${isComplete && matchup.winner?.id === topTeam?.id ? "text-white font-bold" : "text-gray-400"}`}
        >
          <div className="flex items-center gap-2">
            {topTeam?.seed && <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{topTeam.seed}</span>}
            <span className="text-sm truncate">{topTeam?.shortName ?? "TBD"}</span>
          </div>
          {topScore !== undefined && <span className="text-sm font-mono">{topScore}</span>}
        </div>
        <div className="h-px bg-gray-800" />
        <div
          className={`flex items-center justify-between gap-2 ${isComplete && matchup.winner?.id === bottomTeam?.id ? "text-white font-bold" : "text-gray-400"}`}
        >
          <div className="flex items-center gap-2">
            {bottomTeam?.seed && <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">{bottomTeam.seed}</span>}
            <span className="text-sm truncate">{bottomTeam?.shortName ?? "TBD"}</span>
          </div>
          {bottomScore !== undefined && <span className="text-sm font-mono">{bottomScore}</span>}
        </div>
      </div>
    </div>
  );
};

const LivePage = () => {
  const { state } = useBracket();
  const { refresh } = useLivePolling(true);
  const [activeRound, setActiveRound] = useState<Round>("Round of 64");
  const [isAdapting, setIsAdapting] = useState(false);

  const { content, isStreaming, error, stream, reset } = useSSE({
    onDone: () => setIsAdapting(false),
    onError: () => setIsAdapting(false),
  });

  const handleAdapt = async () => {
    const agentSessionId = state.aiSessionId;
    if (!agentSessionId) {
      alert("No active AI session. Please generate an AI bracket first.");
      return;
    }

    reset();
    setIsAdapting(true);

    const relevantMatchups = state.liveMatchups.filter((m) => m.round === activeRound && m.isComplete);
    const prompt = ADAPT_PROMPT(activeRound, relevantMatchups);

    try {
      const fetchPromise = sendStreamingMessage(agentSessionId, prompt, Date.now());
      await stream(fetchPromise);
    } catch (err) {
      setIsAdapting(false);
      console.error("Adapt error:", err);
    }
  };

  const liveGames = state.liveMatchups.filter((m) => m.isLive);
  const completedGames = state.liveMatchups.filter((m) => m.isComplete);
  const upcomingGames = state.liveMatchups.filter((m) => !m.isLive && !m.isComplete);

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
              Tell Agentforce that a round has completed so it can adapt its remaining picks based on actual results.
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
              disabled={isAdapting || isStreaming || !state.aiSessionId}
              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
            >
              {isAdapting || isStreaming ? "Adapting..." : "Adapt AI Picks"}
            </button>
            {!state.aiSessionId && (
              <p className="text-xs text-gray-500 mt-2">Generate an AI bracket first to enable adaptation.</p>
            )}
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
