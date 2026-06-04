import { Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  getTournamentType,
  getKnockoutFormat,
} from "../../utils/sportTrack";

/**
 * V2 TournamentOverviewPage retired. The V2 flow duplicated the legacy
 * /tournament-management/* screens and was creating confusion (two places
 * to manage the same tournament with different UIs).
 *
 * Redirects to the right V1 management URL based on the tournament's
 * per-sport type — mirrors MTournamentsList.openTournament and the
 * `resolveManageUrl` helper used by TournamentCard. We don't import that
 * helper here because we need the raw tournament doc (not the normalised
 * card shape) and don't want a circular `Manager → features` dependency.
 */
export default function TournamentOverviewPage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!tournamentId) { setLoading(false); return; }
    axios
      .get(`/api/tournaments/${tournamentId}`)
      .then((r) => { if (!cancelled) setTournament(r.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  const type = (getTournamentType(tournament) || "").toLowerCase();
  let dest;
  if (type.includes("group stage")) {
    dest = `/tournament-management/group-stage?tournamentId=${tournamentId}`;
  } else if (type.includes("knockout")) {
    const kf = (getKnockoutFormat(tournament) || "").toLowerCase();
    dest = (kf.includes("team") || kf.includes("davis"))
      ? `/tournament-management/team-knockouts?tournamentId=${tournamentId}`
      : `/tournament-management/direct-knockout?tournamentId=${tournamentId}`;
  } else {
    dest = `/tournament-management/group-stage?tournamentId=${tournamentId}`;
  }
  return <Navigate to={dest} replace />;
}
