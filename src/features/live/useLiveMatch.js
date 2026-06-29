import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getSportConfig } from "../scoring/sportUIConfig";
import { useRealtimeMatch } from "../realtime";

const fetchLiveState = async (matchId) => {
  const res = await axios.get(`/api/tournaments/matches/${matchId}/live-state?autoInit=false`);
  return res.data.match;
};

export default function useLiveMatch(matchId) {
  // WebSocket subscription — updates React Query cache directly
  const { isRealtime, fallbackInterval } = useRealtimeMatch(matchId);

  const { data: match, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ["liveMatch", matchId],
    queryFn: () => fetchLiveState(matchId),
    enabled: !!matchId,
    // Use polling ONLY when socket is disconnected
    refetchInterval: (query) => {
      if (isRealtime) return false; // Socket handles updates
      // Fallback polling
      const m = query.state.data;
      if (!m) return fallbackInterval || 5000;
      const s = (m.status || "").toUpperCase();
      if (s === "IN_PROGRESS") return 2000;
      if (s === "COMPLETED") return false;
      return 10000;
    },
  });

  if (!match) return { match: null, isLoading, error, config: null, derived: null, isRealtime };

  // STEP 13: prefer denormalized `sportName` (populated by MatchFactory._stamp).
  const sportName = match.sportName || match.sportsType || match.sport || null;
  const config = getSportConfig(sportName);

  const fmt = match.matchFormat || {};
  const scoringType = fmt.scoringType || null;
  const isNonSet = scoringType === "time" || scoringType === "innings" || scoringType === "single";
  const matchFormat = {
    scoringType,
    totalSets: fmt.maxSets || fmt.totalSets || 1,
    setsToWin: fmt.setsToWin || Math.ceil((fmt.maxSets || fmt.totalSets || 1) / 2),
    totalGames: fmt.maxGames || fmt.totalGames || 1,
    gamesToWin: fmt.gamesToWin || Math.ceil((fmt.maxGames || fmt.totalGames || 1) / 2),
    pointsToWinGame: fmt.pointsToWinGame || fmt.pointsPerSet || null,
    marginToWin: fmt.marginToWin ?? null,
    deuceRule: fmt.deuceRule ?? (!isNonSet),
    // Sport-specific fields
    oversCount: fmt.oversCount || null,
    inningsCount: fmt.inningsCount || null,
    halvesCount: fmt.halvesCount || null,
    halvesDuration: fmt.halvesDuration || null,
  };

  const p1 = match.player1?.userName || match.player1?.playerName || "Player 1";
  const p2 = match.player2?.userName || match.player2?.playerName || "Player 2";
  const sets = match.sets || [];
  const status = (match.status || "SCHEDULED").toUpperCase();
  const isLive = status === "IN_PROGRESS";
  const isCompleted = status === "COMPLETED";

  const countWins = (playerKey, playerName) =>
    sets.filter((s) => {
      const w = s.setWinner;
      if (!w) return false;
      if (typeof w === "string") return w === playerKey || w === playerName;
      return w.playerName === playerName;
    }).length;

  const p1Sets = countWins("player1", p1);
  const p2Sets = countWins("player2", p2);

  const winner = match.winner
    ? typeof match.winner === "object" ? (match.winner.playerName || match.winner.userName) : match.winner
    : null;

  // Build timeline
  const timeline = [];
  sets.forEach((set) => {
    (set.games || []).forEach((game) => {
      if (game.status !== "COMPLETED") return;
      const p1Score = game.finalScore?.player1 ?? game.homePoints ?? 0;
      const p2Score = game.finalScore?.player2 ?? game.awayPoints ?? 0;
      const gWinner = game.winner
        ? typeof game.winner === "object" ? game.winner.playerName : game.winner
        : p1Score > p2Score ? p1 : p2;
      timeline.push({ type: "game", set: set.setNumber, game: game.gameNumber, p1Score, p2Score, winner: gWinner, time: game.endTime });
    });
    if (set.setWinner) {
      const sWinner = typeof set.setWinner === "object" ? set.setWinner.playerName : set.setWinner;
      timeline.push({ type: "set", set: set.setNumber, winner: sWinner === "player1" ? p1 : sWinner === "player2" ? p2 : sWinner });
    }
  });
  if (winner) timeline.push({ type: "match", winner, p1Sets, p2Sets });

  // Sport-specific derived data for scoreboard display
  const result = match.result || {};
  const finalScore = result.finalScore || {};

  // For single-result sports (Chess, Carrom): extract the actual result
  const singleResult = config.scoringType === "single" ? (result.result || finalScore.result || null) : null;
  const singleResultLabel = singleResult && config.scoring?.resultLabels?.[singleResult];

  // Live block from the backend (cricket innings / carrom board incremental state)
  const ls = match.liveScore && match.liveScore.scoringType ? match.liveScore : null;
  const live = ls ? {
    scoringType: ls.scoringType,
    currentInnings: ls.currentInnings ?? null,
    battingPlayer: ls.battingPlayer ?? null,
    target: ls.target ?? null,
    required: ls.required ?? null,
    ballsRemaining: ls.ballsRemaining ?? null,
    requiredRate: ls.requiredRate ?? null,
    currentRunRate: ls.currentRunRate ?? null,
    innings: ls.innings ?? [],
    boards: ls.boards ?? [],
    p1Boards: ls.player1Boards ?? 0,
    p2Boards: ls.player2Boards ?? 0,
    p1Points: ls.player1Points ?? 0,
    p2Points: ls.player2Points ?? 0,
  } : null;

  // For Cricket/innings: prefer the live innings array; fall back to finalScore.
  const liveInn = (side) => (live?.innings || []).find((i) => i.battingSide === side) || null;
  const innings = {
    p1Runs: liveInn("player1")?.runs ?? finalScore.player1Runs ?? finalScore.player1 ?? result.player1Score ?? null,
    p2Runs: liveInn("player2")?.runs ?? finalScore.player2Runs ?? finalScore.player2 ?? result.player2Score ?? null,
    p1Wickets: liveInn("player1")?.wickets ?? finalScore.player1Wickets ?? null,
    p2Wickets: liveInn("player2")?.wickets ?? finalScore.player2Wickets ?? null,
    p1Overs: liveInn("player1") ? `${liveInn("player1").oversBowled}.${liveInn("player1").ballsBowled}` : (finalScore.player1Overs ?? null),
    p2Overs: liveInn("player2") ? `${liveInn("player2").oversBowled}.${liveInn("player2").ballsBowled}` : (finalScore.player2Overs ?? null),
  };

  // For Carrom/board: boards won + points
  const board = {
    p1Boards: live?.p1Boards ?? finalScore.player1Sets ?? 0,
    p2Boards: live?.p2Boards ?? finalScore.player2Sets ?? 0,
    p1Points: live?.p1Points ?? 0,
    p2Points: live?.p2Points ?? 0,
    boards: live?.boards ?? [],
  };

  // For time-based (Football, Basketball): extract goals/points
  const timeScore = {
    p1Score: finalScore.player1Goals ?? finalScore.player1Points ?? finalScore.player1 ?? p1Sets,
    p2Score: finalScore.player2Goals ?? finalScore.player2Points ?? finalScore.player2 ?? p2Sets,
  };

  return {
    match, isLoading, error, config, matchFormat, lastUpdated: dataUpdatedAt, isRealtime,
    derived: {
      p1, p2, p1Sets, p2Sets, sets, status, isLive, isCompleted, winner, timeline, sportName,
      singleResult, singleResultLabel, innings, timeScore, live, board,
    },
  };
}
