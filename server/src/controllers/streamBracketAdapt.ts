import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { getAgentforceAuth, sendAgentMessage, pipeStreamToResponse } from "../services/agentforceService.ts";
import { type Round, type Matchup, type Bracket } from "../types/tournament.ts";

// ── Prompt builder (server-side only) ────────────────────────────────────────

const buildPicksSummary = (aiBracket: Bracket | null): string => {
  if (!aiBracket) return "No prior picks on record.";

  const lines: string[] = [];
  for (const r of aiBracket.rounds) {
    const picked = r.matchups.filter((m) => m.winner != null);
    if (picked.length === 0) continue;
    lines.push(`\n${r.round}:`);
    for (const m of picked) {
      const top = m.topTeam ? `(${m.topTeam.seed}) ${m.topTeam.name}` : "TBD";
      const bottom = m.bottomTeam ? `(${m.bottomTeam.seed}) ${m.bottomTeam.name}` : "TBD";
      lines.push(`  ${top} vs ${bottom} → Your pick: ${m.winner?.name}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No prior picks on record.";
};

const buildAdaptPrompt = (round: Round, completedMatchups: Matchup[], aiBracket: Bracket | null): string => {
  const results = completedMatchups
    .filter((m) => m.isComplete && m.winner)
    .map((m) => `${m.topTeam?.name ?? "TBD"} vs ${m.bottomTeam?.name ?? "TBD"} → Winner: ${m.winner?.name}`)
    .join("\n");

  const picksSummary = buildPicksSummary(aiBracket);

  return `Here is a summary of your current bracket predictions:
${picksSummary}

Round "${round}" is now complete. Actual results:

${results}

Please analyze the upsets, identify surprises, and adapt your remaining bracket predictions based on what actually happened. Provide updated PICK: [ID] -> [WINNER_ID] entries for any rounds not yet completed.`;
};

// ── Controller ────────────────────────────────────────────────────────────────

const streamBracketAdapt = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info("streamBracketAdapt.ts", "Request received");

    const { sessionId, sequenceId, round, completedMatchups, aiBracket } = req.body as {
      sessionId: string;
      sequenceId: number;
      round: Round;
      completedMatchups: Matchup[];
      aiBracket: Bracket | null;
    };

    if (!sessionId || !round || !Array.isArray(completedMatchups)) {
      res.status(400).json({ message: "Missing required fields: sessionId, round, completedMatchups" });
      return;
    }

    const prompt = buildAdaptPrompt(round, completedMatchups, aiBracket ?? null);

    logger.info("streamBracketAdapt.ts", `Adapting round "${round}" for session ${sessionId}`);

    const { accessToken } = await getAgentforceAuth();
    const response = await sendAgentMessage(accessToken, sessionId, {
      sequenceId,
      type: "Text",
      text: prompt,
    });

    await pipeStreamToResponse(response, res, "streamBracketAdapt.ts");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("streamBracketAdapt.ts", `Error: ${message}`);
    res.status(500).json({ message });
  }
};

export default streamBracketAdapt;
