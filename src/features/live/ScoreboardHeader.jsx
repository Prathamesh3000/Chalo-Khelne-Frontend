import { Trophy, Radio } from "lucide-react";

export default function ScoreboardHeader({ config, derived, matchFormat }) {
  const { p1, p2, p1Sets, p2Sets, status, isLive, isCompleted, winner, sportName, singleResult, singleResultLabel, innings, timeScore, live, board } = derived;
  const scoringType = config.scoringType;

  // Determine what to show in the center based on sport type
  const renderCenterScore = () => {
    // Single-result sports (Chess, Carrom, Snooker)
    if (scoringType === "single") {
      if (singleResult && isCompleted) {
        return (
          <div className="flex flex-col items-center">
            <span className="text-4xl lg:text-5xl font-black text-white leading-none">
              {singleResult}
            </span>
            {singleResultLabel && (
              <span className="text-sm font-bold text-gray-400 mt-2">{singleResultLabel}</span>
            )}
            <span className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              {config.labels.matchResult || "Result"}
            </span>
          </div>
        );
      }
      // Manual score sports (Carrom) — show point totals
      const s1 = innings.p1Runs ?? p1Sets;
      const s2 = innings.p2Runs ?? p2Sets;
      if (s1 !== null && s2 !== null && (s1 > 0 || s2 > 0)) {
        return (
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-4">
              <span className={`text-5xl lg:text-6xl font-black tabular-nums leading-none ${winner === p1 ? "text-emerald-400" : "text-white"}`}>{s1}</span>
              <span className="text-2xl font-bold text-gray-600">-</span>
              <span className={`text-5xl lg:text-6xl font-black tabular-nums leading-none ${winner === p2 ? "text-emerald-400" : "text-white"}`}>{s2}</span>
            </div>
            <span className="mt-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              {config.labels.matchResult || "Points"}
            </span>
          </div>
        );
      }
      // Awaiting result
      return (
        <div className="flex flex-col items-center">
          <span className="text-3xl font-black text-gray-600">VS</span>
          <span className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
            {isLive ? "In Progress" : "Awaiting Result"}
          </span>
        </div>
      );
    }

    // Innings-based sports (Cricket)
    if (scoringType === "innings") {
      const hasRuns = innings.p1Runs !== null || innings.p2Runs !== null;
      if (hasRuns) {
        const formatInnings = (runs, wickets, overs) => {
          let str = `${runs ?? 0}`;
          if (wickets !== null && wickets !== undefined) str += `/${wickets}`;
          if (overs !== null && overs !== undefined) str += ` (${overs})`;
          return str;
        };
        return (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className={`text-4xl lg:text-5xl font-black tabular-nums leading-none ${winner === p1 ? "text-emerald-400" : "text-white"}`}>
                  {innings.p1Runs ?? 0}
                </span>
                {innings.p1Wickets !== null && (
                  <span className="text-lg font-bold text-gray-500">/{innings.p1Wickets}</span>
                )}
                {innings.p1Overs !== null && (
                  <div className="text-xs text-gray-500 mt-1">({innings.p1Overs} ov)</div>
                )}
              </div>
              <span className="text-xl font-bold text-gray-600">vs</span>
              <div className="text-center">
                <span className={`text-4xl lg:text-5xl font-black tabular-nums leading-none ${winner === p2 ? "text-emerald-400" : "text-white"}`}>
                  {innings.p2Runs ?? 0}
                </span>
                {innings.p2Wickets !== null && (
                  <span className="text-lg font-bold text-gray-500">/{innings.p2Wickets}</span>
                )}
                {innings.p2Overs !== null && (
                  <div className="text-xs text-gray-500 mt-1">({innings.p2Overs} ov)</div>
                )}
              </div>
            </div>
            <span className="mt-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
              {config.labels.matchResult || "Runs"}
            </span>
            {live?.currentInnings === 2 && live?.target != null && !isCompleted && (
              <span className="mt-2 text-xs font-bold text-yellow-300">
                Target {live.target} · Need {live.required} off {live.ballsRemaining} · RRR {live.requiredRate ?? "—"}
              </span>
            )}
          </div>
        );
      }
      // No data yet
      return (
        <div className="flex flex-col items-center">
          <span className="text-3xl font-black text-gray-600">VS</span>
          <span className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
            {isLive ? "Match in progress" : "Yet to bat"}
          </span>
        </div>
      );
    }

    // Board-based sports (Carrom) — boards won (big) + points (small)
    if (scoringType === "board") {
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-4">
            <span className={`text-6xl lg:text-7xl font-black tabular-nums leading-none ${winner === p1 ? "text-emerald-400" : "text-white"}`}>
              {board?.p1Boards ?? 0}
            </span>
            <span className="text-2xl font-bold text-gray-600">-</span>
            <span className={`text-6xl lg:text-7xl font-black tabular-nums leading-none ${winner === p2 ? "text-emerald-400" : "text-white"}`}>
              {board?.p2Boards ?? 0}
            </span>
          </div>
          <span className="mt-2 text-xs text-gray-500 font-semibold tabular-nums">
            {board?.p1Points ?? 0} - {board?.p2Points ?? 0} pts
          </span>
          <span className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
            {config.labels.matchResult || "Boards"}
          </span>
        </div>
      );
    }

    // Time-based sports (Football, Basketball, Hockey, Kabaddi)
    if (scoringType === "time") {
      return (
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-4">
            <span className={`text-6xl lg:text-7xl font-black tabular-nums leading-none ${winner === p1 ? "text-emerald-400" : "text-white"}`}>
              {timeScore.p1Score}
            </span>
            <span className="text-2xl font-bold text-gray-600">:</span>
            <span className={`text-6xl lg:text-7xl font-black tabular-nums leading-none ${winner === p2 ? "text-emerald-400" : "text-white"}`}>
              {timeScore.p2Score}
            </span>
          </div>
          <span className="mt-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
            {config.labels.matchResult || "Score"}
          </span>
        </div>
      );
    }

    // Default: Set-based sports (Table Tennis, Badminton, Tennis, Volleyball, Pickleball)
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-baseline gap-4">
          <span className={`text-6xl lg:text-7xl font-black tabular-nums leading-none ${winner === p1 ? "text-emerald-400" : "text-white"}`}>
            {p1Sets}
          </span>
          <span className="text-2xl font-bold text-gray-600">:</span>
          <span className={`text-6xl lg:text-7xl font-black tabular-nums leading-none ${winner === p2 ? "text-emerald-400" : "text-white"}`}>
            {p2Sets}
          </span>
        </div>
        <div className="mt-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
          {config.labels.matchResult || "Sets"} · Best of {matchFormat.totalSets}
        </div>
      </div>
    );
  };

  // Determine winner banner text based on sport
  const renderWinnerScore = () => {
    if (scoringType === "single" && singleResult) return `(${singleResult})`;
    if (scoringType === "innings") return `(${innings.p1Runs ?? 0} - ${innings.p2Runs ?? 0})`;
    if (scoringType === "board") return `(${board?.p1Boards ?? 0} - ${board?.p2Boards ?? 0} boards)`;
    if (scoringType === "time") return `(${timeScore.p1Score} - ${timeScore.p2Score})`;
    return `(${p1Sets} - ${p2Sets})`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0B1220]">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-[0.03]"
          style={{ background: `radial-gradient(circle, ${config.color}, transparent)` }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-[0.03]"
          style={{ background: `radial-gradient(circle, ${config.color}, transparent)` }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="relative px-8 py-8">
        {/* Sport + Status */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{config.icon}</span>
            <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">{sportName}</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <Radio className="w-4 h-4 text-red-500" />
              <span className="text-xs font-black text-red-400 tracking-wider">LIVE</span>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-emerald-400 tracking-wider">COMPLETED</span>
            </div>
          )}
          {!isLive && !isCompleted && (
            <span className="text-xs font-bold text-gray-500 bg-gray-800 px-3 py-1.5 rounded-full">UPCOMING</span>
          )}
        </div>

        {/* Players + Score */}
        <div className="flex items-center justify-between">
          <PlayerSide name={p1} isWinner={winner === p1} isCompleted={isCompleted} config={config} scoringType={scoringType} />
          {renderCenterScore()}
          <PlayerSide name={p2} isWinner={winner === p2} isCompleted={isCompleted} config={config} scoringType={scoringType} align="right" />
        </div>

        {/* Winner Banner */}
        {isCompleted && winner && (
          <div className="mt-8 flex items-center justify-center gap-3 pt-6 border-t border-gray-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Trophy className="w-4 h-4 text-yellow-900" />
            </div>
            <span className="font-black text-lg text-white">{winner} wins!</span>
            <span className="text-sm text-gray-500 font-bold">{renderWinnerScore()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerSide({ name, isWinner, isCompleted, config, scoringType, align = "left" }) {
  const initial = name?.charAt(0)?.toUpperCase() || "?";
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end" : "items-start"} flex-1 ${isCompleted && !isWinner ? "opacity-30" : ""}`}>
      <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black mb-3 transition-all ${
        isWinner
          ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900 shadow-xl shadow-yellow-500/20 scale-110"
          : "bg-[#1A2744] text-gray-500"
      }`}>
        {isWinner ? <Trophy className="w-8 h-8" /> : initial}
        {isWinner && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <span className={`font-black text-sm tracking-wide ${isWinner ? "text-emerald-400" : "text-gray-300"}`}>
        {name}
      </span>
      {isWinner && (
        <span className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.2em] mt-1">Champion</span>
      )}
    </div>
  );
}
