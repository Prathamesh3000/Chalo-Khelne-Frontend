import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Plus, Trash2, CalendarDays, Loader2, UserCog, Clock, X } from "lucide-react";
import ScheduleTimetable from "./ScheduleTimetable";
import SessionAdjustmentFlow from "./SessionAdjustmentFlow";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const field = "h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none";
const EMPTY = { day: "Monday", sport: "", coach: "", coachName: "", standard: "", section: "", ground: "", startTime: "", endTime: "" };

const STATUS_STYLE = {
  Scheduled: "bg-blue-500/15 text-blue-300",
  "In Progress": "bg-amber-500/15 text-amber-300",
  Completed: "bg-green-500/15 text-green-300",
  Cancelled: "bg-red-500/15 text-red-300",
  Postponed: "bg-gray-500/20 text-gray-300",
};

// Date (YYYY-MM-DD) of the given weekday in the CURRENT week.
const dateForDay = (dayName) => {
  const target = DAY_NAMES.indexOf(dayName);
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() + (target - now.getDay()));
  return d.toISOString().slice(0, 10);
};

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

const to12h = (hhmm) => {
  const mins = toMin(hhmm);
  if (mins == null) return "";
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
};

// Status: override wins; else derive from the clock for today's sessions.
const statusOf = (row, override) => {
  if (override?.status === "cancelled") return "Cancelled";
  if (override?.status === "postponed") return "Postponed";
  const now = new Date();
  if (row.day === DAY_NAMES[now.getDay()] && row.startTime && row.endTime) {
    const cur = now.getHours() * 60 + now.getMinutes();
    const s = toMin(row.startTime);
    const e = toMin(row.endTime);
    if (s != null && e != null) {
      if (cur >= s && cur <= e) return "In Progress";
      if (cur > e) return "Completed";
    }
  }
  return "Scheduled";
};

/**
 * Schedule Management (school / organization admins). Create recurring weekly
 * slots (Day · Sport · Coach · Class/Section · Ground · Time) and manage each
 * session: Reassign Coach (permanent), Postpone / Cancel (per-date override).
 */
export default function ScheduleAdmin() {
  const [rows, setRows] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [clubSports, setClubSports] = useState([]);
  const [coaches, setCoaches] = useState([]); // { _id, name }
  const [classes, setClasses] = useState([]); // { name, sections[] }
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [modal, setModal] = useState(null); // { type, row, coach, newDay, newStart, newEnd }
  const [mode, setMode] = useState("manage"); // "manage" | "timetable"

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sched, ovr, sports, mgrs, cls] = await Promise.all([
        axios.get("/api/training-schedule").catch(() => ({ data: {} })),
        axios.get("/api/training-schedule/overrides").catch(() => ({ data: {} })),
        axios.get("/api/club-sports").catch(() => ({ data: {} })),
        axios.get("/api/club-admin/managers").catch(() => ({ data: [] })),
        axios.get("/api/students/classes").catch(() => ({ data: {} })),
      ]);
      setRows(sched.data?.rows || []);
      setOverrides(ovr.data?.overrides || []);
      setClubSports((sports.data?.sports || []).map((s) => s.name));
      const mgrList = Array.isArray(mgrs.data) ? mgrs.data : mgrs.data?.managers || [];
      setCoaches(mgrList.filter((m) => ["coach", "trainer"].includes(m.staffRole)));
      setClasses(cls.data?.classes || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const formClass = classes.find((c) => c.name === form.standard);

  const addRow = async () => {
    if (!form.day) return;
    if (!form.sport) { toast.error("Pick a sport."); return; }
    setAdding(true);
    try {
      await axios.post("/api/training-schedule", form);
      setForm({ ...EMPTY });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add slot");
    } finally {
      setAdding(false);
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm("Delete this schedule slot permanently?")) return;
    try {
      await axios.delete(`/api/training-schedule/${id}`);
      setRows((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete slot");
    }
  };

  // Reassign Coach (permanent — edits the slot).
  const saveReassign = async () => {
    const c = coaches.find((x) => x._id === modal.coach);
    try {
      await axios.put(`/api/training-schedule/${modal.row._id}`, { coach: c?._id || null, coachName: c?.name || "" });
      setModal(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reassign coach");
    }
  };

  // Postpone (per-date override).
  const savePostpone = async () => {
    try {
      await axios.post(`/api/training-schedule/${modal.row._id}/override`, {
        date: dateForDay(modal.row.day),
        status: "postponed",
        newDay: modal.newDay || modal.row.day,
        newStartTime: modal.newStart || "",
        newEndTime: modal.newEnd || "",
        reason: modal.reason || "",
      });
      setModal(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to postpone");
    }
  };

  const cancelSession = async (row) => {
    if (!window.confirm("Cancel this session for this week?")) return;
    try {
      await axios.post(`/api/training-schedule/${row._id}/override`, {
        date: dateForDay(row.day),
        status: "cancelled",
      });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel");
    }
  };

  const restoreSession = async (row) => {
    try {
      await axios.delete(`/api/training-schedule/${row._id}/override`, { params: { date: dateForDay(row.day) } });
      fetchAll();
    } catch {
      toast.error("Failed to restore");
    }
  };

  // Override lookup for the current week.
  const overrideMap = useMemo(() => {
    const map = {};
    overrides.forEach((o) => { map[`${o.scheduleId}|${o.date}`] = o; });
    return map;
  }, [overrides]);

  // Group rows by day in DAYS order.
  const byDay = useMemo(() => {
    const g = {};
    DAYS.forEach((d) => (g[d] = []));
    rows.forEach((r) => { (g[r.day] = g[r.day] || []).push(r); });
    return g;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg bg-white/[0.04] p-1 max-w-[220px]">
        {[["manage", "Manage"], ["timetable", "Timetable"]].map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)}
            className={`flex-1 h-8 rounded-md text-[12px] font-semibold transition w-auto ${mode === k ? "bg-orange-500 text-white" : "text-gray-300 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === "timetable" ? (
        <ScheduleTimetable rows={rows} />
      ) : (
        <>
      {/* Create Schedule */}
      <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3 inline-flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-orange-400" /> Create Schedule
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Day">
            <select value={form.day} onChange={(e) => set("day", e.target.value)} className={`w-full ${field}`} style={inputStyle}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Sport">
            <select value={form.sport} onChange={(e) => set("sport", e.target.value)} className={`w-full ${field}`} style={inputStyle}>
              <option value="">Select Sport</option>
              {clubSports.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Coach">
            <select value={form.coach}
              onChange={(e) => { const c = coaches.find((x) => x._id === e.target.value); set("coach", e.target.value); set("coachName", c?.name || ""); }}
              className={`w-full ${field}`} style={inputStyle}>
              <option value="">Select Coach</option>
              {coaches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Standard">
            <select value={form.standard} onChange={(e) => { set("standard", e.target.value); set("section", ""); }} className={`w-full ${field}`} style={inputStyle}>
              <option value="">Select Standard</option>
              {classes.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Section">
            <select value={form.section} onChange={(e) => set("section", e.target.value)} disabled={!formClass || formClass.sections.length === 0}
              className={`w-full ${field} disabled:opacity-40`} style={inputStyle}>
              <option value="">Select Section</option>
              {(formClass?.sections || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Ground">
            <input value={form.ground} onChange={(e) => set("ground", e.target.value)} placeholder="e.g. Field A" className={`w-full ${field}`} style={inputStyle} />
          </Field>
          <Field label="Start Time">
            <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={`w-full ${field}`} style={inputStyle} />
          </Field>
          <Field label="End Time">
            <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} className={`w-full ${field}`} style={inputStyle} />
          </Field>
        </div>
        {clubSports.length === 0 && (
          <p className="text-[12px] text-amber-300/80 mt-3">Add sports first in the <strong>Sports &amp; Trainers</strong> tab.</p>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={addRow} disabled={adding}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add to Schedule
          </button>
        </div>
      </div>

      {/* Weekly Schedule */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center">
          <CalendarDays className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400">No schedule yet. Create a slot above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-[14px] font-semibold text-white">Weekly Schedule</h3>
          {DAYS.filter((d) => byDay[d]?.length).map((d) => (
            <div key={d}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">{d}</p>
              <div className="space-y-2">
                {byDay[d].map((r) => {
                  const ov = overrideMap[`${r._id}|${dateForDay(r.day)}`];
                  const status = statusOf(r, ov);
                  const cancelled = status === "Cancelled";
                  return (
                    <div key={r._id} className="rounded-xl bg-[#181A22] border border-white/[0.06] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-white">{r.sport || (r.sports || []).join(", ") || "—"}</p>
                          <p className="text-[12px] text-gray-400 mt-0.5">
                            {r.standard ? `Std ${r.standard}${r.section ? `-${r.section}` : ""}` : "—"}{r.ground ? ` • ${r.ground}` : ""}
                          </p>
                          <p className="text-[12px] text-gray-500 mt-1 inline-flex items-center gap-3">
                            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{r.startTime ? `${to12h(r.startTime)} – ${to12h(r.endTime)}` : (r.time || "—")}</span>
                            {r.coachName ? <span className="inline-flex items-center gap-1"><UserCog className="w-3.5 h-3.5" />{r.coachName}</span> : null}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 ${STATUS_STYLE[status]}`}>{status}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button onClick={() => setModal({ type: "reassign", row: r, coach: r.coach || "" })}
                          className="h-7 px-3 rounded-md border border-blue-500/40 text-blue-300 text-[12px] font-semibold hover:bg-blue-500/10 w-auto">Reassign Coach</button>
                        {cancelled ? (
                          <button onClick={() => restoreSession(r)}
                            className="h-7 px-3 rounded-md border border-green-500/40 text-green-300 text-[12px] font-semibold hover:bg-green-500/10 w-auto">Restore</button>
                        ) : (
                          <>
                            <button onClick={() => setModal({ type: "postpone", row: r, newDay: r.day, newStart: r.startTime, newEnd: r.endTime })}
                              className="h-7 px-3 rounded-md border border-amber-500/40 text-amber-300 text-[12px] font-semibold hover:bg-amber-500/10 w-auto">Postpone</button>
                            <button onClick={() => cancelSession(r)}
                              className="h-7 px-3 rounded-md border border-red-500/40 text-red-300 text-[12px] font-semibold hover:bg-red-500/10 w-auto">Cancel</button>
                          </>
                        )}
                        <button onClick={() => removeRow(r._id)} title="Delete slot permanently"
                          className="h-7 w-7 ml-auto inline-flex items-center justify-center rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition w-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Adjustment Flow (coach requests → approve/reject/reschedule) */}
      <SessionAdjustmentFlow coaches={coaches} onChanged={fetchAll} />
        </>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-xl bg-[#181A22] border border-white/10 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[14px] font-semibold text-white">
                {modal.type === "reassign" ? "Reassign Coach" : "Postpone Session"}
              </h4>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white w-auto"><X className="w-4 h-4" /></button>
            </div>

            {modal.type === "reassign" ? (
              <>
                <Field label="New Coach">
                  <select value={modal.coach} onChange={(e) => setModal((m) => ({ ...m, coach: e.target.value }))} className={`w-full ${field}`} style={inputStyle}>
                    <option value="">Select Coach</option>
                    {coaches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </Field>
                <button onClick={saveReassign} className="mt-4 w-full h-9 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold">Save</button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="New Day">
                    <select value={modal.newDay} onChange={(e) => setModal((m) => ({ ...m, newDay: e.target.value }))} className={`w-full ${field}`} style={inputStyle}>
                      {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start Time">
                      <input type="time" value={modal.newStart} onChange={(e) => setModal((m) => ({ ...m, newStart: e.target.value }))} className={`w-full ${field}`} style={inputStyle} />
                    </Field>
                    <Field label="End Time">
                      <input type="time" value={modal.newEnd} onChange={(e) => setModal((m) => ({ ...m, newEnd: e.target.value }))} className={`w-full ${field}`} style={inputStyle} />
                    </Field>
                  </div>
                </div>
                <button onClick={savePostpone} className="mt-4 w-full h-9 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold">Postpone</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
