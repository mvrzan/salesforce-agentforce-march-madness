import { type BracketScore, type Round, ROUND_ORDER } from "../types/tournament";

interface ScoreSummaryBarProps {
  userScore?: BracketScore | null;
  aiScore?: BracketScore | null;
}

const RoundPill = ({ round, userPts, aiPts }: { round: Round; userPts: number; aiPts: number }) => {
  const userWins = userPts > aiPts;
  const aiWins = aiPts > userPts;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate max-w-16 text-center">
        {round.replace("Round of ", "R")}
      </div>
      <div className="flex gap-1">
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${userWins ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
        >
          {userPts}
        </span>
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${aiWins ? "bg-orange-600 text-white" : "bg-gray-700 text-gray-300"}`}
        >
          {aiPts}
        </span>
      </div>
    </div>
  );
};

const ScoreSummaryBar = ({ userScore, aiScore }: ScoreSummaryBarProps) => {
  const userTotal = userScore?.total ?? 0;
  const aiTotal = aiScore?.total ?? 0;
  const maxPossible = userScore?.maxPossible ?? aiScore?.maxPossible ?? 192;

  const userPct = maxPossible > 0 ? Math.round((userTotal / maxPossible) * 100) : 0;
  const aiPct = maxPossible > 0 ? Math.round((aiTotal / maxPossible) * 100) : 0;

  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-xl px-6 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* User score */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-blue-400">{userTotal}</span>
          <div>
            <div className="text-xs text-gray-400">Your Score</div>
            <div className="text-xs text-gray-500">{userPct}% correct</div>
          </div>
        </div>

        {/* Round breakdown */}
        <div className="flex gap-3 flex-wrap justify-center">
          {ROUND_ORDER.map((round) => (
            <RoundPill
              key={round}
              round={round}
              userPts={userScore?.byRound?.[round] ?? 0}
              aiPts={aiScore?.byRound?.[round] ?? 0}
            />
          ))}
        </div>

        {/* AI score */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-400">AI Score</div>
            <div className="text-xs text-gray-500">{aiPct}% correct</div>
          </div>
          <span className="text-2xl font-black text-orange-400">{aiTotal}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex gap-1 rounded-full overflow-hidden h-2">
        <div className="bg-blue-500 transition-all duration-500" style={{ width: `${userPct}%` }} />
        <div className="flex-1 bg-gray-700" />
        <div className="bg-orange-500 transition-all duration-500" style={{ width: `${aiPct}%` }} />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-600">
        <span>You</span>
        <span>out of {maxPossible} pts</span>
        <span>AI</span>
      </div>
    </div>
  );
};

export default ScoreSummaryBar;
