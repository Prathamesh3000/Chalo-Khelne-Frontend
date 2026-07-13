import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Calendar, MapPin, Users, Trophy } from "lucide-react";
import ChecklistBoard from "./ChecklistBoard";

export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try { const { data } = await axios.get(`/api/agency-events/${id}`); setEvent(data.event); }
      catch (e) { setErr(e?.response?.data?.message || "Failed to load event"); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading…</div>;
  if (!event) return <div className="text-red-300">{err || "Event not found"}</div>;

  return (
    <div>
      <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-white mb-4 w-auto bg-transparent">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Event header */}
      <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-black text-white">{event.name}</h1>
            <div className="text-[13px] text-gray-500 mt-1">{event.type} · {(event.sports || []).join(", ") || "—"}</div>
          </div>
          <span className="text-[11px] font-bold rounded-full px-3 py-1 bg-white/10 text-gray-200">{event.status}</span>
        </div>
        <div className="flex gap-5 mt-3 text-[13px] text-gray-400 flex-wrap">
          {event.date && <span className="flex items-center gap-1.5"><Calendar size={14} /> {event.date}{event.time ? ` · ${event.time}` : ""}</span>}
          {event.venue && <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.venue}</span>}
          {!!event.expectedParticipants && <span className="flex items-center gap-1.5"><Users size={14} /> {event.expectedParticipants} expected</span>}
          <span className="text-gray-500">Registration: {event.registrationType}{event.registrationFee ? ` · ₹${event.registrationFee}` : ""}</span>
        </div>
      </div>

      {/* Linked tournament */}
      {event.linkedTournamentId ? (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy size={18} className="text-emerald-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-emerald-200">Tournament ready</div>
            <div className="text-[12.5px] text-emerald-100/70">Groups, fixtures, knockouts & live scoring — powered by the tournament engine.</div>
          </div>
          <button onClick={() => nav(`/tournament-management/group-stage?tournamentId=${event.linkedTournamentId}`)}
            className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] px-4 py-2 rounded-lg w-auto">
            Manage tournament
          </button>
        </div>
      ) : null}

      {/* Operation checklist */}
      <ChecklistBoard eventId={id} />
    </div>
  );
}
