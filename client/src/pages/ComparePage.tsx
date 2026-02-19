import { useEffect, useState } from "react";
import BracketTree from "../components/BracketTree";
import ScoreSummaryBar from "../components/ScoreSummaryBar";
import { useBracket } from "../context/BracketContext";
import { getBracketStructure, scoreBracket } from "../services/api";
import { type BracketScore } from "../types/tournament";

const ComparePage = () => {
  const { state, dispatch } = useBracket();
  const [userScore, setUserScore] = useState<BracketScore | null>(null);
  const [aiScore, setAiScore] = useState<BracketScore | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  useEffect(() => {
    if (state.realBracket) return;
    getBracketStructure()
      .then((res) => {
        if (res.success) dispatch({ type: "SET_REAL_BRACKET", payload: res.data });
      })
      .catch(console.error);
  }, []);

  const handleScore = async () => {
    setIsScoring(true);
    try {
      const [userRes, aiRes] = await Promise.allSettled([
        state.userBracket ? scoreBracket(state.userBracket.id) : Promise.reject("No user bracket"),
        state.aiBracket ? scoreBracket(state.aiBracket.id) : Promise.reject("No AI bracket"),
      ]);

      if (userRes.status === "fulfilled" && userRes.value.success) {
        setUserScore(userRes.value.data);
      }
      if (aiRes.status === "fulfilled" && aiRes.value.success) {
        setAiScore(aiRes.value.data);
      }
    } catch (err) {
      console.error("Scoring error:", err);
    } finally {
      setIsScoring(false);
    }
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
          disabled={isScoring || (!hasUserBracket && !hasAIBracket)}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
        >
          {isScoring ? "Scoring..." : "Calculate Scores"}
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

      {/* Side-by-side brackets */}
      <div className="max-w-screen-2xl mx-auto px-4 flex gap-6 flex-wrap xl:flex-nowrap">
        <div className="flex-1 min-w-0 overflow-auto bg-gray-900/40 rounded-2xl border border-blue-800/40 p-4">
          <BracketTree bracket={state.userBracket} realBracket={state.realBracket} isReadOnly label="Your Bracket" />
        </div>

        <div className="flex-1 min-w-0 overflow-auto bg-gray-900/40 rounded-2xl border border-orange-800/40 p-4">
          <BracketTree bracket={state.aiBracket} realBracket={state.realBracket} isReadOnly label="AI Bracket" />
        </div>
      </div>
    </div>
  );
};

export default ComparePage;
