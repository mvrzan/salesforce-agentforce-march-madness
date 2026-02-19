import { type Team, type Matchup } from "../types/tournament";

interface MatchupCardProps {
  matchup: Matchup;
  onPick?: (winner: Team) => void;
  realWinnerId?: string;
  isReadOnly?: boolean;
  compact?: boolean;
}

const SeedBadge = ({ seed }: { seed: number }) => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-gray-300 text-[10px] font-bold shrink-0">
    {seed}
  </span>
);

const TeamRow = ({
  team,
  isWinner,
  isCorrect,
  isWrong,
  score,
  onClick,
  isReadOnly,
}: {
  team: Team | null;
  isWinner: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  score?: number;
  onClick?: () => void;
  isReadOnly: boolean;
}) => {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 opacity-40">
        <div className="w-5 h-5 rounded-full bg-gray-700" />
        <span className="text-gray-500 text-sm italic">TBD</span>
      </div>
    );
  }

  const base = "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 cursor-default select-none";
  const interactive = !isReadOnly && onClick ? "hover:bg-blue-800/40 cursor-pointer active:scale-[0.98]" : "";
  const winnerStyle = isWinner
    ? "bg-blue-700/30 border border-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
    : "bg-gray-800/50";
  const correctStyle = isCorrect ? "!bg-green-700/30 !border !border-green-500/60" : "";
  const wrongStyle = isWrong ? "!bg-red-700/20 !border !border-red-500/30 opacity-60" : "";

  return (
    <div
      className={`${base} ${interactive} ${winnerStyle} ${correctStyle} ${wrongStyle}`}
      onClick={!isReadOnly ? onClick : undefined}
      role={!isReadOnly && onClick ? "button" : undefined}
      aria-pressed={isWinner}
    >
      {team.logo ? (
        <img src={team.logo} alt={team.abbreviation} className="w-5 h-5 object-contain shrink-0" />
      ) : (
        <SeedBadge seed={team.seed} />
      )}
      <SeedBadge seed={team.seed} />
      <span className={`text-sm font-medium truncate flex-1 ${isWinner ? "text-white" : "text-gray-300"}`}>
        {team.shortName}
      </span>
      {score !== undefined && <span className="text-xs text-gray-400 font-mono ml-1">{score}</span>}
      {isCorrect && <span className="text-green-400 text-xs shrink-0">✓</span>}
      {isWrong && <span className="text-red-400 text-xs shrink-0">✗</span>}
    </div>
  );
};

const MatchupCard = ({ matchup, onPick, realWinnerId, isReadOnly = false, compact = false }: MatchupCardProps) => {
  const { topTeam, bottomTeam, winner } = matchup;

  const isTopWinner = !!winner && winner.id === topTeam?.id;
  const isBottomWinner = !!winner && winner.id === bottomTeam?.id;

  const isTopCorrect = !!realWinnerId && isTopWinner && realWinnerId === topTeam?.id;
  const isBottomCorrect = !!realWinnerId && isBottomWinner && realWinnerId === bottomTeam?.id;
  const isTopWrong = !!realWinnerId && isTopWinner && realWinnerId !== topTeam?.id;
  const isBottomWrong = !!realWinnerId && isBottomWinner && realWinnerId !== bottomTeam?.id;

  return (
    <div className={`flex flex-col gap-0.5 ${compact ? "w-36" : "w-44"}`}>
      <TeamRow
        team={topTeam}
        isWinner={isTopWinner}
        isCorrect={isTopCorrect}
        isWrong={isTopWrong}
        score={matchup.topScore}
        onClick={() => topTeam && onPick?.(topTeam)}
        isReadOnly={isReadOnly || !topTeam}
      />
      <div className="h-px bg-gray-700 mx-3" />
      <TeamRow
        team={bottomTeam}
        isWinner={isBottomWinner}
        isCorrect={isBottomCorrect}
        isWrong={isBottomWrong}
        score={matchup.bottomScore}
        onClick={() => bottomTeam && onPick?.(bottomTeam)}
        isReadOnly={isReadOnly || !bottomTeam}
      />
    </div>
  );
};

export default MatchupCard;
