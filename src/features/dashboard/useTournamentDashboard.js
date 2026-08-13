import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRealtimeTournament } from "../realtime";

const fetchTournament = async (id) => {
  const res = await axios.get(`/api/tournaments/${id}`);
  return res.data.tournament || res.data;
};

const fetchGroups = async (id) => {
  const res = await axios.get(`/api/tournaments/bookinggroups/tournament/${id}`);
  return res.data?.data || [];
};

const fetchPlayers = async (id) => {
  const res = await axios.get(`/api/tournaments/getRegisteredPlayers?tournamentId=${id}`);
  return res.data?.bookings || [];
};

const fetchAllMatches = async (tournamentId, groups) => {
  const all = [];
  for (const g of groups.slice(0, 30)) {
    try {
      const res = await axios.get(`/api/tournaments/matches/${tournamentId}/${g._id}`);
      const matches = (res.data?.matches || []).map((m) => ({ ...m, groupName: g.groupName, groupId: g._id }));
      all.push(...matches);
    } catch (err) {
      console.warn(`Dashboard match fetch failed for group ${g._id}:`, err.message);
    }
  }
  return all;
};

export default function useTournamentDashboard(tournamentId) {
  // WebSocket — updates React Query cache directly, disables polling when connected
  const { isRealtime, fallbackInterval } = useRealtimeTournament(tournamentId);
  const tournament = useQuery({
    queryKey: ["dashboard-tournament", tournamentId],
    queryFn: () => fetchTournament(tournamentId),
    enabled: !!tournamentId,
  });

  const groups = useQuery({
    queryKey: ["dashboard-groups", tournamentId],
    queryFn: () => fetchGroups(tournamentId),
    enabled: !!tournamentId,
  });

  const players = useQuery({
    queryKey: ["dashboard-players", tournamentId],
    queryFn: () => fetchPlayers(tournamentId),
    enabled: !!tournamentId,
  });

  const matches = useQuery({
    queryKey: ["dashboard-matches", tournamentId],
    queryFn: () => fetchAllMatches(tournamentId, groups.data || []),
    enabled: !!tournamentId && !!groups.data && groups.data.length > 0,
    refetchInterval: isRealtime ? false : (fallbackInterval || 10000),
  });

  const allMatches = matches.data || [];
  const live = allMatches.filter((m) => m.status === "IN_PROGRESS" || m.status === "in_progress");
  const completed = allMatches.filter((m) => m.status === "COMPLETED" || m.status === "completed");
  const upcoming = allMatches.filter((m) => m.status === "SCHEDULED" || m.status === "pending");
  const progress = allMatches.length > 0 ? Math.round((completed.length / allMatches.length) * 100) : 0;

  return {
    tournament: tournament.data,
    groups: groups.data || [],
    players: players.data || [],
    allMatches,
    live,
    completed,
    upcoming,
    progress,
    loading: tournament.isLoading || groups.isLoading,
    refetchMatches: matches.refetch,
    isRealtime,
  };
}
