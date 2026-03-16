import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { getAgentforceAuth, sendAgentMessage, pipeStreamToResponse } from "../services/agentforceService.ts";

const sendStreamingMessage = async (req: Request, res: Response) => {
  try {
    logger.info("sendStreamingMessage.ts", "Request received");

    const { sessionId, message, sequenceId } = req.body as {
      sessionId: string;
      message: string;
      sequenceId: number;
    };

    logger.info("sendStreamingMessage.ts", `Session: ${sessionId}, Sequence: ${sequenceId}`);

    const { accessToken } = await getAgentforceAuth();

    logger.info("sendStreamingMessage.ts", "Sending Agentforce message");
    const response = await sendAgentMessage(accessToken, sessionId, { sequenceId, type: "Text", text: message });

    await pipeStreamToResponse(response, res, "sendStreamingMessage.ts");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("sendStreamingMessage.ts", `Error occurred: ${errorMessage}`);
    res.status(500).json({ message: errorMessage });
  }
};

export default sendStreamingMessage;
