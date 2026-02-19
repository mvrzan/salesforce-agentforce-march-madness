import { Router } from "express";
import { getBracketStructure, getLiveScores, getTeams } from "../controllers/resultsController.ts";
import { getCurrentTimestamp } from "../utils/loggingUtil.ts";
import initSalesforceSdk from "../middleware/herokuServiceMesh.ts";

const agentforceTools = Router();

const initHerokuMiddleware = async () => {
  try {
    console.log(`${getCurrentTimestamp()} 🔧 - Initializing Agent Action routes...`);
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

    console.log(`${getCurrentTimestamp()} ✅ - agentActions - Agent Action routes registered successfully!`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - agentActions -Failed to initialize Agent Action routes: ${message}`);
  }
};

await initHerokuMiddleware();

export default agentforceTools;
