import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Users, ClipboardCheck, Trophy, ShieldCheck, AlertCircle,
  ChevronRight, ArrowRight,
} from "lucide-react";
import { Skeleton } from "../../shared/ui";
import { cn } from "../../shared/lib";
import { useAuth } from "../../features/auth";
import { useTournaments } from "../../features/tournaments";
import { SuperAdminShell } from "../../shared/layout";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { data: tournaments = [], isLoading } = useTournaments();
  const firstName = user?.name?.split(" ")[0] ?? "admin";

  const [overview, setOverview] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  useEffect(() => {
    axios.get("/api/update/overview").then((r) => setOverview(r.data)).catch(() => {});
    axios.get("/api/update/pending-approval").then((r) => setPendingUsers(Array.isArray(r.data) ? r.data : r.data?.users || [])).catch(() => {});
  }, []);

  const totalUsers = overview
    ? (overview.players || 0) + (overview.trainers || 0) + (overview.clubAdmins || 0)
    : null;
  const verifiedClubs = overview?.clubAdmins ?? null;

  return (
    <SuperAdminShell searchPlaceholder="Search admin…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super admin · System overview
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Welcome back, <span className="text-orange-400">{firstName}</span>
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Platform-wide health, approvals queue, and quick admin shortcuts.
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Total users"        value={totalUsers}          icon={Users}         to="/approved"      loading={overview === null} />
        <Stat label="Pending approvals"  value={pendingUsers.length} icon={ClipboardCheck} to="/pending"      tone="amber" />
        <Stat label="Active tournaments" value={tournaments.length}  icon={Trophy}        loading={isLoading} tone="green" />
        <Stat label="Verified clubs"     value={verifiedClubs}       icon={ShieldCheck}   to="/manage-clubs"  loading={overview === null} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Approvals queue */}
        <Section title="Pending user approvals" subtitle="Approve new managers and club admins." rightSlot={
          <Link to="/pending" className="inline-flex items-center gap-1 text-[12px] font-semibold text-orange-400 hover:text-orange-300 transition w-auto">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        } className="lg:col-span-2">
          {pendingUsers.length === 0 ? (
            <div className="text-center py-10 text-[13px] text-gray-500">No pending user approvals</div>
          ) : (
            <ul className="divide-y divide-white/[0.04] -my-2">
              {pendingUsers.slice(0, 5).map((p) => (
                <li key={p._id || p.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-400 text-[12px] font-semibold">
                    {(p.name || "?")[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-white truncate">{p.name || "Unnamed"}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {p.email || "—"}{p.role ? <> · <span className="capitalize">{p.role}</span></> : null}
                    </p>
                  </div>
                  <Link to="/pending" className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-orange-300 transition w-auto">
                    Review <ArrowRight className="w-3 h-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Right column: health + quick admin */}
        <aside className="space-y-3">
          <Section title="Platform breakdown">
            <ul className="space-y-2.5">
              <HealthRow label="Players"     value={overview?.players    ?? "—"} tone="ok" />
              <HealthRow label="Trainers"    value={overview?.trainers   ?? "—"} tone="ok" />
              <HealthRow label="Club admins" value={overview?.clubAdmins ?? "—"} tone="ok" />
              <HealthRow label="Pending"     value={pendingUsers.length}         tone={pendingUsers.length > 0 ? "warn" : "ok"} />
            </ul>
          </Section>

          <Section title="Quick admin">
            <div className="space-y-1">
              <QuickLink to="/create-club-admin" icon={Users}       label="Create club admin" />
              <QuickLink to="/sports"            icon={Trophy}      label="Manage sports" />
              <QuickLink to="/rbac"              icon={ShieldCheck} label="Roles & permissions" />
              <QuickLink to="/inquiries"         icon={AlertCircle} label="Inquiries" />
            </div>
          </Section>
        </aside>
      </div>
    </SuperAdminShell>
  );
}

// ── Dark inline primitives ───────────────────────────────────────────────────

function Section({ title, subtitle, rightSlot, className = "", children }) {
  return (
    <div className={`bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-medium text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {rightSlot}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone = "orange", to, loading }) {
  const tones = {
    orange: { bg: "bg-orange-500/15",  text: "text-orange-400"  },
    amber:  { bg: "bg-amber-500/15",   text: "text-amber-400"   },
    green:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
    blue:   { bg: "bg-blue-500/15",    text: "text-blue-400"    },
  };
  const t = tones[tone] || tones.orange;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`grid w-[34px] h-[34px] rounded-md place-items-center ${t.bg}`}>
          <Icon className={`w-[18px] h-[18px] ${t.text}`} />
        </span>
        {to && (
          <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-400 transition mt-0.5" />
        )}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16 bg-white/[0.04]" />
      ) : (
        <p className="text-[24px] font-medium leading-none text-white tabular-nums">{value ?? "—"}</p>
      )}
      <p className="mt-1 text-[12px] text-gray-400">{label}</p>
    </>
  );

  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to } : {};
  return (
    <Wrapper {...wrapperProps}
      className={cn(
        "group bg-[#181A22] border border-white/[0.06] rounded-lg p-4 transition w-auto block",
        to && "hover:border-white/[0.12]"
      )}
    >
      {inner}
    </Wrapper>
  );
}

function HealthRow({ label, value, tone }) {
  const dot = tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-400" : "bg-red-500";
  return (
    <li className="flex items-center justify-between text-[13px]">
      <span className="flex items-center gap-2 text-gray-400">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> {label}
      </span>
      <span className="font-semibold tabular-nums text-white">{value}</span>
    </li>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link to={to}
      className="group flex items-center gap-2.5 rounded-md p-2.5 transition hover:bg-white/[0.04] w-auto"
    >
      <span className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.04] transition group-hover:bg-orange-500/15">
        <Icon className="w-3.5 h-3.5 text-gray-500 transition group-hover:text-orange-400" />
      </span>
      <span className="flex-1 text-[13px] font-medium text-gray-300 group-hover:text-white transition">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-600 transition group-hover:text-orange-400" />
    </Link>
  );
}
