import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { BookOpen, Plus, Trash2, Loader2, Pencil, X, Check } from "lucide-react";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const field = "h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none";
const EMPTY = { weekNumber: "", topic: "", objectives: "", activities: "", equipment: "", notes: "" };

/**
 * Sports Syllabus (school/org admins). Pick a sport + standard, then author the
 * week-by-week sessions (topic + objectives/activities/equipment). Coaches see
 * these as their day's plan and tick them off on mobile.
 */
export default function SyllabusAdmin() {
  const [clubSports, setClubSports] = useState([]);
  const [sport, setSport] = useState("");
  const [standard, setStandard] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY });
  const [syllabi, setSyllabi] = useState([]); // existing (sport+standard) with counts

  const fetchSyllabi = () =>
    axios.get("/api/syllabus")
      .then((r) => setSyllabi(r.data?.syllabi || []))
      .catch(() => setSyllabi([]));

  useEffect(() => {
    axios.get("/api/club-sports")
      .then((r) => setClubSports((r.data?.sports || []).map((s) => s.name)))
      .catch(() => setClubSports([]));
    fetchSyllabi();
    // Restore the last sport+standard so returning to the tab isn't blank.
    try {
      const last = JSON.parse(localStorage.getItem("syllabus_last") || "null");
      if (last?.sport) { setSport(last.sport); setStandard(last.standard || ""); }
    } catch { /* ignore */ }
  }, []);

  const loaded = sport && standard.trim();

  const fetchEntries = async (sp = sport, std = standard) => {
    if (!sp || !std.trim()) { setEntries([]); return; }
    setLoading(true);
    try {
      const r = await axios.get("/api/syllabus/entries", { params: { sport: sp, standard: std.trim() } });
      setEntries(r.data?.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loaded) {
      fetchEntries();
      try { localStorage.setItem("syllabus_last", JSON.stringify({ sport, standard: standard.trim() })); } catch { /* ignore */ }
    }
    /* eslint-disable-next-line */
  }, [sport, standard]);

  const addEntry = async () => {
    if (!sport) { toast.error("Pick a sport."); return; }
    if (!standard.trim()) { toast.error("Enter a standard."); return; }
    if (!form.topic.trim()) { toast.error("Enter the topic."); return; }
    setAdding(true);
    try {
      await axios.post("/api/syllabus/entries", { sport, standard: standard.trim(), ...form });
      setForm({ ...EMPTY });
      fetchEntries();
      fetchSyllabi();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`/api/syllabus/entries/${id}`, editForm);
      setEditId(null);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    }
  };

  const removeEntry = async (id) => {
    if (!window.confirm("Delete this session?")) return;
    try {
      await axios.delete(`/api/syllabus/entries/${id}`);
      setEntries((p) => p.filter((e) => e._id !== id));
      fetchSyllabi();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const startEdit = (e) => {
    setEditId(e._id);
    setEditForm({ weekNumber: String(e.weekNumber || ""), topic: e.topic || "", objectives: e.objectives || "", activities: e.activities || "", equipment: e.equipment || "", notes: e.notes || "" });
  };

  return (
    <div className="space-y-4">
      {/* Selector */}
      <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3 inline-flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-orange-400" /> Choose sport &amp; standard
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value)} className={`${field} w-44`} style={inputStyle}>
              <option value="">Select sport…</option>
              {clubSports.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Standard</label>
            <input value={standard} onChange={(e) => setStandard(e.target.value)} placeholder="e.g. V" className={`${field} w-28`} style={inputStyle} />
          </div>
        </div>
        {clubSports.length === 0 && (
          <p className="text-[12px] text-amber-300/80 mt-2">Add sports first in the <strong>Sports &amp; Trainers</strong> tab.</p>
        )}

        {syllabi.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-2">Existing syllabi — click a row to open</p>
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500 bg-white/[0.03]">
                    <th className="px-3 py-2 font-semibold">Sport</th>
                    <th className="px-3 py-2 font-semibold">Standard</th>
                    <th className="px-3 py-2 font-semibold text-right">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {syllabi.map((s) => {
                    const active = s.sport === sport && (s.standard || "") === standard.trim();
                    return (
                      <tr key={s._id} onClick={() => { setSport(s.sport); setStandard(s.standard || ""); }}
                        className={`cursor-pointer border-t border-white/[0.04] transition ${active ? "bg-orange-500/15" : "hover:bg-white/[0.03]"}`}>
                        <td className={`px-3 py-2 text-[13px] font-medium ${active ? "text-orange-300" : "text-white"}`}>{s.sport}</td>
                        <td className="px-3 py-2 text-[13px] text-gray-300">{s.standard ? `Std ${s.standard}` : "—"}</td>
                        <td className="px-3 py-2 text-[13px] text-gray-400 text-right">{s.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {!loaded ? (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center text-[13px] text-gray-400">
          Pick a sport and enter a standard to author its syllabus.
        </div>
      ) : (
        <>
          {/* Add session */}
          <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
            <h3 className="text-[14px] font-semibold text-white mb-3">Add a session — {sport} · Std {standard}</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
              <input value={form.weekNumber} onChange={(e) => setForm((f) => ({ ...f, weekNumber: e.target.value }))} placeholder="Week #" type="number" min="1" className={`${field} md:col-span-1`} style={inputStyle} />
              <input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="Topic (e.g. Forehand serve)" className={`${field} md:col-span-5`} style={inputStyle} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={form.objectives} onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))} placeholder="Objective(s)" className={field} style={inputStyle} />
              <input value={form.activities} onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))} placeholder="Drills / activities" className={field} style={inputStyle} />
              <input value={form.equipment} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))} placeholder="Equipment" className={field} style={inputStyle} />
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={addEntry} disabled={adding}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto">
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add session
              </button>
            </div>
          </div>

          {/* Entries */}
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center text-[13px] text-gray-400">No sessions yet. Add the first one above.</div>
          ) : (
            <div className="rounded-xl bg-[#181A22] border border-white/[0.06] overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-white/[0.06]">
                    <th className="px-3 py-2.5 font-semibold w-16">Week</th>
                    <th className="px-3 py-2.5 font-semibold w-[22%]">Topic</th>
                    <th className="px-3 py-2.5 font-semibold w-[22%]">Objective</th>
                    <th className="px-3 py-2.5 font-semibold w-[22%]">Drills</th>
                    <th className="px-3 py-2.5 font-semibold w-[18%]">Equipment</th>
                    <th className="px-3 py-2.5 font-semibold w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    editId === e._id ? (
                      <tr key={e._id} className="border-b border-white/[0.04] align-top">
                        <td className="px-2 py-2"><input value={editForm.weekNumber} onChange={(ev) => setEditForm((f) => ({ ...f, weekNumber: ev.target.value }))} type="number" className={`${field} w-14`} style={inputStyle} /></td>
                        <td className="px-2 py-2"><input value={editForm.topic} onChange={(ev) => setEditForm((f) => ({ ...f, topic: ev.target.value }))} className={`${field} w-full`} style={inputStyle} /></td>
                        <td className="px-2 py-2"><input value={editForm.objectives} onChange={(ev) => setEditForm((f) => ({ ...f, objectives: ev.target.value }))} className={`${field} w-full`} style={inputStyle} /></td>
                        <td className="px-2 py-2"><input value={editForm.activities} onChange={(ev) => setEditForm((f) => ({ ...f, activities: ev.target.value }))} className={`${field} w-full`} style={inputStyle} /></td>
                        <td className="px-2 py-2"><input value={editForm.equipment} onChange={(ev) => setEditForm((f) => ({ ...f, equipment: ev.target.value }))} className={`${field} w-full`} style={inputStyle} /></td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => saveEdit(e._id)} title="Save" className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-orange-500 hover:bg-orange-600 text-white w-auto"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditId(null)} title="Cancel" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white w-auto"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={e._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] align-top">
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center justify-center px-2 h-6 rounded-md bg-orange-500/15 text-orange-300 text-[11px] font-bold">W{e.weekNumber}</span>
                        </td>
                        <td className="px-3 py-2.5 text-[13px] font-medium text-white">
                          {e.topic}
                          {e.status === "completed" ? <span className="ml-2 text-[9px] font-bold uppercase text-emerald-300 bg-emerald-500/15 rounded px-1.5 py-0.5 align-middle">done</span> : null}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-400">{e.objectives || "—"}</td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-400">{e.activities || "—"}</td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-400">{e.equipment || "—"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(e)} title="Edit" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-orange-400 hover:bg-white/[0.06] transition w-auto"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeEntry(e._id)} title="Delete" className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
