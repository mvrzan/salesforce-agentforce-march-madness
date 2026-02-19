import { type Request, type Response } from "express";
import { getCurrentTimestamp } from "../utils/loggingUtil.ts";
import {
  type Bracket,
  type BracketRound,
  type PickPayload,
  type SaveBracketRequest,
  type Round,
  ROUND_ORDER,
} from "../types/tournament.ts";
import { fetchBracketStructure } from "../services/espnService.ts";

// In-memory store: sessionId -> Bracket
const bracketStore = new Map<string, Bracket>();

const applyPicksToBracket = (base: Bracket, picks: PickPayload[]): Bracket => {
  // Deep-clone the bracket rounds
  const rounds: BracketRound[] = base.rounds.map((r) => ({
    round: r.round,
    matchups: r.matchups.map((m) => ({
      ...m,
      topTeam: m.topTeam ? { ...m.topTeam } : null,
      bottomTeam: m.bottomTeam ? { ...m.bottomTeam } : null,
      winner: m.winner ? { ...m.winner } : null,
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

      const isTop = currentMatchupIndex % 2 === 0;
      if (isTop) {
        nextMatchup.topTeam = { ...winner };
      } else {
        nextMatchup.bottomTeam = { ...winner };
      }
    }
  });

  return { ...base, rounds, updatedAt: new Date().toISOString() };
};

export const saveBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`${getCurrentTimestamp()} 💾 - bracketController - Saving bracket`);

    const { sessionId, picks } = req.body as SaveBracketRequest;

    if (!sessionId || !Array.isArray(picks)) {
      res.status(400).json({ success: false, error: "sessionId and picks are required" });
      return;
    }

    const base = await fetchBracketStructure();
    const bracket: Bracket = {
      ...applyPicksToBracket(base, picks),
      id: sessionId,
      type: "user",
      createdAt: bracketStore.get(sessionId)?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    bracketStore.set(sessionId, bracket);
    console.log(`${getCurrentTimestamp()} ✅ - bracketController - Bracket saved for session ${sessionId}`);

    res.status(200).json({ success: true, data: bracket });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - bracketController - saveBracket error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};

export const getBracket = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    console.log(`${getCurrentTimestamp()} 📂 - bracketController - Getting bracket ${id}`);

    const bracket = bracketStore.get(id);
    if (!bracket) {
      res.status(404).json({ success: false, error: "Bracket not found" });
      return;
    }

    res.status(200).json({ success: true, data: bracket });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - bracketController - getBracket error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};

export const scoreUserVsReal = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    console.log(`${getCurrentTimestamp()} 🏆 - bracketController - Scoring bracket ${id}`);

    const userBracket = bracketStore.get(id);
    if (!userBracket) {
      res.status(404).json({ success: false, error: "Bracket not found" });
      return;
    }

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

    res.status(200).json({ success: true, data: { total, byRound, maxPossible: 192 } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - bracketController - scoreUserVsReal error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};
