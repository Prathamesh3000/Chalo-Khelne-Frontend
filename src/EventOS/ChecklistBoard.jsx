import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Sparkles, Trash2, User } from "lucide-react";

const COLUMNS = [
  { key: "To Do", label: "To Do", head: "text-gray-200", count: "bg-white/10 text-gray-300" },
  { key: "In Progress", label: "In Progress", head: "text-amber-300", count: "bg-amber-500/15 text-amber-300" },
  { key: "Completed", label: "Completed", head: "text-emerald-300", count: "bg-emerald-500/15 text-emerald-300" },
];
const PRIORITY = { High: "text-rose-400", Medium: "text-amber-400", Low: "text-sky-400" };
const ACTION = {
  "To Do": { to: "In Progress", label: "Start Task", cls: "text-emerald-300 hover:text-emerald-200" },
  "In Progress": { to: "Completed", label: "Complete Task", cls: "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 rounded-md py-1.5" },
  "Completed": { to: "To Do", label: "Reopen Task", cls: "bg-white/[0.05] text-gray-300 hover:bg-white/[0.1] rounded-md py-1.5" },
};

/**
 * Reusable Operation-Checklist Kanban board for one AgencyEvent.
 * Used both on the Event Detail page and the standalone Event Checklist module.
 */
export default function ChecklistBoard({ eventId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", owner: "", priority: "Medium" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get(`/api/agency-events/${eventId}/tasks`); setTasks(data.tasks || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load checklist"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (eventId) load(); }, [eventId]);

  const seedChecklist = async () => {
    setBusy(true);
    try { const { data } = await axios.post(`/api/agency-events/${eventId}/tasks/seed-checklist`); setTasks(data.tasks || []); }
    catch (e) { setErr(e?.response?.data?.message || "Could not seed checklist"); }
    finally { setBusy(false); }
  };
  const addTask = async () => {
    if (!form.title.trim()) return;
    try {
      const { data } = await axios.post(`/api/agency-events/${eventId}/tasks`, { title: form.title.trim(), owner: form.owner.trim(), priority: form.priority });
      setTasks((t) => [...t, data.task]);
      setForm({ title: "", owner: "", priority: "Medium" });
    } catch (e) { setErr(e?.response?.data?.message || "Could not add task"); }
  };
  const move = async (task, status) => {
    setTasks((t) => t.map((x) => x._id === task._id ? { ...x, status } : x));
    try { await axios.patch(`/api/agency-events/${eventId}/tasks/${task._id}`, { status }); } catch { load(); }
  };
  const del = async (task) => {
    setTasks((t) => t.filter((x) => x._id !== task._id));
    try { await axios.delete(`/api/agency-events/${eventId}/tasks/${task._id}`); } catch { load(); }
  };

  const done = tasks.filter((t) => t.status === "Completed").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const input = "bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";

  return (
    <div>
      {/* Add task */}
      <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-bold text-white">Add Operation Checklist Task</h2>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-gray-500">{done}/{tasks.length} done · {pct}%</span>
            <button onClick={seedChecklist} disabled={busy}
              className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg disabled:opacity-60 w-auto">
              <Sparkles size={13} /> {busy ? "Seeding…" : "Seed templates"}
            </button>
          </div>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 240px 170px" }}>
          <input className={input} value={form.title} onChange={(e) => set("title", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="Task item e.g., Inspect boundary lines" />
          <input className={input} value={form.owner} onChange={(e) => set("owner", e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="Owner (e.g. Rohan Sharma)" />
          <select className={input} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {["Low", "Medium", "High"].map((p) => <option key={p} value={p} className="bg-[#181A22]">{p} Priority</option>)}
          </select>
        </div>
        <button onClick={addTask} className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg mt-2 w-auto">
          <Plus size={15} /> Append Checklist Task
        </button>
        <div className="h-1 bg-white/[0.06] rounded-full mt-3"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {/* Board */}
      {loading ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.key);
            const act = ACTION[col.key];
            return (
              <div key={col.key} className="bg-[#12141B] border border-white/[0.06] rounded-2xl p-3">
                <div className="flex items-center justify-between px-1 pb-2.5 mb-1 border-b border-white/[0.06]">
                  <span className={`text-[13px] font-bold ${col.head}`}>{col.label}</span>
                  <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${col.count}`}>{items.length}</span>
                </div>
                <div className="space-y-2.5 min-h-[80px]">
                  {items.map((t) => (
                    <div key={t._id} className="group bg-[#181A22] border border-white/[0.07] rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`text-[13.5px] font-semibold ${col.key === "Completed" ? "text-gray-500 line-through" : "text-gray-100"}`}>{t.title}</div>
                        <button onClick={() => del(t)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 flex-shrink-0 w-auto bg-transparent"><Trash2 size={13} /></button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="flex items-center gap-1.5 text-[11.5px] text-gray-400 min-w-0">
                          <User size={12} className="flex-shrink-0" /> <span className="truncate">{t.owner || "Unassigned"}</span>
                        </span>
                        <span className={`text-[11px] font-bold ${PRIORITY[t.priority] || "text-gray-400"}`}>{t.priority}</span>
                      </div>
                      <button onClick={() => move(t, act.to)} className={`w-full mt-2.5 text-[12px] font-bold transition ${act.cls}`}>{act.label}</button>
                    </div>
                  ))}
                  {items.length === 0 && <div className="text-[12px] text-gray-600 italic text-center py-4">Nothing here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
