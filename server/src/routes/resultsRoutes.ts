import { Router } from "express";
import { getBracketStructure, getLiveScores } from "../controllers/resultsController.ts";

const resultsRoutes = Router();

resultsRoutes.get("/api/v1/results/bracket", getBracketStructure);
resultsRoutes.get("/api/v1/results/live", getLiveScores);

export default resultsRoutes;
