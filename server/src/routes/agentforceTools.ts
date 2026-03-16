import { Router } from "express";
import { getBracketStructure, getLiveScores, getTeams } from "../controllers/resultsController.ts";
import { logger } from "../utils/loggingUtil.ts";
import initSalesforceSdk from "../middleware/herokuServiceMesh.ts";

const agentforceTools = Router();

const initHerokuMiddleware = async () => {
  try {
    logger.info("agentforceTools.ts", "Initializing Agent Action routes");
    const { salesforceMiddleware, withSalesforceConfig } = await initSalesforceSdk();

    agentforceTools.get(
      "/api/v1/agentforce/results/teams",
      withSalesforceConfig({ parseRequest: true }),
      salesforceMiddleware,
      getTeams,
    );

    agentforceTools.get(
      "/api/v1/agentforce/results/bracket",
      withSalesforceConfig({ parseRequest: true }),
      salesforceMiddleware,
      getBracketStructure,
    );

    agentforceTools.get(
      "/api/v1/agentforce/results/live",
      withSalesforceConfig({ parseRequest: true }),
      salesforceMiddleware,
      getLiveScores,
    );

    logger.info("agentforceTools.ts", "Agent Action routes registered successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("agentforceTools.ts", `Failed to initialize Agent Action routes: ${message}`);
  }
};

await initHerokuMiddleware();

export default agentforceTools;
