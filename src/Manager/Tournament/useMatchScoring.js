import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import keys from "../../config/queryKeys";

const fetchMatchLiveState = async (matchId) => {
  const res = await axios.get(`/api/tournaments/matches/${matchId}/live-state?autoInit=false`);
  return res.data.match;
};

const completeGameApi = async ({ matchId, player1Score, player2Score, penaltyWinner = null }) => {
  const res = await axios.post(`/api/tournaments/matches/${matchId}/complete-game`, {
    finalPlayer1Points: player1Score,
    finalPlayer2Points: player2Score,
    ...(penaltyWinner ? { penaltyWinner } : {}),
  });
  return res.data;
};

const syncPointsTableApi = async (matchId) => {
  // Sync this match's result into the group points table via the dedicated
  // sync-scores endpoint (group-stage only; the backend no-ops safely for
  // knockout). The old /tournaments/scores/:id (createScore) requires explicit
  // score fields and 400s on an empty body, so it never actually synced.
  await axios.post(`/api/tournaments/matches/${matchId}/sync-scores`, {});
};

// ── Cricket (innings) incremental endpoints ──
const cricketSetupApi = ({ matchId, ...body }) =>
  axios.post(`/api/tournaments/matches/${matchId}/cricket/setup`, body).then((r) => r.data);
const cricketLineupApi = ({ matchId, ...body }) =>
  axios.post(`/api/tournaments/matches/${matchId}/cricket/lineup`, body).then((r) => r.data);
const cricketBallApi = ({ matchId, ...body }) =>
  axios.post(`/api/tournaments/matches/${matchId}/cricket/ball`, body).then((r) => r.data);
const cricketUndoApi = ({ matchId }) =>
  axios.post(`/api/tournaments/matches/${matchId}/cricket/undo`, {}).then((r) => r.data);
const cricketSwitchInningsApi = ({ matchId, ...body }) =>
  axios.post(`/api/tournaments/matches/${matchId}/cricket/innings-switch`, body).then((r) => r.data);
const cricketFinishApi = ({ matchId, ...body }) =>
  axios.post(`/api/tournaments/matches/${matchId}/cricket/finish`, body).then((r) => r.data);

// ── Carrom (board) incremental endpoint ──
const carromBoardApi = ({ matchId, ...body }) =>
  axios.post(`/api/tournaments/matches/${matchId}/carrom/board`, body).then((r) => r.data);

export default function useMatchScoring(matchId) {
  const queryClient = useQueryClient();

  const { data: match, isLoading: loading, error } = useQuery({
    queryKey: keys.matchLiveState(matchId),
    queryFn: () => fetchMatchLiveState(matchId),
    enabled: !!matchId,
    refetchInterval: (data) => {
      // Auto-refetch every 5s if match is live
      const status = data?.status?.toUpperCase();
      return status === "IN_PROGRESS" ? 5000 : false;
    },
  });

  // Parse match format — sport-aware, NO hardcoded TT defaults
  const fmt = match?.matchFormat || {};
  const scoringType = fmt.scoringType || null;
  const isNonSet = scoringType === "time" || scoringType === "innings" || scoringType === "single";

  const matchFormat = match ? {
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
  } : null;

  // Complete a single game
  const completeGameMutation = useMutation({
    mutationFn: ({ player1Score, player2Score }) =>
      completeGameApi({ matchId, player1Score, player2Score }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.matchLiveState(matchId) });
    },
  });

  // Sync to points table
  const syncMutation = useMutation({
    mutationFn: () => syncPointsTableApi(matchId),
  });

  // Cricket + Carrom incremental mutations — each refetches live-state on success
  const invalidateLive = () => queryClient.invalidateQueries({ queryKey: keys.matchLiveState(matchId) });
  const cricketSetupMutation = useMutation({ mutationFn: (body) => cricketSetupApi({ matchId, ...body }), onSuccess: invalidateLive });
  const cricketLineupMutation = useMutation({ mutationFn: (body) => cricketLineupApi({ matchId, ...body }), onSuccess: invalidateLive });
  const cricketBallMutation = useMutation({ mutationFn: (body) => cricketBallApi({ matchId, ...body }), onSuccess: invalidateLive });
  const cricketUndoMutation = useMutation({ mutationFn: () => cricketUndoApi({ matchId }), onSuccess: invalidateLive });
  const cricketSwitchMutation = useMutation({ mutationFn: (body) => cricketSwitchInningsApi({ matchId, ...(body || {}) }), onSuccess: invalidateLive });
  const cricketFinishMutation = useMutation({ mutationFn: (body) => cricketFinishApi({ matchId, ...(body || {}) }), onSuccess: invalidateLive });
  const carromBoardMutation = useMutation({ mutationFn: (body) => carromBoardApi({ matchId, ...body }), onSuccess: invalidateLive });

  // Bulk submit games sequentially. opts.penaltyWinner ("player1"|"player2")
  // decides a level knockout match for time sports (Football penalty shootout).
  const submitBulkScores = async (games, opts = {}) => {
    const toSubmit = games.filter((g) => g.a !== "" && g.b !== "");
    if (toSubmit.length === 0) throw new Error("No scores to submit");

    let submitted = 0;
    for (const game of toSubmit) {
      const scoreA = parseInt(game.a, 10);
      const scoreB = parseInt(game.b, 10);
      if (isNaN(scoreA) || isNaN(scoreB)) continue;
      try {
        await completeGameApi({ matchId, player1Score: scoreA, player2Score: scoreB, penaltyWinner: opts.penaltyWinner || null });
        submitted++;
      } catch (err) {
        // Best-of-N matches finish once a player wins enough sets; the backend
        // then rejects further games as "already completed". If the deciding
        // games were already submitted, that's the correct end state — stop
        // rather than surfacing a spurious error for the dead-rubber games.
        const msg = String(err?.response?.data?.message || "").toLowerCase();
        const matchDone = err?.response?.status === 400 &&
          (msg.includes("completed") || msg.includes("already finished") || msg.includes("not in progress"));
        if (matchDone && submitted > 0) break;
        throw err; // genuine error (or completed before any game) → caller handles
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    // Sync + refetch (sync is best-effort — the refetch below reflects server truth)
    try {
      await syncPointsTableApi(matchId);
    } catch (err) {
      console.warn("Points-table sync failed:", err.message);
    }
    queryClient.invalidateQueries({ queryKey: keys.matchLiveState(matchId) });
  };

  // Derived state
  const player1Name = match?.player1?.userName || match?.player1?.playerName || "Player 1";
  const player2Name = match?.player2?.userName || match?.player2?.playerName || "Player 2";
  const isCompleted = match?.status === "COMPLETED" || match?.status === "completed";
  const isInProgress = match?.status === "IN_PROGRESS" || match?.status === "in_progress" || match?.status === "in-progress";
  const sets = match?.sets || [];

  const countSetsWon = (playerKey, playerName) =>
    sets.filter((s) => {
      if (!s.setWinner) return false;
      const w = s.setWinner;
      if (typeof w === "string") return w === playerKey || w === playerName;
      return w.playerId?.toString() === match?.[playerKey === "player1" ? "player1" : "player2"]?.playerId?.toString() || w.playerName === playerName;
    }).length;

  const player1SetsWon = countSetsWon("player1", player1Name);
  const player2SetsWon = countSetsWon("player2", player2Name);

  const winnerName = match?.winner
    ? typeof match.winner === "object" ? (match.winner.playerName || match.winner.userName) : match.winner
    : null;

  return {
    match, matchFormat, loading,
    error: error?.response?.data?.message || error?.message || null,
    player1Name, player2Name,
    player1Points: match?.liveScore?.player1Points || 0,
    player2Points: match?.liveScore?.player2Points || 0,
    currentSet: match?.currentSet || 1,
    currentGame: match?.currentGame || 1,
    sets, player1SetsWon, player2SetsWon,
    isCompleted, isInProgress, winnerName,

    // Live score block (cricket innings / carrom board) from the backend
    liveScore: match?.liveScore || null,

    // Mutations
    completeGame: completeGameMutation.mutateAsync,
    submitting: completeGameMutation.isPending ||
      cricketBallMutation.isPending || cricketUndoMutation.isPending ||
      cricketSwitchMutation.isPending || cricketFinishMutation.isPending ||
      cricketSetupMutation.isPending || cricketLineupMutation.isPending ||
      carromBoardMutation.isPending,
    submitBulkScores,
    syncToPointsTable: syncMutation.mutateAsync,

    // Cricket (innings)
    setupCricketInnings: cricketSetupMutation.mutateAsync,
    updateCricketLineup: cricketLineupMutation.mutateAsync,
    submitCricketBall: cricketBallMutation.mutateAsync,
    undoCricketBall: cricketUndoMutation.mutateAsync,
    switchCricketInnings: cricketSwitchMutation.mutateAsync,
    finishCricketMatch: cricketFinishMutation.mutateAsync,
    // Carrom (board)
    submitCarromBoard: carromBoardMutation.mutateAsync,
  };
}
