import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ClipboardList, Loader2, ChevronDown, ChevronRight, Clock, Calendar, User,
} from "lucide-react";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const field = "h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none";

/**
 * Attendance report (school / organization admins). View the attendance a
 * trainer recorded — by trainer, date and standard — with the scheduled time
 * and each student's present/absent status.
 */
export default function AttendanceView({ trainers = [] }) {
  const [filters, setFilters] = useState({ trainerId: "", date: "", standard: "" });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.trainerId) params.trainerId = filters.trainerId;
      if (filters.date) params.date = filters.date;
      if (filters.standard) params.standard = filters.standard.trim();
      const res = await axios.get("/api/attendance/admin", { params });
      setSessions(res.data?.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const fmtDate = (ymd) => {
    const [y, m, d] = String(ymd).split("-").map(Number);
    if (!y) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Trainer</label>
            <select value={filters.trainerId} onChange={(e) => setFilters((f) => ({ ...f, trainerId: e.target.value }))} className={`${field} w-48`} style={inputStyle}>
              <option value="">All trainers</option>
              {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Date</label>
            <input type="date" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} className={`${field} w-44`} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Standard</label>
            <input value={filters.standard} onChange={(e) => setFilters((f) => ({ ...f, standard: e.target.value }))} placeholder="e.g. V" className={`${field} w-28`} style={inputStyle} />
          </div>
          {(filters.trainerId || filters.date || filters.standard) && (
            <button onClick={() => setFilters({ trainerId: "", date: "", standard: "" })}
              className="h-9 px-3 rounded-md text-[12px] text-gray-400 hover:text-white transition w-auto">Clear</button>
          )}
        </div>
      </div>

      {/* Sessions */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center">
          <ClipboardList className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400">No attendance recorded for this filter yet.</p>
        </div>
      ) : (
        sessions.map((s, i) => {
          const key = `${s.date}-${s.trainerId}-${s.sport}-${s.standard}-${i}`;
          const open = expanded === key;
          return (
            <div key={key} className="rounded-xl bg-[#181A22] border border-white/[0.06] overflow-hidden">
              <button onClick={() => setExpanded(open ? null : key)} className="w-full text-left px-4 py-3 w-auto">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className="text-[14px] font-semibold text-white truncate">{s.sport || "—"}</span>
                    <span className="text-[11px] font-semibold text-orange-300 bg-orange-500/15 rounded px-1.5 py-0.5">Std {s.standard || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[12px] text-emerald-300">{s.present} present</span>
                    <span className="text-[12px] text-gray-500">/ {s.total}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pl-6 text-[12px] text-gray-400">
                  <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {s.trainerName}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(s.date)}</span>
                  {s.time ? <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.time}</span> : null}
                  <span className={`inline-flex items-center gap-1 ${s.self === "present" ? "text-emerald-300" : s.self === "absent" ? "text-red-300" : "text-gray-600"}`}>
                    Trainer: {s.self ? s.self : "—"}
                  </span>
                </div>
                {s.self === "absent" && s.selfReason ? (
                  <div className="mt-1 pl-6 text-[12px] text-red-300/90">
                    <span className="text-gray-500">Absence reason:</span> {s.selfReason}
                  </div>
                ) : null}
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
                          st.status === "present" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
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
        })
      )}
    </div>
  );
}
