import { useQuery } from "@tanstack/react-query";
import { listTournaments, getTournament, listTournamentsByManager } from "../api/tournaments";

export function useTournaments(filters = {}) {
  return useQuery({
    queryKey: ["tournaments", filters],
    queryFn: () => listTournaments(filters),
  });
}

export function useTournament(id) {
  return useQuery({
    queryKey: ["tournament", id],
    queryFn: () => getTournament(id),
    enabled: !!id,
  });
}

export function useManagerTournaments(managerId) {
  return useQuery({
    queryKey: ["tournaments", "manager", managerId],
    queryFn: () => listTournamentsByManager(managerId),
    enabled: !!managerId,
  });
}
