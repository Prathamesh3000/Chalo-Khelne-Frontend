import { useState } from "react";
import { Check, RefreshCcw } from "lucide-react";
import { toast } from "react-toastify";
import { scoreErrorMessage } from "./scoreError";

/**
 * Scorer for single-result sports: Chess, Carrom.
 * Simple win/draw/loss or point total entry.
 *
 * Props:
 * - config: sport UI config
 * - player1Name, player2Name
 * - onSubmitScores: (games[]) => Promise
 * - submitting: boolean
 * - onRefresh: () => void
 */
export default function SingleResultScorer({
  config,
  player1Name,
  player2Name,
  onSubmitScores,
  submitting,
  onRefresh,
}) {
  const hasResults = config.scoring.possibleResults;
  const [selectedResult, setSelectedResult] = useState(null);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  const handleSubmit = async () => {
    try {
      if (hasResults) {
        if (!selectedResult) return;
        const [a, b] = selectedResult.split("-");
        await onSubmitScores([{ a, b }]);
        setSelectedResult(null);
      } else {
        if (!score1 || !score2) return;
        await onSubmitScores([{ a: score1, b: score2 }]);
        setScore1("");
        setScore2("");
      }
    } catch (e) {
      toast.error(scoreErrorMessage(e));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-bold text-gray-800 mb-4">Enter Result</h3>

      {hasResults ? (
        <div className="space-y-3 mb-6">
          {config.scoring.possibleResults.map((result) => {
            const label = config.scoring.resultLabels?.[result] || result;
            const isSelected = selectedResult === result;
            return (
              <button
                key={result}
                onClick={() => setSelectedResult(result)}
                className={`w-full py-4 rounded-xl text-sm font-bold transition border-2 ${
                  isSelected
                    ? "border-orange-500 bg-blue-50 text-orange-500"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {label}
                <span className="block text-xs font-normal mt-0.5 text-gray-400">{result}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-4 justify-center mb-6">
          <div className="text-center">
            <label className="text-xs font-bold text-gray-500 block mb-1">{player1Name?.split(" ")[0]}</label>
            <input
              type="number"
              min="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="w-24 text-center border border-gray-200 rounded-xl py-3 text-lg font-bold focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <span className="text-gray-300 font-bold text-xl mt-5">—</span>
          <div className="text-center">
            <label className="text-xs font-bold text-gray-500 block mb-1">{player2Name?.split(" ")[0]}</label>
            <input
              type="number"
              min="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="w-24 text-center border border-gray-200 rounded-xl py-3 text-lg font-bold focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || (hasResults ? !selectedResult : (!score1 || !score2))}
          className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><RefreshCcw className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Check className="w-4 h-4" /> Submit Result</>
          )}
        </button>
        <button onClick={onRefresh} className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
