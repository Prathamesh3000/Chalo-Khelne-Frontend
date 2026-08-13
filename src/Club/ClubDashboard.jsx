import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { activatable } from "../shared/utils/activatable";
import {
  CalendarCheck, Tv, Users, TrendingUp, AlertCircle, Trophy, Dribbble,
  GraduationCap, UserCheck, UserPlus, PlusCircle, ArrowRight, Sparkles, FileText, Clock,
} from "lucide-react";

/**
 * Club Dashboard — dark replica of the prototype's facility-business overview.
 * Aggregates KPIs from the club summary API. Until each source module is wired,
 * missing feeds render as 0 / empty (graceful), then light up as modules ship.
 */
const EMPTY = {
  todayBookings: 0, liveMatches: 0, activeMembers: 0, expiredMembers: 0, totalRevenue: 0,
  pendingAmount: 0, pendingCount: 0, upcomingTournaments: 0, availableCourts: 0, totalCourts: 0,
  coachesAvailable: 0, staffOnDuty: 0, totalStaff: 0, newMemberRequests: 0,
  liveActivity: [], pendingPayments: [], auditLogs: [],
};

export default function ClubDashboard() {
  const nav = useNavigate();
  const [d, setD] = useState(EMPTY);
  const [currency] = useState("₹");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/club/dashboard/summary");
        if (data?.stats) setD({ ...EMPTY, ...data.stats });
      } catch { /* summary API arrives with the module build — keep graceful zeros */ }
    })();
  }, []);

  const go = (tab) => nav(`/club/${tab}`);

  const cards = [
    { title: "Today's Bookings", value: d.todayBookings, sub: "Reserved slots today", icon: CalendarCheck, tone: "text-emerald-300", tab: "calendar" },
    { title: "Live Matches", value: d.liveMatches, sub: "Courts & tournaments live", icon: Tv, tone: "text-rose-300", tab: "tournaments" },
    { title: "Active Members", value: d.activeMembers, sub: `${d.expiredMembers} expired/unpaid`, icon: Users, tone: "text-blue-300", tab: "members" },
    { title: "Total Revenue", value: `${currency}${d.totalRevenue.toLocaleString()}`, sub: "Cumulative income", icon: TrendingUp, tone: "text-amber-300", tab: "finance" },
    { title: "Pending Payments", value: `${currency}${d.pendingAmount.toLocaleString()}`, sub: `${d.pendingCount} pending invoices`, icon: AlertCircle, tone: "text-orange-300", tab: "finance" },
    { title: "Upcoming Tournaments", value: d.upcomingTournaments, sub: "Open registrations", icon: Trophy, tone: "text-violet-300", tab: "tournaments" },
    { title: "Available Courts", value: `${d.availableCourts}/${d.totalCourts}`, sub: "Free for walk-ins", icon: Dribbble, tone: "text-teal-300", tab: "courts" },
    { title: "Coaches Available", value: d.coachesAvailable, sub: "On-duty coaches", icon: GraduationCap, tone: "text-indigo-300", tab: "coaches" },
    { title: "Staff On Duty", value: `${d.staffOnDuty}/${d.totalStaff}`, sub: "Active shift crew", icon: UserCheck, tone: "text-cyan-300", tab: "staff" },
    { title: "New Member Requests", value: d.newMemberRequests, sub: "Awaiting approval", icon: UserPlus, tone: "text-fuchsia-300", tab: "members" },
  ];

  const quickActions = [
    { label: "Add Booking", tab: "calendar" }, { label: "Create Tournament", tab: "tournaments" },
    { label: "Add Member", tab: "members" }, { label: "Add Coach", tab: "coaches" },
    { label: "Block Court", tab: "courts" }, { label: "Generate Invoice", tab: "finance" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181A22] p-5 rounded-2xl border border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/15 text-emerald-300 rounded-lg"><Sparkles size={16} /></span>
            <h1 className="text-[20px] font-black text-white tracking-tight">Club Operations Hub</h1>
          </div>
          <p className="text-gray-500 text-[13px] mt-1">Bookings, memberships, POS, coaching and events — one facility cockpit.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#12141B] px-4 py-2.5 rounded-xl border border-white/[0.08]">
          <Clock size={15} className="text-gray-500" />
          <span className="text-[11px] font-mono font-medium text-gray-400">REAL-TIME SYNC</span>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((a) => (
            <button key={a.label} onClick={() => go(a.tab)}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/[0.06] bg-[#181A22] hover:bg-white/[0.04] hover:border-emerald-500/30 transition group">
              <div className="w-8 h-8 bg-emerald-500/10 text-emerald-300 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-500/20 transition">
                <PlusCircle size={18} />
              </div>
              <span className="text-[12px] text-gray-300 font-semibold group-hover:text-white text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Operations Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} {...activatable(() => go(c.tab))}
                className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col justify-between hover:border-white/20 transition cursor-pointer group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">{c.title}</span>
                  <div className="p-1.5 rounded-lg border border-white/[0.08] text-gray-500 group-hover:text-emerald-300 group-hover:border-emerald-500/30 transition"><Icon size={15} /></div>
                </div>
                <div className="mt-3">
                  <span className={`text-[22px] font-black tracking-tight block ${c.tone}`}>{c.value}</span>
                  <p className="text-[11px] text-gray-500 mt-1 leading-none">{c.sub}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-gray-500 group-hover:text-emerald-300 transition">
                  <span className="font-medium">Manage module</span>
                  <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live + pending + audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-[#181A22] p-5 rounded-2xl border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              <h3 className="font-bold text-white text-[15px]">Live Matches &amp; Active Courts</h3>
            </div>
            <button onClick={() => go("tournaments")} className="text-[12px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 w-auto bg-transparent">
              View fixtures <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {d.liveActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-600 text-[13px] italic">No matches or courts are live right now.</div>
            ) : d.liveActivity.map((a, i) => (
              <div key={i} className="p-3 bg-[#12141B] rounded-xl border border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-rose-300 px-1.5 py-0.5 bg-rose-500/10 rounded">{a.tag || "LIVE"}</span>
                  <p className="text-[13px] font-semibold text-gray-100 mt-1.5">{a.title}</p>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">{a.subtitle}</p>
                </div>
                {a.score && <div className="bg-rose-500/15 text-rose-300 font-mono px-3 py-1.5 rounded-lg font-bold text-sm tracking-widest border border-rose-500/25">{a.score}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-3"><span className="text-emerald-300"><FileText size={17} /></span><h3 className="font-bold text-white text-[15px]">Pending Settlements</h3></div>
            <p className="text-[12px] text-gray-500 mb-4">Collect payment for offline walk-ins and corporate reserves.</p>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {d.pendingPayments.length === 0 ? (
                <div className="py-6 text-center text-[12px] text-gray-600 italic">All current invoices settled.</div>
              ) : d.pendingPayments.map((b, i) => (
                <div key={i} className="p-3 bg-[#12141B] rounded-xl border border-white/[0.06] flex items-center justify-between">
                  <div><p className="text-[12px] font-bold text-gray-200">{b.customerName}</p><p className="text-[10px] text-gray-500 font-mono mt-0.5">{b.courtName} • {b.startTime}</p></div>
                  <div className="flex items-center gap-2"><span className="text-[12px] font-mono font-bold text-gray-200">{currency}{b.amount}</span><button onClick={() => go("finance")} className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded hover:bg-emerald-700 w-auto">Collect</button></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06]">
            <h3 className="font-bold text-white text-[15px] mb-3">Back-Office Audit Log</h3>
            <div className="space-y-2.5">
              {d.auditLogs.length === 0 ? (
                <div className="py-4 text-center text-[12px] text-gray-600 italic">Recent admin actions will appear here.</div>
              ) : d.auditLogs.slice(0, 4).map((log, i) => (
                <div key={i} className="p-2.5 bg-[#12141B] rounded-xl border border-white/[0.06] text-[12px]">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono"><span>{log.user} • {log.module}</span><span>{log.time}</span></div>
                  <p className="text-gray-300 font-medium mt-1">{log.action}: <span className="font-normal text-gray-500">{log.details}</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
