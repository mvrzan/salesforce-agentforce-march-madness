import { getCurrentTimestamp } from "../utils/loggingUtil.ts";
import {
  type Team,
  type Matchup,
  type Bracket,
  type BracketRound,
  type Region,
  type Round,
  ROUND_ORDER,
} from "../types/tournament.ts";
import { type ESPNEvent, type ESPNScoreboard, type ESPNCompetitor } from "../types/api.ts";
import { AppError } from "../middleware/errorHandler.ts";
import { buildStaticBracket, TOURNAMENT_FIELD_2025, buildTeamFromStaticEntry } from "../data/tournamentField2025.ts";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

// NCAA Men's Basketball Championship tournament ID on ESPN
const NCAA_TOURNAMENT_ID = 22;

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the set of scoreboard date strings (YYYYMMDD) to query for the given
 * tournament year. Dates are approximate – the API returns an empty event list
 * for any date with no games, so over-fetching is harmless.
 */
const getTournamentDates = (year: number): string[] => {
  const y = String(year);
  return [
    `${y}0318`,
    `${y}0319`, // First Four
    `${y}0320`,
    `${y}0321`, // Round of 64
    `${y}0322`,
    `${y}0323`, // Round of 32
    `${y}0327`,
    `${y}0328`, // Sweet 16
    `${y}0329`,
    `${y}0330`, // Elite 8
    `${y}0404`,
    `${y}0405`, // Final Four
    `${y}0406`, // Championship
  ];
};

// ── Headline parsers ──────────────────────────────────────────────────────────

/**
 * Maps an ESPN competition notes headline to our internal Round type.
 * Example headlines from ESPN:
 *   "Men's Basketball Championship - East Region - First Round"
 *   "Men's Basketball Championship - South Region - Sweet 16"
 *   "Men's Basketball Championship - Final Four"
 *   "Men's Basketball Championship"  (championship game)
 */
const parseRoundFromHeadline = (headline: string): Round | null => {
  if (headline.includes("First Round")) return "Round of 64";
  if (headline.includes("Second Round")) return "Round of 32";
  if (headline.includes("Sweet 16") || headline.includes("Sweet Sixteen")) return "Sweet 16";
  if (headline.includes("Elite Eight") || headline.includes("Elite 8")) return "Elite 8";
  if (headline.includes("Final Four")) return "Final Four";
  // Championship game — headline is just "Men's Basketball Championship" with no round qualifier
  if (/Men's Basketball Championship\s*$/.test(headline.trim())) return "Championship";
  return null;
};

const parseRegionFromHeadline = (headline: string): Region | "Final Four" | "Championship" => {
  if (headline.includes("East")) return "East";
  if (headline.includes("West")) return "West";
  if (headline.includes("South")) return "South";
  if (headline.includes("Midwest")) return "Midwest";
  if (headline.includes("Final Four")) return "Final Four";
  return "Championship";
};

// ── Team builder ─────────────────────────────────────────────────────────────

const buildTeamFromESPN = (competitor: ESPNCompetitor, region: Region | "Final Four" | "Championship"): Team => {
  const { team } = competitor;
  // For Final Four / Championship games, the team's original region isn't in the game data —
  // default to "East" as a non-breaking placeholder (UI only uses region for R64 seeding display).
  const teamRegion: Region = region === "Final Four" || region === "Championship" ? "East" : (region as Region);

  return {
    id: team.id,
    name: team.displayName,
    shortName: team.shortDisplayName,
    abbreviation: team.abbreviation,
    seed: competitor.curatedRank?.current ?? 0,
    region: teamRegion,
    logo: team.logo ?? team.logos?.[0]?.href ?? `https://a.espncdn.com/i/teamlogos/ncaa/500/${team.id}.png`,
    espnId: team.id,
  };
};

// ── Bracket builder from ESPN events ─────────────────────────────────────────

const buildBracketFromESPNGames = (events: ESPNEvent[]): Bracket => {
  // Keep only real NCAA Tournament games (not First Four, not TBD placeholders)
  const tournamentGames = events.filter((event) => {
    const comp = event.competitions[0];
    if (!comp) return false;
    if (comp.type.abbreviation !== "TRNMNT") return false;
    if (comp.tournamentId !== NCAA_TOURNAMENT_ID) return false;
    // Skip TBD slot games
    if (comp.competitors.some((c) => c.team.id === "-1" || c.team.id === "-2")) return false;
    const headline = comp.notes?.[0]?.headline ?? "";
    if (headline.includes("First Four")) return false;
    return true;
  });

  type ParsedGame = { event: ESPNEvent; round: Round; region: Region | "Final Four" | "Championship" };

  const parsedGames: ParsedGame[] = [];
  for (const event of tournamentGames) {
    const comp = event.competitions[0];
    const headline = comp?.notes?.[0]?.headline ?? "";
    const round = parseRoundFromHeadline(headline);
    if (!round) continue;
    const region = parseRegionFromHeadline(headline);
    parsedGames.push({ event, round, region });
  }

  // Group matchups by "round::region" key
  const gamesBySlot = new Map<string, Matchup[]>();

  for (const { event, round, region } of parsedGames) {
    const key = `${round}::${region}`;
    if (!gamesBySlot.has(key)) gamesBySlot.set(key, []);

    const comp = event.competitions[0];
    const [compA, compB] = comp.competitors;
    const seedA = compA.curatedRank?.current ?? 99;
    const seedB = compB.curatedRank?.current ?? 99;

    // Top = lower seed number (better seed)
    const topComp = seedA <= seedB ? compA : compB;
    const bottomComp = seedA <= seedB ? compB : compA;
    const topTeam = buildTeamFromESPN(topComp, region);
    const bottomTeam = buildTeamFromESPN(bottomComp, region);

    const isComplete = comp.status.type.completed;
    const isLive = comp.status.type.state === "in";

    let winner: Team | null = null;
    if (isComplete) {
      const winnerComp = comp.competitors.find((c) => c.winner);
      if (winnerComp) winner = winnerComp === topComp ? topTeam : bottomTeam;
    }

    gamesBySlot.get(key)!.push({
      id: event.id,
      round,
      region,
      topTeam,
      bottomTeam,
      topScore: isComplete || isLive ? parseInt(topComp.score, 10) || undefined : undefined,
      bottomScore: isComplete || isLive ? parseInt(bottomComp.score, 10) || undefined : undefined,
      winner,
      isComplete,
      isLive,
      gameTime: comp.status.type.shortDetail,
      espnEventId: event.id,
    });
  }

  // Expected matchups per region per round
  const REGIONAL_COUNTS: Partial<Record<Round, number>> = {
    "Round of 64": 8,
    "Round of 32": 4,
    "Sweet 16": 2,
    "Elite 8": 1,
  };

  const regions: Region[] = ["East", "West", "South", "Midwest"];
  const allMatchups: Matchup[] = [];

  // Regional rounds — fill any missing slots with empty matchups
  for (const round of ["Round of 64", "Round of 32", "Sweet 16", "Elite 8"] as Round[]) {
    for (const region of regions) {
      const key = `${round}::${region}`;
      const games = gamesBySlot.get(key) ?? [];
      const expected = REGIONAL_COUNTS[round] ?? 0;
      allMatchups.push(...games);
      for (let i = games.length; i < expected; i++) {
        allMatchups.push({
          id: `${region}-${round.replace(/ /g, "")}-empty-${i + 1}`,
          round,
          region,
          topTeam: null,
          bottomTeam: null,
          winner: null,
          isComplete: false,
          isLive: false,
        });
      }
    }
  }

  // Final Four (2 matchups)
  const ffGames = gamesBySlot.get("Final Four::Final Four") ?? [];
  allMatchups.push(...ffGames);
  for (let i = ffGames.length; i < 2; i++) {
    allMatchups.push({
      id: `FF-${i + 1}`,
      round: "Final Four",
      region: "Final Four",
      topTeam: null,
      bottomTeam: null,
      winner: null,
      isComplete: false,
      isLive: false,
    });
  }

  // Championship (1 matchup)
  const champGames = gamesBySlot.get("Championship::Championship") ?? [];
  allMatchups.push(...champGames);
  if (champGames.length === 0) {
    allMatchups.push({
      id: "CHAMP-1",
      round: "Championship",
      region: "Championship",
      topTeam: null,
      bottomTeam: null,
      winner: null,
      isComplete: false,
      isLive: false,
    });
  }

  const rounds: BracketRound[] = ROUND_ORDER.map((round) => ({
    round,
    matchups: allMatchups.filter((m) => m.round === round),
  }));

  return {
    id: "bracket-live",
    rounds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: "real",
  };
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const fetchScoreboardForDate = async (date: string): Promise<ESPNEvent[]> => {
  try {
    const res = await fetch(`${ESPN_BASE}/scoreboard?groups=100&dates=${date}&limit=100`);
    if (!res.ok) return [];
    const data = (await res.json()) as ESPNScoreboard;
    return data.events ?? [];
  } catch {
    return [];
  }
};

// ── Public exports ────────────────────────────────────────────────────────────

/**
 * Attempts to build the bracket from live ESPN data for the current tournament year.
 * Falls back to the hardcoded 2024 field when:
 *  - ESPN has no tournament games yet (pre-Selection-Sunday)
 *  - All games are TBD placeholders
 *  - Fewer than 32 Round-of-64 games are returned (incomplete data)
 */
export const fetchBracketStructure = async (): Promise<Bracket> => {
  const year = new Date().getFullYear();
  console.log(`${getCurrentTimestamp()} 🏀 - espnService - Fetching live bracket for ${year} tournament`);

  const dates = getTournamentDates(year);

  // Fetch all tournament dates in parallel; ignore individual failures
  const results = await Promise.allSettled(dates.map(fetchScoreboardForDate));
  const allEvents = results
    .filter((r): r is PromiseFulfilledResult<ESPNEvent[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Deduplicate events by id (same game can appear across adjacent date queries)
  const uniqueEvents = Array.from(new Map(allEvents.map((e) => [e.id, e])).values());

  // Count real (non-TBD) Round of 64 games to decide if ESPN has published the full bracket
  const r64Count = uniqueEvents.filter((e) => {
    const comp = e.competitions[0];
    const headline = comp?.notes?.[0]?.headline ?? "";
    return (
      comp?.tournamentId === NCAA_TOURNAMENT_ID &&
      headline.includes("First Round") &&
      comp.competitors.every((c) => c.team.id !== "-1" && c.team.id !== "-2")
    );
  }).length;

  if (r64Count >= 32) {
    console.log(`${getCurrentTimestamp()} ✅ - espnService - Found ${r64Count} R64 games, building live bracket`);
    return buildBracketFromESPNGames(uniqueEvents);
  }

  console.log(
    `${getCurrentTimestamp()} ⚠️ - espnService - Only ${r64Count} R64 games found (tournament not yet announced). Using 2024 static bracket as fallback.`,
  );
  return buildStaticBracket();
};

export const fetchLiveScores = async (): Promise<ESPNEvent[]> => {
  console.log(`${getCurrentTimestamp()} 📡 - espnService - Fetching live scores`);

  try {
    const response = await fetch(`${ESPN_BASE}/scoreboard?groups=100&limit=100`);

    if (!response.ok) {
      throw new AppError(`ESPN API returned ${response.status}`, 502);
    }

    const data = (await response.json()) as ESPNScoreboard;
    return data.events ?? [];
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error(`${getCurrentTimestamp()} ❌ - espnService - Failed to fetch live scores`, err);
    throw new AppError("Failed to fetch live scores from ESPN", 502);
  }
};

/**
 * Returns all 64 tournament teams. Derives them from the active bracket so the
 * team list always matches whatever source (live or static) is in use.
 */
export const fetchTeams = async (): Promise<Team[]> => {
  console.log(`${getCurrentTimestamp()} 🏀 - espnService - Fetching teams`);
  const bracket = await fetchBracketStructure();
  const r64Round = bracket.rounds.find((r) => r.round === "Round of 64");
  if (!r64Round) return TOURNAMENT_FIELD_2025.map(buildTeamFromStaticEntry);

  const teams = new Map<string, Team>();
  for (const matchup of r64Round.matchups) {
    if (matchup.topTeam) teams.set(matchup.topTeam.id, matchup.topTeam);
    if (matchup.bottomTeam) teams.set(matchup.bottomTeam.id, matchup.bottomTeam);
  }
  return Array.from(teams.values());
};
