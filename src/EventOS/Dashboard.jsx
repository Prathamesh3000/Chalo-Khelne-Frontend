import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Calendar, Radio, CalendarClock, CheckCircle2, ListTodo } from "lucide-react";

const STATUS_STYLE = {
  Draft: "bg-white/10 text-gray-300", Planned: "bg-blue-500/20 text-blue-300",
  Live: "bg-rose-500/20 text-rose-300", Completed: "bg-emerald-500/20 text-emerald-300",
  Cancelled: "bg-red-500/20 text-red-300",
};

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/agency-events/dashboard/summary");
        setStats(data.stats); setRecent(data.recentEvents || []);
      } catch (e) { setErr(e?.response?.data?.message || "Failed to load dashboard"); }
      finally { setLoading(false); }
    })();
  }, []);

  const tiles = [
    { key: "totalEvents", label: "Total Events", icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { key: "live", label: "Live Now", icon: Radio, color: "text-rose-400", bg: "bg-rose-500/10" },
    { key: "upcoming", label: "Upcoming", icon: CalendarClock, color: "text-blue-400", bg: "bg-blue-500/10" },
    { key: "completed", label: "Completed", icon: CheckCircle2, color: "text-gray-300", bg: "bg-white/[0.06]" },
    { key: "pendingTasks", label: "Pending Tasks", icon: ListTodo, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div>
      <h1 className="text-[22px] font-black text-white">Dashboard</h1>
      <p className="text-gray-500 text-[13px] mt-0.5 mb-5">Your agency's event operations at a glance.</p>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {loading ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : (
        <>
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.key} className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4">
                  <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center mb-3`}>
                    <Icon size={18} className={t.color} />
                  </div>
                  <div className="text-[28px] font-black text-white leading-none">{stats?.[t.key] ?? 0}</div>
                  <div className="text-[12px] text-gray-500 mt-1">{t.label}</div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-200">Recent Events</h2>
            <button onClick={() => nav("/agency/planner")} className="text-[12px] text-emerald-400 hover:text-emerald-300 w-auto bg-transparent">View all →</button>
          </div>
          {recent.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-10 text-center text-gray-500">
              <Calendar size={36} className="opacity-30 mx-auto mb-3" />
              <div className="text-gray-300 font-semibold">No events yet</div>
              <button onClick={() => nav("/agency/planner")} className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold px-4 py-2 rounded-lg w-auto">Create your first event</button>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {recent.map((ev) => (
                <button key={ev._id} onClick={() => nav(`/agency/event/${ev._id}`)}
                  className="text-left bg-[#181A22] border border-white/[0.06] hover:border-white/[0.14] rounded-2xl p-4 transition w-auto">
                  <div className="flex justify-between items-start">
                    <div className="text-[14px] font-bold text-white">{ev.name}</div>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS_STYLE[ev.status] || "bg-white/10 text-gray-300"}`}>{ev.status}</span>
                  </div>
                  <div className="text-[12px] text-gray-500 mt-1">{ev.type} · {(ev.sports || []).join(", ") || "—"}</div>
                  {ev.date && <div className="text-[12px] text-gray-400 mt-1">{ev.date}{ev.venue ? ` · ${ev.venue}` : ""}</div>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
