import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Trophy, Settings2, Calendar, MapPin } from "lucide-react";

const STATUS_STYLE = {
  Draft: "bg-white/10 text-gray-300", Planned: "bg-blue-500/20 text-blue-300",
  Live: "bg-rose-500/20 text-rose-300", Completed: "bg-emerald-500/20 text-emerald-300",
  Cancelled: "bg-red-500/20 text-red-300",
};

export default function TournamentBoard() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/agency-events");
        setEvents((data.events || []).filter((e) => e.linkedTournamentId));
      } catch (e) { setErr(e?.response?.data?.message || "Failed to load tournaments"); }
      finally { setLoading(false); }
    })();
  }, []);

  // Open the existing tournament-management hub (groups / fixtures / scoring).
  const manage = (ev) => nav(`/tournament-management/group-stage?tournamentId=${ev.linkedTournamentId}`);

  return (
    <div>
      <h1 className="text-[22px] font-black text-white flex items-center gap-2.5"><Trophy size={22} /> Tournament Board</h1>
      <p className="text-gray-500 text-[13px] mt-0.5 mb-5">Run your events' competitions — groups, fixtures, knockouts and live scoring.</p>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {loading ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : events.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <Trophy size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No tournaments yet</div>
          <div className="text-[13px] mt-1">Create an event with sports in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button> — it becomes a tournament here.</div>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {events.map((ev) => (
            <div key={ev._id} className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-white truncate">{ev.name}</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">{(ev.sports || []).join(", ") || "—"}</div>
                </div>
                <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 flex-shrink-0 ${STATUS_STYLE[ev.status] || "bg-white/10 text-gray-300"}`}>{ev.status}</span>
              </div>
              <div className="flex gap-3.5 mt-2.5 mb-3.5 text-[12px] text-gray-400">
                {ev.date && <span className="flex items-center gap-1.5"><Calendar size={13} /> {ev.date}</span>}
                {ev.venue && <span className="flex items-center gap-1.5"><MapPin size={13} /> {ev.venue}</span>}
              </div>
              <button onClick={() => manage(ev)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg transition">
                <Settings2 size={15} /> Manage tournament
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
