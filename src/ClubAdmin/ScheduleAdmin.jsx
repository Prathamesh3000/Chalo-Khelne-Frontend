import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Trash2, CalendarDays, Loader2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const EMPTY = { day: "Monday", standard: "", time: "", sports: [] };

/**
 * Training Schedule (school / organization admins). Build rows of
 * Day · Standard · Time · Sports — trainers see the rows for their sport(s).
 */
export default function ScheduleAdmin() {
  const [rows, setRows] = useState([]);
  const [clubSports, setClubSports] = useState([]); // sport names the school offers
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sched, sports] = await Promise.all([
        axios.get("/api/training-schedule").catch(() => ({ data: {} })),
        axios.get("/api/club-sports").catch(() => ({ data: {} })),
      ]);
      setRows(sched.data?.rows || []);
      setClubSports((sports.data?.sports || []).map((s) => s.name));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  const toggleSport = (s) =>
    setForm((p) => ({ ...p, sports: p.sports.includes(s) ? p.sports.filter((x) => x !== s) : [...p.sports, s] }));

  const addRow = async () => {
    if (!form.day) return;
    if (form.sports.length === 0) { toast.error("Pick at least one sport for this slot."); return; }
    setAdding(true);
    try {
      await axios.post("/api/training-schedule", form);
      setForm({ ...EMPTY });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add row");
    } finally {
      setAdding(false);
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm("Delete this schedule row?")) return;
    try {
      await axios.delete(`/api/training-schedule/${id}`);
      setRows((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete row");
    }
  };

  const field = "h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Add row */}
      <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3 inline-flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-orange-400" /> Add a schedule slot
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Day</label>
            <select value={form.day} onChange={(e) => setForm((p) => ({ ...p, day: e.target.value }))} className={`w-full ${field}`} style={inputStyle}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Standard</label>
            <input value={form.standard} onChange={(e) => setForm((p) => ({ ...p, standard: e.target.value }))} placeholder="e.g. V  or  IX & X" className={`w-full ${field}`} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Time</label>
            <input value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} placeholder="e.g. 12:30 pm TO 1:30 pm" className={`w-full ${field}`} style={inputStyle} />
          </div>
        </div>

        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Sports in this slot</label>
        {clubSports.length === 0 ? (
          <p className="text-[12px] text-amber-300/80">Add sports first in the <strong>Sports &amp; Trainers</strong> tab.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {clubSports.map((s) => {
              const active = form.sports.includes(s);
              return (
                <button key={s} type="button" onClick={() => toggleSport(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition w-auto ${active ? "bg-orange-500 text-white" : "text-gray-300 hover:bg-white/[0.08]"}`}
                  style={active ? undefined : inputStyle}>
                  {s}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button onClick={addRow} disabled={adding}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add slot
          </button>
        </div>
      </div>

      {/* Schedule list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center">
          <CalendarDays className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400">No schedule yet. Add a slot above.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-semibold">Day</th>
                <th className="px-4 py-3 font-semibold">Standard</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Sports</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-white/[0.04] last:border-b-0">
                  <td className="px-4 py-3 text-[13px] font-medium text-white whitespace-nowrap">{r.day}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.standard || "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-400 whitespace-nowrap">{r.time || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(r.sports || []).map((s, i) => (
                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-300">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeRow(r._id)} title="Delete row"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
