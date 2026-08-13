import { useEffect, useState } from "react";
import axios from "axios";
import { Tag, Plus, X, Trash2, Users, Unlock, Sparkles } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const SPORTS = ["Tennis", "Badminton", "Padel", "Cricket", "Swimming", "Football", "Pickleball", "Table Tennis"];
const randomCode = () => "PROMO" + Math.random().toString(36).slice(2, 7).toUpperCase();

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const blank = { name: "", code: "", discountType: "Percentage", value: 15, validFrom: "", validUntil: "", usageLimit: 200, applicableSports: ["Tennis"], membershipOnly: false };
  const [form, setForm] = useState(blank);
  const [currency] = useState("₹");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get("/api/club/coupons"); setCoupons(data.coupons || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load coupons"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleSport = (s) => set("applicableSports", form.applicableSports.includes(s) ? form.applicableSports.filter((x) => x !== s) : [...form.applicableSports, s]);

  const addCoupon = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setErr("Name and code are required"); return; }
    try {
      const { data } = await axios.post("/api/club/coupons", { ...form, value: Number(form.value) || 0, usageLimit: Number(form.usageLimit) || 0 });
      setCoupons((c) => [data.coupon, ...c]); setForm(blank); setAddOpen(false);
    } catch (e) { setErr(e?.response?.data?.message || "Could not create coupon"); }
  };
  const del = async (c) => { setCoupons((l) => l.filter((x) => x._id !== c._id)); try { await axios.delete(`/api/club/coupons/${c._id}`); } catch { load(); } };

  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Coupons &amp; Promotions</h2>
          <p className="text-gray-500 text-[13px] mt-1">Run promo codes on court bookings and memberships.</p>
        </div>
        <button onClick={() => { setForm({ ...blank, code: randomCode() }); setAddOpen(true); }} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Coupon</button>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : coupons.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500"><Tag size={40} className="opacity-30 mx-auto mb-3" /><div className="text-gray-300 font-semibold">No coupons</div><div className="text-[13px] mt-1">Create your first promo code.</div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => {
            const pct = c.usageLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : 0;
            return (
              <div key={c._id} className="group bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[22px] font-black text-emerald-300">{c.discountType === "Percentage" ? `${c.value}%` : `${currency}${c.value}`} <span className="text-[13px] text-gray-500 font-bold">OFF</span></div>
                    <div className="text-[11px] text-gray-500">{c.discountType} discount</div>
                  </div>
                  <button onClick={() => del(c)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={14} /></button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-mono text-[13px] font-bold text-white bg-white/[0.06] border border-dashed border-white/20 rounded-lg px-2.5 py-1 tracking-wider">{c.code}</span>
                  <span className="text-[12px] text-gray-400">{c.name}</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-gray-500 mb-1"><span>{c.usedCount}/{c.usageLimit} claimed</span><span>{pct}%</span></div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-1.5 text-[12px] text-gray-400">
                  {(c.validFrom || c.validUntil) && <div>Valid: <span className="text-gray-300">{c.validFrom || "—"} → {c.validUntil || "—"}</span></div>}
                  {c.applicableSports?.length > 0 && <div className="truncate">Sports: <span className="text-gray-300">{c.applicableSports.join(", ")}</span></div>}
                  <div className="flex items-center gap-1.5">{c.membershipOnly ? <><Users size={12} className="text-amber-400" /> Members only</> : <><Unlock size={12} className="text-emerald-400" /> Public promo</>}</div>
                </div>
              </div>
            );
          })}
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
          <div onClick={(e) => e.stopPropagation()} className="bg-[#181A22] rounded-2xl max-w-md w-full overflow-hidden border border-white/[0.1] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#0a0d14]">
              <div><span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">Marketing</span><h3 className="text-[17px] font-bold text-white mt-0.5">New Promo Code</h3></div>
              <button onClick={() => setAddOpen(false)} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
            </div>
            <form onSubmit={addCoupon} className="p-5 space-y-3.5">
              <div><label className={label} htmlFor="campaign-name">Campaign Name *</label><input id="campaign-name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Summer Splash" required /></div>
              <div>
                <label className={label}>Code *</label>
                <div className="flex gap-2">
                  <input className={input} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} required />
                  <button type="button" onClick={() => set("code", randomCode())} className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.1] text-gray-300 hover:text-white text-[12px] px-3 rounded-lg w-auto whitespace-nowrap"><Sparkles size={13} /> Auto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="type">Type</label><select id="type" className={input} value={form.discountType} onChange={(e) => { set("discountType", e.target.value); set("value", e.target.value === "Percentage" ? 15 : 50); }}><option value="Percentage" className="bg-[#181A22]">Percentage (%)</option><option value="Flat" className="bg-[#181A22]">Flat ({currency})</option></select></div>
                <div><label className={label} htmlFor="value">Value</label><input id="value" className={input} type="number" min="0" value={form.value} onChange={(e) => set("value", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="valid-from">Valid From</label><input id="valid-from" className={input} type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} /></div>
                <div><label className={label} htmlFor="valid-until">Valid Until</label><input id="valid-until" className={input} type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} /></div>
              </div>
              <div><label className={label} htmlFor="usage-limit">Usage Limit</label><input id="usage-limit" className={input} type="number" min="0" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} /></div>
              <div>
                <label className={label}>Applicable Sports</label>
                <div className="flex flex-wrap gap-1.5">
                  {SPORTS.map((s) => <button type="button" key={s} onClick={() => toggleSport(s)} className={`text-[11px] px-2.5 py-1 rounded-lg border w-auto ${form.applicableSports.includes(s) ? "bg-emerald-600 text-white border-emerald-500" : "bg-[#12141B] text-gray-400 border-white/[0.1]"}`}>{s}</button>)}
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-gray-300"><input type="checkbox" checked={form.membershipOnly} onChange={(e) => set("membershipOnly", e.target.checked)} className="w-auto accent-emerald-500" /> Members only</label>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Create Coupon</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
