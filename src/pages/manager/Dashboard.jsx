import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ShieldCheck, Plus, Trophy, Activity, Clock, UserCheck,
  Users, ArrowRight, Calendar, CheckCircle2, X as XIcon,
  PlayCircle, Inbox,
} from "lucide-react";
import { ManagerShell } from "../../shared/layout";
import { Skeleton } from "../../shared/ui";
import { cn } from "../../shared/lib";
import { useAuth } from "../../features/auth";
import { useTournaments, resolveManageUrl } from "../../features/tournaments";

const TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit", minute: "2-digit", hour12: false,
});

// Initial-derived avatar color — keeps a player's chip the same hue across
// renders. Spec example: A=orange, P=blue, R=green.
const AVATAR_TONES = [
  { bg: "bg-orange-500/20",  text: "text-orange-300"  },
  { bg: "bg-blue-500/20",    text: "text-blue-300"    },
  { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  { bg: "bg-purple-500/20",  text: "text-purple-300"  },
  { bg: "bg-pink-500/20",    text: "text-pink-300"    },
  { bg: "bg-amber-500/20",   text: "text-amber-300"   },
];
const toneFor = (name) => {
  const ch = (name?.trim()[0] || "A").toUpperCase().charCodeAt(0);
  return AVATAR_TONES[ch % AVATAR_TONES.length];
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: tournaments = [], isLoading } = useTournaments();
  const firstName = user?.name?.split(" ")[0] ?? "Manager";

  // Derived counts — all from existing useTournaments data, no new fetches.
  const myTournamentsCount = tournaments.length;
  const activeTournaments = tournaments.filter((t) => t.status === "live");
  const activeCount = activeTournaments.length;
  // Pending = payment proofs awaiting this manager's review (real data,
  // shaped to match what PendingApprovalRow expects).
  const [pendingBookings, setPendingBookings] = useState([]);
  useEffect(() => {
    const managerId = user?.id || user?._id;
    if (!managerId) return;
    axios.get(`/api/payments/proofs/pending/${managerId}`)
      .then((r) => {
        const list = (r.data?.data || []).map((p) => ({
          _id: p._id,
          userName: p.playerId?.name || "Player",
          tournamentName: p.tournamentId?.title || "Tournament",
        }));
        setPendingBookings(list);
      })
      .catch(() => setPendingBookings([]));
  }, [user]);
  const pendingApprovalsCount = pendingBookings.length;
  const todayMatches = []; // TODO P1: add /api/manager/today-matches endpoint.
  const todayMatchesCount = todayMatches.length;

  // Recent tournaments — most recent first. Featured = [0], compact = [1..3].
  const recentTournaments = [...tournaments]
    .sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0))
    .slice(0, 4);
  const featured = recentTournaments[0];
  const compact = recentTournaments.slice(1);

  return (
    <ManagerShell searchPlaceholder="Search tournaments, players…">
      {/* ── Welcome header ────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Tournament Manager · Overview
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Welcome back,{" "}
            <span className="text-orange-400">{firstName}</span>
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Here's what's happening with your tournaments today.
          </p>
        </div>
        <button
          onClick={() => navigate("/mtournament-management")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold shadow-sm shadow-orange-200 transition active:scale-[0.98] flex-shrink-0 w-auto"
        >
          <Plus className="w-4 h-4" /> Create tournament
        </button>
      </header>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={Trophy}
          tone="orange"
          label="My tournaments"
          value={isLoading ? null : myTournamentsCount}
          loading={isLoading}
          actionLabel="View all"
          to="/mtournament-management"
        />
        <StatCard
          icon={Activity}
          tone="green"
          label="Active right now"
          value={isLoading ? null : activeCount}
          loading={isLoading}
          rightSlot={
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold"
              style={{
                padding: "2px 7px",
                borderRadius: 20,
                color: "#34d399",
                background: "rgba(16,185,129,0.15)",
              }}
            >
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          }
          sublineNode={
            activeCount > 0 ? (
              <span className="text-[11px] text-emerald-400">
                {activeCount} match{activeCount === 1 ? "" : "es"} in progress
              </span>
            ) : (
              <span className="text-[11px] text-gray-400">All quiet</span>
            )
          }
        />
        <StatCard
          icon={Clock}
          tone="orange"
          label="Today's matches"
          value={isLoading ? null : todayMatchesCount}
          loading={isLoading}
          sublineNode={
            todayMatchesCount === 0 ? (
              <span className="text-[11px] text-gray-400">None scheduled</span>
            ) : null
          }
        />
        <StatCard
          icon={UserCheck}
          tone="orange"
          label="Pending approvals"
          value={isLoading ? null : pendingApprovalsCount}
          loading={isLoading}
          rightSlot={
            pendingApprovalsCount > 0 ? (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 20,
                  color: "#fb923c",
                  background: "rgba(249,115,22,0.18)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Action needed
              </span>
            ) : null
          }
          actionLabel={pendingApprovalsCount > 0 ? "Approve players" : undefined}
          to={pendingApprovalsCount > 0 ? "/mtournament-management" : undefined}
        />
      </div>

      {/* ── Two-column section ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* LEFT — Recent tournaments */}
        <section>
          <SectionHeader title="Recent tournaments" to="/mtournament-management" />

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-44 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : recentTournaments.length === 0 ? (
            <EmptyState
              icon={Trophy}
              message="No tournaments yet"
            />
          ) : (
            <>
              {featured && <FeaturedTournamentCard tournament={featured} onManage={() => navigate(resolveManageUrl(featured))} />}
              {compact.length > 0 && (
                <div className="mt-3 bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
                  {compact.map((t, i) => (
                    <CompactTournamentRow
                      key={t._id}
                      tournament={t}
                      isLast={i === compact.length - 1}
                      onClick={() => navigate(resolveManageUrl(t))}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* RIGHT — Pending approvals + Today's matches */}
        <section className="space-y-3.5">
          {/* Pending approvals */}
          <div>
            <SectionHeader title="Pending approvals" to="/mtournament-management" />
            <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-12 rounded-md" />
                  <Skeleton className="h-12 rounded-md" />
                </div>
              ) : pendingBookings.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  message="No pending approvals"
                  inline
                />
              ) : (
                pendingBookings.map((b, i) => (
                  <PendingApprovalRow
                    key={b._id || i}
                    booking={b}
                    isLast={i === pendingBookings.length - 1}
                  />
                ))
              )}
            </div>
          </div>

          {/* Today's matches */}
          <div>
            <SectionHeader title="Today's matches" />
            {isLoading ? (
              <Skeleton className="h-32 rounded-lg" />
            ) : todayMatches.length === 0 ? (
              <div className="bg-[#181A22] border border-white/[0.06] rounded-lg">
                <EmptyState
                  icon={Calendar}
                  message="No matches scheduled for today"
                  inline
                />
              </div>
            ) : (
              <TodayMatchCard match={todayMatches[0]} />
            )}
          </div>
        </section>
      </div>
    </ManagerShell>
  );
}

// ── Building blocks ──────────────────────────────────────────────────────────

function SectionHeader({ title, to }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-[14px] font-medium text-white">{title}</h2>
      {to && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-orange-400 hover:text-orange-400 transition w-auto"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value, loading, rightSlot, sublineNode, actionLabel, to }) {
  const tones = {
    orange: { bg: "bg-orange-500/15",  text: "text-orange-400"  },
    green:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  };
  const t = tones[tone] || tones.orange;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={cn("grid w-[34px] h-[34px] rounded-md place-items-center", t.bg)}>
          <Icon className={cn("w-[18px] h-[18px]", t.text)} />
        </span>
        <div className="flex items-start gap-1.5">
          {rightSlot}
          {to && !actionLabel && (
            <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-400 transition mt-0.5" />
          )}
        </div>
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <p className="text-[24px] font-medium leading-none text-white tabular-nums">{value ?? 0}</p>
        )}
      </div>
      <p className="mt-1 text-[12px] text-gray-400">{label}</p>
      {(sublineNode || (actionLabel && to)) && (
        <div className="mt-1.5 min-h-[14px]">
          {sublineNode}
          {actionLabel && to && (
            // Render as a styled span (NOT another <Link>) — the whole card
            // is already wrapped in <Link to={to}>, so nesting an <a> inside
            // an <a> would be invalid HTML and triggers a React hydration
            // warning. Visual remains identical because the parent Link
            // carries the navigation; this is decorative.
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 group-hover:text-orange-300 transition">
              {actionLabel} <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      )}
    </>
  );

  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group bg-[#181A22] border border-white/[0.06] rounded-lg p-4 transition w-auto block",
        to && "hover:border-gray-300"
      )}
    >
      {inner}
    </Wrapper>
  );
}

function FeaturedTournamentCard({ tournament, onManage }) {
  const t = tournament;
  const players = t.registered || 0;
  const capacity = t.capacity || 0;
  const fillPct = capacity > 0 ? Math.min(100, Math.round((players / capacity) * 100)) : 0;
  const groups = t.groupsCount || 0;
  const pending = Math.max(0, capacity - players);
  const status = t.status || "upcoming";

  return (
    <article className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div aria-hidden="true" style={{ height: 3, background: "#f97316" }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid w-10 h-10 rounded-md bg-orange-500/15 place-items-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-orange-400" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-medium text-white truncate">{t.title || t.name}</h3>
            <p className="text-[12px] text-gray-400 mt-0.5 truncate">
              {t.sport || "—"}{t.bookingType ? ` · ${t.bookingType}` : ""}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Mini stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="Players" value={players} />
          <MiniStat label="Pending" value={pending} />
          <MiniStat label="Groups" value={groups} />
        </div>

        {/* Registration fill — always rendered. When capacity is 0 (real
            backend doesn't always populate it) we still show "0 / 0" with an
            empty track so the bar slot doesn't disappear and the layout
            stays predictable. */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-gray-400">Registration fill</span>
            <span className="font-mono tabular-nums text-gray-400">{players} / {capacity}</span>
          </div>
          <div style={{ height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                background: "#f97316",
                width: `${fillPct}%`,
                transition: "width 200ms ease",
              }}
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={onManage}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-orange-400 hover:text-orange-400 transition w-auto"
          >
            Manage tournament <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white/[0.04] rounded-md py-2 text-center">
      <p className="text-[14px] font-medium text-white tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function CompactTournamentRow({ tournament, isLast, onClick }) {
  const t = tournament;
  // Spec: open/live = #f97316, completed = #888. Inline style avoids Tailwind
  // arbitrary-value resolution edge cases for the muted gray.
  const dotBg = t.status === "completed" ? "#888" : "#f97316";
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]",
        !isLast && "border-b border-white/[0.05]"
      )}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: dotBg }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate">{t.title || t.name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
          {t.sport || "—"} · <span className="capitalize">{t.status}</span>
        </p>
      </div>
      <StatusBadge status={t.status} small />
      <ArrowRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
    </button>
  );
}

function PendingApprovalRow({ booking, isLast }) {
  const name = booking.userName || booking.playerName || "Player";
  const tone = toneFor(name);
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !isLast && "border-b border-white/[0.05]"
      )}
    >
      <span className={cn("grid w-[30px] h-[30px] rounded-full place-items-center text-[12px] font-bold flex-shrink-0", tone.bg, tone.text)}>
        {initial}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate">{name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{booking.tournamentName || booking.tournament || "Tournament"}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold transition w-auto">
          <CheckCircle2 className="w-3 h-3" /> Approve
        </button>
        <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-white/[0.06] text-gray-600 hover:bg-white/5 text-[11px] font-semibold transition w-auto">
          <XIcon className="w-3 h-3" /> Reject
        </button>
      </div>
    </div>
  );
}

function TodayMatchCard({ match }) {
  const teamA = match.teamA || match.team1 || { name: "Team A" };
  const teamB = match.teamB || match.team2 || { name: "Team B" };
  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;
  return (
    <article className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[13px] font-medium text-white truncate">{match.tournamentName || "Tournament"}</p>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <TeamColumn name={teamA.name || teamA.teamName} />
        <div className="flex flex-col items-center min-w-[80px]">
          <p className="text-[24px] font-medium tabular-nums text-white leading-none">
            {scoreA} <span className="text-gray-600">—</span> {scoreB}
          </p>
          {match.periodLabel && (
            <p className="text-[10px] text-gray-400 mt-1">{match.periodLabel}</p>
          )}
        </div>
        <TeamColumn name={teamB.name || teamB.teamName} align="right" />
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.05] text-center text-[11px] text-gray-400">
        {match.court && <span>{match.court}</span>}
        {match.court && match.startAt && <span className="mx-1">·</span>}
        {match.startAt && <span>{TIME_FMT.format(new Date(match.startAt))}</span>}
      </div>
    </article>
  );
}

function TeamColumn({ name, align = "left" }) {
  const tone = toneFor(name);
  const initial = (name?.trim()[0] || "?").toUpperCase();
  return (
    <div className={cn("flex items-center gap-2 min-w-0", align === "right" && "flex-row-reverse")}>
      <span className={cn("grid w-9 h-9 rounded-full place-items-center text-[13px] font-bold flex-shrink-0", tone.bg, tone.text)}>
        {initial}
      </span>
      <p className={cn("text-[12px] font-medium text-gray-600 truncate", align === "right" && "text-right")}>{name}</p>
    </div>
  );
}

function StatusBadge({ status, small }) {
  const map = {
    live:      { bg: "bg-red-500/15",   text: "text-red-400",   label: "Live",      dot: true  },
    upcoming:  { bg: "bg-blue-500/15",  text: "text-blue-300",  label: "Open",      dot: false },
    completed: { bg: "bg-white/[0.06]", text: "text-gray-400",  label: "Completed", dot: false },
  };
  const s = map[status] || map.upcoming;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold flex-shrink-0",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        s.bg, s.text
      )}
    >
      {s.dot && <span className="w-1 h-1 rounded-full bg-current animate-pulse" />}
      {s.label}
    </span>
  );
}

function EmptyState({ icon: Icon, message, inline }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      inline ? "py-10 px-4" : "py-12 px-4 bg-[#181A22] border border-white/[0.06] rounded-lg"
    )}>
      <Icon className="w-6 h-6 text-gray-600 mb-2" />
      <p className="text-[13px] text-gray-400">{message}</p>
    </div>
  );
}
