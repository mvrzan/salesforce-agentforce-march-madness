import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { getAgentforceAuth, createAgentSession } from "../services/agentforceService.ts";

const startSession = async (req: Request, res: Response) => {
  try {
    logger.info("startSession.ts", "Request received");

    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const agentId = process.env.AGENTFORCE_AGENT_ID!;

    logger.info("startSession.ts", `Using session ID: ${sessionId}`);

    const { accessToken, instanceUrl } = await getAgentforceAuth();
    const data = await createAgentSession(accessToken, instanceUrl, agentId, sessionId);

    logger.info("startSession.ts", "Agentforce session started");
    logger.info("startSession.ts", `Session ID from Agentforce: ${(data as { sessionId: string }).sessionId}`);

    res.status(200).json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("startSession.ts", `Error occurred: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: "Failed to start Agentforce session",
      message: errorMessage,
    });
  }
};

export default startSession;
