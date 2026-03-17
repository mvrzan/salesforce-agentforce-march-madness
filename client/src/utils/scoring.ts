import { type Bracket, type BracketScore, type Round, ROUND_ORDER, ROUND_POINTS } from "../types/tournament";

export const scoreLocally = (picks: Bracket, real: Bracket): BracketScore => {
  let total = 0;
  const byRound = {} as Record<Round, number>;

  for (const round of ROUND_ORDER) {
    const pickRound = picks.rounds.find((r) => r.round === round);
    const realRound = real.rounds.find((r) => r.round === round);
    let pts = 0;
    pickRound?.matchups.forEach((m) => {
      const realMatchup = realRound?.matchups.find((rm) => rm.id === m.id);
      if (realMatchup?.winner && m.winner?.id === realMatchup.winner.id) {
        pts += ROUND_POINTS[round];
      }
    });
    byRound[round] = pts;
    total += pts;
  }

  return { total, byRound, maxPossible: 192 };
};
