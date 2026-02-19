export type Region = "East" | "West" | "South" | "Midwest";

export type Round = "Round of 64" | "Round of 32" | "Sweet 16" | "Elite 8" | "Final Four" | "Championship";

export const ROUND_ORDER: Round[] = ["Round of 64", "Round of 32", "Sweet 16", "Elite 8", "Final Four", "Championship"];

export const ROUND_POINTS: Record<Round, number> = {
  "Round of 64": 1,
  "Round of 32": 2,
  "Sweet 16": 4,
  "Elite 8": 8,
  "Final Four": 16,
  Championship: 32,
};

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  seed: number;
  region: Region;
  record?: string;
  logo?: string;
  espnId?: string;
}

export interface Matchup {
  id: string;
  round: Round;
  region: Region | "Final Four" | "Championship";
  topTeam: Team | null;
  bottomTeam: Team | null;
  winner: Team | null;
  topScore?: number;
  bottomScore?: number;
  isComplete: boolean;
  isLive: boolean;
  gameTime?: string;
  espnEventId?: string;
}

export interface BracketRound {
  round: Round;
  matchups: Matchup[];
}

export interface Bracket {
  id: string;
  rounds: BracketRound[];
  createdAt: string;
  updatedAt: string;
  type: "user" | "ai" | "real";
  score?: number;
}

export interface PickPayload {
  matchupId: string;
  winnerId: string;
}

export interface BracketScore {
  total: number;
  byRound: Record<Round, number>;
  maxPossible: number;
}

export interface StreamChunk {
  type: "reasoning" | "pick" | "complete" | "error";
  content: string;
  matchupId?: string;
  winnerId?: string;
}

export interface AgentSession {
  sessionId: string;
  messages?: unknown[];
}

export interface LiveMatchup extends Matchup {
  gameTime: string;
}
