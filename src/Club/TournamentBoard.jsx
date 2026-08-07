import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Trophy, Plus, Settings2, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import MCreateTournament from "../Manager/MCreateTournament";

const STATUS_STYLE = {
  Draft: "bg-white/10 text-gray-300", Planned: "bg-blue-500/15 text-blue-300",
  Ongoing: "bg-rose-500/15 text-rose-300", Live: "bg-rose-500/15 text-rose-300",
  Completed: "bg-emerald-500/15 text-emerald-300", Cancelled: "bg-red-500/15 text-red-300",
};

/**
 * Club Tournament Board — the facility Club runs its own competitions by REUSING
 * the manager tournament engine. Tournaments are owned via managerId=[club _id]
 * (scopeTournamentCreate self-owner branch), and managed through the shared
 * /tournament-management/* screens (wired in ClubApp, outside ClubLayout).
 */
export default function TournamentBoard() {
  const nav = useNavigate();
  const { auth } = useAuth();
  const clubId = auth?._id || auth?.id;
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true); setErr("");
    try {
      const { data } = await axios.get(`/api/tournaments/manager/${clubId}`);
      setTournaments(data.tournaments || data || []);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to load tournaments"); }
    finally { setLoading(false); }
  }, [clubId]);
  useEffect(() => { load(); }, [load]);

  const onCreated = () => { setShowWizard(false); load(); };
  const manage = (t) => nav(`/tournament-management/group-stage?tournamentId=${t._id}`);
  const sportsLabel = (t) => (t.sports || []).map((s) => s.sportName || s.name || s).filter(Boolean).join(", ") || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><Trophy size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Tournaments</h1>
            <p className="text-gray-500 text-[13px]">Run competitions — groups, fixtures, knockouts and live scoring.</p>
          </div>
        </div>
        <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Create Tournament</button>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {loading ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : tournaments.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <Trophy size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No tournaments yet</div>
          <div className="text-[13px] mt-1">Create your first tournament to manage groups, fixtures and scoring.</div>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {tournaments.map((t) => (
            <div key={t._id} className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-white truncate">{t.title || t.name}</div>
                  <div className="text-[12px] text-gray-500 mt-0.5 truncate">{sportsLabel(t)}</div>
                </div>
                {t.status && <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 flex-shrink-0 ${STATUS_STYLE[t.status] || "bg-white/10 text-gray-300"}`}>{t.status}</span>}
              </div>
              {(t.startDate || t.tournamentType) && (
                <div className="flex gap-3.5 mt-2.5 mb-3.5 text-[12px] text-gray-400">
                  {t.startDate && <span className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(t.startDate).toISOString().slice(0, 10)}</span>}
                  {t.tournamentType && <span className="capitalize">{t.tournamentType}</span>}
                </div>
              )}
              <button onClick={() => manage(t)} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg transition mt-2">
                <Settings2 size={15} /> Manage tournament
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Full manager tournament-creation wizard. redirectOnSuccess=false keeps us
          in the Club shell; onSuccess refreshes the board. Owned via managerId=[club]. */}
      {showWizard && (
        <MCreateTournament showPopup={showWizard} setShowPopup={setShowWizard} redirectOnSuccess={false} onSuccess={onCreated} />
      )}
    </div>
  );
}
