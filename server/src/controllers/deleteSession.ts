import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { getAgentforceAuth, removeAgentSession } from "../services/agentforceService.ts";

const deleteSession = async (req: Request, res: Response) => {
  try {
    logger.info("deleteSession.ts", "Request received");

    const sessionId = req.body.sessionId;
    logger.info("deleteSession.ts", `Session: ${sessionId}`);

    const { accessToken } = await getAgentforceAuth();
    await removeAgentSession(accessToken, sessionId);

    logger.info("deleteSession.ts", "Agentforce session deleted");
    res.status(200).json({ message: "Session successfully ended." });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("deleteSession.ts", `Error occurred: ${errorMessage}`);
    res.status(500).json({ message: errorMessage });
  }
};

export default deleteSession;
