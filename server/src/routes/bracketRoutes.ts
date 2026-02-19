import { Router } from "express";
import { saveBracket, getBracket, scoreUserVsReal } from "../controllers/bracketController.ts";

const bracketRoutes = Router();

bracketRoutes.post("/api/v1/bracket/save", saveBracket);
bracketRoutes.get("/api/v1/bracket/:id", getBracket);
bracketRoutes.get("/api/v1/bracket/:id/score", scoreUserVsReal);

export default bracketRoutes;
