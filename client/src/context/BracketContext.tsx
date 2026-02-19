import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { type Bracket, type PickPayload, type Matchup, type Team, ROUND_ORDER } from "../types/tournament";

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

const generateSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const initialState: BracketState = {
  userBracket: null,
  aiBracket: null,
  realBracket: null,
  liveMatchups: [],
  sessionId: generateSessionId(),
  aiSessionId: null,
  userPicks: [],
  isLoadingBracket: false,
  isLoadingAI: false,
  error: null,
};

const bracketReducer = (state: BracketState, action: BracketAction): BracketState => {
  switch (action.type) {
    case "SET_REAL_BRACKET":
      return {
        ...state,
        realBracket: action.payload,
        userBracket: state.userBracket ?? { ...action.payload, id: state.sessionId, type: "user" },
      };
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
