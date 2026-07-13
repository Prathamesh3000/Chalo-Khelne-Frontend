import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ShieldCheck, Plus, Trash2 } from "lucide-react";

const ATT_CYCLE = { Pending: "Present", Present: "Absent", Absent: "Pending" };
const ATT_STYLE = {
  Present: "text-emerald-300 border-emerald-500/30",
  Absent: "text-red-300 border-red-500/30",
  Pending: "text-amber-300 border-amber-500/30",
};

export default function OfficialsHub() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [officials, setOfficials] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", sport: "", court: "", shiftStart: "", shiftEnd: "", payout: "" });
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
    try { const { data } = await axios.get(`/api/agency-events/${id}/officials`); setOfficials(data.officials || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load officials"); }
    finally { setLoadingRows(false); }
  };
  useEffect(() => { if (sel) load(sel); else setOfficials([]); }, [sel]);

  const selEvent = events.find((e) => e._id === sel);
  const sports = selEvent?.sports || [];

  const addOfficial = async () => {
    if (!form.name.trim()) return;
    try {
      const { data } = await axios.post(`/api/agency-events/${sel}/officials`, {
        name: form.name.trim(), sport: form.sport, court: form.court.trim(),
        shiftStart: form.shiftStart, shiftEnd: form.shiftEnd, payout: Number(form.payout) || 0,
      });
      setOfficials((o) => [...o, data.official]);
      setForm({ name: "", sport: "", court: "", shiftStart: "", shiftEnd: "", payout: "" });
    } catch (e) { setErr(e?.response?.data?.message || "Could not add official"); }
  };
  const cycleAtt = async (o) => {
    const attendance = ATT_CYCLE[o.attendance] || "Present";
    setOfficials((list) => list.map((x) => x._id === o._id ? { ...x, attendance } : x));
    try { await axios.patch(`/api/agency-events/${sel}/officials/${o._id}`, { attendance }); } catch { load(sel); }
  };
  const del = async (o) => {
    setOfficials((list) => list.filter((x) => x._id !== o._id));
    try { await axios.delete(`/api/agency-events/${sel}/officials/${o._id}`); } catch { load(sel); }
  };

  const input = "bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const th = "text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left px-4 py-3";
  const td = "px-4 py-3.5 text-[13px] text-gray-300 border-t border-white/[0.05]";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><ShieldCheck size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Officials Hub</h1>
            <p className="text-gray-500 text-[13px]">Certified referees & umpires assigned to courts and tables.</p>
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
          <ShieldCheck size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button> to assign officials.</div>
        </div>
      ) : (
        <>
          {/* Add official */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4 mb-4">
            <h2 className="text-[14px] font-bold text-white mb-3">Assign an Official</h2>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 90px 90px 110px" }}>
              <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Official name" />
              <select className={input} value={form.sport} onChange={(e) => set("sport", e.target.value)}>
                <option value="" className="bg-[#181A22]">Sport…</option>
                {sports.map((s) => <option key={s} value={s} className="bg-[#181A22]">{s}</option>)}
              </select>
              <input className={input} value={form.court} onChange={(e) => set("court", e.target.value)} placeholder="Court / Table" />
              <input className={input} value={form.shiftStart} onChange={(e) => set("shiftStart", e.target.value)} placeholder="09:00" />
              <input className={input} value={form.shiftEnd} onChange={(e) => set("shiftEnd", e.target.value)} placeholder="15:00" />
              <input className={input} value={form.payout} onChange={(e) => set("payout", e.target.value.replace(/[^0-9]/g, ""))} placeholder="₹ Payout" inputMode="numeric" />
            </div>
            <button onClick={addOfficial} className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg mt-2 w-auto">
              <Plus size={15} /> Add Official
            </button>
          </div>

          {/* Roster */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[14px] font-bold text-white">Tournament Officials, Referees & Umpires Roster</h2>
              <p className="text-[12.5px] text-gray-500 mt-0.5">Certified match adjudicators assigned for courts and tables.</p>
            </div>
            {loadingRows ? (
              <div className="text-gray-500 py-10 text-center">Loading…</div>
            ) : officials.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-[13px]">No officials assigned yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className={th}>Official Name</th>
                      <th className={th}>Sport Roster</th>
                      <th className={th}>Assigned Court</th>
                      <th className={th}>Shift Timing</th>
                      <th className={th}>Day Payout</th>
                      <th className={th}>Attendance</th>
                      <th className={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {officials.map((o) => (
                      <tr key={o._id} className="group hover:bg-white/[0.02]">
                        <td className={`${td} font-bold text-white`}>{o.name}</td>
                        <td className={td}>{o.sport || "—"}</td>
                        <td className={td}>{o.court || "—"}</td>
                        <td className={`${td} font-mono text-gray-400`}>{o.shiftStart || "—"}{o.shiftEnd ? ` - ${o.shiftEnd}` : ""}</td>
                        <td className={`${td} font-bold text-emerald-400`}>{o.payout ? `₹${o.payout.toLocaleString()}` : "—"}</td>
                        <td className={td}>
                          <button onClick={() => cycleAtt(o)} className={`text-[11px] font-bold rounded border px-2.5 py-1 bg-transparent w-auto ${ATT_STYLE[o.attendance]}`}>{o.attendance}</button>
                        </td>
                        <td className={td}>
                          <button onClick={() => del(o)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
