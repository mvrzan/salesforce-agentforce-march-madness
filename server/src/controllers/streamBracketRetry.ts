import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { getAgentforceAuth, sendAgentMessage, pipeStreamToResponse } from "../services/agentforceService.ts";

const streamBracketRetry = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info("streamBracketRetry.ts", "Request received");

    const { sessionId, missingMatchupIds, sequenceId } = req.body as {
      sessionId: string;
      missingMatchupIds: string[];
      sequenceId: number;
    };

    if (!Array.isArray(missingMatchupIds) || missingMatchupIds.length === 0) {
      res.status(400).json({ message: "missingMatchupIds must be a non-empty array" });
      return;
    }

    const message = `You missed picks for these matchups: ${missingMatchupIds.join(", ")}. Please provide picks for each one now.`;
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
