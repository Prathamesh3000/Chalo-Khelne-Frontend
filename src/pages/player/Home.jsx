import { Link } from "react-router-dom";
import {
  Trophy, Calendar, MapPin, TrendingUp, Award, ChevronRight, Flame,
  ArrowRight, Sparkles,
} from "lucide-react";
import { Eyebrow, PageTitle, Skeleton } from "../../shared/ui";
import { cn } from "../../shared/lib";
import { useAuth } from "../../features/auth";
import { TournamentCard, useTournaments } from "../../features/tournaments";

export default function PlayerHome() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "player";

  const { data: live = [], isLoading: liveLoading } = useTournaments({ status: "live" });
  const { data: upcoming = [] } = useTournaments({ status: "upcoming" });
  const recommended = [...live, ...upcoming].slice(0, 3);

  const totalMatches = (user?.win || 0) + (user?.lose || 0) + (user?.draw || 0);
  const winPct = totalMatches > 0 ? Math.round((user.win / totalMatches) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header>
        <Eyebrow>Player · Overview</Eyebrow>
        <PageTitle accent={firstName} size="lg" className="mt-4">
          {`Welcome back, ${firstName}`}
        </PageTitle>
        <p className="mt-4 max-w-xl text-base text-gray-600 sm:text-lg">
          Pick up where you left off — book your next session, score wins, and join tournaments near you.
        </p>
      </header>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total matches" value={totalMatches} icon={Trophy}      tone="primary" />
        <Stat label="Wins"          value={user?.win || 0} icon={Award}     tone="success" />
        <Stat label="Win rate"      value={`${winPct}%`} icon={TrendingUp}  tone="info" />
        <Stat label="Current streak" value={3}         icon={Flame}         tone="warning" />
      </div>

      {/* Recommended */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Recommended for you</h2>
            <p className="mt-0.5 text-xs text-gray-500">Live and upcoming tournaments near you.</p>
          </div>
          <Link to="/ptournament-management" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-orange-500 transition-colors hover:text-orange-600 w-auto">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {liveLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}
          </div>
        ) : recommended.length === 0 ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-400">
              <Trophy className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-gray-900">No tournaments yet</p>
            <p className="max-w-sm text-xs text-gray-500">Check back later, or browse the catalog.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((t) => (
              <TournamentCard key={t._id} tournament={t} actionLabel="Register" />
            ))}
          </div>
        )}
      </section>

      {/* Activity + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Recent activity</h2>
          <ul className="space-y-3">
            {RECENT.map((r, i) => (
              <li key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", r.tone)}>
                  <r.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">{r.label}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{r.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Quick actions</h2>
          <div className="space-y-2">
            <QuickAction to="/pslot-booking"          icon={MapPin}   label="Book a turf" />
            <QuickAction to="/ptournament-management" icon={Trophy}   label="Join a tournament" />
            <QuickAction to="/pprofile"               icon={Award}    label="View profile" />
            <QuickAction to="/psettings"              icon={Calendar} label="My bookings" />
          </div>
        </aside>
      </div>
    </div>
  );
}

const RECENT = [
  { label: "You won a match in Monsoon Cup 2026",        when: "2 hours ago", icon: Trophy,    tone: "bg-orange-50 text-orange-600" },
  { label: "Booking confirmed at Pune Sports Arena",     when: "Yesterday",   icon: MapPin,    tone: "bg-emerald-50 text-emerald-600" },
  { label: "Registered for City League 2026",            when: "3 days ago",  icon: Calendar,  tone: "bg-amber-50 text-amber-600" },
  { label: "Earned badge: Hat Trick",                    when: "5 days ago",  icon: Sparkles,  tone: "bg-purple-50 text-purple-600" },
];

function Stat({ label, value, icon: Icon, tone }) {
  const toneClass = {
    info:    "bg-blue-50 text-blue-600 ring-blue-100",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    success: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    primary: "bg-orange-50 text-orange-600 ring-orange-100",
  }[tone];

  return (
    <div className="relative flex items-start gap-4 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 ring-inset", toneClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</p>
        <p className="text-3xl font-black tabular-nums leading-none tracking-tight text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl p-3 transition hover:bg-gray-50 w-auto">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 transition group-hover:bg-orange-50">
        <Icon className="h-4 w-4 text-gray-500 transition group-hover:text-orange-500" />
      </span>
      <span className="flex-1 text-sm font-semibold text-gray-700">{label}</span>
      <ChevronRight className="h-4 w-4 text-gray-300 transition group-hover:text-orange-500" />
    </Link>
  );
}
