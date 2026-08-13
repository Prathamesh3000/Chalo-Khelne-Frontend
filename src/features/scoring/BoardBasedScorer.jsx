import { useState } from "react";
import { Check, RefreshCcw, Crown } from "lucide-react";
import { toast } from "react-toastify";

/**
 * Carrom scorer — board-by-board, INCREMENTAL.
 *
 * Each board's result (winner + pocketed-coin points + optional queen bonus)
 * is POSTed to the backend (carrom/board). UI hydrates from the server
 * `liveScore` block; the match auto-completes when a side reaches boardsToWin.
 *
 * Props:
 * - config, matchFormat, player1Name, player2Name
 * - liveScore: { boards: [...], player1Boards, player2Boards, player1Points, player2Points }
 * - onSubmitBoard(payload), submitting, onRefresh
 */
export default function BoardBasedScorer({
  config,
  matchFormat,
  player1Name,
  player2Name,
  liveScore,
  onSubmitBoard,
  submitting,
  onRefresh,
}) {
  const queenBonus = config.scoring?.queenBonus ?? matchFormat?.queenValue ?? 3;
  const boardsToWin = matchFormat?.boardsToWin || config.defaults?.boardsToWin || 2;

  const boards = liveScore?.boards || [];
  const p1Boards = liveScore?.player1Boards ?? 0;
  const p2Boards = liveScore?.player2Boards ?? 0;
  const p1Points = liveScore?.player1Points ?? 0;
  const p2Points = liveScore?.player2Points ?? 0;

  const [winner, setWinner] = useState("player1");
  const [points, setPoints] = useState("");
  const [queen, setQueen] = useState(false);

  const sideName = (s) => (s === "player1" ? player1Name : player2Name);

  const submitBoard = async () => {
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < 0) {
      toast.error("Enter the winner's pocketed-coin points");
      return;
    }
    try {
      await onSubmitBoard({
        boardNumber: boards.length + 1,
        winner,
        points: pts,
        queenPocketed: queen,
        queenBonus,
      });
      setPoints("");
      setQueen(false);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not record board");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-gray-800">Carrom Scoring</h3>
        <span className="text-xs text-gray-500">Best of — first to {boardsToWin} boards</span>
      </div>

      {/* Board tally */}
      <div className="bg-gray-900 rounded-xl p-5 text-white my-4">
        <div className="grid grid-cols-2 divide-x divide-gray-700">
          {["player1", "player2"].map((s) => (
            <div key={s} className="text-center px-4">
              <div className="text-xs font-bold text-gray-400 mb-1">{sideName(s)?.split(" ")[0]}</div>
              <div className="text-3xl font-black">{s === "player1" ? p1Boards : p2Boards}</div>
              <div className="text-xs text-gray-400 mt-1">{s === "player1" ? p1Points : p2Points} pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Board history */}
      {boards.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {boards.map((b, i) => (
            <div key={i} className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
              <span className="font-bold text-gray-500">B{b.boardNumber || i + 1}</span>{" "}
              <span className="text-green-600 font-bold">
                {sideName(b.winner)?.split(" ")[0]} +{b.winner === "player1" ? b.player1Points : b.player2Points}
              </span>
              {b.queenPocketedBy && <Crown className="inline w-3 h-3 ml-1 text-yellow-500" />}
            </div>
          ))}
        </div>
      )}

      {/* New board entry */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2">Board {boards.length + 1} winner</p>
          <div className="flex gap-2">
            {["player1", "player2"].map((s) => (
              <button
                key={s}
                onClick={() => setWinner(s)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${winner === s ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {sideName(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 block mb-1" htmlFor="pocketed-coin-points">Pocketed-coin points</label>
            <input id="pocketed-coin-points"
              type="number"
              min="0"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 5"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            />
          </div>
          <label className="flex items-center gap-2 mt-5 cursor-pointer">
            <input type="checkbox" checked={queen} onChange={(e) => setQueen(e.target.checked)} className="accent-orange-500 w-4 h-4" />
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <Crown className="w-4 h-4 text-yellow-500" /> Queen (+{queenBonus})
            </span>
          </label>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={submitBoard}
            disabled={submitting}
            className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Submit Board
          </button>
          <button onClick={onRefresh} className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
