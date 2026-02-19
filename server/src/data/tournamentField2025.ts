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
