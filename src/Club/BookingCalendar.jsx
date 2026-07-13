import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, User, Phone, DollarSign, X, Check, Ban, RefreshCw, Trash2, MapPin } from "lucide-react";

const SOURCES = ["Walk-in", "Admin Booking", "Corporate Booking", "School Booking", "Mobile App"];
const SOURCE_BADGE = {
  "Mobile App": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Walk-in": "bg-white/[0.06] text-gray-300 border-white/[0.1]",
  "Admin Booking": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Corporate Booking": "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  "School Booking": "bg-violet-500/15 text-violet-300 border-violet-500/30",
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;

export default function BookingCalendar() {
  const [date, setDate] = useState(todayISO());
  const [sportFilter, setSportFilter] = useState("All");
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState("");
  const blank = { customerName: "", customerPhone: "", courtId: "", startTime: "09:00", duration: 1, source: "Walk-in", isPaid: false, notes: "" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadCourts = async () => { try { const { data } = await axios.get("/api/club/courts"); setCourts(data.courts || []); } catch { /* courts optional */ } };
  const load = async (d = date) => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get(`/api/club/bookings?date=${d}`); setBookings(data.bookings || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load bookings"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadCourts(); }, []);
  useEffect(() => { load(date); }, [date]);

  const shiftDate = (days) => { const d = new Date(date); d.setDate(d.getDate() + days); setDate(d.toISOString().slice(0, 10)); };

  const selectedCourt = courts.find((c) => c._id === form.courtId);
  const estAmount = selectedCourt ? (Number(selectedCourt.pricePerHour) || 0) * (Number(form.duration) || 1) : 0;

  const sports = useMemo(() => ["All", ...Array.from(new Set(courts.map((c) => c.sport)))], [courts]);
  const visible = bookings.filter((b) => sportFilter === "All" || b.sport === sportFilter);
  const summary = useMemo(() => {
    const active = visible.filter((b) => b.status !== "Cancelled");
    return {
      count: active.length,
      collected: active.filter((b) => b.isPaid).reduce((s, b) => s + (b.amount || 0), 0),
      pending: active.filter((b) => !b.isPaid).reduce((s, b) => s + (b.amount || 0), 0),
    };
  }, [visible]);

  const addBooking = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.courtId) { setErr("Customer name and court are required"); return; }
    try {
      const { data } = await axios.post("/api/club/bookings", { ...form, date, duration: Number(form.duration) || 1, amount: estAmount });
      setBookings((b) => [...b, data.booking]);
      setForm(blank); setAddOpen(false);
    } catch (e) { setErr(e?.response?.data?.message || "Could not create booking"); }
  };

  const act = async (b, verb) => {
    setBusyId(b._id);
    try { const { data } = await axios.patch(`/api/club/bookings/${b._id}/${verb}`); setBookings((list) => list.map((x) => x._id === b._id ? data.booking : x)); }
    catch (e) { setErr(e?.response?.data?.message || "Action failed"); }
    finally { setBusyId(""); }
  };
  const del = async (b) => { setBookings((list) => list.filter((x) => x._id !== b._id)); try { await axios.delete(`/api/club/bookings/${b._id}`); } catch { load(); } };

  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Booking Calendar</h2>
          <p className="text-gray-500 text-[13px] mt-1">Court reservations — walk-ins, memberships and app bookings in one timeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#12141B] border border-white/[0.1] rounded-xl overflow-hidden">
            <button onClick={() => shiftDate(-1)} className="px-2.5 py-2 text-gray-400 hover:text-white w-auto bg-transparent"><ChevronLeft size={16} /></button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-[13px] text-gray-100 px-1 py-2 focus:outline-none" />
            <button onClick={() => shiftDate(1)} className="px-2.5 py-2 text-gray-400 hover:text-white w-auto bg-transparent"><ChevronRight size={16} /></button>
          </div>
          <button onClick={() => setDate(todayISO())} className="text-[12px] font-semibold text-gray-300 border border-white/[0.1] hover:bg-white/[0.05] rounded-xl px-3 py-2 w-auto">Today</button>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> New Booking</button>
        </div>
      </div>

      {/* Summary + filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          {[["Bookings", summary.count, "text-white"], ["Collected", money(summary.collected), "text-emerald-300"], ["Pending", money(summary.pending), "text-amber-300"]].map(([l, v, t]) => (
            <div key={l} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-2.5 min-w-[120px]"><div className={`text-[18px] font-black ${t}`}>{v}</div><div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{l}</div></div>
          ))}
        </div>
        <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} className="bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-white/25">
          {sports.map((s) => <option key={s} value={s} className="bg-[#181A22]">{s === "All" ? "All sports" : s}</option>)}
        </select>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {/* Bookings list */}
      {loading ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <CalendarIcon size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No bookings for {date}</div>
          <div className="text-[13px] mt-1">Add a walk-in or reservation with “New Booking”.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((b) => {
            const cancelled = b.status === "Cancelled";
            const busy = busyId === b._id;
            return (
              <div key={b._id} className={`group bg-[#181A22] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4 flex-wrap ${cancelled ? "opacity-60" : ""}`}>
                <div className="w-16 text-center flex-shrink-0">
                  <div className="text-[15px] font-black text-white">{b.startTime}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{b.duration}h</div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-white">{b.customerName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SOURCE_BADGE[b.source] || SOURCE_BADGE["Walk-in"]}`}>{b.source}</span>
                    {cancelled && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-500/15 text-rose-300 border-rose-500/30">Cancelled</span>}
                  </div>
                  <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {b.courtName || "—"} · {b.sport}</span>
                    {b.customerPhone && <span className="flex items-center gap-1"><Phone size={12} /> {b.customerPhone}</span>}
                    {b.coachName && <span className="flex items-center gap-1"><User size={12} /> {b.coachName}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[15px] font-black text-gray-100">{money(b.amount)}</div>
                  <div className={`text-[11px] font-bold ${b.isPaid ? "text-emerald-400" : "text-amber-400"}`}>{b.isPaid ? "Paid" : "Unpaid"}</div>
                </div>
                {!cancelled && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!b.isPaid && <button disabled={busy} onClick={() => act(b, "pay")} title="Collect payment" className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg w-auto"><Check size={13} /> Collect</button>}
                    {b.isPaid && <button disabled={busy} onClick={() => act(b, "refund")} title="Refund" className="flex items-center gap-1 border border-white/[0.12] text-gray-300 hover:bg-white/[0.05] text-[11px] font-bold px-2.5 py-1.5 rounded-lg w-auto"><RefreshCw size={13} /> Refund</button>}
                    <button disabled={busy} onClick={() => act(b, "cancel")} title="Cancel" className="text-gray-500 hover:text-rose-400 p-1.5 w-auto bg-transparent"><Ban size={15} /></button>
                    <button onClick={() => del(b)} title="Delete" className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1.5 w-auto bg-transparent"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New booking modal */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#181A22] rounded-2xl max-w-md w-full overflow-hidden border border-white/[0.1] shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#0a0d14]">
              <div><span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">Reservation</span><h3 className="text-[17px] font-bold text-white mt-0.5">New Booking · {date}</h3></div>
              <button onClick={() => setAddOpen(false)} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
            </div>
            <form onSubmit={addBooking} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Customer Name *</label><input className={input} value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Rahul Sharma" required /></div>
                <div><label className={label}>Phone</label><input className={input} value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="+91 …" /></div>
              </div>
              <div><label className={label}>Court *</label><select className={input} value={form.courtId} onChange={(e) => set("courtId", e.target.value)} required><option value="" className="bg-[#181A22]">Select court…</option>{courts.map((c) => <option key={c._id} value={c._id} className="bg-[#181A22]">{c.name} — {c.sport} ({money(c.pricePerHour)}/hr)</option>)}</select></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={label}>Time</label><input className={input} type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
                <div><label className={label}>Hours</label><input className={input} type="number" min="1" value={form.duration} onChange={(e) => set("duration", e.target.value)} /></div>
                <div><label className={label}>Source</label><select className={input} value={form.source} onChange={(e) => set("source", e.target.value)}>{SOURCES.map((s) => <option key={s} value={s} className="bg-[#181A22]">{s}</option>)}</select></div>
              </div>
              <div><label className={label}>Notes</label><input className={input} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" /></div>
              <div className="flex items-center justify-between bg-[#12141B] border border-white/[0.08] rounded-lg px-3 py-2.5">
                <label className="flex items-center gap-2 text-[13px] text-gray-300"><input type="checkbox" checked={form.isPaid} onChange={(e) => set("isPaid", e.target.checked)} className="w-auto accent-emerald-500" /> Paid now</label>
                <div className="text-right"><div className="text-[10px] text-gray-500 uppercase font-bold">Amount</div><div className="text-[16px] font-black text-emerald-300">{money(estAmount)}</div></div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Create Booking</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
