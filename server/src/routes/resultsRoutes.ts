import { Router } from "express";
import { getBracketStructure, getLiveScores, getTeams } from "../controllers/resultsController.ts";

const resultsRoutes = Router();

resultsRoutes.get("/api/v1/results/teams", getTeams);
resultsRoutes.get("/api/v1/results/bracket", getBracketStructure);
resultsRoutes.get("/api/v1/results/live", getLiveScores);

export default resultsRoutes;
