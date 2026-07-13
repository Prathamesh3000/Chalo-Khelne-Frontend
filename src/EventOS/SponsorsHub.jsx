import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Megaphone, MapPin, Monitor, Flame, Trash2 } from "lucide-react";

const TIERS = ["Title Sponsor", "Presenting Sponsor", "Gold", "Silver", "Bronze", "Associate", "Partner"];
const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;

export default function SponsorsHub() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ count: 0, totalSecured: 0, paid: 0, pending: 0 });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");
  const blank = { brand: "", amount: "", tier: "Title Sponsor", partnerType: "", standeesPosition: "", ledRotatingAds: false, status: "Pending" };
  const [form, setForm] = useState(blank);
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
    try {
      const { data } = await axios.get(`/api/agency-events/${id}/sponsors`);
      setItems(data.items || []);
      setSummary(data.summary || summary);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to load sponsors"); }
    finally { setLoadingRows(false); }
  };
  useEffect(() => { if (sel) load(sel); }, [sel]);

  const register = async () => {
    if (!form.brand.trim()) { setErr("Enter a sponsor brand"); return; }
    setPosting(true); setErr("");
    try {
      const { data } = await axios.post(`/api/agency-events/${sel}/sponsors`, { ...form, amount: Number(form.amount) || 0 });
      setItems((it) => [...it, data.item]);
      setSummary(data.summary);
      setForm(blank);
    } catch (e) { setErr(e?.response?.data?.message || "Could not register sponsor"); }
    finally { setPosting(false); }
  };
  const del = async (item) => {
    try {
      const { data } = await axios.delete(`/api/agency-events/${sel}/sponsors/${item._id}`);
      setItems((list) => list.filter((x) => x._id !== item._id));
      setSummary(data.summary);
    } catch (e) { setErr(e?.response?.data?.message || "Could not delete sponsor"); }
  };
  const toggleStatus = async (item) => {
    const status = item.status === "Paid" ? "Pending" : "Paid";
    setItems((list) => list.map((x) => x._id === item._id ? { ...x, status } : x));
    try {
      const { data } = await axios.patch(`/api/agency-events/${sel}/sponsors/${item._id}`, { status });
      setSummary(data.summary);
    } catch { load(sel); }
  };

  const input = "bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><Megaphone size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Sponsors Hub</h1>
            <p className="text-gray-500 text-[13px]">Register corporate sponsors and track secured sponsorship revenue.</p>
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
          <Megaphone size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button>.</div>
        </div>
      ) : (
        <>
          {/* Register Corporate Event Sponsor */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4 mb-5">
            <h2 className="text-[14px] font-bold text-white mb-3">Register Corporate Event Sponsor</h2>
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1.4fr 140px 1fr auto" }}>
              <input className={input} value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Sponsor Brand e.g. Gatorade" />
              <input className={input} value={form.amount} onChange={(e) => set("amount", e.target.value.replace(/[^0-9]/g, ""))} placeholder="5000" inputMode="numeric" />
              <select className={input} value={form.tier} onChange={(e) => set("tier", e.target.value)}>
                {TIERS.map((t) => <option key={t} value={t} className="bg-[#181A22]">{t}</option>)}
              </select>
              <button onClick={register} disabled={posting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] px-5 rounded-lg disabled:opacity-60 w-auto whitespace-nowrap">
                {posting ? "Registering…" : "Register Sponsor Node"}
              </button>
            </div>
            {/* Activation details — populate the catalog cards */}
            <div className="grid gap-2" style={{ gridTemplateColumns: "1.4fr 1fr 160px 140px" }}>
              <input className={input} value={form.partnerType} onChange={(e) => set("partnerType", e.target.value)} placeholder="Partner type e.g. Beverage Partner" />
              <input className={input} value={form.standeesPosition} onChange={(e) => set("standeesPosition", e.target.value)} placeholder="Standees position e.g. Player Lounge" />
              <label className="flex items-center gap-2 text-[12.5px] text-gray-400 bg-[#12141B] border border-white/[0.1] rounded-lg px-3">
                <input type="checkbox" checked={form.ledRotatingAds} onChange={(e) => set("ledRotatingAds", e.target.checked)} className="w-auto accent-emerald-500" />
                LED Rotating Ads
              </label>
              <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="Pending" className="bg-[#181A22]">Pending</option>
                <option value="Paid" className="bg-[#181A22]">Paid</option>
              </select>
            </div>
          </div>

          {/* Secured summary */}
          <div className="flex gap-3 mb-5 flex-wrap">
            {[["Sponsors", summary.count, "text-white"], ["Total Secured", money(summary.totalSecured), "text-emerald-300"], ["Received", money(summary.paid), "text-emerald-400"], ["Outstanding", money(summary.pending), "text-amber-300"]].map(([label, val, tone]) => (
              <div key={label} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[130px]">
                <div className={`text-[20px] font-black ${tone}`}>{val}</div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Registered Sponsor Catalog */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-[14px] font-bold text-white mb-4">Registered Sponsor Catalog</h2>
            {loadingRows ? (
              <div className="text-gray-500 py-10 text-center">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-[13px]">No sponsors registered yet. Add one above.</div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {items.map((s) => {
                  const paid = s.status === "Paid";
                  return (
                    <div key={s._id} className="group bg-[#12141B] border border-white/[0.07] rounded-xl p-4 relative">
                      <button onClick={() => del(s)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={14} /></button>
                      <div className="flex items-start gap-3 mb-3 pr-6">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-emerald-300 font-black text-[13px]">{(s.brand || "?").charAt(0).toUpperCase()}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-bold text-white truncate">{s.brand}</span>
                            <button onClick={() => toggleStatus(s)} title="Toggle payment status"
                              className={`text-[10px] font-bold rounded border px-2 py-0.5 uppercase w-auto ${paid ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
                              {s.status}
                            </button>
                          </div>
                          <div className="text-[11.5px] text-gray-500 mt-0.5">{s.partnerType || s.tier}</div>
                        </div>
                      </div>
                      <div className="border-t border-white/[0.06] pt-3 space-y-1.5 text-[12.5px]">
                        <Line icon={<MapPin size={13} className="text-rose-300" />} label="Standees Position" value={s.standeesPosition || "—"} />
                        <Line icon={<Monitor size={13} className="text-blue-300" />} label="LED Rotating Ads" value={s.ledRotatingAds ? "Yes" : "No"} />
                        <Line icon={<Flame size={13} className="text-amber-300" />} label="Sponsorship Amount" value={<span className="text-emerald-400 font-bold">{money(s.amount)}</span>} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Line({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-400">
      {icon}
      <span className="font-mono text-gray-500">{label}:</span>
      <span className="text-gray-200 truncate">{value}</span>
    </div>
  );
}
