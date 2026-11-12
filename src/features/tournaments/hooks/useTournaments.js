import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth";
import { listTournaments, getTournament, listTournamentsByManager } from "../api/tournaments";
import { myTournamentsQuery } from "../lib/myTournamentsQuery";

export function useTournaments(filters = {}) {
  return useQuery({
    queryKey: ["tournaments", filters],
    queryFn: () => listTournaments(filters),
  });
}

/**
 * The logged-in manager's own tournaments (public + private). Use this for any
 * "my tournaments" count or list so every screen agrees. `isLoading` stays true
 * until the user is known, so callers show a skeleton instead of a flash of
 * zeros (or, worse, someone else's data).
 */
export function useMyTournaments() {
  const { user } = useAuth();
  const { filters, queryKey, enabled } = myTournamentsQuery(user);
  const query = useQuery({
    queryKey,
    queryFn: () => listTournaments(filters),
    enabled,
  });
  return { ...query, isLoading: query.isLoading || !enabled };
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
