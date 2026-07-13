import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Clock } from "lucide-react";
import ScheduleBoard from "./ScheduleBoard";

/**
 * Standalone Schedule Planner module (sidebar → /agency/schedule).
 * Pick an event, then plan its day-of milestone timeline.
 */
export default function SchedulePlanner() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/agency-events");
        const list = data.events || [];
        setEvents(list);
        if (list.length) setSel(list[0]._id);
      } catch (e) { setErr(e?.response?.data?.message || "Failed to load events"); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-[22px] font-black text-white flex items-center gap-2.5"><Clock size={22} /> Schedule Planner</h1>
      <p className="text-gray-500 text-[13px] mt-0.5 mb-5">The day-of operational sequence for each event.</p>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {loading ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : events.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <Clock size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button> to plan its schedule.</div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {events.map((ev) => (
              <button key={ev._id} onClick={() => setSel(ev._id)}
                className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition w-auto ${sel === ev._id ? "bg-emerald-600 text-white" : "bg-[#181A22] border border-white/[0.08] text-gray-300 hover:bg-white/[0.05]"}`}>
                {ev.name}
              </button>
            ))}
          </div>
          {sel && <ScheduleBoard eventId={sel} />}
        </>
      )}
    </div>
  );
}
