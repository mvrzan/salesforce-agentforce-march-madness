import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { type SaveBracketRequest } from "../types/tournament.ts";
import { saveBracket as storeBracket, findBracket, scoreUserBracket } from "../services/bracketService.ts";

export const saveBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info("bracketController.ts", "Saving bracket");

    const { sessionId, picks } = req.body as SaveBracketRequest;

    if (!sessionId || !Array.isArray(picks)) {
      res.status(400).json({ success: false, error: "sessionId and picks are required" });
      return;
    }

    const bracket = await storeBracket(sessionId, picks);
    res.status(200).json({ success: true, data: bracket });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("bracketController.ts", `saveBracket error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};

export const getBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    logger.info("bracketController.ts", `Getting bracket ${id}`);

    const bracket = findBracket(id);
    if (!bracket) {
      res.status(404).json({ success: false, error: "Bracket not found" });
      return;
    }

    res.status(200).json({ success: true, data: bracket });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("bracketController.ts", `getBracket error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};

export const scoreUserVsReal = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    logger.info("bracketController.ts", `Scoring bracket ${id}`);

    const score = await scoreUserBracket(id);
    if (!score) {
      res.status(404).json({ success: false, error: "Bracket not found" });
      return;
    }

    res.status(200).json({ success: true, data: score });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("bracketController.ts", `scoreUserVsReal error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};
