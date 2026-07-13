import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  GraduationCap, Users, BookOpen, CalendarDays, ArrowRight, Loader2,
  CheckCircle2, XCircle, MinusCircle, Timer, ClipboardList, Calendar,
  CalendarRange, Bell, TrendingUp,
} from "lucide-react";
import { ClubAdminShell } from "../shared/layout";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtHours = (h) => {
  const hrs = Number(h) || 0;
  if (hrs <= 0) return "0h";
  const whole = Math.floor(hrs);
  const mins = Math.round((hrs - whole) * 60);
  return mins ? `${whole}:${String(mins).padStart(2, "0")}h` : `${whole}h`;
};

/**
 * School / organization admin dashboard — a school-focused overview (students,
 * coaches, classes, today's schedule + attendance) instead of the club's
 * revenue/turf/tournament dashboard. Rendered by ClubAdminDashboard when the
 * admin's orgType is school/organization.
 */
export default function SchoolDashboard() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [counts, setCounts] = useState({ students: 0, coaches: 0, classes: 0 });
  const [summary, setSummary] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [pending, setPending] = useState({ leaves: 0, sessions: 0 });

  const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    if (auth?._id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?._id]);

  const fetchAll = async () => {
    setLoading(true);
    const date = todayStr();
    try {
      const [prof, students, classes, mgrs, sched, sum, leaves, sessions] = await Promise.allSettled([
        axios.get(`/api/clubadminprofile/${auth._id}`),
        axios.get("/api/students"),
        axios.get("/api/students/classes"),
        axios.get("/api/club-admin/managers"),
        axios.get("/api/training-schedule"),
        axios.get("/api/attendance/admin/summary", { params: { date } }),
        axios.get("/api/leave-requests", { params: { status: "pending" } }),
        axios.get("/api/session-requests", { params: { status: "pending" } }),
      ]);

      if (prof.status === "fulfilled") {
        const d = prof.value.data;
        setSchoolName(d?.clubProfile?.clubName || d?.clubName || d?.clubProfile?.name || "");
      }
      const studentList = students.status === "fulfilled" ? (students.value.data?.students || []) : [];
      const classList = classes.status === "fulfilled" ? (classes.value.data?.classes || []) : [];
      const mgrRaw = mgrs.status === "fulfilled" ? mgrs.value.data : [];
      const mgrList = (Array.isArray(mgrRaw) ? mgrRaw : mgrRaw?.managers || [])
        .filter((m) => ["coach", "trainer"].includes(m.staffRole));
      setCounts({ students: studentList.length, coaches: mgrList.length, classes: classList.length });

      const rows = sched.status === "fulfilled" ? (sched.value.data?.rows || []) : [];
      setTodaySessions(rows.filter((r) => r.day === weekday));

      if (sum.status === "fulfilled") setSummary(sum.value.data);
      setPending({
        leaves: leaves.status === "fulfilled" ? (leaves.value.data?.leaves || []).length : 0,
        sessions: sessions.status === "fulfilled" ? (sessions.value.data?.requests || []).length : 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const displayName = auth?.name || "Admin";

  if (loading) {
    return (
      <ClubAdminShell searchPlaceholder="Search…">
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gray-500 animate-spin" /></div>
      </ClubAdminShell>
    );
  }

  const st = summary?.students || { present: 0, absent: 0, leave: 0 };
  const cs = summary?.coachSummary || { present: 0, absent: 0, totalHours: 0 };
  const pendingTotal = pending.leaves + pending.sessions;

  const quickActions = [
    { label: "Student Management", icon: GraduationCap, tab: "students" },
    { label: "Schedule Management", icon: Calendar, tab: "schedule" },
    { label: "Attendance", icon: ClipboardList, tab: "attendance" },
    { label: "Coach Management", icon: Users, tab: "trainers" },
    { label: "Assessment Reports", icon: TrendingUp, tab: "progress" },
  ];
  const goTab = (tab) => navigate(`/trainer-management?tab=${tab}`);

  const sessionLabel = (r) => {
    const sport = r.sport || (r.sports || [])[0] || "Session";
    const std = r.standard ? `Std ${r.standard}${r.section ? `-${r.section}` : ""}` : "";
    return { sport, std };
  };

  return (
    <ClubAdminShell searchPlaceholder="Search…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <GraduationCap className="w-3.5 h-3.5" /> School admin · Overview
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Welcome back, <span className="text-orange-400">{displayName}</span>
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {schoolName ? `${schoolName} · ` : ""}{dateLabel}
          </p>
        </div>
      </header>

      {/* Needs attention */}
      {pendingTotal > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6 rounded-lg p-4 bg-amber-500/[0.08] border border-amber-500/20">
          <span className="grid w-9 h-9 rounded-md place-items-center bg-amber-500/15 text-amber-300 flex-shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </span>
          <p className="text-[13px] text-amber-100 flex-1 min-w-[180px]">
            You have <span className="font-semibold">{pendingTotal}</span> pending request{pendingTotal === 1 ? "" : "s"} to review.
          </p>
          {pending.leaves > 0 && (
            <button onClick={() => goTab("leave")} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold text-amber-200 hover:text-white hover:bg-white/[0.06] transition w-auto" style={{ border: "1px solid rgba(245,158,11,0.3)" }}>
              <CalendarRange className="w-3.5 h-3.5" /> {pending.leaves} leave
            </button>
          )}
          {pending.sessions > 0 && (
            <button onClick={() => goTab("schedule")} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold text-amber-200 hover:text-white hover:bg-white/[0.06] transition w-auto" style={{ border: "1px solid rgba(245,158,11,0.3)" }}>
              <Calendar className="w-3.5 h-3.5" /> {pending.sessions} session change
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile icon={GraduationCap} label="Students" value={counts.students} onClick={() => goTab("students")} />
        <StatTile icon={Users} label="Coaches" value={counts.coaches} tone="blue" onClick={() => goTab("trainers")} />
        <StatTile icon={BookOpen} label="Classes" value={counts.classes} tone="purple" onClick={() => goTab("students")} />
        <StatTile icon={CalendarDays} label={`Today's sessions`} value={todaySessions.length} tone="green" onClick={() => goTab("schedule")} />
      </div>

      {/* Attendance today + Today's schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <div className="lg:col-span-1">
          <Section title="Today's attendance" icon={ClipboardList} actionLabel="Open" onAction={() => goTab("attendance")}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <MiniStat icon={CheckCircle2} label="Present" value={st.present} tone="green" />
              <MiniStat icon={XCircle} label="Absent" value={st.absent} tone="red" />
              <MiniStat icon={MinusCircle} label="Leave" value={st.leave} tone="amber" />
            </div>
            <div className="flex items-center justify-between rounded-md px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-[12px] text-gray-400">Coaches present</span>
              <span className="text-[13px] font-semibold text-white tabular-nums">{cs.present} / {cs.present + cs.absent}</span>
            </div>
            <div className="flex items-center justify-between rounded-md px-3 py-2.5 mt-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-[12px] text-gray-400 inline-flex items-center gap-1.5"><Timer className="w-3.5 h-3.5 text-sky-400" /> Coach hours today</span>
              <span className="text-[13px] font-semibold text-white tabular-nums">{fmtHours(cs.totalHours)}</span>
            </div>
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title={`Today's schedule · ${weekday}`} icon={CalendarDays} actionLabel="Manage" onAction={() => goTab("schedule")}>
            {todaySessions.length === 0 ? (
              <EmptyInline icon={CalendarDays} title="No sessions today" desc="Nothing is scheduled for today. Add slots in Schedule Management." />
            ) : (
              <ul className="divide-y divide-white/[0.04] -my-1 max-h-[280px] overflow-y-auto">
                {todaySessions.map((r) => {
                  const { sport, std } = sessionLabel(r);
                  return (
                    <li key={r._id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-md bg-orange-500/15 text-orange-300 grid place-items-center text-[11px] font-semibold flex-shrink-0">
                          {(sport[0] || "S").toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white truncate">{sport}{std ? ` · ${std}` : ""}</p>
                          <p className="text-[11px] text-gray-500 truncate">{r.coachName || "Unassigned"}</p>
                        </div>
                      </div>
                      <span className="text-[12px] text-gray-400 tabular-nums flex-shrink-0">
                        {r.time || (r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : "—")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Quick actions */}
      <Section title="Quick actions">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {quickActions.map(({ label, icon: Icon, tab }) => (
            <button key={tab} onClick={() => goTab(tab)}
              className="flex flex-col items-start gap-2 px-3 py-3 rounded-md hover:bg-white/[0.04] text-[13px] font-medium text-gray-200 transition group w-auto text-left"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Icon className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition" />
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </Section>
    </ClubAdminShell>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, tone = "orange", onClick }) {
  const tones = {
    orange: { bg: "bg-orange-500/15", text: "text-orange-400" },
    green: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
    blue: { bg: "bg-sky-500/15", text: "text-sky-400" },
    purple: { bg: "bg-purple-500/15", text: "text-purple-400" },
  };
  const t = tones[tone] || tones.orange;
  return (
    <button onClick={onClick}
      className="text-left bg-[#181A22] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.12] transition w-auto">
      <span className={`grid w-[34px] h-[34px] rounded-md place-items-center ${t.bg} mb-3`}>
        <Icon className={`w-[18px] h-[18px] ${t.text}`} />
      </span>
      <p className="text-[24px] font-medium leading-none text-white tabular-nums">{value ?? 0}</p>
      <p className="mt-1 text-[12px] text-gray-400">{label}</p>
    </button>
  );
}

function MiniStat({ icon: Icon, label, value, tone }) {
  const tones = {
    green: "text-emerald-300", red: "text-red-300", amber: "text-amber-300",
  };
  return (
    <div className="rounded-md p-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${tones[tone] || "text-gray-300"}`} />
      <p className="text-[18px] font-semibold text-white leading-none tabular-nums">{value ?? 0}</p>
      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, actionLabel, onAction, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
          <h3 className="text-[13px] font-medium text-white">{title}</h3>
        </div>
        {actionLabel && onAction && (
          <button onClick={onAction} className="text-[12px] font-semibold inline-flex items-center gap-1 transition text-orange-400 hover:text-orange-300 w-auto">
            {actionLabel} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyInline({ icon: Icon, title, desc }) {
  return (
    <div className="text-center py-8">
      <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-2.5">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <p className="text-[13px] font-medium text-white">{title}</p>
      <p className="text-[12px] text-gray-400 mt-1 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
