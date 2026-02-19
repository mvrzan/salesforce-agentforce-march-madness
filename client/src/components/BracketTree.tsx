import { type Bracket, type Round, type Region, type Team, type Matchup } from "../types/tournament";
import MatchupCard from "./MatchupCard";

interface BracketTreeProps {
  bracket: Bracket | null;
  realBracket?: Bracket | null;
  onPick?: (matchupId: string, winner: Team) => void;
  isReadOnly?: boolean;
  label?: string;
}

// const REGION_ORDER: Region[] = ["East", "West", "South", "Midwest"];
const ROUNDS_LEFT: Round[] = ["Round of 64", "Round of 32", "Sweet 16", "Elite 8"];
const ROUNDS_RIGHT: Round[] = ["Elite 8", "Sweet 16", "Round of 32", "Round of 64"];

const getRealWinner = (realBracket: Bracket | null | undefined, matchupId: string): string | undefined => {
  if (!realBracket) return undefined;
  for (const round of realBracket.rounds) {
    const matchup = round.matchups.find((m) => m.id === matchupId);
    if (matchup) return matchup.winner?.id;
  }
  return undefined;
};

const getMatchups = (bracket: Bracket, round: Round, region: Region | "Final Four" | "Championship"): Matchup[] =>
  bracket.rounds.find((r) => r.round === round)?.matchups.filter((m) => m.region === region) ?? [];

interface RegionColumnProps {
  bracket: Bracket;
  region: Region;
  realBracket?: Bracket | null;
  onPick?: (matchupId: string, winner: Team) => void;
  isReadOnly: boolean;
  side: "left" | "right";
}

const RegionColumn = ({ bracket, region, realBracket, onPick, isReadOnly, side }: RegionColumnProps) => {
  const rounds = side === "left" ? ROUNDS_LEFT : ROUNDS_RIGHT;

  return (
    <div className="flex gap-1">
      {rounds.map((round) => {
        const matchups = getMatchups(bracket, round, region);
        return (
          <div key={round} className="flex flex-col gap-2 justify-around" style={{ minHeight: "100%" }}>
            <div className="text-[10px] text-gray-500 text-center mb-1 truncate px-1">{round}</div>
            {matchups.map((matchup) => (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                realWinnerId={getRealWinner(realBracket, matchup.id)}
                onPick={(winner) => onPick?.(matchup.id, winner)}
                isReadOnly={isReadOnly}
                compact
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

const BracketTree = ({ bracket, realBracket, onPick, isReadOnly = false, label }: BracketTreeProps) => {
  if (!bracket) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        {label ? `Loading ${label}...` : "No bracket data"}
      </div>
    );
  }

  const ffMatchups = bracket.rounds.find((r) => r.round === "Final Four")?.matchups ?? [];
  const champMatchups = bracket.rounds.find((r) => r.round === "Championship")?.matchups ?? [];

  return (
    <div className="overflow-x-auto">
      {label && (
        <div className="text-center text-sm font-semibold text-gray-400 mb-3 uppercase tracking-widest">{label}</div>
      )}
      <div className="flex gap-2 items-start min-w-max">
        {/* Left side: East + South */}
        <div className="flex flex-col gap-6">
          {(["East", "South"] as Region[]).map((region) => (
            <div key={region}>
              <div className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-2 pl-2">{region}</div>
              <RegionColumn
                bracket={bracket}
                region={region}
                realBracket={realBracket}
                onPick={onPick}
                isReadOnly={isReadOnly}
                side="left"
              />
            </div>
          ))}
        </div>

        {/* Center: Final Four + Championship */}
        <div className="flex flex-col items-center justify-center gap-4 px-2 self-center">
          <div className="text-[10px] text-gray-500 text-center uppercase tracking-widest mb-1">Final Four</div>
          {ffMatchups.map((matchup) => (
            <MatchupCard
              key={matchup.id}
              matchup={matchup}
              realWinnerId={getRealWinner(realBracket, matchup.id)}
              onPick={(winner) => onPick?.(matchup.id, winner)}
              isReadOnly={isReadOnly}
            />
          ))}
          <div className="text-[10px] text-gray-500 text-center uppercase tracking-widest mt-2 mb-1">Championship</div>
          {champMatchups.map((matchup) => (
            <MatchupCard
              key={matchup.id}
              matchup={matchup}
              realWinnerId={getRealWinner(realBracket, matchup.id)}
              onPick={(winner) => onPick?.(matchup.id, winner)}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>

        {/* Right side: Midwest + West */}
        <div className="flex flex-col gap-6">
          {(["Midwest", "West"] as Region[]).map((region) => (
            <div key={region}>
              <div className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-2 pl-2">{region}</div>
              <RegionColumn
                bracket={bracket}
                region={region}
                realBracket={realBracket}
                onPick={onPick}
                isReadOnly={isReadOnly}
                side="right"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketTree;
