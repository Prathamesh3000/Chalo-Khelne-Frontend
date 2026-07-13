import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Briefcase, Clock, User, Trash2 } from "lucide-react";

const STAFF_ROLES = ["Manager", "Coordinator", "Volunteer", "Referee", "Photographer", "Commentator", "Ground Staff", "Security", "Medical"];
const STATUS_STYLE = {
  Active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "On Break": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Offline: "bg-white/10 text-gray-400 border-white/10",
};
const ATT_COLOR = { Present: "text-emerald-300", Absent: "text-red-300", Pending: "text-amber-300" };

export default function StaffHub() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [crew, setCrew] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", role: "Volunteer", reportingManager: "", shiftStart: "", shiftEnd: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/agency-events");
        const list = data.events || [];
        setEvents(list);
        if (list.length) setSel(list[0]._id);
      } catch (e) { setErr(e?.response?.data?.message || "Failed to load events"); }
      finally { setLoadingEvents(false); }
    })();
  }, []);

  const load = async (id) => {
    setLoadingRows(true); setErr("");
    try { const { data } = await axios.get(`/api/agency-events/${id}/staff`); setCrew(data.staff || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load crew"); }
    finally { setLoadingRows(false); }
  };
  useEffect(() => { if (sel) load(sel); else setCrew([]); }, [sel]);

  const addStaff = async () => {
    if (!form.name.trim()) return;
    try {
      const { data } = await axios.post(`/api/agency-events/${sel}/staff`, {
        name: form.name.trim(), role: form.role, reportingManager: form.reportingManager.trim(),
        shiftStart: form.shiftStart, shiftEnd: form.shiftEnd,
      });
      setCrew((c) => [...c, data.staff]);
      setForm({ name: "", role: "Volunteer", reportingManager: "", shiftStart: "", shiftEnd: "" });
    } catch (e) { setErr(e?.response?.data?.message || "Could not add staff"); }
  };
  const patch = async (m, body) => {
    setCrew((list) => list.map((x) => x._id === m._id ? { ...x, ...body } : x));
    try { await axios.patch(`/api/agency-events/${sel}/staff/${m._id}`, body); } catch { load(sel); }
  };
  const del = async (m) => {
    setCrew((list) => list.filter((x) => x._id !== m._id));
    try { await axios.delete(`/api/agency-events/${sel}/staff/${m._id}`); } catch { load(sel); }
  };

  const input = "bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const btn = "flex-1 text-[11.5px] font-bold rounded-md py-1.5 transition w-auto";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><Briefcase size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Staff Hub</h1>
            <p className="text-gray-500 text-[13px]">Onboard and roster your event crew — roles, shifts, attendance.</p>
          </div>
        </div>
        {events.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active workspace</span>
            <select value={sel} onChange={(e) => setSel(e.target.value)}
              className="bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-white/25 min-w-[240px]">
              {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-[#181A22]">{ev.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {loadingEvents ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : events.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <Briefcase size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button> to roster staff.</div>
        </div>
      ) : (
        <>
          {/* Onboard */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4 mb-5">
            <h2 className="text-[14px] font-bold text-white mb-3">Onboard & Roster Staff Crew</h2>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1.3fr 1fr 1.1fr 90px 90px auto" }}>
              <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Staff full name" />
              <select className={input} value={form.role} onChange={(e) => set("role", e.target.value)}>
                {STAFF_ROLES.map((r) => <option key={r} value={r} className="bg-[#181A22]">{r}</option>)}
              </select>
              <input className={input} value={form.reportingManager} onChange={(e) => set("reportingManager", e.target.value)} placeholder="Reports to (e.g. Rohan Sharma)" />
              <input className={input} value={form.shiftStart} onChange={(e) => set("shiftStart", e.target.value)} placeholder="07:00" />
              <input className={input} value={form.shiftEnd} onChange={(e) => set("shiftEnd", e.target.value)} placeholder="18:00" />
              <button onClick={addStaff} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] px-4 rounded-lg w-auto whitespace-nowrap">Assign Staff Node</button>
            </div>
          </div>

          {/* Roster */}
          <h2 className="text-[14px] font-bold text-gray-200 mb-3">Roster Crew List</h2>
          {loadingRows ? (
            <div className="text-gray-500 py-8 text-center">Loading…</div>
          ) : crew.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl py-12 text-center text-gray-500 text-[13px]">No staff assigned yet.</div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
              {crew.map((m) => (
                <div key={m._id} className="group bg-[#181A22] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[15px] font-bold text-white">{m.name}</div>
                      <div className="text-[10.5px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{m.role}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold rounded border px-2 py-0.5 uppercase ${STATUS_STYLE[m.status]}`}>{m.status}</span>
                      <button onClick={() => del(m)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-[12.5px] text-gray-400">
                    <div className="flex items-center gap-1.5"><Clock size={13} /> Shift: <span className="font-mono text-gray-300">{m.shiftStart || "—"}{m.shiftEnd ? ` - ${m.shiftEnd}` : ""}</span></div>
                    <div className="flex items-center gap-1.5"><User size={13} /> Report to: <span className="text-gray-300">{m.reportingManager || "—"}</span></div>
                    <div>Attendance: <span className={`font-bold ${ATT_COLOR[m.attendance]}`}>{m.attendance}</span></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => patch(m, { status: "Active" })} className={`${btn} border ${m.status === "Active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/10"}`}>Set Active</button>
                    <button onClick={() => patch(m, { status: "On Break" })} className={`${btn} ${m.status === "On Break" ? "bg-amber-500/25 text-amber-200" : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"}`}>Break</button>
                    <button onClick={() => patch(m, { attendance: "Present" })} className={`${btn} border border-white/[0.1] text-gray-300 hover:bg-white/[0.05]`}>Mark Present</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
