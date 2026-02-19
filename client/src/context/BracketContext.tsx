import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react";
import { type Bracket, type PickPayload, type Matchup, type Team, ROUND_ORDER } from "../types/tournament";

const STORAGE_KEY_SESSION = "mm-session-id";
const STORAGE_KEY_PICKS = "mm-user-picks";

const getOrCreateSessionId = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY_SESSION);
  if (stored) return stored;
  const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem(STORAGE_KEY_SESSION, newId);
  return newId;
};

const loadStoredPicks = (): PickPayload[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PICKS);
    return raw ? (JSON.parse(raw) as PickPayload[]) : [];
  } catch {
    return [];
  }
};

interface BracketState {
  userBracket: Bracket | null;
  aiBracket: Bracket | null;
  realBracket: Bracket | null;
  liveMatchups: Matchup[];
  sessionId: string;
  aiSessionId: string | null;
  userPicks: PickPayload[];
  isLoadingBracket: boolean;
  isLoadingAI: boolean;
  error: string | null;
}

type BracketAction =
  | { type: "SET_REAL_BRACKET"; payload: Bracket }
  | { type: "SET_USER_BRACKET"; payload: Bracket }
  | { type: "SET_AI_BRACKET"; payload: Bracket }
  | { type: "SET_LIVE_MATCHUPS"; payload: Matchup[] }
  | { type: "SET_AI_SESSION_ID"; payload: string }
  | { type: "ADD_PICK"; payload: PickPayload }
  | { type: "SET_LOADING_BRACKET"; payload: boolean }
  | { type: "SET_LOADING_AI"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

/**
 * When the bracket source changes (static fallback → live ESPN), stored matchup IDs
 * no longer match. Re-map each pick to the new matchup that contains the same winner
 * team as a participant. Picks whose team can't be found are dropped.
 * Sorted by round order so propagation in applyPickToLocal works correctly.
 */
const migratePicks = (picks: PickPayload[], bracket: Bracket): PickPayload[] => {
  const allMatchups = bracket.rounds.flatMap((r) => r.matchups);
  const existingIds = new Set(allMatchups.map((m) => m.id));

  // Build round lookup for sorting after migration
  const matchupRound = new Map(bracket.rounds.flatMap((r) => r.matchups.map((m) => [m.id, r.round])));

  const migrated = picks.flatMap((pick): PickPayload[] => {
    // If the matchupId already exists in the new bracket, no migration needed
    if (existingIds.has(pick.matchupId)) return [pick];

    // Find a matchup where this team is a seeded participant (not a null placeholder)
    const matchup = allMatchups.find(
      (m) =>
        (m.topTeam?.id === pick.winnerId || m.bottomTeam?.id === pick.winnerId) &&
        (m.topTeam !== null || m.bottomTeam !== null),
    );

    return matchup ? [{ matchupId: matchup.id, winnerId: pick.winnerId }] : [];
  });

  // Sort by round order so propagation plays out correctly (R64 → R32 → ...)
  return migrated.sort((a, b) => {
    const rA = ROUND_ORDER.indexOf(matchupRound.get(a.matchupId) ?? "Round of 64");
    const rB = ROUND_ORDER.indexOf(matchupRound.get(b.matchupId) ?? "Round of 64");
    return rA - rB;
  });
};

const applyPickToLocal = (bracket: Bracket, pick: PickPayload): Bracket => {
  const rounds = bracket.rounds.map((r) => ({
    ...r,
    matchups: r.matchups.map((m) => {
      if (m.id !== pick.matchupId) return m;
      const winner =
        m.topTeam?.id === pick.winnerId ? m.topTeam : m.bottomTeam?.id === pick.winnerId ? m.bottomTeam : null;
      return { ...m, winner };
    }),
  }));

  // Propagate winner to next round slot
  const updated = { ...bracket, rounds };
  updated.rounds.forEach((round, ri) => {
    if (ri >= ROUND_ORDER.length - 1) return;
    round.matchups.forEach((matchup, mi) => {
      if (matchup.id !== pick.matchupId || !matchup.winner) return;
      const nextRound = updated.rounds[ri + 1];
      if (!nextRound) return;
      const nextMatchupIdx = Math.floor(mi / 2);
      const nextMatchup = nextRound.matchups[nextMatchupIdx];
      if (!nextMatchup) return;
      const winner = matchup.winner as Team;
      if (mi % 2 === 0) {
        nextRound.matchups[nextMatchupIdx] = { ...nextMatchup, topTeam: { ...winner } };
      } else {
        nextRound.matchups[nextMatchupIdx] = { ...nextMatchup, bottomTeam: { ...winner } };
      }
    });
  });

  return { ...updated, updatedAt: new Date().toISOString() };
};

const initialState: BracketState = {
  userBracket: null,
  aiBracket: null,
  realBracket: null,
  liveMatchups: [],
  sessionId: getOrCreateSessionId(),
  aiSessionId: null,
  userPicks: loadStoredPicks(),
  isLoadingBracket: false,
  isLoadingAI: false,
  error: null,
};

const bracketReducer = (state: BracketState, action: BracketAction): BracketState => {
  switch (action.type) {
    case "SET_REAL_BRACKET": {
      const newMatchupIds = new Set(action.payload.rounds.flatMap((r) => r.matchups.map((m) => m.id)));

      // Detect bracket source change (e.g. static fallback → live ESPN data)
      const needsMigration = state.userPicks.length > 0 && state.userPicks.some((p) => !newMatchupIds.has(p.matchupId));
      const resolvedPicks = needsMigration ? migratePicks(state.userPicks, action.payload) : state.userPicks;

      // Re-apply picks whenever bracket is freshly loaded or source changed
      const shouldRestore = !state.userBracket || needsMigration;
      let restoredBracket: Bracket = { ...action.payload, id: state.sessionId, type: "user" };
      if (shouldRestore && resolvedPicks.length > 0) {
        restoredBracket = resolvedPicks.reduce((bracket, pick) => applyPickToLocal(bracket, pick), restoredBracket);
      }

      return {
        ...state,
        realBracket: action.payload,
        userBracket: shouldRestore ? restoredBracket : state.userBracket,
        // Persist migrated pick IDs so future refreshes use the new matchup IDs
        userPicks: resolvedPicks,
      };
    }
    case "SET_USER_BRACKET":
      return { ...state, userBracket: action.payload };
    case "SET_AI_BRACKET":
      return { ...state, aiBracket: action.payload };
    case "SET_LIVE_MATCHUPS":
      return { ...state, liveMatchups: action.payload };
    case "SET_AI_SESSION_ID":
      return { ...state, aiSessionId: action.payload };
    case "ADD_PICK": {
      const updatedPicks = [...state.userPicks.filter((p) => p.matchupId !== action.payload.matchupId), action.payload];
      const updatedBracket = state.userBracket ? applyPickToLocal(state.userBracket, action.payload) : null;
      return { ...state, userPicks: updatedPicks, userBracket: updatedBracket };
    }
    case "SET_LOADING_BRACKET":
      return { ...state, isLoadingBracket: action.payload };
    case "SET_LOADING_AI":
      return { ...state, isLoadingAI: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

interface BracketContextValue {
  state: BracketState;
  dispatch: Dispatch<BracketAction>;
  makePick: (matchupId: string, winner: Team) => void;
}

const BracketContext = createContext<BracketContextValue | null>(null);

export const BracketProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(bracketReducer, initialState);

  // Sync picks to localStorage whenever they change so they survive a refresh
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PICKS, JSON.stringify(state.userPicks));
  }, [state.userPicks]);

  const makePick = (matchupId: string, winner: Team) => {
    dispatch({ type: "ADD_PICK", payload: { matchupId, winnerId: winner.id } });
  };

  return <BracketContext.Provider value={{ state, dispatch, makePick }}>{children}</BracketContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBracket = (): BracketContextValue => {
  const ctx = useContext(BracketContext);
  if (!ctx) throw new Error("useBracket must be used within <BracketProvider>");
  return ctx;
};
