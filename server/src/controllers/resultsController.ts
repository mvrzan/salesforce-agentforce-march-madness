import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { fetchBracketStructure, fetchTeams, fetchTournamentMatchups } from "../services/espnService.ts";

export const getTeams = async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info("resultsController.ts", "Fetching teams");
    const teams = await fetchTeams();
    res.status(200).json({ success: true, data: teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("resultsController.ts", `getTeams error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};

export const getBracketStructure = async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info("resultsController.ts", "Fetching bracket structure");
    const bracket = await fetchBracketStructure();
    res.status(200).json({ success: true, data: bracket });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("resultsController.ts", `getBracketStructure error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};

export const getLiveScores = async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.info("resultsController.ts", "Fetching live scores");
    const { matchups, isFallback } = await fetchTournamentMatchups();
    res.status(200).json({ success: true, data: matchups, isFallback });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("resultsController.ts", `getLiveScores error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};
