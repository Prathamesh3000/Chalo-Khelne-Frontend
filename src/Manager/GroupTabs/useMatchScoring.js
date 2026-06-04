import { useState, useEffect, useCallback } from "react";
import axios from "axios";

/**
 * Hook for all match scoring logic.
 * Works with group stage, knockout, and direct knockout matches.
 * Reads match format from the DB — no sport-specific hardcoding.
 */
export default function useMatchScoring(matchId) {
  const [match, setMatch] = useState(null);
  const [matchFormat, setMatchFormat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Live scoring state
  const [player1Points, setPlayer1Points] = useState(0);
  const [player2Points, setPlayer2Points] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentGame, setCurrentGame] = useState(1);

  // Manual entry state
  const [manualGames, setManualGames] = useState([]);

  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`/api/tournaments/matches/${matchId}/live-state?autoInit=false`);
      const data = res.data;
      const m = data.match;

      if (!m) { setError("Match not found"); return; }

      setMatch(m);

      // Parse match format from DB — NO hardcoded TT defaults
      const fmt = m.matchFormat || {};
      const scoringType = fmt.scoringType || null;
      const isNonSet = scoringType === "time" || scoringType === "innings" || scoringType === "single";
      const parsed = {
        scoringType,
        totalSets: fmt.maxSets || fmt.totalSets || 1,
        setsToWin: fmt.setsToWin || Math.ceil((fmt.maxSets || fmt.totalSets || 1) / 2),
        totalGames: fmt.maxGames || fmt.totalGames || 1,
        gamesToWin: fmt.gamesToWin || Math.ceil((fmt.maxGames || fmt.totalGames || 1) / 2),
        pointsToWinGame: fmt.pointsToWinGame || fmt.pointsPerSet || null,
        marginToWin: fmt.marginToWin ?? null,
        deuceRule: fmt.deuceRule !== undefined ? fmt.deuceRule : !isNonSet,
        maxPointsPerGame: fmt.maxPointsPerGame || fmt.maxPointsCap || null,
        serviceRule: fmt.serviceRule || null,
        // Sport-specific fields
        oversCount: fmt.oversCount || null,
        inningsCount: fmt.inningsCount || null,
        halvesCount: fmt.halvesCount || null,
        halvesDuration: fmt.halvesDuration || null,
      };
      setMatchFormat(parsed);

      // Set live state
      if (m.liveScore) {
        setPlayer1Points(m.liveScore.player1Points || 0);
        setPlayer2Points(m.liveScore.player2Points || 0);
      }
      setCurrentSet(m.currentSet || 1);
      setCurrentGame(m.currentGame || 1);

      // Initialize manual games for bulk entry
      setManualGames(Array(parsed.totalGames).fill(null).map(() => ({ a: "", b: "" })));

    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  // Submit a single game score
  const completeGame = async (player1Score, player2Score) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`/api/tournaments/matches/${matchId}/complete-game`, {
        finalPlayer1Points: player1Score,
        finalPlayer2Points: player2Score,
      });
      await loadMatch(); // Refresh
      return res.data;
    } catch (err) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Submit all manual game scores in sequence
  const submitBulkScores = async (games) => {
    setSubmitting(true);
    try {
      const toSubmit = games.filter((g) => g.a !== "" && g.b !== "");
      if (toSubmit.length === 0) throw new Error("No scores to submit");

      for (let i = 0; i < toSubmit.length; i++) {
        const scoreA = parseInt(toSubmit[i].a, 10);
        const scoreB = parseInt(toSubmit[i].b, 10);
        if (isNaN(scoreA) || isNaN(scoreB)) continue;

        await axios.post(`/api/tournaments/matches/${matchId}/complete-game`, {
          finalPlayer1Points: scoreA,
          finalPlayer2Points: scoreB,
        });
        await new Promise((r) => setTimeout(r, 300));
      }

      // Sync to points table
      try {
        await axios.post(`/api/tournaments/scores/${matchId}`, {});
      } catch {}

      await loadMatch();
    } finally {
      setSubmitting(false);
    }
  };

  // Sync score to points table
  const syncToPointsTable = async () => {
    try {
      await axios.post(`/api/tournaments/scores/${matchId}`, {});
    } catch {}
  };

  // Derived state
  const player1Name = match?.player1?.userName || match?.player1?.playerName || "Player 1";
  const player2Name = match?.player2?.userName || match?.player2?.playerName || "Player 2";
  const isCompleted = match?.status === "COMPLETED" || match?.status === "completed";
  const isInProgress = match?.status === "IN_PROGRESS" || match?.status === "in_progress" || match?.status === "in-progress";
  const sets = match?.sets || [];

  // Some legacy matches don't store `setWinner` on each set (it was added
  // mid-flight by a later scoring revision). When it's missing, derive it
  // from the games: count games won within the set, fall back to total
  // points on a tie. Without this fallback, completed matches show a
  // SCORE of 0—0 in the header even though every set has a clear winner.
  const setWinnerOf = (s) => {
    if (s?.setWinner) return s.setWinner;
    const games = Array.isArray(s?.games) ? s.games : [];
    if (games.length === 0) return null;
    let p1Games = 0, p2Games = 0, p1Pts = 0, p2Pts = 0;
    for (const g of games) {
      const a = g?.finalScore?.player1 ?? g?.homePoints ?? 0;
      const b = g?.finalScore?.player2 ?? g?.awayPoints ?? 0;
      p1Pts += a; p2Pts += b;
      if (a > b) p1Games++;
      else if (b > a) p2Games++;
    }
    if (p1Games !== p2Games) return p1Games > p2Games ? "player1" : "player2";
    if (p1Pts === p2Pts) return null;
    return p1Pts > p2Pts ? "player1" : "player2";
  };

  const matchesPlayer1 = (w) => {
    if (!w) return false;
    if (typeof w === "string") return w === "player1" || w === player1Name;
    return (
      w.playerId?.toString() === match?.player1?.playerId?.toString() ||
      w.playerName === player1Name
    );
  };
  const matchesPlayer2 = (w) => {
    if (!w) return false;
    if (typeof w === "string") return w === "player2" || w === player2Name;
    return (
      w.playerId?.toString() === match?.player2?.playerId?.toString() ||
      w.playerName === player2Name
    );
  };

  const player1SetsWon = sets.filter((s) => matchesPlayer1(setWinnerOf(s))).length;
  const player2SetsWon = sets.filter((s) => matchesPlayer2(setWinnerOf(s))).length;

  // Same fallback for the overall winner name — if the match doc never had
  // `winner` written (older scorers), infer it from the sets-won count.
  let winnerName = match?.winner
    ? typeof match.winner === "object"
      ? (match.winner.playerName || match.winner.userName || "Unknown")
      : match.winner
    : null;
  if (!winnerName && isCompleted && player1SetsWon !== player2SetsWon) {
    winnerName = player1SetsWon > player2SetsWon ? player1Name : player2Name;
  }

  return {
    // Data
    match, matchFormat, loading, error, submitting,
    player1Name, player2Name,
    player1Points, player2Points,
    currentSet, currentGame,
    sets, player1SetsWon, player2SetsWon,
    isCompleted, isInProgress, winnerName,
    manualGames, setManualGames,

    // Actions
    loadMatch, completeGame, submitBulkScores, syncToPointsTable,
    setPlayer1Points, setPlayer2Points,
  };
}
