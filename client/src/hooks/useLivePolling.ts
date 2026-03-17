import { useCallback, useEffect, useRef } from "react";
import { getLiveScores } from "../services/api";
import { useBracket } from "../context/BracketContext";

const POLL_INTERVAL_MS = 30_000;

export const useLivePolling = (enabled = true) => {
  const { dispatch } = useBracket();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const res = await getLiveScores();
      if (res.success) {
        dispatch({ type: "SET_LIVE_MATCHUPS", payload: { matchups: res.data, isFallback: res.isFallback ?? false } });
      }
    } catch (err) {
      console.error("Live polling error:", err);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!enabled) return;

    void fetchScores();
    timerRef.current = setInterval(() => void fetchScores(), POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, fetchScores]);

  return { refresh: fetchScores };
};
