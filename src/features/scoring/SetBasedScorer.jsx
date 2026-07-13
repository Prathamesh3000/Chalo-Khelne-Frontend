import { useState } from "react";
import { Check, RefreshCcw } from "lucide-react";
import { toast } from "react-toastify";
import { scoreErrorMessage } from "./scoreError";

/**
 * Detects whether the match format uses nested games (Tennis) or flat sets (TT, Badminton).
 * Mirror of server/factories/MatchFactory.js → hasNestedGames.
 * Kept inline because the React app has no shared utils with the Express server.
 */
function hasNestedGames(fmt) {
  if (!fmt || typeof fmt !== "object") return false;
  if (fmt.gamesPerSet != null && Number(fmt.gamesPerSet) > 0) return true;
  const tg = Number(fmt.totalGames);
  const ts = Number(fmt.totalSets);
  if (Number.isFinite(tg) && Number.isFinite(ts) && tg > 1 && tg !== ts) return true;
  return false;
}

/**
 * Scorer for set-based sports: Table Tennis, Badminton, Tennis, Pickleball, Volleyball.
 * Shape-aware: nested-game sports (Tennis) show N game-score rows per set; flat-set
 * sports (TT, Badminton) show one set-score row.
 *
 * Props:
 * - config: sport UI config from sportUIConfig.js
 * - matchFormat: { totalSets, setsToWin, totalGames, gamesToWin, pointsToWinGame, ... }
 * - sets: array of completed set data from match
 * - currentSet: number
 * - player1Name: string
 * - player2Name: string
 * - onSubmitScores: (games[]) => Promise   // array length = 1 for flat, N for nested
 * - submitting: boolean
 * - onRefresh: () => void
 */
export default function SetBasedScorer({
  config,
  matchFormat,
  sets,
  currentSet,
  player1Name,
  player2Name,
  onSubmitScores,
  submitting,
  onRefresh,
}) {
  const labels = config.labels;
  const nested = hasNestedGames(matchFormat);
  const gamesPerSet = nested
    ? (matchFormat?.totalGames || matchFormat?.gamesToWin * 2 - 1 || 5)
    : 1;
  const pointsToWin = matchFormat?.pointsToWinGame || null;

  const [manualGames, setManualGames] = useState(
    Array(gamesPerSet).fill(null).map(() => ({ a: "", b: "" }))
  );

  const handleChange = (idx, player, value) => {
    const next = [...manualGames];
    next[idx] = { ...next[idx], [player]: value };
    setManualGames(next);
  };

  const handleSubmit = async () => {
    try {
      await onSubmitScores(manualGames);
      setManualGames(Array(gamesPerSet).fill(null).map(() => ({ a: "", b: "" })));
    } catch (e) {
      toast.error(scoreErrorMessage(e));
    }
  };

  const p1Short = player1Name?.split(" ")[0] || "P1";
  const p2Short = player2Name?.split(" ")[0] || "P2";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-gray-800">
          Enter {nested ? `${labels.game} Scores` : `${labels.set} Score`}
        </h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
          {labels.set} {currentSet} • {pointsToWin} {labels.point}s to win
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {nested
          ? `${labels.set} ${currentSet} — enter score for each ${labels.game.toLowerCase()}`
          : `${labels.set} ${currentSet} — enter final score`}
      </p>

      {/* Column Headers */}
      <div className="flex items-center gap-3 justify-center mb-2">
        <span className="text-xs text-gray-400 w-16 text-right" />
        <span className="w-20 text-center text-xs font-bold text-blue-600 truncate">{p1Short}</span>
        <span className="w-4" />
        <span className="w-20 text-center text-xs font-bold text-blue-600 truncate">{p2Short}</span>
      </div>

      {/* Game Inputs */}
      <div className="space-y-2">
        {manualGames.map((game, idx) => (
          <div key={idx} className="flex items-center gap-3 justify-center">
            <span className="text-xs text-gray-400 w-16 text-right font-medium">
              {nested ? `${labels.game} ${idx + 1}` : `${labels.set} ${currentSet}`}
            </span>
            <input
              type="number"
              min="0"
              value={game.a}
              onChange={(e) => handleChange(idx, "a", e.target.value)}
              placeholder="0"
              className="w-20 text-center border border-gray-200 rounded-lg py-2 text-sm font-bold focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            />
            <span className="text-gray-300 font-bold">—</span>
            <input
              type="number"
              min="0"
              value={game.b}
              onChange={(e) => handleChange(idx, "b", e.target.value)}
              placeholder="0"
              className="w-20 text-center border border-gray-200 rounded-lg py-2 text-sm font-bold focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            />
          </div>
        ))}
      </div>

      {/* Deuce hint */}
      {config.scoring.showDeuce && (
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Deuce: if tied at {pointsToWin ? pointsToWin - 1 : "?"}-{pointsToWin ? pointsToWin - 1 : "?"}, win by {matchFormat?.marginToWin || "—"}
        </p>
      )}

      {/* Submit */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><RefreshCcw className="w-4 h-4 animate-spin" /> Submitting...</>
          ) : (
            <><Check className="w-4 h-4" /> Submit {nested ? `${labels.game} Scores` : `${labels.set} Score`}</>
          )}
        </button>
        <button
          onClick={onRefresh}
          className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
