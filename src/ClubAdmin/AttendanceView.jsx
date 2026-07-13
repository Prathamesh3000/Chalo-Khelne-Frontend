import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ClipboardList, Loader2, ChevronDown, ChevronRight, Clock, Calendar, User,
  Users, CheckCircle2, XCircle, MinusCircle, LogIn, LogOut, Timer, GraduationCap,
} from "lucide-react";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const field = "h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtDate = (ymd) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

// "HH:mm" (24h) → "3:45 PM"
const fmtTime = (t) => {
  if (!t) return "—";
  const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  let h = +m[1];
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
};

// decimal hours → "1:45h"
const fmtHours = (h) => {
  const hrs = Number(h) || 0;
  if (hrs <= 0) return "—";
  const whole = Math.floor(hrs);
  const mins = Math.round((hrs - whole) * 60);
  return `${whole}:${String(mins).padStart(2, "0")}h`;
};

// ── Summary stat card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    green: "text-emerald-300 bg-emerald-500/10",
    red: "text-red-300 bg-red-500/10",
    amber: "text-amber-300 bg-amber-500/10",
    blue: "text-sky-300 bg-sky-500/10",
    orange: "text-orange-300 bg-orange-500/10",
  };
  return (
    <div className="flex-1 min-w-[120px] rounded-xl bg-[#181A22] border border-white/[0.06] p-4">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${tones[tone] || tones.blue}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="text-[22px] font-bold text-white leading-none">{value}</p>
      <p className="text-[12px] text-gray-400 mt-1">{label}</p>
    </div>
  );
}

/**
 * Attendance Management (school / organization admins) — view-only.
 * Coaches mark attendance on mobile (students Present/Absent/Leave + their own
 * present/absent with check-in/out). Two tabs:
 *   • Student Attendance — today's Present/Absent/Leave totals + recent sessions.
 *   • Coach Attendance   — today's Present/Absent/Total Hours + per-coach in/out.
 */
export default function AttendanceView({ trainers = [] }) {
  const [subTab, setSubTab] = useState("students"); // students | coaches
  const [date, setDate] = useState(todayStr);

  // Today's summary (both tabs) --------------------------------------------------
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await axios.get("/api/attendance/admin/summary", { params: { date } });
      setSummary(res.data || null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [date]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Recent sessions (student tab) ------------------------------------------------
  const [filters, setFilters] = useState({ trainerId: "", standard: "" });
  const [sessions, setSessions] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const params = {};
      if (filters.trainerId) params.trainerId = filters.trainerId;
      if (filters.standard) params.standard = filters.standard.trim();
      const res = await axios.get("/api/attendance/admin", { params });
      setSessions(res.data?.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setRecentLoading(false);
    }
  }, [filters]);
  useEffect(() => { if (subTab === "students") fetchRecent(); }, [subTab, fetchRecent]);

  const students = summary?.students || { present: 0, absent: 0, leave: 0 };
  const coachSummary = summary?.coachSummary || { present: 0, absent: 0, totalHours: 0 };
  const coaches = summary?.coaches || [];

  return (
    <div className="space-y-4">
      {/* Header: sub-tabs + date */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-white/[0.04] p-1">
          {[
            { id: "students", label: "Student Attendance", icon: GraduationCap },
            { id: "coaches", label: "Coach Attendance", icon: Users },
          ].map((t) => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold transition w-auto ${subTab === t.id ? "bg-blue-600 text-white" : "text-gray-300 hover:text-white"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">Day</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} w-44`} style={inputStyle} />
        </div>
      </div>

      {/* ── STUDENT ATTENDANCE ── */}
      {subTab === "students" && (
        <>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-2">
              Attendance Summary · {fmtDate(date)}
            </p>
            {summaryLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-orange-500 animate-spin" /></div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <StatCard icon={CheckCircle2} label="Present" value={students.present} tone="green" />
                <StatCard icon={XCircle} label="Absent" value={students.absent} tone="red" />
                <StatCard icon={MinusCircle} label="Leave" value={students.leave} tone="amber" />
              </div>
            )}
          </div>

          {/* Recent Attendance */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-500">Recent Attendance</p>
            <div className="flex items-end gap-3">
              <select value={filters.trainerId} onChange={(e) => setFilters((f) => ({ ...f, trainerId: e.target.value }))} className={`${field} w-40`} style={inputStyle}>
                <option value="">All coaches</option>
                {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
              <input value={filters.standard} onChange={(e) => setFilters((f) => ({ ...f, standard: e.target.value }))} placeholder="Std" className={`${field} w-24`} style={inputStyle} />
              {(filters.trainerId || filters.standard) && (
                <button onClick={() => setFilters({ trainerId: "", standard: "" })} className="h-9 px-3 rounded-md text-[12px] text-gray-400 hover:text-white transition w-auto">Clear</button>
              )}
            </div>
          </div>

          {recentLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center">
              <ClipboardList className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-[13px] text-gray-400">No attendance recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s, i) => {
                const key = `${s.date}-${s.trainerId}-${s.sport}-${s.standard}-${i}`;
                const open = expanded === key;
                return (
                  <div key={key} className="rounded-xl bg-[#181A22] border border-white/[0.06] overflow-hidden">
                    <button onClick={() => setExpanded(open ? null : key)} className="w-full text-left px-4 py-3 w-auto">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                          <span className="text-[14px] font-semibold text-white truncate">Std {s.standard || "—"} · {s.sport || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0 text-[12px]">
                          <span className="text-emerald-300">✓{s.present}</span>
                          <span className="text-red-300">✕{s.absent}</span>
                          <span className="text-amber-300">⊘{s.leave || 0}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pl-6 text-[12px] text-gray-400">
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(s.date)}</span>
                        <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {s.trainerName}</span>
                        {s.time ? <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.time}</span> : null}
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-white/[0.06]">
                        {s.students.length === 0 ? (
                          <p className="px-4 py-3 text-[12px] text-gray-500">No student records for this session.</p>
                        ) : (
                          s.students.map((st, idx) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04] last:border-b-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-[11px] text-gray-600 w-6">{idx + 1}</span>
                                <span className="text-[13px] text-gray-200 truncate">{st.name}</span>
                                {st.rollNo ? <span className="text-[11px] text-gray-500">#{st.rollNo}</span> : null}
                              </div>
                              <span className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                st.status === "present" ? "bg-emerald-500/15 text-emerald-300"
                                  : st.status === "leave" ? "bg-amber-500/15 text-amber-300"
                                  : "bg-red-500/15 text-red-300"
                              }`}>
                                {st.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── COACH ATTENDANCE ── */}
      {subTab === "coaches" && (
        <>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-2">
              Coach Attendance · {fmtDate(date)}
            </p>
            {summaryLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-orange-500 animate-spin" /></div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <StatCard icon={CheckCircle2} label="Present" value={coachSummary.present} tone="green" />
                <StatCard icon={XCircle} label="Absent" value={coachSummary.absent} tone="red" />
                <StatCard icon={Timer} label="Total Hours" value={fmtHours(coachSummary.totalHours)} tone="orange" />
              </div>
            )}
          </div>

          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gray-500 pt-1">Coaches</p>
          {summaryLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
          ) : coaches.length === 0 ? (
            <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center">
              <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-[13px] text-gray-400">No coach attendance recorded for this day.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {coaches.map((c) => (
                <div key={c.trainerId} className="rounded-xl bg-[#181A22] border border-white/[0.06] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-white truncate">{c.name}</p>
                      {c.sport ? <p className="text-[12px] text-gray-500 mt-0.5">{c.sport} Coach</p> : null}
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 capitalize ${
                      c.status === "present" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                    }`}>{c.status}</span>
                  </div>
                  {c.status === "present" && (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-[12px] text-gray-400">
                      <span className="inline-flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5 text-emerald-400" /> In: <span className="text-gray-200">{fmtTime(c.checkInTime)}</span></span>
                      <span className="inline-flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5 text-orange-400" /> Out: <span className="text-gray-200">{fmtTime(c.checkOutTime)}</span></span>
                      <span className="inline-flex items-center gap-1.5"><Timer className="w-3.5 h-3.5 text-sky-400" /> Total: <span className="text-gray-200">{fmtHours(c.hours)}</span></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
