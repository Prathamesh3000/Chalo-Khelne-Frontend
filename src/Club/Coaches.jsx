import { useEffect, useState } from "react";
import axios from "axios";
import { GraduationCap, Plus, X, Star, Trash2, Zap } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const SPORTS = ["Tennis", "Badminton", "Padel", "Cricket", "Swimming", "Football", "Pickleball", "Table Tennis"];
const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
const ATT = ["Present", "Absent", "On Leave"];
const ATT_ON = { Present: "bg-emerald-600 text-white", Absent: "bg-rose-600 text-white", "On Leave": "bg-amber-500 text-black" };

export default function Coaches() {
  const [coaches, setCoaches] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, onLeave: 0, payroll: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const blank = { name: "", sport: "Tennis", hourlyRate: 40, availability: "Monday, Wednesday, Friday" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get("/api/club/coaches"); setCoaches(data.coaches || []); setStats(data.stats || stats); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load coaches"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = (c) => setCoaches((l) => l.map((x) => x._id === c._id ? c : x));
  const addCoach = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Coach name is required"); return; }
    try {
      const { data } = await axios.post("/api/club/coaches", { ...form, hourlyRate: Number(form.hourlyRate) || 0, availability: form.availability.split(",").map((s) => s.trim()).filter(Boolean) });
      setCoaches((c) => [...c, data.coach]); setStats((s) => ({ ...s, total: s.total + 1, available: s.available + 1 })); setForm(blank); setAddOpen(false);
    } catch (e) { setErr(e?.response?.data?.message || "Could not add coach"); }
  };
  const setAttendance = async (c, attendanceToday) => {
    try { const { data } = await axios.patch(`/api/club/coaches/${c._id}/attendance`, { attendanceToday }); patch(data.coach); load(); }
    catch (e) { setErr(e?.response?.data?.message || "Could not update"); }
  };
  const assign = async (c) => {
    try { const { data } = await axios.patch(`/api/club/coaches/${c._id}/assign-session`, {}); patch(data.coach); setStats((s) => ({ ...s, payroll: s.payroll + (Number(c.hourlyRate) || 0) })); }
    catch (e) { setErr(e?.response?.data?.message || "Could not assign session"); }
  };
  const del = async (c) => { setCoaches((l) => l.filter((x) => x._id !== c._id)); try { await axios.delete(`/api/club/coaches/${c._id}`); load(); } catch { load(); } };

  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Coaches &amp; Trainers</h2>
          <p className="text-gray-500 text-[13px] mt-1">Rosters, daily check-in, and session payroll.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Coach</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {[["Coaches", stats.total, "text-white"], ["Available Today", stats.available, "text-emerald-300"], ["On Leave", stats.onLeave, "text-amber-300"], ["Payroll Paid", money(stats.payroll), "text-rose-300"]].map(([l, v, t]) => (
          <div key={l} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[130px]"><div className={`text-[20px] font-black ${t}`}>{v}</div><div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{l}</div></div>
        ))}
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : coaches.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500"><GraduationCap size={40} className="opacity-30 mx-auto mb-3" /><div className="text-gray-300 font-semibold">No coaches</div><div className="text-[13px] mt-1">Add your first coach.</div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((c) => (
            <div key={c._id} className="group bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center">{c.name.charAt(0).toUpperCase()}</div>
                  <div><div className="text-[14px] font-bold text-white">{c.name}</div><div className="text-[11px] text-gray-500 font-mono uppercase">{c.sport}</div></div>
                </div>
                <div className="flex items-center gap-1 text-amber-300 text-[12px] font-bold"><Star size={13} className="fill-amber-300" /> {c.rating}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-[#12141B] border border-white/[0.06] rounded-lg px-3 py-2"><div className="text-[10px] text-gray-500 uppercase">Sessions</div><div className="text-[15px] font-black text-gray-100">{c.sessionsCount}</div></div>
                <div className="bg-[#12141B] border border-white/[0.06] rounded-lg px-3 py-2"><div className="text-[10px] text-gray-500 uppercase">Earnings</div><div className="text-[15px] font-black text-emerald-300">{money(c.earnings)}</div></div>
              </div>

              <div className="mt-3">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1.5">Attendance</div>
                <div className="flex gap-1.5">
                  {ATT.map((a) => (
                    <button key={a} onClick={() => setAttendance(c, a)} className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg w-auto ${c.attendanceToday === a ? ATT_ON[a] : "bg-[#12141B] border border-white/[0.08] text-gray-400 hover:text-white"}`}>{a}</button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-500">{money(c.hourlyRate)}/hr</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => assign(c)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg w-auto"><Zap size={12} /> Assign Session</button>
                  <button onClick={() => del(c)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1.5 w-auto bg-transparent"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <div
        role="dialog"
        aria-modal="true"
        onClick={() => setAddOpen(false)}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <DialogA11y onClose={() => setAddOpen(false)} />
          <div onClick={(e) => e.stopPropagation()} className="bg-[#181A22] rounded-2xl max-w-md w-full overflow-hidden border border-white/[0.1] shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#0a0d14]">
              <div><span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">Roster</span><h3 className="text-[17px] font-bold text-white mt-0.5">Add Coach</h3></div>
              <button onClick={() => setAddOpen(false)} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
            </div>
            <form onSubmit={addCoach} className="p-5 space-y-3.5">
              <div><label className={label} htmlFor="name">Name *</label><input id="name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="sport">Sport</label><select id="sport" className={input} value={form.sport} onChange={(e) => set("sport", e.target.value)}>{SPORTS.map((s) => <option key={s} value={s} className="bg-[#181A22]">{s}</option>)}</select></div>
                <div><label className={label} htmlFor="hourly-rate">Hourly Rate (₹)</label><input id="hourly-rate" className={input} type="number" min="0" value={form.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} /></div>
              </div>
              <div><label className={label} htmlFor="availability-comma-separated">Availability (comma-separated days)</label><input id="availability-comma-separated" className={input} value={form.availability} onChange={(e) => set("availability", e.target.value)} placeholder="Monday, Wednesday, Friday" /></div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Add Coach</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
