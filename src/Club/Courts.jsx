import { useEffect, useState } from "react";
import axios from "axios";
import { Dribbble, Plus, Building, Wrench, Layers, SunMoon, Info, DollarSign, X, Trash2 } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const SPORTS = ["Tennis", "Badminton", "Padel", "Cricket", "Swimming", "Football", "Pickleball", "Table Tennis"];
const STATUS_BADGE = {
  Available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Occupied: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Maintenance: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const blankCourt = { name: "", sport: "Tennis", surfaceType: "", isIndoor: true, capacity: 4, pricePerHour: 30, peakHourPrice: 45, operatingHours: "06:00 - 22:00" };

export default function Courts() {
  const [courts, setCourts] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [form, setForm] = useState(blankCourt);
  const [maint, setMaint] = useState({ courtId: "", reason: "" });
  const [currency] = useState("₹");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get("/api/club/courts"); setCourts(data.courts || []); setStats(data.stats || stats); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load courts"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addCourt = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.surfaceType.trim()) { setErr("Court name and surface type are required"); return; }
    try {
      const { data } = await axios.post("/api/club/courts", {
        ...form, capacity: Number(form.capacity) || 0, pricePerHour: Number(form.pricePerHour) || 0, peakHourPrice: Number(form.peakHourPrice) || 0,
      });
      setCourts((c) => [...c, data.court]); setStats((s) => ({ ...s, total: s.total + 1, available: s.available + 1 }));
      setForm(blankCourt); setAddOpen(false);
    } catch (e) { setErr(e?.response?.data?.message || "Could not add court"); }
  };

  const setStatus = async (court, status, reason = "") => {
    const prev = court.status;
    setCourts((list) => list.map((c) => c._id === court._id ? { ...c, status } : c));
    setStats((s) => ({ ...s, [prev.toLowerCase()]: Math.max(0, s[prev.toLowerCase()] - 1), [status.toLowerCase()]: s[status.toLowerCase()] + 1 }));
    try { await axios.patch(`/api/club/courts/${court._id}/status`, { status, maintenanceReason: reason }); }
    catch { load(); }
  };

  const submitMaintenance = async (e) => {
    e.preventDefault();
    if (!maint.courtId) return;
    const court = courts.find((c) => c._id === maint.courtId);
    if (court) await setStatus(court, "Maintenance", maint.reason);
    setMaint({ courtId: "", reason: "" }); setMaintOpen(false);
  };

  const del = async (court) => {
    setCourts((list) => list.filter((c) => c._id !== court._id));
    try { await axios.delete(`/api/club/courts/${court._id}`); } catch { load(); }
  };

  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";

  return (
    <div className="space-y-5">
      {/* Header + actions */}
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Court &amp; Field Management</h2>
          <p className="text-gray-500 text-[13px] mt-1">Configure courts, operating hours, peak rates, and maintenance windows.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Court</button>
          <button disabled title="Bulk reserve arrives with Booking Calendar" className="flex items-center gap-1.5 bg-white/[0.05] text-gray-500 px-3.5 py-2 rounded-xl text-[12px] font-bold w-auto cursor-not-allowed"><Building size={14} /> Bulk Reserve</button>
          <button onClick={() => setMaintOpen(true)} className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 px-3.5 py-2 rounded-xl text-[12px] font-bold w-auto"><Wrench size={14} /> Maintenance Block</button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="flex gap-3 flex-wrap">
        {[["Total Courts", stats.total, "text-white"], ["Available", stats.available, "text-emerald-300"], ["Occupied", stats.occupied, "text-blue-300"], ["Maintenance", stats.maintenance, "text-rose-300"]].map(([l, v, t]) => (
          <div key={l} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[130px]">
            <div className={`text-[22px] font-black ${t}`}>{v}</div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {/* Courts grid */}
      {loading ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : courts.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <Dribbble size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No courts yet</div>
          <div className="text-[13px] mt-1">Add your first court to start taking bookings.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {courts.map((c) => (
            <div key={c._id} className="group bg-[#181A22] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col justify-between">
              <div className="p-4 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1.5 bg-emerald-500/15 text-emerald-300 rounded-lg flex-shrink-0"><Dribbble size={16} /></span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-100 text-[13px] truncate">{c.name}</h4>
                    <span className="text-[10px] font-mono text-gray-500 font-bold uppercase">{c.sport}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[c.status]}`}>{c.status}</span>
              </div>
              <div className="p-4 space-y-2.5 text-[12px]">
                <Row icon={<Layers size={13} />} k="Surface" v={c.surfaceType || "—"} />
                <Row icon={<SunMoon size={13} />} k="Setting" v={c.isIndoor ? "Indoor" : "Outdoor"} />
                <Row icon={<Info size={13} />} k="Capacity" v={`${c.capacity} players`} />
                <div className="flex justify-between text-gray-500">
                  <span className="flex items-center gap-1"><DollarSign size={13} /> Rate</span>
                  <div><span className="font-bold text-gray-100">{currency}{c.pricePerHour}</span><span className="text-[10px] text-gray-500"> /hr (Peak {currency}{c.peakHourPrice})</span></div>
                </div>
              </div>
              <div className="p-4 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-mono text-gray-500">Hrs: {c.operatingHours}</span>
                <div className="flex gap-1.5 items-center">
                  {c.status === "Maintenance" ? (
                    <button onClick={() => setStatus(c, "Available")} className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded w-auto">Set Ready</button>
                  ) : (
                    <button onClick={() => setStatus(c, c.status === "Available" ? "Occupied" : "Available")} className="text-[10px] font-bold border border-white/[0.12] text-gray-300 hover:bg-white/[0.05] px-2 py-1 rounded w-auto">Toggle Use</button>
                  )}
                  <button onClick={() => del(c)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Court modal */}
      {addOpen && (
        <Modal title="Add New Court / Field" tag="Facility Directory" onClose={() => setAddOpen(false)}>
          <form onSubmit={addCourt} className="p-5 space-y-3.5">
            <div><label className={label} htmlFor="court-field-name">Court/Field Name *</label><input id="court-field-name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Court 5 (Premium Clay)" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="sport">Sport *</label><select id="sport" className={input} value={form.sport} onChange={(e) => set("sport", e.target.value)}>{SPORTS.map((s) => <option key={s} value={s} className="bg-[#181A22]">{s}</option>)}</select></div>
              <div><label className={label} htmlFor="surface-type">Surface Type *</label><input id="surface-type" className={input} value={form.surfaceType} onChange={(e) => set("surfaceType", e.target.value)} placeholder="Acrylic / Clay / Grass" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="setting">Setting</label><select id="setting" className={input} value={form.isIndoor ? "indoor" : "outdoor"} onChange={(e) => set("isIndoor", e.target.value === "indoor")}><option value="indoor" className="bg-[#181A22]">Indoor</option><option value="outdoor" className="bg-[#181A22]">Outdoor</option></select></div>
              <div><label className={label} htmlFor="max-capacity">Max Capacity</label><input id="max-capacity" className={input} type="number" min="0" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Price / hr ({currency})</label><input className={input} type="number" min="0" value={form.pricePerHour} onChange={(e) => set("pricePerHour", e.target.value)} /></div>
              <div><label className={label}>Peak / hr ({currency})</label><input className={input} type="number" min="0" value={form.peakHourPrice} onChange={(e) => set("peakHourPrice", e.target.value)} /></div>
            </div>
            <div><label className={label} htmlFor="operating-hours">Operating Hours</label><input id="operating-hours" className={input} value={form.operatingHours} onChange={(e) => set("operatingHours", e.target.value)} placeholder="06:00 - 22:00" /></div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Add Court</button>
          </form>
        </Modal>
      )}

      {/* Maintenance modal */}
      {maintOpen && (
        <Modal title="Court Repairs Block" tag="Maintenance" onClose={() => setMaintOpen(false)}>
          <form onSubmit={submitMaintenance} className="p-5 space-y-3.5">
            <div><label className={label} htmlFor="court">Court *</label><select id="court" className={input} value={maint.courtId} onChange={(e) => setMaint((m) => ({ ...m, courtId: e.target.value }))} required><option value="" className="bg-[#181A22]">Select court…</option>{courts.map((c) => <option key={c._id} value={c._id} className="bg-[#181A22]">{c.name} ({c.sport})</option>)}</select></div>
            <div><label className={label} htmlFor="reason">Reason</label><input id="reason" className={input} value={maint.reason} onChange={(e) => setMaint((m) => ({ ...m, reason: e.target.value }))} placeholder="Resurfacing / net repair…" /></div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Mark Under Maintenance</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Row({ icon, k, v }) {
  return <div className="flex justify-between text-gray-500"><span className="flex items-center gap-1">{icon} {k}</span><span className="font-semibold text-gray-300">{v}</span></div>;
}

function Modal({ title, tag, onClose, children }) {
  return (
    <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <DialogA11y onClose={onClose} />
      <div onClick={(e) => e.stopPropagation()} className="bg-[#181A22] rounded-2xl max-w-md w-full overflow-hidden border border-white/[0.1] shadow-2xl">
        <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#0a0d14]">
          <div>
            <span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">{tag}</span>
            <h3 className="text-[17px] font-bold text-white mt-0.5">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
