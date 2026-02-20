import { useEffect, useState } from "react";
import BracketTree from "../components/BracketTree";
import ScoreSummaryBar from "../components/ScoreSummaryBar";
import { useBracket } from "../context/BracketContext";
import { getBracketStructure } from "../services/api";
import { type Bracket, type BracketScore, type Round, ROUND_ORDER } from "../types/tournament";

const POINTS_PER_ROUND: Record<Round, number> = {
  "Round of 64": 1,
  "Round of 32": 2,
  "Sweet 16": 4,
  "Elite 8": 8,
  "Final Four": 16,
  Championship: 32,
};

const scoreLocally = (picks: Bracket, real: Bracket): BracketScore => {
  let total = 0;
  const byRound = {} as Record<Round, number>;

  for (const round of ROUND_ORDER) {
    const pickRound = picks.rounds.find((r) => r.round === round);
    const realRound = real.rounds.find((r) => r.round === round);
    let pts = 0;
    pickRound?.matchups.forEach((m) => {
      const realMatchup = realRound?.matchups.find((rm) => rm.id === m.id);
      if (realMatchup?.winner && m.winner?.id === realMatchup.winner.id) {
        pts += POINTS_PER_ROUND[round];
      }
    });
    byRound[round] = pts;
    total += pts;
  }

  return { total, byRound, maxPossible: 192 };
};

type ActiveTab = "user" | "ai";

const ComparePage = () => {
  const { state, dispatch } = useBracket();
  const [userScore, setUserScore] = useState<BracketScore | null>(null);
  const [aiScore, setAiScore] = useState<BracketScore | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("user");

  useEffect(() => {
    if (state.realBracket) return;
    const load = async () => {
      try {
        const res = await getBracketStructure();
        if (res.success) dispatch({ type: "SET_REAL_BRACKET", payload: res.data });
      } catch (err) {
        console.error(err);
      }
    };
    void load();
  }, [dispatch, state.realBracket]);

  const handleScore = () => {
    if (!state.realBracket) return;
    if (state.userBracket) setUserScore(scoreLocally(state.userBracket, state.realBracket));
    if (state.aiBracket) setAiScore(scoreLocally(state.aiBracket, state.realBracket));
  };

  const hasUserBracket = !!state.userBracket;
  const hasAIBracket = !!state.aiBracket;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">
      {/* Header */}
      <div className="max-w-screen-2xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">⚖️ Compare</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your bracket vs Agentforce, measured against real results</p>
        </div>
        <button
          onClick={handleScore}
          disabled={!state.realBracket || (!hasUserBracket && !hasAIBracket)}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
        >
          Calculate Scores
        </button>
      </div>

      {/* Score bar */}
      {(userScore || aiScore) && (
        <div className="max-w-screen-2xl mx-auto px-4 mb-6">
          <ScoreSummaryBar userScore={userScore} aiScore={aiScore} />
        </div>
      )}

      {/* Missing brackets warnings */}
      {(!hasUserBracket || !hasAIBracket) && (
        <div className="max-w-screen-2xl mx-auto px-4 mb-4 flex gap-3 flex-wrap">
          {!hasUserBracket && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900/30 border border-blue-700 text-sm text-blue-300">
              ⚠️ No user bracket yet —{" "}
              <a href="/bracket" className="underline hover:text-blue-200">
                build yours
              </a>
            </div>
          )}
          {!hasAIBracket && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-900/30 border border-orange-700 text-sm text-orange-300">
              ⚠️ No AI bracket yet —{" "}
              <a href="/ai-bracket" className="underline hover:text-orange-200">
                generate one
              </a>
            </div>
          )}
        </div>
      )}

      {/* Tab switcher */}
      <div className="max-w-screen-2xl mx-auto px-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("user")}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors border ${
              activeTab === "user"
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            📝 Your Bracket
            {userScore && (
              <span
                className={`ml-2 text-xs font-semibold ${activeTab === "user" ? "text-blue-200" : "text-gray-500"}`}
              >
                {userScore.total} pts
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors border ${
              activeTab === "ai"
                ? "bg-orange-600 border-orange-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            🤖 AI Bracket
            {aiScore && (
              <span
                className={`ml-2 text-xs font-semibold ${activeTab === "ai" ? "text-orange-200" : "text-gray-500"}`}
              >
                {aiScore.total} pts
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Single bracket view */}
      <div className="max-w-screen-2xl mx-auto px-4">
        {activeTab === "user" ? (
          <div className="overflow-x-auto bg-gray-900/40 rounded-2xl border border-blue-800/40 p-4">
            <BracketTree bracket={state.userBracket} realBracket={state.realBracket} isReadOnly label="Your Bracket" />
          </div>
        ) : (
          <div className="overflow-x-auto bg-gray-900/40 rounded-2xl border border-orange-800/40 p-4">
            <BracketTree bracket={state.aiBracket} realBracket={state.realBracket} isReadOnly label="AI Bracket" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparePage;
