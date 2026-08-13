import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { FiX, FiCheck } from "react-icons/fi";
import axios from "axios";
import { resolveSetsToWin } from "../utils/sportTrack";

/**
 * Reusable Bulk Score Upload Modal
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onSuccess: () => void  (called after successful upload to refresh data)
 * - matches: array of match objects (pending/scheduled matches to score)
 * - tournamentId: string
 * - groupId: string (optional, for group stage matches)
 * - matchType: "player" | "team"  (default: "player")
 *   - "player" uses player1/player2 + /api/tournaments/matches/bulk-upload-scores
 *   - "team" uses team names + /api/tournaments/team-knockout/bulk-upload-scores
 * - maxSets: number (default: 5)
 * - setsToWin: number (default: 3)
 * - getPlayerName: (match, side) => string  (optional custom name resolver)
 * - title: string (optional, modal title override)
 */
export default function BulkScoreUploadModal({
  isOpen,
  onClose,
  onSuccess,
  matches = [],
  tournamentId,
  groupId,
  matchType = "player",
  maxSets = 5,
  setsToWin: propSetsToWin,
  getPlayerName,
  title,
}) {
  const setsToWin = propSetsToWin || Math.ceil(maxSets / 2);

  const [bulkScores, setBulkScores] = useState({});
  const [loading, setLoading] = useState(false);
  // Outcome of the last submit. Rendered as a readable panel in place of the
  // form — previously every result was concatenated into a single toast, which
  // with a full round of doubles became an unreadable wall of text.
  const [uploadResult, setUploadResult] = useState(null);

  // Clear the last outcome only when the modal is (re)opened. Deliberately NOT
  // keyed on `matches`: submitting calls onSuccess, the parent refetches, and
  // the new `matches` array would otherwise wipe the results panel the instant
  // it appeared.
  useEffect(() => {
    if (isOpen) setUploadResult(null);
  }, [isOpen]);

  // Re-initialize scores when matches change or modal opens
  useEffect(() => {
    if (isOpen && matches.length > 0) {
      const initial = {};
      matches.forEach((match) => {
        // Row count comes from THIS match's format — a Bo5 semi needs 5 rows,
        // not the tournament-wide default.
        const f = match?.matchFormat;
        const rows = Number(f?.totalSets) || Number(f?.maxSets) || maxSets;
        initial[match._id] = {
          sets: Array.from({ length: rows }, () => ({
            player1Score: "",
            player2Score: "",
          })),
        };
      });
      setBulkScores(initial);
    }
  }, [isOpen, matches, maxSets]);

  if (!isOpen) return null;

  // `!uploadResult` matters: scoring the last pending match empties `matches`,
  // and without this the results panel would be replaced by "nothing to score"
  // the moment the upload succeeded.
  if (matches.length === 0 && !uploadResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 text-center">
          <p className="text-gray-500 text-sm mb-4">No matches are ready for scoring. All matches are either completed or waiting for players.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 w-auto">
            Close
          </button>
        </div>
      </div>
    );
  }

  // ── Per-match format ────────────────────────────────────────────────────
  // Knockout brackets escalate per round: Bo3 early, Bo5 semi, Bo7 final. The
  // maxSets/setsToWin PROPS carry one tournament-level format, so using them
  // for every match mislabels a Bo5 semi as "Best of 3 (need 2 to win)" AND
  // renders only 3 input rows — making it impossible to enter the 3 set wins
  // the server correctly requires. Each match's own matchFormat wins; the props
  // remain the fallback for matches that carry none.
  const formatFor = (match) => {
    const f = match?.matchFormat;
    const container = Number(f?.totalSets) || Number(f?.maxSets) || 0;
    if (container > 0) {
      return { maxSets: container, setsToWin: resolveSetsToWin(f) };
    }
    return { maxSets, setsToWin };
  };

  // Name resolvers
  const getName = (match, side) => {
    if (getPlayerName) return getPlayerName(match, side);
    if (matchType === "team") {
      if (side === 1) return match.team1Name || match.team1Id?.teamName || "Team 1";
      return match.team2Name || match.team2Id?.teamName || "Team 2";
    }
    if (side === 1) return match.player1?.userName || match.player1?.playerName || "Player 1";
    return match.player2?.userName || match.player2?.playerName || "Player 2";
  };

  const handleChange = (matchId, setIndex, field, value) => {
    setBulkScores((prev) => {
      const updated = { ...prev };
      const matchData = { ...updated[matchId] };
      const sets = [...matchData.sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      matchData.sets = sets;
      updated[matchId] = matchData;
      return updated;
    });
  };

  const handleSubmit = async () => {
    const scoresToSubmit = [];

    for (const [matchId, data] of Object.entries(bulkScores)) {
      const filledSets = data.sets
        .filter((s) => s.player1Score !== "" && s.player2Score !== "")
        .map((s) => ({
          player1Score: parseInt(s.player1Score, 10),
          player2Score: parseInt(s.player2Score, 10),
        }));

      if (filledSets.length === 0) continue;

      // Validate: no ties
      const tiedSet = filledSets.find((s) => s.player1Score === s.player2Score);
      if (tiedSet) {
        toast.warn("Invalid score: Set scores cannot be tied. Each set must have a winner.");
        return;
      }

      // Validate: enough sets to determine winner
      let p1Wins = 0,
        p2Wins = 0;
      for (const s of filledSets) {
        if (s.player1Score > s.player2Score) p1Wins++;
        else p2Wins++;
      }

      // Validate against THIS match's requirement, not a tournament-wide one.
      const match = matches.find((m) => m._id === matchId);
      const { setsToWin: needed } = formatFor(match);
      if (p1Wins < needed && p2Wins < needed) {
        toast.info(
          `${getName(match, 1)} vs ${getName(match, 2)}: needs ${needed} set win${needed === 1 ? "" : "s"} to decide the match — got ${p1Wins}-${p2Wins}.`
        );
        return;
      }

      scoresToSubmit.push({ matchId, sets: filledSets });
    }

    if (scoresToSubmit.length === 0) {
      toast.warn("No scores to submit. Please fill in set scores for at least one match.");
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        matchType === "team"
          ? "/api/tournaments/team-knockout/bulk-upload-scores"
          : "/api/tournaments/matches/bulk-upload-scores";

      const response = await axios.post(endpoint, {
        tournamentId,
        groupId,
        scores: scoresToSubmit,
      });

      if (response.data.success) {
        const results = (response.data.results || []).map((r) => ({
          winner: r.winner,
          // The loser is whichever side isn't the winner.
          loser: (r.winner === (r.player1 || r.team1))
            ? (r.player2 || r.team2 || "—")
            : (r.player1 || r.team1 || "—"),
          score: r.finalScore,
        }));
        const errs = Array.isArray(response.data.errors) ? response.data.errors : [];

        // Detail goes into the panel below; the toast stays to one line, since
        // a toast cannot render a list legibly (it collapses newlines).
        setUploadResult({ results, errors: errs });
        if (errs.length > 0) {
          toast.warn(`${results.length} scored, ${errs.length} failed`);
        } else {
          toast.success(`${results.length} match${results.length === 1 ? "" : "es"} scored`);
        }

        onSuccess?.();
        // The modal stays open on the results panel either way — on success so
        // the manager can see what was recorded, on failure so they can fix the
        // offending rows without re-entering the rest.
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error("Bulk score upload error:", err);
      toast.error("Failed to upload scores: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-white text-lg font-bold">
              {uploadResult ? "Upload complete" : (title || "Bulk Score Upload")}
            </h3>
            <p className="text-emerald-200 text-sm">
              {uploadResult
                ? `${uploadResult.results.length} recorded${uploadResult.errors.length > 0 ? `, ${uploadResult.errors.length} failed` : ""}`
                : `Enter set scores for ${matches.length} pending match${matches.length !== 1 ? "es" : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-emerald-200 bg-transparent w-auto"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Results panel — shown after a submit, in place of the form. */}
        {uploadResult ? (
          <div className="overflow-y-auto flex-1 p-6">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl p-4 text-center bg-emerald-50 border border-emerald-200">
                <p className="text-[26px] font-bold text-emerald-700 tabular-nums leading-none">
                  {uploadResult.results.length}
                </p>
                <p className="text-[12px] font-semibold text-emerald-700/80 mt-1.5">Scored</p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${
                uploadResult.errors.length > 0
                  ? "bg-red-50 border-red-200"
                  : "bg-gray-50 border-gray-200"
              }`}>
                <p className={`text-[26px] font-bold tabular-nums leading-none ${
                  uploadResult.errors.length > 0 ? "text-red-700" : "text-gray-400"
                }`}>
                  {uploadResult.errors.length}
                </p>
                <p className={`text-[12px] font-semibold mt-1.5 ${
                  uploadResult.errors.length > 0 ? "text-red-700/80" : "text-gray-400"
                }`}>
                  Failed
                </p>
              </div>
            </div>

            {uploadResult.errors.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Not recorded
                </p>
                <div className="space-y-2">
                  {uploadResult.errors.map((e, i) => (
                    <div key={i} className="rounded-lg px-3 py-2.5 bg-red-50 border border-red-200">
                      <p className="text-[12px] font-mono text-red-900 break-all">
                        {e.matchId || e.id || "(unknown match)"}
                      </p>
                      <p className="text-[13px] text-red-700 mt-0.5">{e.error || "Unknown error"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadResult.results.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Recorded
                </p>
                {/* One row per match. The winner sits on its own line above the
                    loser — doubles pair names are long, and putting them on one
                    "A vs B: A wins" line is what made this unreadable. */}
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {uploadResult.results.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 grid place-items-center flex-shrink-0">
                        <FiCheck className="text-emerald-600" size={12} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-900 leading-snug">
                          {r.winner}
                        </p>
                        <p className="text-[12px] text-gray-500 leading-snug">
                          def. {r.loser}
                        </p>
                      </div>
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[12px] font-bold tabular-nums">
                        {r.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
        /* Body */
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {matches.map((match) => {
            const scoreData = bulkScores[match._id];
            if (!scoreData) return null;

            const name1 = getName(match, 1);
            const name2 = getName(match, 2);
            // This match's own format — a Bo5 semi and a Bo3 quarter can sit
            // side by side in the same list.
            const { maxSets: mMaxSets, setsToWin: mSetsToWin } = formatFor(match);

            return (
              <div
                key={match._id}
                className="border border-gray-200 rounded-xl p-4 bg-gray-50"
              >
                {/* Match Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-orange-100 text-orange-600 rounded-full text-xs font-medium px-2.5 py-1">
                    {match.matchNumber ? `M${match.matchNumber}` : `Match`}
                  </span>
                  <span className="text-xs text-gray-500">
                    Best of {mMaxSets} (need {mSetsToWin} to win)
                  </span>
                </div>

                {/* Player/Team Names */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className="font-semibold text-orange-500 text-sm text-right flex-1">
                    {name1}
                  </span>
                  <span className="text-gray-400 text-xs font-medium">VS</span>
                  <span className="font-semibold text-orange-500 text-sm text-left flex-1">
                    {name2}
                  </span>
                </div>

                {/* Set Score Inputs */}
                <div className="space-y-2">
                  {scoreData.sets.map((setScore, setIdx) => {
                    // Count wins so far
                    let p1Wins = 0,
                      p2Wins = 0;
                    for (let i = 0; i < setIdx; i++) {
                      const s = scoreData.sets[i];
                      if (s.player1Score !== "" && s.player2Score !== "") {
                        const p1 = parseInt(s.player1Score, 10);
                        const p2 = parseInt(s.player2Score, 10);
                        if (!isNaN(p1) && !isNaN(p2)) {
                          if (p1 > p2) p1Wins++;
                          else if (p2 > p1) p2Wins++;
                        }
                      }
                    }
                    // Hide once THIS match is decided — a Bo5 must still show
                    // sets 3-5 after a 2-0, which the global value hid.
                    if (p1Wins >= mSetsToWin || p2Wins >= mSetsToWin) return null;

                    return (
                      <div
                        key={setIdx}
                        className="flex items-center gap-2 justify-center"
                      >
                        <span className="text-xs text-gray-500 w-12 text-right">
                          Set {setIdx + 1}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={setScore.player1Score}
                          onChange={(e) =>
                            handleChange(match._id, setIdx, "player1Score", e.target.value)
                          }
                          className="w-16 text-center border border-gray-300 rounded-lg py-1.5 text-sm font-medium focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                        />
                        <span className="text-gray-400 text-xs">-</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={setScore.player2Score}
                          onChange={(e) =>
                            handleChange(match._id, setIdx, "player2Score", e.target.value)
                          }
                          className="w-16 text-center border border-gray-300 rounded-lg py-1.5 text-sm font-medium focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Winner preview */}
                {(() => {
                  let p1W = 0,
                    p2W = 0;
                  scoreData.sets.forEach((s) => {
                    if (s.player1Score !== "" && s.player2Score !== "") {
                      const p1 = parseInt(s.player1Score, 10);
                      const p2 = parseInt(s.player2Score, 10);
                      if (!isNaN(p1) && !isNaN(p2) && p1 !== p2) {
                        if (p1 > p2) p1W++;
                        else p2W++;
                      }
                    }
                  });
                  if (p1W >= mSetsToWin) {
                    return (
                      <div className="mt-2 text-center text-green-600 text-xs font-semibold bg-green-50 rounded-lg py-1">
                        Winner: {name1} ({p1W}-{p2W})
                      </div>
                    );
                  }
                  if (p2W >= mSetsToWin) {
                    return (
                      <div className="mt-2 text-center text-green-600 text-xs font-semibold bg-green-50 rounded-lg py-1">
                        Winner: {name2} ({p1W}-{p2W})
                      </div>
                    );
                  }
                  if (p1W > 0 || p2W > 0) {
                    return (
                      <div className="mt-2 text-center text-orange-500 text-xs font-medium">
                        Sets: {p1W}-{p2W} (need {mSetsToWin} to win)
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            );
          })}
        </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50">
          {uploadResult ? (
            <>
              <button
                onClick={() => setUploadResult(null)}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 bg-white w-auto"
              >
                {uploadResult.errors.length > 0 ? "Back to scores" : "Enter more"}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 w-auto flex items-center gap-2"
              >
                <FiCheck />
                Done
              </button>
            </>
          ) : (
          <>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-100 bg-white w-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed w-auto flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <FiCheck />
                Submit All Scores
              </>
            )}
          </button>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
