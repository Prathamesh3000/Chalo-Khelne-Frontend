import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Calendar, MapPin } from "lucide-react";
import MCreateTournament from "../Manager/MCreateTournament";

const STATUS_STYLE = {
  Draft: "bg-white/10 text-gray-300", Planned: "bg-blue-500/20 text-blue-300",
  Live: "bg-rose-500/20 text-rose-300", Completed: "bg-emerald-500/20 text-emerald-300",
  Cancelled: "bg-red-500/20 text-red-300",
};

export default function EventPlanner() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const { data } = await axios.get("/api/agency-events");
      setEvents(data.events || []);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to load events"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // The manager tournament wizard creates the Tournament; we wrap it in an
  // AgencyEvent so it shows up in the Event OS.
  const onWizardSuccess = async (tournament) => {
    try {
      if (tournament?._id) {
        await axios.post("/api/agency-events/from-tournament", { tournamentId: tournament._id });
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Tournament created, but linking the event failed.");
    } finally {
      setShowWizard(false);
      load();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-black text-white">Event Planner</h1>
          <p className="text-gray-500 text-[13px] mt-0.5">Create an event — it runs on the full tournament engine (sports, formats, categories, live scoring).</p>
        </div>
        <button onClick={() => setShowWizard(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] px-4 py-2.5 rounded-lg transition w-auto">
          <Plus size={16} /> New Event
        </button>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-3.5">{err}</div>}

      {loading ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : events.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <Calendar size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Click “New Event” to create one with the tournament wizard.</div>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {events.map((ev) => (
            <button key={ev._id} onClick={() => nav(`/agency/event/${ev._id}`)}
              className="text-left bg-[#181A22] border border-white/[0.06] hover:border-white/[0.14] rounded-2xl p-4 transition w-auto">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[15px] font-bold text-white">{ev.name}</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">{ev.type} · {(ev.sports || []).join(", ") || "—"}</div>
                </div>
                <span className={`text-[10px] font-bold rounded-full px-2.5 py-1 ${STATUS_STYLE[ev.status] || "bg-white/10 text-gray-300"}`}>{ev.status}</span>
              </div>
              <div className="flex gap-3.5 mt-3 text-[12px] text-gray-400">
                {ev.date && <span className="flex items-center gap-1.5"><Calendar size={13} /> {ev.date}</span>}
                {ev.venue && <span className="flex items-center gap-1.5"><MapPin size={13} /> {ev.venue}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* The full manager tournament-creation wizard. redirectOnSuccess=false
          keeps us in the Event OS; onSuccess wraps the new tournament as an event. */}
      {showWizard && (
        <MCreateTournament
          showPopup={showWizard}
          setShowPopup={setShowWizard}
          redirectOnSuccess={false}
          onSuccess={onWizardSuccess}
        />
      )}
    </div>
  );
}
