import { Navigate, useParams } from "react-router-dom";

/**
 * V2 GroupListPage retired in favour of the legacy /tournament-management/
 * group-stage page which has its own "Groups" tab plus the player selection
 * and Create Groups action. One canonical place for group management.
 */
export default function GroupListPage() {
  const { tournamentId } = useParams();
  return (
    <Navigate
      to={`/tournament-management/group-stage?tournamentId=${tournamentId}`}
      replace
    />
  );
}
