import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeMatch, isSocketConnected } from "./socketService";

/**
 * Hook: subscribes to real-time match updates via WebSocket.
 * Updates React Query cache directly — no refetch needed.
 * Falls back to polling interval if socket is disconnected.
 *
 * @param {string} matchId
 * @returns {{ isRealtime: boolean, fallbackInterval: number | false }}
 */
export default function useRealtimeMatch(matchId) {
  const queryClient = useQueryClient();
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!matchId) return;

    const handlers = {
      onScoreUpdate: (data) => {
        // Update live match cache directly — sport-aware fields
        const updatedFields = {
          currentSet: data.currentSet,
          currentGame: data.currentGame,
          liveScore: data.liveScore,
          sets: data.sets,
          status: "IN_PROGRESS",
          // Preserve sport metadata if received from enriched socket.
          // STEP 17b.iii — emit canonical sportName (not legacy sportsType).
          ...(data.scoringType && { matchFormat: { ...(data.matchFormat || {}), scoringType: data.scoringType } }),
          ...(data.sportName && { sportName: data.sportName }),
          // Cricket/carrom carry the latest result subdoc so finalScore renders live
          ...(data.result && { result: data.result }),
        };

        queryClient.setQueryData(["liveMatch", matchId], (old) => {
          if (!old) return old;
          return { ...old, ...updatedFields, sets: data.sets || old.sets };
        });

        queryClient.setQueryData(["matchLiveState", matchId], (old) => {
          if (!old) return old;
          return { ...old, ...updatedFields, sets: data.sets || old.sets };
        });
      },

      onSetComplete: (data) => {
        // Update cache directly with set data, then background refetch for full details
        queryClient.setQueryData(["liveMatch", matchId], (old) => {
          if (!old) return old;
          return { ...old, currentSet: data.currentSet, sets: data.sets || old.sets };
        });
        queryClient.setQueryData(["matchLiveState", matchId], (old) => {
          if (!old) return old;
          return { ...old, currentSet: data.currentSet, sets: data.sets || old.sets };
        });
        // Background refetch for complete data (no loading flicker)
        queryClient.invalidateQueries({ queryKey: ["liveMatch", matchId], refetchType: "none" });
      },

      onMatchComplete: (data) => {
        // Update cache with completion data + normalized result
        const completionFields = {
          status: "COMPLETED",
          winner: data.winner,
          result: data.result,
          ...(data.matchResult && { _normalizedResult: data.matchResult }),
        };
        queryClient.setQueryData(["liveMatch", matchId], (old) => {
          if (!old) return old;
          return { ...old, ...completionFields };
        });
        queryClient.setQueryData(["matchLiveState", matchId], (old) => {
          if (!old) return old;
          return { ...old, ...completionFields };
        });

        // Invalidate tournament-level caches
        if (data.tournamentId) {
          queryClient.invalidateQueries({ queryKey: ["dashboard-matches", data.tournamentId] });
        }
      },
    };

    unsubRef.current = subscribeMatch(matchId, handlers);

    return () => {
      unsubRef.current?.();
    };
  }, [matchId, queryClient]);

  const connected = isSocketConnected();

  return {
    isRealtime: connected,
    // If socket is down, use polling as fallback
    fallbackInterval: connected ? false : 3000,
  };
}
