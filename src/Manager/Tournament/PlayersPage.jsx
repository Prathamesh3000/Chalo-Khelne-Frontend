import { Navigate, useParams } from "react-router-dom";

/**
 * V2 PlayersPage has been retired. It was a read-only mirror of the
 * registered-players list that the legacy /tournament-management/group-stage
 * page already shows — same data, same table, but missing the player
 * checkboxes + Create Groups action that live on the legacy page.
 *
 * Routing the URL directly to the legacy view kills the redundant click
 * without removing the route (deep links and the TournamentStepper still
 * work). When the full V2 tournament flow lands, replace this redirect
 * with the real V2 implementation.
 */
export default function PlayersPage() {
  const { tournamentId } = useParams();
  return (
    <Navigate
      to={`/tournament-management/group-stage?tournamentId=${tournamentId}`}
      replace
    />
  );
}
