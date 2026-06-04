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

  const kf = (getKnockoutFormat(tournament) || "").toLowerCase();
  const dest = (kf.includes("team") || kf.includes("davis"))
    ? `/tournament-management/team-knockouts?tournamentId=${tournamentId}`
    : `/tournament-management/direct-knockout?tournamentId=${tournamentId}`;
  return <Navigate to={dest} replace />;
}
