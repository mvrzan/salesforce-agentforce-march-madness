import { type Request, type Response } from "express";
import { getCurrentTimestamp } from "../utils/loggingUtil.ts";
import { fetchBracketStructure, fetchLiveScores, fetchTeams } from "../services/espnService.ts";
import { buildStaticBracket } from "../data/tournamentField2025.ts";
import { type Bracket, type Matchup } from "../types/tournament.ts";
import { type ESPNEvent } from "../types/api.ts";

const NCAA_TOURNAMENT_ID = 22;

export const getTeams = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log(`${getCurrentTimestamp()} 🏀 - resultsController - Fetching teams`);
    const teams = await fetchTeams();
    res.status(200).json({ success: true, data: teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - resultsController - getTeams error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};

export const getBracketStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`${getCurrentTimestamp()} 🏀 - resultsController - Fetching bracket structure`);
    const bracket = await fetchBracketStructure();

    res.status(200).json({ success: true, data: bracket });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - resultsController - getBracketStructure error: ${message}`);

    res.status(500).json({ success: false, error: message });
  }
};

const mapESPNEventToMatchup = (event: ESPNEvent): Matchup => {
  const competition = event.competitions[0];
  const homeTeam = competition?.competitors.find((c) => c.homeAway === "home");
  const awayTeam = competition?.competitors.find((c) => c.homeAway === "away");
  const isComplete = competition?.status.type.completed ?? false;
  const isLive = competition?.status.type.state === "in";

  const buildTeam = (competitor: typeof homeTeam) => {
    if (!competitor) return null;
    return {
      id: competitor.team.id,
      name: competitor.team.displayName,
      shortName: competitor.team.shortDisplayName,
      abbreviation: competitor.team.abbreviation,
      seed: competitor.curatedRank?.current ?? 0,
      region: "East" as const,
      logo: competitor.team.logos?.[0]?.href,
      espnId: competitor.team.id,
    };
  };

  const awayTeamMapped = buildTeam(awayTeam);
  const homeTeamMapped = buildTeam(homeTeam);

  let winner = null;
  if (isComplete) {
    const winnerCompetitor = competition?.competitors.find((c) => c.winner);
    if (winnerCompetitor) {
      winner = winnerCompetitor.homeAway === "home" ? homeTeamMapped : awayTeamMapped;
    }
  }

  return {
    id: event.id,
    round: "Round of 64",
    region: "East",
    topTeam: awayTeamMapped,
    bottomTeam: homeTeamMapped,
    topScore: awayTeam ? parseInt(awayTeam.score, 10) || 0 : undefined,
    bottomScore: homeTeam ? parseInt(homeTeam.score, 10) || 0 : undefined,
    winner,
    isComplete,
    isLive,
    gameTime: competition?.status.type.shortDetail,
    espnEventId: event.id,
  };
};

export const getLiveScores = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log(`${getCurrentTimestamp()} 📡 - resultsController - Fetching live scores`);
    const events = await fetchLiveScores();

    // Only show NCAA tournament games (tournamentId 22), not regular season/conference games
    const tournamentEvents = events.filter((e) => e.competitions[0]?.tournamentId === NCAA_TOURNAMENT_ID);

    // Require at least 8 games to be considered an active tournament day (minimum for one R64 session).
    // A single archived/stale game from a prior year should not prevent the fallback from triggering.
    const ACTIVE_TOURNAMENT_THRESHOLD = 8;
    if (tournamentEvents.length >= ACTIVE_TOURNAMENT_THRESHOLD) {
      console.log(
        `${getCurrentTimestamp()} ✅ - resultsController - Found ${tournamentEvents.length} live tournament games`,
      );
      const matchups = tournamentEvents.map(mapESPNEventToMatchup);
      res.status(200).json({ success: true, data: matchups, isFallback: false });
      return;
    }

    if (tournamentEvents.length > 0) {
      console.log(
        `${getCurrentTimestamp()} ⚠️ - resultsController - Found only ${tournamentEvents.length} tournament game(s) — likely stale archived data, using 2025 static bracket as fallback`,
      );
    }

    // No live tournament games — fall back to static 2025 bracket results
    console.log(
      `${getCurrentTimestamp()} ⚠️ - resultsController - No live tournament games found, using 2025 static bracket as fallback`,
    );
    const staticBracket = buildStaticBracket();
    const allMatchups = staticBracket.rounds.flatMap((r) => r.matchups).filter((m) => m.topTeam && m.bottomTeam);
    res.status(200).json({ success: true, data: allMatchups, isFallback: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - resultsController - getLiveScores error: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
};
