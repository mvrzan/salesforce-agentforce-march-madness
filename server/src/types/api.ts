export interface ESPNTeamRecord {
  summary: string;
  stats: { name: string; value: number }[];
}

export interface ESPNTeamLogo {
  href: string;
  width: number;
  height: number;
}

export interface ESPNTeam {
  id: string;
  uid: string;
  slug?: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name: string;
  location: string;
  color?: string;
  alternateColor?: string;
  /** Direct logo URL present on competitor-level team objects */
  logo?: string;
  /** Logo array present on top-level team endpoints */
  logos?: ESPNTeamLogo[];
  record?: { items: ESPNTeamRecord[] };
}

export interface ESPNCompetitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: "home" | "away";
  team: ESPNTeam;
  score: string;
  winner?: boolean;
  curatedRank?: { current: number };
  records?: { name: string; summary: string }[];
}

export interface ESPNStatusType {
  id: string;
  name: string;
  state: "pre" | "in" | "post";
  completed: boolean;
  description: string;
  detail: string;
  shortDetail: string;
}

export interface ESPNStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: ESPNStatusType;
}

export interface ESPNCompetition {
  id: string;
  uid: string;
  date: string;
  startDate: string;
  attendance: number;
  type: { id: string; abbreviation: string };
  status: ESPNStatus;
  competitors: ESPNCompetitor[];
  notes: { type: string; headline: string }[];
  broadcasts: { market: string; names: string[] }[];
  /** Present on NCAA Tournament games — 22 = NCAA Men's Basketball Championship */
  tournamentId?: number;
  leaders?: unknown[];
}

export interface ESPNEvent {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  season: { year: number; type: number; slug: string };
  competitions: ESPNCompetition[];
  status: ESPNStatus;
}

export interface ESPNScoreboard {
  leagues: unknown[];
  season: { type: number; year: number };
  day: { date: string };
  events: ESPNEvent[];
}

export interface ESPNTournamentEntry {
  seed: number;
  region: string;
  team: ESPNTeam;
}
