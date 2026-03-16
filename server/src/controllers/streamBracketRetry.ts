import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { getAgentforceAuth, sendAgentMessage, pipeStreamToResponse } from "../services/agentforceService.ts";

const streamBracketRetry = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info("streamBracketRetry.ts", "Request received");

    const { sessionId, missingMatchupIds, sequenceId, priorPicks } = req.body as {
      sessionId: string;
      missingMatchupIds: string[];
      sequenceId: number;
      priorPicks?: Record<string, string>;
    };

    if (!Array.isArray(missingMatchupIds) || missingMatchupIds.length === 0) {
      res.status(400).json({ message: "missingMatchupIds must be a non-empty array" });
      return;
    }

    // Annotate each missing ID with the resolved participants from priorPicks where possible
    const picks = priorPicks ?? {};
    const resolveWinner = (id: string) => picks[id.toLowerCase()] ?? `winner-of-${id}`;
    const annotated = missingMatchupIds.map((id) => {
      // For non-R64 slots, try to show which teams are expected based on prior picks
      const teamHint = picks[id.toLowerCase()];
      return teamHint ? `${id} (already picked: ${teamHint} — confirm or correct)` : id;
    });
    const lines = annotated.join("\n");
    const message =
      `You did not provide picks for the following matchup IDs. ` +
      `You MUST output one PICK line per ID below — no exceptions, no prose, no refusals. ` +
      `Format: PICK: MATCHUP_ID -> TEAM_ABBREVIATION\n\n${lines}`;

    void resolveWinner; // suppress unused warning — kept for future use
    logger.info(
      "streamBracketRetry.ts",
      `Session: ${sessionId}, Sequence: ${sequenceId}, Missing: ${missingMatchupIds.join(", ")}`,
    );

    const { accessToken } = await getAgentforceAuth();

    logger.info("streamBracketRetry.ts", "Sending Agentforce message");
    const response = await sendAgentMessage(accessToken, sessionId, { sequenceId, type: "Text", text: message });

    await pipeStreamToResponse(response, res, "streamBracketRetry.ts");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("streamBracketRetry.ts", `Error occurred: ${errorMessage}`);
    res.status(500).json({ message: errorMessage });
  }
};

export default streamBracketRetry;
