import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { getAgentforceAuth, sendAgentMessage, pipeStreamToResponse } from "../services/agentforceService.ts";

// Prompt text lives here on the server so it is never exposed in the client bundle.
// The client sends only a roundIndex (0-based) to select the appropriate prompt.
const ROUND_PROMPTS: string[] = [
  "Provide your picks for all 8 Round of 64 matchups in the East region.",
  "Provide your picks for all 8 Round of 64 matchups in the West region.",
  "Provide your picks for all 8 Round of 64 matchups in the South region.",
  "Provide your picks for all 8 Round of 64 matchups in the Midwest region.",
  "Now provide your picks for every Round of 32 matchup across all 4 regions, based on your Round of 64 picks.",
  "Now provide your picks for every Sweet 16 matchup across all 4 regions.",
  "Now provide your picks for every Elite 8 matchup across all 4 regions.",
  "Finally, provide your picks for the Final Four (FF-1, FF-2) and Championship (CHAMP-1).",
];

const streamBracketRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, roundIndex, sequenceId } = req.body as {
      sessionId: string;
      roundIndex: number;
      sequenceId: number;
    };

    if (typeof roundIndex !== "number" || roundIndex < 0 || roundIndex >= ROUND_PROMPTS.length) {
      res.status(400).json({ message: `Invalid roundIndex: must be 0–${ROUND_PROMPTS.length - 1}` });
      return;
    }

    const message = ROUND_PROMPTS[roundIndex]!;
    logger.info("streamBracketRound.ts", `Round ${roundIndex}, Session: ${sessionId}, Sequence: ${sequenceId}`);

    const { accessToken } = await getAgentforceAuth();

    logger.info("streamBracketRound.ts", "Sending Agentforce message");
    const response = await sendAgentMessage(accessToken, sessionId, { sequenceId, type: "Text", text: message });

    await pipeStreamToResponse(response, res, "streamBracketRound.ts");
    logger.info("streamBracketRound.ts", `Round ${roundIndex} complete`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("streamBracketRound.ts", `Error: ${msg}`);
    res.status(500).json({ message: msg });
  }
};

export default streamBracketRound;
