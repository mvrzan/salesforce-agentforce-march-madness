import { logger } from "../utils/loggingUtil.ts";
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
import { buildStaticBracket, TOURNAMENT_FIELD_2025, buildTeamFromStaticEntry } from "../data/tournamentField2025.ts";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

// Stable ESPN abbreviation for NCAA Tournament games — does not change year to year.
export const TOURNAMENT_TYPE_ABBREVIATION = "TRNMNT";

// ── In-process TTL cache ──────────────────────────────────────────────────────
// Prevents redundant fan-out ESPN fetches on every request and keeps memory usage
// bounded on low-RAM dynos (Heroku eco = 512 MB).

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const getCached = <T>(key: string): T | null => {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = <T>(key: string, value: T, ttlMs: number): void => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const BRACKET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — bracket data changes slowly
const LIVE_SCORES_CACHE_TTL = 30 * 1000; // 30 seconds — live scores need to be fresh

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the set of scoreboard date strings (YYYYMMDD) to query for the given
 * tournament year. Dates are approximate – the API returns an empty event list
 * for any date with no games, so over-fetching is harmless.
 */
const getTournamentDates = (year: number): string[] => {
  const y = String(year);
  return [
    `${y}0313`,
    `${y}0314`,
    `${y}0315`,
    `${y}0316`,
    `${y}0317`, // Selection Sunday weekend + First Four (day 1)
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
    `${y}0406`,
    `${y}0407`, // Championship
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
  // ESPN has used both "First Round" (pre-2026) and "1st Round" (2026+)
  if (headline.includes("First Round") || headline.includes("1st Round")) return "Round of 64";
  // ESPN has used both "Second Round" (pre-2026) and "2nd Round" (2026+)
  if (headline.includes("Second Round") || headline.includes("2nd Round")) return "Round of 32";
  if (headline.includes("Sweet 16") || headline.includes("Sweet Sixteen")) return "Sweet 16";
  if (headline.includes("Elite Eight") || headline.includes("Elite 8")) return "Elite 8";
  if (headline.includes("Final Four")) return "Final Four";
  // Championship game — ESPN uses "National Championship" (2026+) or the headline ends with
  // "Basketball Championship" with no round qualifier (pre-2026)
  if (headline.includes("National Championship") || /Basketball Championship\s*$/.test(headline.trim()))
    return "Championship";
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

const isTBDCompetitor = (comp: ESPNCompetitor): boolean => comp.team.id === "-1" || comp.team.id === "-2";

const buildBracketFromESPNGames = (events: ESPNEvent[]): Bracket => {
  // Keep only real NCAA Tournament games (not First Four).
  // Games where one team is TBD (First Four winner not yet decided) are allowed through —
  // buildTeamFromESPN returns null for TBD competitors, producing a "Team vs TBD" matchup.
  // Games where BOTH competitors are TBD are useless placeholders and are dropped.
  const tournamentGames = events.filter((event) => {
    const comp = event.competitions[0];
    if (!comp) return false;
    const headline = comp.notes?.[0]?.headline ?? "";
    // type.abbreviation may not be set on pre-game scheduled events; fall back to headline
    const isTournament =
      comp.type.abbreviation === TOURNAMENT_TYPE_ABBREVIATION ||
      headline.includes("Men's Basketball Championship") ||
      comp.tournamentId === 22;
    if (!isTournament) return false;
    // Drop games where every competitor is TBD — no useful data
    if (comp.competitors.every(isTBDCompetitor)) return false;
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

    // Top = lower seed number (better seed); TBD competitor always has seed 99 so it sorts to bottom
    const topComp = seedA <= seedB ? compA : compB;
    const bottomComp = seedA <= seedB ? compB : compA;
    const topTeam = isTBDCompetitor(topComp) ? null : buildTeamFromESPN(topComp, region);
    const bottomTeam = isTBDCompetitor(bottomComp) ? null : buildTeamFromESPN(bottomComp, region);

    const isComplete = comp.status.type.completed;
    const isLive = comp.status.type.state === "in";

    let winner: Team | null = null;
    if (isComplete) {
      const winnerComp = comp.competitors.find((c) => c.winner);
      if (winnerComp) winner = winnerComp === topComp ? topTeam : bottomTeam;
    }

    const slotIndex = gamesBySlot.get(key)!.length;
    const topSeed = Math.min(seedA, seedB);
    const bottomSeed = Math.max(seedA, seedB);
    const semanticId =
      round === "Round of 64"
        ? `${region}-R64-${topSeed}v${bottomSeed}`
        : round === "Round of 32"
          ? `${region}-Roundof32-${slotIndex + 1}`
          : round === "Sweet 16"
            ? `${region}-Sweet16-${slotIndex + 1}`
            : round === "Elite 8"
              ? `${region}-Elite8-${slotIndex + 1}`
              : round === "Final Four"
                ? `FF-${slotIndex + 1}`
                : "CHAMP-1";

    gamesBySlot.get(key)!.push({
      id: semanticId,
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

  const ROUND_SLUG: Partial<Record<Round, string>> = {
    "Round of 64": "R64",
    "Round of 32": "Roundof32",
    "Sweet 16": "Sweet16",
    "Elite 8": "Elite8",
  };

  // Standard NCAA bracket seed order within a region for Round of 64 (top to bottom).
  // This order is fixed every year and determines which R32 slot each R64 winner feeds into.
  // applyPickToLocal in the frontend propagates winners by positional index (Math.floor(mi/2)),
  // so the array order here MUST match this canonical sequence for propagation to be correct.
  const R64_SEED_ORDER = [1, 8, 5, 4, 6, 3, 7, 2];

  const sortGames = (games: Matchup[], round: Round): Matchup[] => {
    if (round === "Round of 64") {
      return [...games].sort((a, b) => {
        const seedA = parseInt(a.id.match(/-R64-(\d+)v/)?.[1] ?? "99");
        const seedB = parseInt(b.id.match(/-R64-(\d+)v/)?.[1] ?? "99");
        return R64_SEED_ORDER.indexOf(seedA) - R64_SEED_ORDER.indexOf(seedB);
      });
    }
    // R32/S16/E8: sort by trailing slot number so position is always 1-based sequential
    return [...games].sort((a, b) => {
      const numA = parseInt(a.id.match(/-(\d+)$/)?.[1] ?? "99");
      const numB = parseInt(b.id.match(/-(\d+)$/)?.[1] ?? "99");
      return numA - numB;
    });
  };

  // Regional rounds — fill any missing slots with empty matchups using semantic IDs
  for (const round of ["Round of 64", "Round of 32", "Sweet 16", "Elite 8"] as Round[]) {
    for (const region of regions) {
      const key = `${round}::${region}`;
      const games = sortGames(gamesBySlot.get(key) ?? [], round);
      const expected = REGIONAL_COUNTS[round] ?? 0;
      allMatchups.push(...games);
      for (let i = games.length; i < expected; i++) {
        const slug = ROUND_SLUG[round]!;
        // R64 placeholders use seed slots; later rounds use sequential slot numbers
        const slotId = round === "Round of 64" ? `${R64_SEED_ORDER[i]}v${16 - R64_SEED_ORDER[i]!}` : `${i + 1}`;
        allMatchups.push({
          id: `${region}-${slug}-${slotId}`,
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
    const res = await fetch(`${ESPN_BASE}/scoreboard?calendar=blacklist&groups=100&dates=${date}&limit=100`);
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
  const cached = getCached<Bracket>("bracket");
  if (cached) {
    logger.debug("espnService.ts", "Returning cached bracket");
    return cached;
  }

  const year = new Date().getFullYear();
  logger.info("espnService.ts", `Fetching live bracket for ${year} tournament`);

  const dates = getTournamentDates(year);

  // Fetch all tournament dates in parallel; ignore individual failures
  const results = await Promise.allSettled(dates.map(fetchScoreboardForDate));
  const allEvents = results
    .filter((r): r is PromiseFulfilledResult<ESPNEvent[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Deduplicate events by id (same game can appear across adjacent date queries)
  const uniqueEvents = Array.from(new Map(allEvents.map((e) => [e.id, e])).values());

  // Count all Round of 64 games (including TBD slots) to confirm the bracket has been published.
  // TBD slots appear when a team's spot is still determined by a First Four game — they are valid
  // proof the bracket is set, even though the opponent isn't known yet. buildBracketFromESPNGames
  // already skips TBD games, leaving those as empty placeholder slots in the UI.
  const r64Count = uniqueEvents.filter((e) => {
    const comp = e.competitions[0];
    const headline = comp?.notes?.[0]?.headline ?? "";
    const isTournament =
      comp?.type?.abbreviation === TOURNAMENT_TYPE_ABBREVIATION ||
      headline.includes("Men's Basketball Championship") ||
      comp?.tournamentId === 22;
    // ESPN uses "First Round" (pre-2026) and "1st Round" (2026+)
    const isR64 = headline.includes("First Round") || headline.includes("1st Round");
    return isTournament && isR64;
  }).length;

  if (r64Count >= 32) {
    logger.info("espnService.ts", `Found ${r64Count} R64 games, building live bracket`);
    const bracket = buildBracketFromESPNGames(uniqueEvents);
    setCached("bracket", bracket, BRACKET_CACHE_TTL);
    return bracket;
  }

  logger.warn(
    "espnService.ts",
    `Only ${r64Count} R64 games found (tournament not yet announced). Using 2025 static bracket as fallback.`,
  );
  const staticBracket = buildStaticBracket();
  setCached("bracket", staticBracket, BRACKET_CACHE_TTL);
  return staticBracket;
};

export const fetchLiveScores = async (): Promise<ESPNEvent[]> => {
  const cached = getCached<ESPNEvent[]>("liveScores");
  if (cached) {
    logger.debug("espnService.ts", "Returning cached live scores");
    return cached;
  }

  logger.info("espnService.ts", "Fetching live scores");

  try {
    const response = await fetch(`${ESPN_BASE}/scoreboard?calendar=blacklist&groups=100&limit=100`);

    if (!response.ok) {
      throw new Error(`ESPN API returned ${response.status}`);
    }

    const data = (await response.json()) as ESPNScoreboard;
    const events = data.events ?? [];
    setCached("liveScores", events, LIVE_SCORES_CACHE_TTL);
    return events;
  } catch (err) {
    logger.error("espnService.ts", "Failed to fetch live scores", err);
    throw new Error("Failed to fetch live scores from ESPN");
  }
};

/**
 * Returns all 64 tournament teams. Derives them from the active bracket so the
 * team list always matches whatever source (live or static) is in use.
 */
export const fetchTeams = async (): Promise<Team[]> => {
  logger.info("espnService.ts", "Fetching teams");
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

// ── Live-scores matchup mapper ────────────────────────────────────────────────

const mapESPNEventToMatchup = (event: ESPNEvent): Matchup => {
  const competition = event.competitions[0];
  const homeTeam = competition?.competitors.find((c) => c.homeAway === "home");
  const awayTeam = competition?.competitors.find((c) => c.homeAway === "away");
  const isComplete = competition?.status.type.completed ?? false;
  const isLive = competition?.status.type.state === "in";

  const buildTeam = (competitor: ESPNCompetitor | undefined) => {
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

// Minimum number of concurrent tournament games to trust the live feed as an active tournament day.
// A single stale archived game from a prior year should not prevent the static fallback from firing.
const ACTIVE_TOURNAMENT_THRESHOLD = 8;

/**
 * Fetches live scores, filters for NCAA Tournament games, and maps them to Matchup objects.
 * Falls back to the best available bracket (current-year ESPN data if announced, otherwise
 * the hardcoded 2025 static bracket) when fewer than ACTIVE_TOURNAMENT_THRESHOLD tournament
 * games are found on the current scoreboard (e.g. between rounds, pre-tipoff, off-season).
 */
export const fetchTournamentMatchups = async (): Promise<{ matchups: Matchup[]; isFallback: boolean }> => {
  const events = await fetchLiveScores();

  const tournamentEvents = events.filter((e) => {
    const comp = e.competitions[0];
    const headline = comp?.notes?.[0]?.headline ?? "";
    return (
      comp?.type?.abbreviation === TOURNAMENT_TYPE_ABBREVIATION ||
      headline.includes("Men's Basketball Championship") ||
      comp?.tournamentId === 22
    );
  });

  if (tournamentEvents.length >= ACTIVE_TOURNAMENT_THRESHOLD) {
    logger.info("espnService.ts", `Found ${tournamentEvents.length} live tournament games`);
    return { matchups: tournamentEvents.map(mapESPNEventToMatchup), isFallback: false };
  }

  if (tournamentEvents.length > 0) {
    logger.warn(
      "espnService.ts",
      `Found only ${tournamentEvents.length} tournament game(s) — likely stale archived data, falling back to bracket source`,
    );
  } else {
    logger.warn("espnService.ts", "No live tournament games found, falling back to bracket source");
  }

  // Reuse fetchBracketStructure so we get the current-year ESPN bracket when it has already
  // been announced (e.g. between rounds or before tip-off), rather than always serving 2025 data.
  const bracket = await fetchBracketStructure();
  const matchups = bracket.rounds.flatMap((r) => r.matchups).filter((m) => m.topTeam && m.bottomTeam);
  return { matchups, isFallback: true };
};
