import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users, Trophy, IndianRupee, MapPin, TrendingUp, CreditCard,
  ArrowRight, Gavel, BarChart3, Inbox, Loader2, ShieldCheck,
} from "lucide-react";
import { ClubAdminShell } from "../shared/layout";
import SchoolDashboard from "./SchoolDashboard";

const ClubAdminDashboard = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [orgType, setOrgType] = useState(null); // null = still resolving
  const [profileData, setProfileData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolve the admin's org type first — schools/organizations get a different,
  // school-focused dashboard instead of the club revenue/turf overview.
  useEffect(() => {
    const uid = auth?._id;
    if (!uid) return;
    axios.get(`/api/clubadminprofile/${uid}`, { headers })
      .then((r) => setOrgType(r.data?.clubProfile?.orgType || r.data?.orgType || "club"))
      .catch(() => setOrgType("club"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?._id]);

  useEffect(() => {
    if (auth?._id && orgType === "club") fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, orgType]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [profileRes, overviewRes, paymentsRes] = await Promise.allSettled([
        axios.get(`/api/user/profile/${auth._id}`, { headers }),
        axios.get("/api/club-admin/finance/overview", { headers }),
        axios.get("/api/club-admin/finance/payments?limit=5", { headers }),
      ]);
      if (profileRes.status === "fulfilled") setProfileData(profileRes.value.data);
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value.data.overview);
      if (paymentsRes.status === "fulfilled") setRecentPayments(paymentsRes.value.data.payments || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  // While org type is resolving, hold on a loader (avoids flashing the club
  // dashboard to a school admin).
  if (orgType === null) {
    return (
      <ClubAdminShell searchPlaceholder="Search dashboard…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </ClubAdminShell>
    );
  }
  if (orgType === "school" || orgType === "organization") {
    return <SchoolDashboard />;
  }

  if (loading) {
    return (
      <ClubAdminShell searchPlaceholder="Search dashboard…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </ClubAdminShell>
    );
  }

  const totalManagers = overview?.totalManagers || 0;
  const totalTournaments = overview?.totalTournaments || 0;
  const grandRevenue = overview?.grandTotalRevenue || 0;
  const totalBookings = overview?.totalBookings || 0;
  const tournamentRevenue = overview?.totalTournamentRevenue || 0;
  const bookingRevenue = overview?.totalBookingRevenue || 0;

  const displayName = profileData?.name || auth?.name || "Club Admin";
  const clubName = profileData?.clubName || auth?.clubName || "your club";

  const quickActions = [
    { label: "Manage turfs",       icon: MapPin,     path: "/turf-management" },
    { label: "Staff / Managers",   icon: Users,      path: "/staff-admin" },
    { label: "Financial overview", icon: TrendingUp, path: "/club-finance" },
    { label: "Payment history",    icon: CreditCard, path: "/payment-history" },
    { label: "Referee management", icon: Gavel,      path: "/club-refree" },
  ];

  return (
    <ClubAdminShell searchPlaceholder="Search dashboard…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Club admin · Overview
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Welcome back, <span className="text-orange-400">{displayName}</span>
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {clubName} · here's how things are doing today.
          </p>
        </div>
        <button
          onClick={() => navigate("/ClubAdminProfile")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition active:scale-[0.98] flex-shrink-0 w-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          Edit profile <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile icon={Users}       label="Managers"       value={totalManagers} />
        <StatTile icon={Trophy}      label="Tournaments"    value={totalTournaments} />
        <StatTile icon={IndianRupee} label="Total revenue"  value={formatCurrency(grandRevenue)} tone="green" />
        <StatTile icon={MapPin}      label="Turf bookings"  value={totalBookings} />
      </div>

      {/* Revenue + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <div className="lg:col-span-2">
          <Section title="Revenue breakdown" icon={BarChart3}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RevenueTile
                icon={Trophy}
                label="Tournament revenue"
                value={formatCurrency(tournamentRevenue)}
                hint={`From ${totalTournaments} tournament${totalTournaments === 1 ? "" : "s"}`}
                tone="orange"
              />
              <RevenueTile
                icon={MapPin}
                label="Turf booking revenue"
                value={formatCurrency(bookingRevenue)}
                hint={`From ${totalBookings} booking${totalBookings === 1 ? "" : "s"}`}
                tone="green"
              />
            </div>
          </Section>
        </div>

        <Section title="Quick actions">
          <div className="space-y-1.5">
            {quickActions.map(({ label, icon: Icon, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.04] text-[13px] font-medium text-gray-200 transition group w-auto"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-orange-400 transition" />
                  {label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-400 transition" />
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Managers + Recent payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section
          title="Top managers"
          icon={Users}
          actionLabel="View all"
          onAction={() => navigate("/club-finance")}
        >
          {overview?.managers?.length > 0 ? (
            <ul className="divide-y divide-white/[0.04] -my-2">
              {overview.managers.slice(0, 5).map((mgr) => (
                <li
                  key={mgr._id}
                  onClick={() => navigate("/club-finance")}
                  className="flex items-center justify-between py-2.5 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-orange-500/15 text-orange-400 grid place-items-center text-[12px] font-semibold flex-shrink-0">
                      {mgr.name?.charAt(0)?.toUpperCase() || "M"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white truncate group-hover:text-orange-300 transition">{mgr.name}</p>
                      <p className="text-[11px] text-gray-500">
                        <span className="font-mono tabular-nums">{mgr.tournaments}</span> tournament{mgr.tournaments === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-semibold text-emerald-300 tabular-nums">{formatCurrency(mgr.totalRevenue)}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">revenue</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyInline icon={Users} title="No managers yet" desc="Assign managers to your tournaments to see them ranked here." />
          )}
        </Section>

        <Section
          title="Recent payments"
          icon={CreditCard}
          actionLabel="View all"
          onAction={() => navigate("/payment-history")}
        >
          {recentPayments.length > 0 ? (
            <ul className="divide-y divide-white/[0.04] -my-2">
              {recentPayments.map((p) => (
                <li key={p._id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-8 h-8 rounded-md grid place-items-center flex-shrink-0 ${
                      p.type === "tournament" ? "bg-amber-500/15 text-amber-300" : "bg-blue-500/15 text-blue-300"
                    }`}>
                      {p.type === "tournament" ? <Trophy className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{p.playerName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{p.reference}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-0.5 flex-shrink-0 ml-3">
                    <p className="text-[13px] font-semibold text-white tabular-nums">{formatCurrency(p.amount)}</p>
                    <PaymentStatusPill status={p.paymentStatus} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyInline icon={Inbox} title="No payments yet" desc="Payment activity will show up here once players check out." />
          )}
        </Section>
      </div>
    </ClubAdminShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, tone = "orange" }) {
  const tones = {
    orange: { bg: "bg-orange-500/15",  text: "text-orange-400"  },
    green:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  };
  const t = tones[tone] || tones.orange;
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`grid w-[34px] h-[34px] rounded-md place-items-center ${t.bg}`}>
          <Icon className={`w-[18px] h-[18px] ${t.text}`} />
        </span>
      </div>
      <p className="text-[24px] font-medium leading-none text-white tabular-nums">{value ?? 0}</p>
      <p className="mt-1 text-[12px] text-gray-400">{label}</p>
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
          <button onClick={onAction}
            className="text-[12px] font-semibold inline-flex items-center gap-1 transition text-orange-400 hover:text-orange-300 w-auto"
          >
            {actionLabel} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RevenueTile({ icon: Icon, label, value, hint, tone }) {
  const tones = {
    orange: { iconBg: "bg-orange-500/15",  iconText: "text-orange-400",  valueText: "text-white" },
    green:  { iconBg: "bg-emerald-500/15", iconText: "text-emerald-300", valueText: "text-white" },
  };
  const t = tones[tone] || tones.orange;
  return (
    <div className="rounded-md p-3.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-7 h-7 rounded-md ${t.iconBg} grid place-items-center`}>
          <Icon className={`w-3.5 h-3.5 ${t.iconText}`} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <p className={`text-[22px] font-medium ${t.valueText} tabular-nums leading-none`}>{value}</p>
      <p className="text-[11px] mt-1.5 text-gray-500">{hint}</p>
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

function PaymentStatusPill({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "bg-white/[0.06] text-gray-400";
  if (s === "paid")    cls = "bg-emerald-500/15 text-emerald-300";
  if (s === "pending") cls = "bg-amber-500/15 text-amber-300";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status || "—"}
    </span>
  );
}

export default ClubAdminDashboard;
