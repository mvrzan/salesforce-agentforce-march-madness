import { useEffect, useState } from "react";
import BracketTree from "../components/BracketTree";
import { useBracket } from "../context/BracketContext";
import { getBracketStructure, saveBracket } from "../services/api";
import { type Team } from "../types/tournament";

const BracketPage = () => {
  const { state, dispatch, makePick } = useBracket();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state.realBracket) return;

    const loadBracket = async () => {
      dispatch({ type: "SET_LOADING_BRACKET", payload: true });
      try {
        const res = await getBracketStructure();
        if (res.success) dispatch({ type: "SET_REAL_BRACKET", payload: res.data });
      } catch (err) {
        dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Failed to load bracket" });
      } finally {
        dispatch({ type: "SET_LOADING_BRACKET", payload: false });
      }
    };

    void loadBracket();
  }, [dispatch, state.realBracket]);

  const handlePick = (matchupId: string, winner: Team) => {
    makePick(matchupId, winner);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!state.userBracket) return;
    setIsSaving(true);
    try {
      const res = await saveBracket(state.sessionId, state.userPicks);
      if (res.success) {
        dispatch({ type: "SET_USER_BRACKET", payload: res.data });
        setSaveMessage("✅ Bracket saved!");
      }
    } catch (err) {
      setSaveMessage(`❌ ${err instanceof Error ? err.message : "Save failed"}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (state.isLoadingBracket) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-bounce">🏀</div>
          <div>Loading bracket...</div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <div className="text-center">
          <div className="text-3xl mb-3">❌</div>
          <div>{state.error}</div>
        </div>
      </div>
    );
  }

  const totalPicks = state.userPicks.length;
  const isLiveData = state.realBracket?.id === "bracket-live";

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">
      {/* Header */}
      <div className="max-w-screen-2xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-white">📝 My Bracket</h1>
            {state.realBracket &&
              (isLiveData ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-900/50 border border-green-600/60 text-green-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live ESPN Data
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-900/40 border border-yellow-600/50 text-yellow-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  2025 Fallback Data
                </span>
              ))}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{totalPicks} / 63 picks made · Click a team to advance them</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-sm text-gray-400">{saveMessage}</span>}
          <button
            onClick={handleSave}
            disabled={isSaving || totalPicks === 0}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
          >
            {isSaving ? "Saving..." : "Save Bracket"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-screen-2xl mx-auto px-4 mb-6">
        <div className="h-1.5 rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-300"
            style={{ width: `${(totalPicks / 63) * 100}%` }}
          />
        </div>
      </div>

      {/* Bracket */}
      <div className="max-w-screen-2xl mx-auto px-4">
        <BracketTree
          bracket={state.userBracket}
          realBracket={state.realBracket}
          onPick={handlePick}
          label="Your Picks"
        />
      </div>
    </div>
  );
};

export default BracketPage;
