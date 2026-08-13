import { useEffect, useState } from "react";
import axios from "axios";
import { Settings as Cog, Save, Check, Building2, Clock, Percent, Palette } from "lucide-react";

const SPORTS = ["Tennis", "Badminton", "Padel", "Cricket", "Swimming", "Football", "Pickleball", "Table Tennis"];
const ACCENTS = [
  { key: "emerald", label: "Mint Emerald", dot: "bg-emerald-500" },
  { key: "indigo", label: "Cosmic Indigo", dot: "bg-indigo-500" },
  { key: "amber", label: "Solar Gold", dot: "bg-amber-500" },
  { key: "rose", label: "Coral Rose", dot: "bg-rose-500" },
];

export default function Settings() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try { const { data } = await axios.get("/api/club/settings"); setForm(data.settings); }
      catch (e) { setErr(e?.response?.data?.message || "Failed to load settings"); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggleSport = (s) => set("sportsSupported", form.sportsSupported.includes(s) ? form.sportsSupported.filter((x) => x !== s) : [...form.sportsSupported, s]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(""); setSaved(false);
    try {
      const { data } = await axios.put("/api/club/settings", {
        ...form, bookingWindowDays: Number(form.bookingWindowDays) || 0, cancellationPolicyHours: Number(form.cancellationPolicyHours) || 0, taxRatePercent: Number(form.taxRatePercent) || 0,
      });
      setForm(data.settings); setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { setErr(e?.response?.data?.message || "Could not save settings"); }
    finally { setSaving(false); }
  };

  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";
  const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4"><Icon size={15} className="text-emerald-300" /><h3 className="text-[14px] font-bold text-white">{title}</h3></div>
      {children}
    </div>
  );

  if (loading) return <div className="text-gray-500 py-10 text-center">Loading…</div>;
  if (!form) return <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err || "No settings"}</div>;

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><Cog size={22} className="text-emerald-300" /></div>
          <div><h2 className="text-[20px] font-black text-white tracking-tight">Club Settings</h2><p className="text-gray-500 text-[13px] mt-0.5">Operating calendar, tax parameters, and dashboard accent.</p></div>
        </div>
        <button type="submit" disabled={saving} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold w-auto ${saved ? "bg-emerald-500 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"} disabled:opacity-60`}>{saved ? <><Check size={15} /> Saved</> : <><Save size={15} /> {saving ? "Saving…" : "Save Settings"}</>}</button>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)" }}>
        <div className="space-y-5">
          <Section icon={Building2} title="Club Profile">
            <div className="space-y-3.5">
              <div><label className={label} htmlFor="club-name">Club Name</label><input id="club-name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><label className={label} htmlFor="address">Address</label><input id="address" className={input} value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="phone">Phone</label><input id="phone" className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div><label className={label} htmlFor="email">Email</label><input id="email" className={input} value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              </div>
              <div>
                <label className={label}>Sports Supported</label>
                <div className="flex flex-wrap gap-1.5">{SPORTS.map((s) => <button type="button" key={s} onClick={() => toggleSport(s)} className={`text-[11px] px-2.5 py-1 rounded-lg border w-auto ${form.sportsSupported.includes(s) ? "bg-emerald-600 text-white border-emerald-500" : "bg-[#12141B] text-gray-400 border-white/[0.1]"}`}>{s}</button>)}</div>
              </div>
            </div>
          </Section>

          <Section icon={Clock} title="Operations">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="opening-hour">Opening Hour</label><input id="opening-hour" className={input} type="time" value={form.operatingHoursStart} onChange={(e) => set("operatingHoursStart", e.target.value)} /></div>
              <div><label className={label} htmlFor="closing-hour">Closing Hour</label><input id="closing-hour" className={input} type="time" value={form.operatingHoursEnd} onChange={(e) => set("operatingHoursEnd", e.target.value)} /></div>
              <div><label className={label} htmlFor="booking-window-days">Booking Window (days)</label><input id="booking-window-days" className={input} type="number" min="0" value={form.bookingWindowDays} onChange={(e) => set("bookingWindowDays", e.target.value)} /></div>
              <div><label className={label} htmlFor="cancellation-policy-hrs">Cancellation Policy (hrs)</label><input id="cancellation-policy-hrs" className={input} type="number" min="0" value={form.cancellationPolicyHours} onChange={(e) => set("cancellationPolicyHours", e.target.value)} /></div>
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <Section icon={Percent} title="Tax & Currency">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="gst-tax-rate">GST / Tax Rate (%)</label><input id="gst-tax-rate" className={input} type="number" min="0" value={form.taxRatePercent} onChange={(e) => set("taxRatePercent", e.target.value)} /></div>
              <div><label className={label} htmlFor="currency">Currency</label><input id="currency" className={input} value={form.currency} onChange={(e) => set("currency", e.target.value)} /></div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Applied to income entries in the finance ledger.</p>
          </Section>

          <Section icon={Palette} title="Dashboard Accent">
            <div className="space-y-2">
              {ACCENTS.map((a) => (
                <button type="button" key={a.key} onClick={() => set("primaryColor", a.key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border ${form.primaryColor === a.key ? "border-white/25 bg-white/[0.04]" : "border-white/[0.08] hover:bg-white/[0.02]"}`}>
                  <span className={`w-5 h-5 rounded-full ${a.dot}`} />
                  <span className="text-[13px] font-semibold text-gray-200 flex-1 text-left">{a.label}</span>
                  {form.primaryColor === a.key && <Check size={15} className="text-emerald-400" />}
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </form>
  );
}
