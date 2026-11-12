/**
 * The query a manager screen uses to load "my tournaments".
 *
 * Kept free of React so the scoping rule is unit-testable. The dashboard and the
 * tournaments list both build their query from this, so they share one cache
 * entry and can never disagree about what "mine" means.
 *
 * "Mine" = the manager-scoped endpoint (`/tournaments/manager/:id`): tournaments
 * where the manager, or their parent club, is in `managerId` — public AND
 * private. The unscoped `/tournaments` endpoint is the public player-facing
 * listing (other clubs' events, no private ones, first 20 only) and must never
 * back a "my tournaments" number.
 */
export function myTournamentsQuery(user) {
  const managerId = user?._id || user?.id || null;
  const filters = managerId ? { managerId } : {};
  return {
    managerId,
    filters,
    // Same shape useTournaments(filters) uses, so both hit one cache entry.
    queryKey: ["tournaments", filters],
    // Never fall back to the public listing while the user is still loading.
    enabled: !!managerId,
  };
}
