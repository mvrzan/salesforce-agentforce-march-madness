import { type Bracket, type BracketRound, type PickPayload, type Round, ROUND_ORDER } from "../types/tournament.ts";
import { fetchBracketStructure } from "./espnService.ts";
import { logger } from "../utils/loggingUtil.ts";

const bracketStore = new Map<string, Bracket>();

const applyPicksToBracket = (base: Bracket, picks: PickPayload[]): Bracket => {
  // Deep-clone the bracket rounds, stripping any pre-baked winners and post-R64 teams
  // so the resulting bracket only reflects the user's picks, not static 2025 results.
  const rounds: BracketRound[] = base.rounds.map((r) => ({
    round: r.round,
    matchups: r.matchups.map((m) => ({
      ...m,
      winner: null,
      isComplete: false,
      topTeam: r.round === "Round of 64" ? (m.topTeam ? { ...m.topTeam } : null) : null,
      bottomTeam: r.round === "Round of 64" ? (m.bottomTeam ? { ...m.bottomTeam } : null) : null,
    })),
  }));

  picks.forEach(({ matchupId, winnerId }) => {
    for (const round of rounds) {
      const matchup = round.matchups.find((m) => m.id === matchupId);
      if (!matchup) continue;

      const winner =
        matchup.topTeam?.id === winnerId
          ? matchup.topTeam
          : matchup.bottomTeam?.id === winnerId
            ? matchup.bottomTeam
            : null;

      if (!winner) continue;
      matchup.winner = winner;

      // Propagate winner to next round as a participant
      const currentRoundIndex = ROUND_ORDER.indexOf(round.round as Round);
      if (currentRoundIndex < 0 || currentRoundIndex >= ROUND_ORDER.length - 1) continue;

      const nextRound = rounds[currentRoundIndex + 1];
      if (!nextRound) continue;

      // Find the next-round matchup this winner feeds into
      const currentMatchupIndex = round.matchups.findIndex((m) => m.id === matchupId);
      const nextMatchupIndex = Math.floor(currentMatchupIndex / 2);
      const nextMatchup = nextRound.matchups[nextMatchupIndex];
      if (!nextMatchup) continue;

      if (currentMatchupIndex % 2 === 0) {
        nextMatchup.topTeam = { ...winner };
      } else {
        nextMatchup.bottomTeam = { ...winner };
      }
    }
  });

  return { ...base, rounds, updatedAt: new Date().toISOString() };
};

export const saveBracket = async (sessionId: string, picks: PickPayload[]): Promise<Bracket> => {
  const base = await fetchBracketStructure();
  const bracket: Bracket = {
    ...applyPicksToBracket(base, picks),
    id: sessionId,
    type: "user",
    createdAt: bracketStore.get(sessionId)?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  bracketStore.set(sessionId, bracket);
  logger.info("bracketService.ts", `Bracket saved for session ${sessionId}`);
  return bracket;
};

export const findBracket = (id: string): Bracket | undefined => bracketStore.get(id);

export const scoreUserBracket = async (
  id: string,
): Promise<{ total: number; byRound: Record<string, number>; maxPossible: number } | null> => {
  const userBracket = bracketStore.get(id);
  if (!userBracket) return null;

  const realBracket = await fetchBracketStructure();

  const pointsPerRound: Record<Round, number> = {
    "Round of 64": 1,
    "Round of 32": 2,
    "Sweet 16": 4,
    "Elite 8": 8,
    "Final Four": 16,
    Championship: 32,
  };

  let total = 0;
  const byRound: Record<string, number> = {};

  userBracket.rounds.forEach((userRound) => {
    const realRound = realBracket.rounds.find((r) => r.round === userRound.round);
    let roundPoints = 0;

    userRound.matchups.forEach((userMatchup) => {
      const realMatchup = realRound?.matchups.find((m) => m.id === userMatchup.id);
      if (realMatchup?.winner && userMatchup.winner?.id === realMatchup.winner.id) {
        roundPoints += pointsPerRound[userRound.round];
      }
    });

    total += roundPoints;
    byRound[userRound.round] = roundPoints;
  });

  return { total, byRound, maxPossible: 192 };
};
