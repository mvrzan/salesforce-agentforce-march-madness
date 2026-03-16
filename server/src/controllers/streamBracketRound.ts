import { type Request, type Response } from "express";
import { logger } from "../utils/loggingUtil.ts";
import { getAgentforceAuth, sendAgentMessage, pipeStreamToResponse } from "../services/agentforceService.ts";
import { fetchBracketStructure } from "../services/espnService.ts";

const TOTAL_ROUND_PROMPTS = 8;

const REGION_ORDER = ["East", "West", "South", "Midwest"] as const;

/**
 * Builds a prompt for the given roundIndex.
 *
 * priorPicks is a map of matchupId (lowercase) -> team abbreviation accumulated
 * from all previous rounds. For R32+, this lets us resolve "winner of East-R64-1v16"
 * to the actual team name the agent already picked — making each prompt fully
 * self-contained and removing all reliance on the LLM recalling prior turns.
 */
const buildPrompt = async (roundIndex: number, priorPicks: Record<string, string>): Promise<string> => {
  const bracket = await fetchBracketStructure();

  const r64Round = bracket.rounds.find((r) => r.round === "Round of 64");
  const r32Round = bracket.rounds.find((r) => r.round === "Round of 32");
  const s16Round = bracket.rounds.find((r) => r.round === "Sweet 16");
  const e8Round = bracket.rounds.find((r) => r.round === "Elite 8");
  const ffRound = bracket.rounds.find((r) => r.round === "Final Four");
  const champRound = bracket.rounds.find((r) => r.round === "Championship");

  // Only include picks from the immediately preceding round in the prompt.
  // Sending the full accumulated map adds noise and can confuse the agent.
  const R64_PATTERN = /-r64-/i;
  const R32_PATTERN = /-roundof32-/i;
  const S16_PATTERN = /-sweet16-/i;
  const E8_PATTERN = /-elite8-/i;
  const FF_PATTERN = /^ff-/i;

  const filterPicks = (pattern: RegExp): Record<string, string> =>
    Object.fromEntries(Object.entries(priorPicks).filter(([k]) => pattern.test(k)));

  // What each round needs to build its participant annotations
  const relevantPicks: Record<string, string> =
    roundIndex <= 3
      ? {} // R64 prompts need nothing — teams come from ESPN bracket data
      : roundIndex === 4
        ? filterPicks(R64_PATTERN) // R32 needs R64 picks
        : roundIndex === 5
          ? filterPicks(R32_PATTERN) // S16 needs R32 picks
          : roundIndex === 6
            ? filterPicks(S16_PATTERN) // E8 needs S16 picks
            : { ...filterPicks(E8_PATTERN), ...filterPicks(FF_PATTERN) }; // FF+Champ needs E8+FF picks

  logger.debug("streamBracketRound.ts", `Round ${roundIndex} relevantPicks: ${JSON.stringify(relevantPicks)}`);

  // Resolve a matchup ID to the team the agent already picked in a prior round.
  const resolveWinner = (matchupId: string): string =>
    relevantPicks[matchupId.toLowerCase()] ?? `winner-of-${matchupId}`;

  // Round of 64 — one region per prompt (indexes 0–3)
  if (roundIndex <= 3) {
    const region = REGION_ORDER[roundIndex]!;
    const matchups = r64Round?.matchups.filter((m) => m.region === region) ?? [];
    const lines = matchups
      .map((m) => {
        const top = m.topTeam?.abbreviation ?? "TBD";
        const bot = m.bottomTeam?.abbreviation ?? "TBD";
        return `${m.id} (${top} vs ${bot})`;
      })
      .join("\n");
    return (
      `Provide your picks for all ${matchups.length} Round of 64 matchups in the ${region} region.\n\n` +
      `You MUST output a PICK line for every matchup listed below — no skipping:\n${lines}`
    );
  }

  // Round of 32 (index 4)
  // Standard NCAA pairing: slot order within region corresponds to seed pairings
  // 1v16+8v9, 5v12+4v13, 6v11+3v14, 7v10+2v15.
  // We find each R64 game by its seed-encoded ID, then resolve the winner from priorPicks.
  if (roundIndex === 4) {
    const SLOT_TOP_SEEDS: [number, number][] = [
      [1, 8],
      [5, 4],
      [6, 3],
      [7, 2],
    ];
    const findR64Id = (region: string, topSeed: number): string =>
      r64Round?.matchups.filter((m) => m.region === region).find((m) => new RegExp(`-R64-${topSeed}v\\d+$`).test(m.id))
        ?.id ?? `${region}-R64-${topSeed}v?`;

    const lines = REGION_ORDER.flatMap((region) => {
      const r32s = r32Round?.matchups.filter((m) => m.region === region) ?? [];
      const regionLines = r32s.map((r32m, slotIdx) => {
        const [sa, sb] = SLOT_TOP_SEEDS[slotIdx] ?? [0, 0];
        const idA = findR64Id(region, sa);
        const idB = findR64Id(region, sb);
        const teamA = resolveWinner(idA);
        const teamB = resolveWinner(idB);
        return `${r32m.id} (${teamA} vs ${teamB})`;
      });
      return [`\n${region}:`].concat(regionLines);
    });
    return (
      `Now provide your picks for all 16 Round of 32 matchups.\n` +
      `The participants for each slot are derived from your Round of 64 picks and are shown below.\n\n` +
      `You MUST output a PICK line for every matchup ID below — no skipping:\n` +
      lines.join("\n")
    );
  }

  // Sweet 16 (index 5)
  if (roundIndex === 5) {
    const lines = REGION_ORDER.flatMap((region) => {
      const r32s = r32Round?.matchups.filter((m) => m.region === region) ?? [];
      const s16s = s16Round?.matchups.filter((m) => m.region === region) ?? [];
      const regionLines = s16s.map((s16m, slotIdx) => {
        const idA = r32s[slotIdx * 2]?.id ?? `${region}-Roundof32-${slotIdx * 2 + 1}`;
        const idB = r32s[slotIdx * 2 + 1]?.id ?? `${region}-Roundof32-${slotIdx * 2 + 2}`;
        const teamA = resolveWinner(idA);
        const teamB = resolveWinner(idB);
        return `${s16m.id} (${teamA} vs ${teamB})`;
      });
      return [`\n${region}:`].concat(regionLines);
    });
    return (
      `Now provide your picks for all 8 Sweet 16 matchups.\n` +
      `The participants for each slot are derived from your Round of 32 picks and are shown below.\n\n` +
      `You MUST output a PICK line for every matchup ID below — no skipping:\n` +
      lines.join("\n")
    );
  }

  // Elite 8 (index 6)
  if (roundIndex === 6) {
    const lines = REGION_ORDER.flatMap((region) => {
      const s16s = s16Round?.matchups.filter((m) => m.region === region) ?? [];
      const e8s = e8Round?.matchups.filter((m) => m.region === region) ?? [];
      const regionLines = e8s.map((e8m) => {
        const idA = s16s[0]?.id ?? `${region}-Sweet16-1`;
        const idB = s16s[1]?.id ?? `${region}-Sweet16-2`;
        const teamA = resolveWinner(idA);
        const teamB = resolveWinner(idB);
        return `${e8m.id} (${teamA} vs ${teamB})`;
      });
      return [`\n${region}:`].concat(regionLines);
    });
    return (
      `Now provide your picks for all 4 Elite 8 matchups (one per region).\n` +
      `The participants for each slot are derived from your Sweet 16 picks and are shown below.\n\n` +
      `You MUST output a PICK line for every matchup ID below — no skipping:\n` +
      lines.join("\n")
    );
  }

  // Final Four + Championship (index 7)
  const FF_REGION_PAIRS: [string, string][] = [
    ["East", "West"],
    ["South", "Midwest"],
  ];
  const getE8Id = (region: string) => e8Round?.matchups.find((m) => m.region === region)?.id ?? `${region}-Elite8-1`;
  const ffMatchups = ffRound?.matchups ?? [];
  const champMatchups = champRound?.matchups ?? [];
  const ffLines = ffMatchups
    .map((ff, idx) => {
      const [ra, rb] = FF_REGION_PAIRS[idx] ?? ["?", "?"];
      const teamA = resolveWinner(getE8Id(ra));
      const teamB = resolveWinner(getE8Id(rb));
      return `${ff.id} (${teamA} vs ${teamB})`;
    })
    .join("\n");
  const champId = champMatchups[0]?.id ?? "CHAMP-1";
  const ff1Id = ffMatchups[0]?.id ?? "FF-1";
  const ff2Id = ffMatchups[1]?.id ?? "FF-2";
  const champTeamA = resolveWinner(ff1Id);
  const champTeamB = resolveWinner(ff2Id);
  return (
    `Finally, provide your picks for the Final Four (2 picks) and Championship (1 pick).\n` +
    `The participants are derived from your Elite 8 picks and are shown below.\n\n` +
    `Final Four:\n${ffLines}\n\n` +
    `Championship:\n${champId} (${champTeamA} vs ${champTeamB})\n\n` +
    `You MUST output a PICK line for all 3 IDs — no skipping.`
  );
};

const streamBracketRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, roundIndex, sequenceId, priorPicks } = req.body as {
      sessionId: string;
      roundIndex: number;
      sequenceId: number;
      priorPicks?: Record<string, string>;
    };

    if (typeof roundIndex !== "number" || roundIndex < 0 || roundIndex >= TOTAL_ROUND_PROMPTS) {
      res.status(400).json({ message: `Invalid roundIndex: must be 0–${TOTAL_ROUND_PROMPTS - 1}` });
      return;
    }

    const message = await buildPrompt(roundIndex, priorPicks ?? {});
    logger.info("streamBracketRound.ts", `Round ${roundIndex}, Session: ${sessionId}, Sequence: ${sequenceId}`);
    logger.info("streamBracketRound.ts", `Prompt for round ${roundIndex}:\n${message}`);

    const { accessToken } = await getAgentforceAuth();

    logger.info("streamBracketRound.ts", "Sending Agentforce message");
    const response = await sendAgentMessage(accessToken, sessionId, { sequenceId, type: "Text", text: message });

    await pipeStreamToResponse(response, res, "streamBracketRound.ts");
    logger.info("streamBracketRound.ts", `Round ${roundIndex} complete`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("streamBracketRound.ts", `Error: ${msg}`);
    res.status(500).json({ message: msg });
  }
};

export default streamBracketRound;
