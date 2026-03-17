import { type Matchup } from "../types/tournament";

const LiveMatchupCard = ({ matchup }: { matchup: Matchup }) => {
  const { topTeam, bottomTeam, topScore, bottomScore, isLive, isComplete, gameTime } = matchup;

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 ${isLive ? "border-green-600 shadow-[0_0_12px_rgba(34,197,94,0.2)]" : "border-gray-700"}`}
    >
      {isLive && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-bold uppercase tracking-wider">Live</span>
          {gameTime && <span className="text-xs text-gray-500 ml-auto">{gameTime}</span>}
        </div>
      )}
      {isComplete && <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Final</div>}
      {!isLive && !isComplete && gameTime && <div className="text-xs text-gray-500 mb-2">{gameTime}</div>}

      <div className="flex flex-col gap-1">
        {[
          { team: topTeam, score: topScore },
          { team: bottomTeam, score: bottomScore },
        ].map(({ team, score }, i) => {
          const isWinner = isComplete && matchup.winner?.id === team?.id;
          const isLoser = isComplete && matchup.winner != null && !isWinner;
          return (
            <div key={i}>
              {i === 1 && <div className="h-px bg-gray-800 my-1" />}
              <div
                className={`flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${
                  isWinner ? "bg-green-950/50 text-white" : isLoser ? "text-gray-600" : "text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {team?.seed && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${isLoser ? "bg-gray-800 text-gray-600" : "bg-gray-700"}`}
                    >
                      {team.seed}
                    </span>
                  )}
                  <span
                    className={`text-sm truncate ${isLoser ? "line-through decoration-gray-600" : isWinner ? "font-bold" : ""}`}
                  >
                    {team?.shortName ?? "TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {score !== undefined && (
                    <span className={`text-sm font-mono ${isWinner ? "font-bold text-green-300" : ""}`}>{score}</span>
                  )}
                  {isWinner && <span className="text-green-400 text-xs">✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveMatchupCard;
