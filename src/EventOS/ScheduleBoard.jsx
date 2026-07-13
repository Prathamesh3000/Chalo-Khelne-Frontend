import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2, Clock } from "lucide-react";

const sortByTime = (arr) => [...arr].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

/**
 * Reusable Milestone Schedule Planner for one AgencyEvent.
 * Reads/writes AgencyEvent.timeline ([{ time, label, details }]) via the
 * existing PATCH /agency-events/:id — no dedicated backend needed.
 */
export default function ScheduleBoard({ eventId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ time: "", label: "", details: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get(`/api/agency-events/${eventId}`); setItems(sortByTime(data.event?.timeline || [])); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load schedule"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (eventId) load(); }, [eventId]);

  const save = async (next) => {
    setItems(next); setSaving(true); setErr("");
    try { await axios.patch(`/api/agency-events/${eventId}`, { timeline: next }); }
    catch (e) { setErr(e?.response?.data?.message || "Could not save schedule"); load(); }
    finally { setSaving(false); }
  };
  const addItem = () => {
    if (!form.time.trim() || !form.label.trim()) return;
    save(sortByTime([...items, { time: form.time.trim(), label: form.label.trim(), details: form.details.trim() }]));
    setForm({ time: "", label: "", details: "" });
  };
  const del = (idx) => save(items.filter((_, i) => i !== idx));

  const input = "bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";

  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-[15px] font-bold text-white">Milestone Schedule Planner</h2>
          <p className="text-[12.5px] text-gray-500">Day-of operational sequence itinerary.</p>
        </div>
        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded px-2 py-1 tracking-wider">
          {saving ? "SAVING…" : `${items.length} MILESTONES`}
        </span>
      </div>

      {/* Add milestone */}
      <div className="grid gap-2 mt-4 mb-4" style={{ gridTemplateColumns: "120px 1fr 1.4fr auto" }}>
        <input className={input} value={form.time} onChange={(e) => set("time", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="07:00" />
        <input className={input} value={form.label} onChange={(e) => set("label", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="Milestone (e.g. Venue Opens)" />
        <input className={input} value={form.details} onChange={(e) => set("details", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="Details (optional)" />
        <button onClick={addItem} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] px-4 rounded-lg w-auto">
          <Plus size={15} /> Add
        </button>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {/* Timeline */}
      {loading ? (
        <div className="text-gray-500 py-8 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Clock size={36} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No milestones yet</div>
          <div className="text-[13px] mt-1">Add the day's sequence — venue opens, staff meeting, round one, finals…</div>
        </div>
      ) : (
        <div className="pt-1">
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-3 group">
              {/* dot + connector */}
              <div className="flex flex-col items-center pt-1">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0F1117] shadow-[0_0_0_3px_rgba(16,185,129,0.15)] flex-shrink-0" />
                {idx < items.length - 1 && <span className="w-px flex-1 bg-white/[0.1] my-1" />}
              </div>
              {/* content */}
              <div className="pb-5 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px] font-bold text-emerald-400">{it.time}</span>
                  <span className="text-[14px] font-bold text-gray-100">{it.label}</span>
                  <button onClick={() => del(idx)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent ml-auto"><Trash2 size={14} /></button>
                </div>
                {it.details && <div className="text-[12.5px] text-gray-500 mt-0.5">{it.details}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
