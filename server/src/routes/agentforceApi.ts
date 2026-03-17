import { Router } from "express";
import startSession from "../controllers/startSession.ts";
import deleteSession from "../controllers/deleteSession.ts";
import { validateSignature } from "../middleware/validateSignature.ts";
import streamBracketRound from "../controllers/streamBracketRound.ts";
import streamBracketRetry from "../controllers/streamBracketRetry.ts";
import streamBracketAdapt from "../controllers/streamBracketAdapt.ts";

const agentforceApiRoutes = Router();

agentforceApiRoutes.post("/api/v1/af/sessions/:sessionId", validateSignature, startSession);
agentforceApiRoutes.delete("/api/v1/af/delete-session", validateSignature, deleteSession);
agentforceApiRoutes.post("/api/v1/af/bracket/round", validateSignature, streamBracketRound);
agentforceApiRoutes.post("/api/v1/af/bracket/retry", validateSignature, streamBracketRetry);
agentforceApiRoutes.post("/api/v1/af/bracket/adapt", validateSignature, streamBracketAdapt);

export default agentforceApiRoutes;
