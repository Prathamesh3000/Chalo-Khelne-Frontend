import { Navigate, useParams } from "react-router-dom";

/**
 * V2 GroupDetailPage retired. Drill-down into a group + standings lives on
 * the legacy /tournament-management/group-stage/.../scoreboard page (the
 * Score Board view) which is what the legacy generate-matches flow points
 * at after matches are created.
 */
export default function GroupDetailPage() {
  const { tournamentId, groupId } = useParams();
  return (
    <Navigate
      to={`/tournament-management/group-stage/${tournamentId}/${groupId}/scoreboard`}
      replace
    />
  );
}
