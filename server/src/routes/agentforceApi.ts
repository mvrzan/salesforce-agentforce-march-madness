import { Router } from "express";
import startSession from "../controllers/startSession.ts";
import deleteSession from "../controllers/deleteSession.ts";
import { validateSignature } from "../middleware/validateSignature.ts";
import sendStreamingMessage from "../controllers/sendStreamingMessage.ts";
import streamBracketRound from "../controllers/streamBracketRound.ts";
import streamBracketRetry from "../controllers/streamBracketRetry.ts";

const agentforceApiRoutes = Router();

agentforceApiRoutes.post("/api/v1/af/sessions/:sessionId", validateSignature, startSession);
agentforceApiRoutes.delete("/api/v1/delete-session", validateSignature, deleteSession);
agentforceApiRoutes.post("/api/v1/send-streaming-message", validateSignature, sendStreamingMessage);
agentforceApiRoutes.post("/api/v1/af/bracket/round", validateSignature, streamBracketRound);
agentforceApiRoutes.post("/api/v1/af/bracket/retry", validateSignature, streamBracketRetry);

export default agentforceApiRoutes;
