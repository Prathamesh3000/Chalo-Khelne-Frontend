import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import {
  ShieldCheck,
  Sparkles,
  RotateCw,
  Search,
  Filter,
  X,
  Lock,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";

const API = import.meta.env.VITE_API_BASE_URL;

const LEVELS = ["district", "state", "national", "international"];

const levelChip = {
  district: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  state: "bg-blue-500/15 text-blue-300 border-blue-400/20",
  national: "bg-purple-500/15 text-purple-300 border-purple-400/20",
  international: "bg-amber-500/15 text-amber-300 border-amber-400/20",
};

const levelAccent = {
  district: "text-emerald-300",
  state: "text-blue-300",
  national: "text-purple-300",
  international: "text-amber-300",
};

const formatLabel = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

const renderValue = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === "boolean")
    return (
      <span
        className={`text-[12px] font-bold ${
          val ? "text-emerald-300" : "text-gray-500"
        }`}
      >
        {val ? "Yes" : "No"}
      </span>
    );
  return <span className="text-[13px] font-medium text-white">{val}</span>;
};

function RuleSection({ title, data }) {
  if (!data) return null;
  const entries = Object.entries(data).filter(
    ([k, v]) => v !== null && v !== undefined && k !== "_id"
  );
  if (entries.length === 0) return null;

  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-3">
        {title}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {entries.map(([key, val]) => (
          <div
            key={key}
            className="bg-[#0F1117] border border-white/[0.06] rounded-md px-3 py-2"
          >
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {formatLabel(key)}
            </p>
            <div className="mt-0.5">{renderValue(val)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SportRuleBooks() {
  const [ruleBooks, setRuleBooks] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [expandedSport, setExpandedSport] = useState(null);
  const [selectedRuleBook, setSelectedRuleBook] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, sportsRes] = await Promise.all([
        axios.get(`${API}/sport-rules`),
        axios.get(`${API}/sports/active`),
      ]);
      setRuleBooks(rulesRes.data.data || []);
      setSports(sportsRes.data.data || []);
    } catch {
      toast.error("Failed to load rule books");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await axios.post(`${API}/sports/seed`);
      const res = await axios.post(`${API}/sport-rules/seed`);
      toast.success(res.data.message || "Rule books seeded");
      fetchData();
    } catch {
      toast.error("Failed to seed rule books");
    } finally {
      setSeeding(false);
    }
  };

  const groupedBySport = ruleBooks.reduce((acc, rb) => {
    if (!acc[rb.sportName]) acc[rb.sportName] = [];
    acc[rb.sportName].push(rb);
    return acc;
  }, {});

  const filteredSportNames = Object.keys(groupedBySport)
    .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
    .filter((name) => !filterSport || name === filterSport)
    .sort();

  const stats = {
    total: ruleBooks.length,
    sports: Object.keys(groupedBySport).length,
    levels: LEVELS.reduce((acc, l) => {
      acc[l] = ruleBooks.filter((rb) => rb.level === l).length;
      return acc;
    }, {}),
  };

  return (
    <SuperAdminShell searchPlaceholder="Search rule books…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <BookOpen className="w-3.5 h-3.5" />
            Content · Rule books
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Sport Rule Books
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Locked rule sets per sport per tournament level. Auto-attached when
            managers create matching tournaments.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200 disabled:opacity-50"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`}
            />
            {seeding ? "Seeding…" : "Seed rule books"}
          </button>
          <button
            onClick={fetchData}
            className="w-9 h-9 inline-flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-gray-300"
            title="Refresh"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500">
            Total rules
          </p>
          <p className="mt-1 text-[22px] font-medium text-orange-300">
            {stats.total}
          </p>
        </div>
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500">
            Sports
          </p>
          <p className="mt-1 text-[22px] font-medium text-white">
            {stats.sports}
          </p>
        </div>
        {LEVELS.map((level) => (
          <div
            key={level}
            className="bg-[#181A22] border border-white/[0.06] rounded-lg px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500 capitalize">
              {level}
            </p>
            <p
              className={`mt-1 text-[22px] font-medium ${levelAccent[level]}`}
            >
              {stats.levels[level]}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search sports…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
          />
        </div>
        <div className="relative sm:w-44">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <select
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
          >
            <option value="">All sports</option>
            {sports.map((s) => (
              <option key={s._id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="sm:w-40 h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <RotateCw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">Loading rule books…</p>
        </div>
      ) : filteredSportNames.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">
            No rule books found
          </h3>
          <p className="text-[13px] text-gray-400 mt-1">
            Click "Seed rule books" to generate official rules for the 15 sports.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSportNames.map((sportName) => {
            const sportRules = groupedBySport[sportName]
              .filter((rb) => !filterLevel || rb.level === filterLevel)
              .sort(
                (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)
              );
            if (sportRules.length === 0) return null;
            const isExpanded = expandedSport === sportName;

            return (
              <div
                key={sportName}
                className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedSport(isExpanded ? null : sportName)
                  }
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-orange-500/15 text-orange-300 flex items-center justify-center text-[13px] font-bold shrink-0">
                      {sportName.charAt(0)}
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="text-[14px] font-medium text-white truncate">
                        {sportName}
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {sportRules.length} level
                        {sportRules.length !== 1 ? "s" : ""} configured
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1.5">
                      {sportRules.map((rb) => (
                        <span
                          key={rb.level}
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                            levelChip[rb.level]
                          }`}
                        >
                          {rb.level}
                        </span>
                      ))}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/[0.06]">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
                      {sportRules.map((rb) => (
                        <button
                          key={rb._id}
                          onClick={() => setSelectedRuleBook(rb)}
                          className="text-left bg-[#0F1117] border border-white/[0.06] hover:border-orange-400/30 rounded-md p-3 transition group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                                levelChip[rb.level]
                              }`}
                            >
                              {rb.level}
                            </span>
                            <Lock className="h-3 w-3 text-gray-600 group-hover:text-orange-300 transition" />
                          </div>

                          <p className="text-[11px] text-gray-400 mb-3 line-clamp-2 min-h-[2rem]">
                            {rb.description || "No description"}
                          </p>

                          <div className="space-y-1">
                            {rb.format?.totalSets && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-500">Sets</span>
                                <span className="font-medium text-gray-200">
                                  {rb.format.totalSets}
                                </span>
                              </div>
                            )}
                            {rb.format?.pointsPerSet && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-500">
                                  Points/Set
                                </span>
                                <span className="font-medium text-gray-200">
                                  {rb.format.pointsPerSet}
                                </span>
                              </div>
                            )}
                            {rb.format?.oversCount && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-500">Overs</span>
                                <span className="font-medium text-gray-200">
                                  {rb.format.oversCount}
                                </span>
                              </div>
                            )}
                            {rb.format?.halvesCount && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-500">Halves</span>
                                <span className="font-medium text-gray-200">
                                  {rb.format.halvesCount}
                                </span>
                              </div>
                            )}
                            {rb.format?.quartersCount && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-500">Quarters</span>
                                <span className="font-medium text-gray-200">
                                  {rb.format.quartersCount}
                                </span>
                              </div>
                            )}
                            {rb.rules?.maxPlayersPerTeam && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-gray-500">Players</span>
                                <span className="font-medium text-gray-200">
                                  {rb.rules.maxPlayersPerTeam}
                                </span>
                              </div>
                            )}
                            {rb.rules?.umpiresCount != null &&
                              rb.rules.umpiresCount > 0 && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-gray-500">Umpires</span>
                                  <span className="font-medium text-gray-200">
                                    {rb.rules.umpiresCount}
                                  </span>
                                </div>
                              )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-white/[0.06]">
                            <p className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">
                              View full rules →
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedRuleBook && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium text-white">
                    {selectedRuleBook.sportName}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                      levelChip[selectedRuleBook.level]
                    }`}
                  >
                    {selectedRuleBook.level}
                  </span>
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5 inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {selectedRuleBook.description || "Official locked rule book"}
                </p>
              </div>
              <button
                onClick={() => setSelectedRuleBook(null)}
                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <RuleSection title="Match format" data={selectedRuleBook.format} />
              <RuleSection
                title="Rules & officials"
                data={selectedRuleBook.rules}
              />
              <RuleSection title="Equipment" data={selectedRuleBook.equipment} />

              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-400/20 rounded-md">
                <ShieldCheck className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-medium text-amber-200">
                    This rule book is locked and cannot be edited by managers.
                  </p>
                  <p className="text-[11px] text-amber-300/80 mt-1">
                    When a manager creates a tournament with{" "}
                    {selectedRuleBook.sportName} at {selectedRuleBook.level}{" "}
                    level, these rules are automatically attached and enforced.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}
