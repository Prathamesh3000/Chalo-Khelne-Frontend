import { useMemo, useState } from "react";
import { Search, Filter, Plus, Trophy } from "lucide-react";
import { Button, Input, EmptyState, Eyebrow, PageTitle, ShineButton } from "../../shared/ui";
import { TournamentCard, useTournaments } from "../../features/tournaments";
import { useAuth } from "../../features/auth";

const TABS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

const SPORTS = ["All Sports", "Cricket", "Football", "Badminton", "Tennis", "Basketball", "Volleyball"];

export default function TournamentList() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [sport, setSport] = useState("All Sports");
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  const filters = useMemo(() => {
    const f = {};
    if (tab !== "all") f.status = tab;
    if (sport !== "All Sports") f.sport = sport;
    if (q.trim()) f.q = q.trim();
    return f;
  }, [tab, sport, q]);

  const { data: tournaments = [], isLoading } = useTournaments(filters);

  const isManager = role === "manager" || role === "clubadmin";
  const actionLabel = isManager ? "Manage" : "Register";

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{isManager ? "Tournament Manager · Catalog" : "Player · Catalog"}</Eyebrow>
          <PageTitle accent="Tournaments" size="lg" className="mt-4">
            Tournaments
          </PageTitle>
          <p className="mt-3 max-w-xl text-base text-gray-600">
            {isManager ? "Manage your tournaments across all stages." : "Find tournaments to join near you."}
          </p>
        </div>
        {isManager && (
          <ShineButton size="md">
            <Plus className="h-4 w-4" /> Create
          </ShineButton>
        )}
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition w-auto ${
              tab === t.key
                ? "bg-orange-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {t.label}
            {t.key === "live" && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black">
                {tournaments.filter((x) => x.status === "live").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <Input
            name="search"
            placeholder="Search by name or sport..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          >
            {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments found"
          description="Try adjusting filters or check back later."
          action={tab !== "all" && <Button variant="outline" onClick={() => { setTab("all"); setQ(""); setSport("All Sports"); }}>Clear filters</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tournaments.map((t) => (
            <TournamentCard
              key={t._id}
              tournament={t}
              actionLabel={actionLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
