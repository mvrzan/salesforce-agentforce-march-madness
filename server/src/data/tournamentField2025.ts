/**
 * 2025 NCAA Tournament field - 64 teams by seed/region.
 * Used as a static fallback when ESPN has not yet published real bracket data
 * (i.e. before Selection Sunday of the current year's tournament).
 */
import {
  type Region,
  type Team,
  type Matchup,
  type Bracket,
  type BracketRound,
  ROUND_ORDER,
} from "../types/tournament.ts";

export const TOURNAMENT_FIELD_2025: { seed: number; region: Region; name: string; abbreviation: string; id: string }[] =
  [
    // East
    { seed: 1, region: "East", name: "Duke Blue Devils", abbreviation: "DUKE", id: "150" },
    { seed: 2, region: "East", name: "Alabama Crimson Tide", abbreviation: "ALA", id: "333" },
    { seed: 3, region: "East", name: "Wisconsin Badgers", abbreviation: "WIS", id: "275" },
    { seed: 4, region: "East", name: "Arizona Wildcats", abbreviation: "ARIZ", id: "12" },
    { seed: 5, region: "East", name: "Oregon Ducks", abbreviation: "ORE", id: "2483" },
    { seed: 6, region: "East", name: "BYU Cougars", abbreviation: "BYU", id: "252" },
    { seed: 7, region: "East", name: "Saint Mary's Gaels", abbreviation: "SMC", id: "2608" },
    { seed: 8, region: "East", name: "Mississippi State Bulldogs", abbreviation: "MSST", id: "344" },
    { seed: 9, region: "East", name: "Baylor Bears", abbreviation: "BAY", id: "239" },
    { seed: 10, region: "East", name: "Vanderbilt Commodores", abbreviation: "VAN", id: "238" },
    { seed: 11, region: "East", name: "VCU Rams", abbreviation: "VCU", id: "2670" },
    { seed: 12, region: "East", name: "Liberty Flames", abbreviation: "LIB", id: "2335" },
    { seed: 13, region: "East", name: "Akron Zips", abbreviation: "AKR", id: "2006" },
    { seed: 14, region: "East", name: "Montana Grizzlies", abbreviation: "MONT", id: "149" },
    { seed: 15, region: "East", name: "Robert Morris Colonials", abbreviation: "RMU", id: "2523" },
    { seed: 16, region: "East", name: "Mount St. Mary's Mountaineers", abbreviation: "MSM", id: "116" },
    // West
    { seed: 1, region: "West", name: "Florida Gators", abbreviation: "FLA", id: "57" },
    { seed: 2, region: "West", name: "St. John's Red Storm", abbreviation: "SJU", id: "2599" },
    { seed: 3, region: "West", name: "Texas Tech Red Raiders", abbreviation: "TTU", id: "2641" },
    { seed: 4, region: "West", name: "Maryland Terrapins", abbreviation: "MD", id: "120" },
    { seed: 5, region: "West", name: "Memphis Tigers", abbreviation: "MEM", id: "235" },
    { seed: 6, region: "West", name: "Missouri Tigers", abbreviation: "MIZ", id: "142" },
    { seed: 7, region: "West", name: "Kansas Jayhawks", abbreviation: "KU", id: "2305" },
    { seed: 8, region: "West", name: "UConn Huskies", abbreviation: "CONN", id: "41" },
    { seed: 9, region: "West", name: "Oklahoma Sooners", abbreviation: "OU", id: "201" },
    { seed: 10, region: "West", name: "Arkansas Razorbacks", abbreviation: "ARK", id: "8" },
    { seed: 11, region: "West", name: "Drake Bulldogs", abbreviation: "DRKE", id: "2181" },
    { seed: 12, region: "West", name: "Colorado State Rams", abbreviation: "CSU", id: "36" },
    { seed: 13, region: "West", name: "Grand Canyon Lopes", abbreviation: "GCU", id: "2253" },
    { seed: 14, region: "West", name: "UNC Wilmington Seahawks", abbreviation: "UNCW", id: "350" },
    { seed: 15, region: "West", name: "Omaha Mavericks", abbreviation: "OMA", id: "2437" },
    { seed: 16, region: "West", name: "Norfolk State Spartans", abbreviation: "NORF", id: "2450" },
    // South
    { seed: 1, region: "South", name: "Auburn Tigers", abbreviation: "AUB", id: "2" },
    { seed: 2, region: "South", name: "Michigan State Spartans", abbreviation: "MSU", id: "127" },
    { seed: 3, region: "South", name: "Iowa State Cyclones", abbreviation: "ISU", id: "66" },
    { seed: 4, region: "South", name: "Texas A&M Aggies", abbreviation: "TA&M", id: "245" },
    { seed: 5, region: "South", name: "Michigan Wolverines", abbreviation: "MICH", id: "130" },
    { seed: 6, region: "South", name: "Ole Miss Rebels", abbreviation: "MISS", id: "145" },
    { seed: 7, region: "South", name: "Marquette Golden Eagles", abbreviation: "MARQ", id: "269" },
    { seed: 8, region: "South", name: "Louisville Cardinals", abbreviation: "LOU", id: "97" },
    { seed: 9, region: "South", name: "Creighton Bluejays", abbreviation: "CREI", id: "156" },
    { seed: 10, region: "South", name: "New Mexico Lobos", abbreviation: "UNM", id: "167" },
    { seed: 11, region: "South", name: "North Carolina Tar Heels", abbreviation: "UNC", id: "153" },
    { seed: 12, region: "South", name: "UC San Diego Tritons", abbreviation: "UCSD", id: "28" },
    { seed: 13, region: "South", name: "Yale Bulldogs", abbreviation: "YALE", id: "43" },
    { seed: 14, region: "South", name: "Lipscomb Bisons", abbreviation: "LIP", id: "288" },
    { seed: 15, region: "South", name: "Bryant Bulldogs", abbreviation: "BRY", id: "2803" },
    { seed: 16, region: "South", name: "Alabama State Hornets", abbreviation: "ALST", id: "2011" },
    // Midwest
    { seed: 1, region: "Midwest", name: "Houston Cougars", abbreviation: "HOU", id: "248" },
    { seed: 2, region: "Midwest", name: "Tennessee Volunteers", abbreviation: "TENN", id: "2633" },
    { seed: 3, region: "Midwest", name: "Kentucky Wildcats", abbreviation: "UK", id: "96" },
    { seed: 4, region: "Midwest", name: "Purdue Boilermakers", abbreviation: "PUR", id: "2509" },
    { seed: 5, region: "Midwest", name: "Clemson Tigers", abbreviation: "CLEM", id: "228" },
    { seed: 6, region: "Midwest", name: "Illinois Fighting Illini", abbreviation: "ILL", id: "356" },
    { seed: 7, region: "Midwest", name: "UCLA Bruins", abbreviation: "UCLA", id: "26" },
    { seed: 8, region: "Midwest", name: "Gonzaga Bulldogs", abbreviation: "GONZ", id: "2250" },
    { seed: 9, region: "Midwest", name: "Georgia Bulldogs", abbreviation: "UGA", id: "61" },
    { seed: 10, region: "Midwest", name: "Utah State Aggies", abbreviation: "USU", id: "328" },
    { seed: 11, region: "Midwest", name: "Xavier Musketeers", abbreviation: "XAV", id: "2752" },
    { seed: 12, region: "Midwest", name: "McNeese Cowboys", abbreviation: "MCN", id: "2377" },
    { seed: 13, region: "Midwest", name: "High Point Panthers", abbreviation: "HPU", id: "2272" },
    { seed: 14, region: "Midwest", name: "Troy Trojans", abbreviation: "TROY", id: "2653" },
    { seed: 15, region: "Midwest", name: "Wofford Terriers", abbreviation: "WOF", id: "2747" },
    { seed: 16, region: "Midwest", name: "SIU Edwardsville Cougars", abbreviation: "SIUE", id: "2565" },
  ];

/**
 * Actual 2025 NCAA tournament results — maps matchupId → winning team ESPN ID.
 * Used to populate the static bracket with real winner data for scoring.
 */
export const RESULTS_2025: Record<string, string> = {
  // === EAST REGION ===
  // First Round
  "East-R64-1v16": "150", // Duke 93, Mount St. Mary's 49
  "East-R64-8v9": "239", // Baylor 75, Mississippi State 72
  "East-R64-5v12": "2483", // Oregon 81, Liberty 52
  "East-R64-4v13": "12", // Arizona 93, Akron 65
  "East-R64-6v11": "252", // BYU 80, VCU 71
  "East-R64-3v14": "275", // Wisconsin 85, Montana 66
  "East-R64-7v10": "2608", // Saint Mary's 59, Vanderbilt 56
  "East-R64-2v15": "333", // Alabama 90, Robert Morris 81
  // Round of 32
  "East-Roundof32-1": "150", // Duke 89, Baylor 66
  "East-Roundof32-2": "12", // Arizona 87, Oregon 83
  "East-Roundof32-3": "252", // BYU 91, Wisconsin 89
  "East-Roundof32-4": "333", // Alabama 80, Saint Mary's 66
  // Sweet 16
  "East-Sweet16-1": "150", // Duke 100, Arizona 93
  "East-Sweet16-2": "333", // Alabama 113, BYU 88
  // Elite 8
  "East-Elite8-1": "150", // Duke 85, Alabama 65

  // === WEST REGION ===
  // First Round
  "West-R64-1v16": "57", // Florida 95, Norfolk State 69
  "West-R64-8v9": "41", // UConn 67, Oklahoma 59
  "West-R64-5v12": "36", // Colorado State 78, Memphis 70 (upset)
  "West-R64-4v13": "120", // Maryland 81, Grand Canyon 49
  "West-R64-6v11": "2181", // Drake 67, Missouri 57 (upset)
  "West-R64-3v14": "2641", // Texas Tech 82, UNC Wilmington 72
  "West-R64-7v10": "8", // Arkansas 79, Kansas 72 (upset)
  "West-R64-2v15": "2599", // St. John's 83, Omaha 53
  // Round of 32
  "West-Roundof32-1": "57", // Florida 77, UConn 75
  "West-Roundof32-2": "120", // Maryland 72, Colorado State 71
  "West-Roundof32-3": "2641", // Texas Tech 77, Drake 64
  "West-Roundof32-4": "8", // Arkansas 75, St. John's 66 (upset)
  // Sweet 16
  "West-Sweet16-1": "57", // Florida 87, Maryland 71
  "West-Sweet16-2": "2641", // Texas Tech 85, Arkansas 83 (OT)
  // Elite 8
  "West-Elite8-1": "57", // Florida 84, Texas Tech 79

  // === SOUTH REGION ===
  // First Round
  "South-R64-1v16": "2", // Auburn 83, Alabama State 63
  "South-R64-8v9": "156", // Creighton 89, Louisville 75
  "South-R64-5v12": "130", // Michigan 68, UC San Diego 65
  "South-R64-4v13": "245", // Texas A&M 80, Yale 71
  "South-R64-6v11": "145", // Ole Miss 71, North Carolina 64
  "South-R64-3v14": "66", // Iowa State 82, Lipscomb 55
  "South-R64-7v10": "167", // New Mexico 75, Marquette 66 (upset)
  "South-R64-2v15": "127", // Michigan State 87, Bryant 62
  // Round of 32
  "South-Roundof32-1": "2", // Auburn 82, Creighton 70
  "South-Roundof32-2": "130", // Michigan 91, Texas A&M 79
  "South-Roundof32-3": "145", // Ole Miss 91, Iowa State 78
  "South-Roundof32-4": "127", // Michigan State 71, New Mexico 63
  // Sweet 16
  "South-Sweet16-1": "2", // Auburn 78, Michigan 65
  "South-Sweet16-2": "127", // Michigan State 73, Ole Miss 70
  // Elite 8
  "South-Elite8-1": "2", // Auburn 70, Michigan State 64

  // === MIDWEST REGION ===
  // First Round
  "Midwest-R64-1v16": "248", // Houston 78, SIU Edwardsville 40
  "Midwest-R64-8v9": "2250", // Gonzaga 89, Georgia 68
  "Midwest-R64-5v12": "2377", // McNeese 69, Clemson 67 (upset)
  "Midwest-R64-4v13": "2509", // Purdue 75, High Point 63
  "Midwest-R64-6v11": "356", // Illinois 86, Xavier 73
  "Midwest-R64-3v14": "96", // Kentucky 76, Troy 57
  "Midwest-R64-7v10": "26", // UCLA 72, Utah State 47
  "Midwest-R64-2v15": "2633", // Tennessee 77, Wofford 62
  // Round of 32
  "Midwest-Roundof32-1": "248", // Houston 81, Gonzaga 76
  "Midwest-Roundof32-2": "2509", // Purdue 76, McNeese 62
  "Midwest-Roundof32-3": "96", // Kentucky 84, Illinois 75
  "Midwest-Roundof32-4": "2633", // Tennessee 67, UCLA 58
  // Sweet 16
  "Midwest-Sweet16-1": "248", // Houston 62, Purdue 60
  "Midwest-Sweet16-2": "2633", // Tennessee 78, Kentucky 65
  // Elite 8
  "Midwest-Elite8-1": "248", // Houston 69, Tennessee 50

  // === FINAL FOUR ===
  "FF-1": "57", // Florida 79, Auburn 73  (West 1 vs South 1)
  "FF-2": "248", // Houston 70, Duke 67    (Midwest 1 vs East 1)

  // === CHAMPIONSHIP ===
  "CHAMP-1": "57", // Florida 65, Houston 63
};

export const buildTeamFromStaticEntry = (entry: (typeof TOURNAMENT_FIELD_2025)[number]): Team => ({
  id: entry.id,
  name: entry.name,
  shortName: entry.abbreviation,
  abbreviation: entry.abbreviation,
  seed: entry.seed,
  region: entry.region,
  espnId: entry.id,
  logo: `https://a.espncdn.com/i/teamlogos/ncaa/500/${entry.id}.png`,
});

export const buildStaticBracket = (): Bracket => {
  const regions: Region[] = ["East", "West", "South", "Midwest"];
  // Standard NCAA bracket pairings: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
  const SEED_PAIRS = [
    [1, 16],
    [8, 9],
    [5, 12],
    [4, 13],
    [6, 11],
    [3, 14],
    [7, 10],
    [2, 15],
  ];

  const firstRoundMatchups: Matchup[] = [];
  regions.forEach((region) => {
    const regionTeams = TOURNAMENT_FIELD_2025.filter((t) => t.region === region).sort((a, b) => a.seed - b.seed);
    SEED_PAIRS.forEach(([top, bottom]) => {
      const topEntry = regionTeams.find((t) => t.seed === top);
      const bottomEntry = regionTeams.find((t) => t.seed === bottom);
      if (!topEntry || !bottomEntry) return;
      firstRoundMatchups.push({
        id: `${region}-R64-${top}v${bottom}`,
        round: "Round of 64",
        region,
        topTeam: buildTeamFromStaticEntry(topEntry),
        bottomTeam: buildTeamFromStaticEntry(bottomEntry),
        winner: null,
        isComplete: false,
        isLive: false,
      });
    });
  });

  const laterRoundMatchups: Matchup[] = [];
  const laterRounds: { round: "Round of 32" | "Sweet 16" | "Elite 8"; count: number }[] = [
    { round: "Round of 32", count: 4 },
    { round: "Sweet 16", count: 2 },
    { round: "Elite 8", count: 1 },
  ];
  laterRounds.forEach(({ round, count }) => {
    regions.forEach((region) => {
      for (let i = 0; i < count; i++) {
        laterRoundMatchups.push({
          id: `${region}-${round.replace(/ /g, "")}-${i + 1}`,
          round,
          region,
          topTeam: null,
          bottomTeam: null,
          winner: null,
          isComplete: false,
          isLive: false,
        });
      }
    });
  });

  const ffAndChamp: Matchup[] = [
    {
      id: "FF-1",
      round: "Final Four",
      region: "Final Four",
      topTeam: null,
      bottomTeam: null,
      winner: null,
      isComplete: false,
      isLive: false,
    },
    {
      id: "FF-2",
      round: "Final Four",
      region: "Final Four",
      topTeam: null,
      bottomTeam: null,
      winner: null,
      isComplete: false,
      isLive: false,
    },
    {
      id: "CHAMP-1",
      round: "Championship",
      region: "Championship",
      topTeam: null,
      bottomTeam: null,
      winner: null,
      isComplete: false,
      isLive: false,
    },
  ];

  const allMatchups = [...firstRoundMatchups, ...laterRoundMatchups, ...ffAndChamp];

  // Apply actual 2025 tournament results to every matchup that has a known winner
  for (const matchup of allMatchups) {
    const winnerId = RESULTS_2025[matchup.id];
    if (winnerId) {
      const winnerEntry = TOURNAMENT_FIELD_2025.find((t) => t.id === winnerId);
      if (winnerEntry) {
        matchup.winner = buildTeamFromStaticEntry(winnerEntry);
        matchup.isComplete = true;
      }
    }
  }

  // Propagate winners into topTeam/bottomTeam of subsequent round matchups so
  // every matchup beyond R64 shows actual participating teams (not null).
  const byId = new Map(allMatchups.map((m) => [m.id, m]));

  const setSlot = (matchupId: string, slot: "topTeam" | "bottomTeam", team: Team) => {
    const m = byId.get(matchupId);
    if (m) m[slot] = team;
  };

  // Regional rounds: R64 → R32 → S16 → E8
  for (const region of regions) {
    const r64Ids = SEED_PAIRS.map(([top, bottom]) => `${region}-R64-${top}v${bottom}`);
    const r32Base = `${region}-Roundof32-`;
    const s16Base = `${region}-Sweet16-`;
    const e8Id = `${region}-Elite8-1`;

    // R64 winners → R32 teams (pairs 0,1 → R32-1; 2,3 → R32-2; 4,5 → R32-3; 6,7 → R32-4)
    for (let i = 0; i < r64Ids.length; i++) {
      const winner = byId.get(r64Ids[i])?.winner;
      if (!winner) continue;
      const r32Id = `${r32Base}${Math.floor(i / 2) + 1}`;
      setSlot(r32Id, i % 2 === 0 ? "topTeam" : "bottomTeam", winner);
    }

    // R32 winners → S16 teams (R32-1,2 → S16-1; R32-3,4 → S16-2)
    for (let i = 1; i <= 4; i++) {
      const winner = byId.get(`${r32Base}${i}`)?.winner;
      if (!winner) continue;
      const s16Id = `${s16Base}${Math.ceil(i / 2)}`;
      setSlot(s16Id, i % 2 === 1 ? "topTeam" : "bottomTeam", winner);
    }

    // S16 winners → E8 teams
    const s16_1Winner = byId.get(`${s16Base}1`)?.winner;
    const s16_2Winner = byId.get(`${s16Base}2`)?.winner;
    if (s16_1Winner) setSlot(e8Id, "topTeam", s16_1Winner);
    if (s16_2Winner) setSlot(e8Id, "bottomTeam", s16_2Winner);
  }

  // E8 winners → Final Four
  // NCAA bracket pairing: South vs West → FF-1, East vs Midwest → FF-2
  const southE8 = byId.get("South-Elite8-1")?.winner;
  const westE8 = byId.get("West-Elite8-1")?.winner;
  const eastE8 = byId.get("East-Elite8-1")?.winner;
  const midwestE8 = byId.get("Midwest-Elite8-1")?.winner;
  if (southE8) setSlot("FF-1", "topTeam", southE8);
  if (westE8) setSlot("FF-1", "bottomTeam", westE8);
  if (eastE8) setSlot("FF-2", "topTeam", eastE8);
  if (midwestE8) setSlot("FF-2", "bottomTeam", midwestE8);

  // FF winners → Championship
  const ff1Winner = byId.get("FF-1")?.winner;
  const ff2Winner = byId.get("FF-2")?.winner;
  if (ff1Winner) setSlot("CHAMP-1", "topTeam", ff1Winner);
  if (ff2Winner) setSlot("CHAMP-1", "bottomTeam", ff2Winner);

  const rounds: BracketRound[] = ROUND_ORDER.map((round) => ({
    round,
    matchups: allMatchups.filter((m) => m.round === round),
  }));

  return {
    id: "bracket-2025-static",
    rounds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: "real",
  };
};
