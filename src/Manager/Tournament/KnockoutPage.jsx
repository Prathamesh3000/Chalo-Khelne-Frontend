import { Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { getKnockoutFormat } from "../../utils/sportTrack";

/**
 * V2 KnockoutPage retired. Routes to the V1 knockout flow appropriate to
 * the tournament's knockout format — team / Davis Cup vs singles.
 */
export default function KnockoutPage() {
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

  // Route to the Davis-Cup team engine only if a real team-track exists that is
  // NOT a time/innings sport. Football (time) / Cricket (innings) use the Direct
  // engine even though their knockoutFormat is "Teams Knockout".
  const _sports = Array.isArray(tournament?.sports) ? tournament.sports : [];
  const hasDavisCupTrack = _sports.some((s) =>
    ["Davis Cup", "Teams Knockout"].includes(s?.knockoutFormat) &&
    !["time", "innings"].includes((s?.matchFormat?.scoringType || "").toLowerCase())
  );
  const dest = hasDavisCupTrack
    ? `/tournament-management/team-knockouts?tournamentId=${tournamentId}`
    : `/tournament-management/direct-knockout?tournamentId=${tournamentId}`;
  return <Navigate to={dest} replace />;
}
