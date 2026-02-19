import { type Bracket, type BracketRound, type Round } from "./tournament.ts";

export interface AgentSession {
  sessionId: string;
  agentId: string;
  createdAt: string;
  lastActivity: string;
  round?: Round;
}

export interface StreamChunk {
  type: "reasoning" | "pick" | "complete" | "error";
  content: string;
  matchupId?: string;
  winnerId?: string;
}

export interface AgentBracketResponse {
  bracket: Bracket;
  reasoning: string;
  sessionId: string;
}

export interface RoundAdaptation {
  round: Round;
  completedMatchups: string[];
  surprises: string[];
  updatedPicks: BracketRound[];
  reasoning: string;
}

export interface AgentGenerateRequest {
  sessionId?: string;
  context?: string;
  round?: Round;
  completedResults?: string;
}
