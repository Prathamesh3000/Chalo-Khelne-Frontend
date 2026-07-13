import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapPin, Plus, Trash2, Sparkles, Radio } from "lucide-react";

const STATUS_STYLE = {
  Active: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Ready: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Delayed: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Available: "bg-white/10 text-gray-400 border-white/10",
};
const ACTIONS = [
  { to: "Active", label: "Active", cls: "text-rose-300 border-rose-500/25 hover:bg-rose-500/10" },
  { to: "Ready", label: "Ready", cls: "text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/10" },
  { to: "Delayed", label: "Delay", cls: "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20" },
];

export default function VenueManager() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [venues, setVenues] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", sport: "", currentMatch: "", liveStream: false });
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
    try { const { data } = await axios.get(`/api/agency-events/${id}/venues`); setVenues(data.venues || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load venues"); }
    finally { setLoadingRows(false); }
  };
  useEffect(() => { if (sel) load(sel); else setVenues([]); }, [sel]);

  const selEvent = events.find((e) => e._id === sel);
  const sports = selEvent?.sports || [];

  const addVenue = async () => {
    if (!form.name.trim()) return;
    try {
      const { data } = await axios.post(`/api/agency-events/${sel}/venues`, { ...form, name: form.name.trim(), currentMatch: form.currentMatch.trim() });
      setVenues((v) => [...v, data.venue]);
      setForm({ name: "", sport: "", currentMatch: "", liveStream: false });
    } catch (e) { setErr(e?.response?.data?.message || "Could not add station"); }
  };
  const seed = async () => {
    setBusy(true);
    try { const { data } = await axios.post(`/api/agency-events/${sel}/venues/seed`); setVenues(data.venues || []); }
    catch (e) { setErr(e?.response?.data?.message || "Could not seed courts"); }
    finally { setBusy(false); }
  };
  const setStatus = async (v, status) => {
    setVenues((list) => list.map((x) => x._id === v._id ? { ...x, status } : x));
    try { await axios.patch(`/api/agency-events/${sel}/venues/${v._id}`, { status }); } catch { load(sel); }
  };
  const del = async (v) => {
    setVenues((list) => list.filter((x) => x._id !== v._id));
    try { await axios.delete(`/api/agency-events/${sel}/venues/${v._id}`); } catch { load(sel); }
  };

  const input = "bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><MapPin size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Venue Station Management</h1>
            <p className="text-gray-500 text-[13px]">Map court surfaces, table slots & fields, and inspect operational states.</p>
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
          <MapPin size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button>.</div>
        </div>
      ) : (
        <>
          {/* Add station */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-white">Add Station / Subdivision</h2>
              <button onClick={seed} disabled={busy}
                className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg disabled:opacity-60 w-auto">
                <Sparkles size={13} /> {busy ? "Seeding…" : "Seed from tournament courts"}
              </button>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1.4fr auto auto" }}>
              <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Station (e.g. Table 1)" />
              <select className={input} value={form.sport} onChange={(e) => set("sport", e.target.value)}>
                <option value="" className="bg-[#181A22]">Sport…</option>
                {sports.map((s) => <option key={s} value={s} className="bg-[#181A22]">{s}</option>)}
              </select>
              <input className={input} value={form.currentMatch} onChange={(e) => set("currentMatch", e.target.value)} placeholder="Adjudicated game (optional)" />
              <label className="flex items-center gap-1.5 text-[12px] text-gray-400 px-2 cursor-pointer">
                <input type="checkbox" checked={form.liveStream} onChange={(e) => set("liveStream", e.target.checked)} /> Live stream
              </label>
              <button onClick={addVenue} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] px-4 rounded-lg w-auto whitespace-nowrap">Add Station</button>
            </div>
          </div>

          {/* Board */}
          {loadingRows ? (
            <div className="text-gray-500 py-8 text-center">Loading…</div>
          ) : venues.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl py-12 text-center text-gray-500 text-[13px]">
              No stations yet. Add one above, or seed from the linked tournament's courts.
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
              {venues.map((v) => (
                <div key={v._id} className="group bg-[#181A22] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5 text-[15px] font-bold text-white">
                      {v.name}{v.liveStream && <span className="flex items-center gap-1 text-[10px] font-bold text-rose-300"><Radio size={11} /> LIVE</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold rounded border px-2 py-0.5 ${STATUS_STYLE[v.status]}`}>{v.status}</span>
                      <button onClick={() => del(v)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1 text-[12.5px] text-gray-400">
                    <div>Sport configuration: <span className="font-bold text-gray-200">{v.sport || "—"}</span></div>
                    {v.currentMatch && <div>Adjudicated Game: <span className="font-bold text-gray-200">{v.currentMatch}</span></div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {ACTIONS.map((a) => (
                      <button key={a.to} onClick={() => setStatus(v, a.to)}
                        className={`flex-1 text-[11.5px] font-bold rounded-md py-1.5 border transition w-auto ${v.status === a.to ? STATUS_STYLE[a.to] : a.cls}`}>
                        {a.label}
                      </button>
                    ))}
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
