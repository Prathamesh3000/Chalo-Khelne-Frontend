import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ShieldCheck, Plus, Search, Filter, Trophy, Calendar, MapPin,
  ArrowRight, Users, Edit2, FileSpreadsheet, Download, FileText, Target, X, Trash2,
} from "lucide-react";
import { getTournamentType } from "../../utils/sportTrack";
import { ManagerShell } from "../../shared/layout";
import { Skeleton } from "../../shared/ui";
import { cn } from "../../shared/lib";
import { useAuth } from "../../features/auth";
import { useTournaments, resolveManageUrl } from "../../features/tournaments";
import MCreateTournament from "../../Manager/MCreateTournament";

const TABS = [
  { key: "all",       label: "All"       },
  { key: "live",      label: "Live"      },
  { key: "upcoming",  label: "Upcoming"  },
  { key: "completed", label: "Completed" },
];

const SPORTS = ["All Sports", "Cricket", "Football", "Badminton", "Tennis", "Basketball", "Volleyball"];

// Download a tournament export (participants CSV / results XLSX). The endpoints
// require auth, so a plain <a download> can't be used — fetch with the Bearer
// token from localStorage, then trigger a blob download.
async function downloadTournamentExport(tournamentId, kind) {
  const urls = {
    participants: `/api/tournaments/${tournamentId}/export/participants.csv`,
    results: `/api/tournaments/${tournamentId}/export/results.xlsx`,
    pdf: `/api/tournaments/${tournamentId}/export/results.pdf`,
    csv: `/api/tournaments/${tournamentId}/export/results.csv`,
  };
  const fallbacks = {
    participants: "participants.csv",
    results: "results.xlsx",
    pdf: "results.pdf",
    csv: "results.csv",
  };
  const url = urls[kind];
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let msg = `Export failed (${res.status})`;
      try { const body = await res.json(); if (body?.message) msg = body.message; } catch (_) { /* keep default msg */ }
      toast.error(msg);
      return;
    }
    const cd = res.headers.get("Content-Disposition") || "";
    const m = /filename="?([^";]+)"?/.exec(cd);
    const filename = (m && m[1]) || fallbacks[kind] || "export";
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    toast.error(err.message || "Export failed");
  }
}

const SPORT_ACCENT = {
  Cricket:       "#F97316",
  Football:      "#10B981",
  Badminton:     "#3B82F6",
  Tennis:        "#EAB308",
  Basketball:    "#EF4444",
  Volleyball:    "#EC4899",
  Kabaddi:       "#8B5CF6",
  Hockey:        "#06B6D4",
  "Table Tennis":"#84CC16",
};

const fmtDate = (s) =>
  !s ? "—"
    : new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function ManagerTournaments() {
  const [tab, setTab]     = useState("all");
  const [q, setQ]         = useState("");
  const [sport, setSport] = useState("All Sports");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const firstName = user?.name?.split(" ")[0] ?? "Manager";

  // ?create=1 (set by the sidebar link in ManagerShell and the Create button
  // below) opens the create-tournament modal. Closing the modal clears the
  // param so reopening works.
  const showCreate = searchParams.get("create") === "1";
  const setShowCreate = (next) => {
    if (next) {
      setSearchParams({ create: "1" });
    } else {
      const sp = new URLSearchParams(searchParams);
      sp.delete("create");
      setSearchParams(sp, { replace: true });
    }
  };

  // Edit flow — fetch the full tournament doc (the normalized list shape is
  // missing nested fields the form needs) and hand it to MCreateTournament in
  // edit mode. Stays in component state; no URL param so a refresh doesn't
  // re-trigger the fetch with stale state.
  const [editingTournament, setEditingTournament] = useState(null);

  // Manage flow — format is PER-SPORT, and the management screens are organised
  // by stage (group-stage / team-KO / singles-KO), each with its own sport
  // switcher. So we scan every sport, collect the distinct stages the tournament
  // actually uses, and: 1 stage → route straight there; 2+ → let the manager
  // pick. This covers a single combined "group stage + knockout" sport AND a
  // multi-sport tournament whose sports use different formats.
  const [chooserTournament, setChooserTournament] = useState(null);
  const getManageFlows = (t) => {
    const tracks = Array.isArray(t?.sports) && t.sports.length
      ? t.sports
      : [{ type: getTournamentType(t), knockoutFormat: t?.knockoutFormat }];
    const flows = new Set();
    for (const s of tracks) {
      const type = (s?.type || "").toLowerCase();
      if (type.includes("group stage")) flows.add("group-stage");
      if (type.includes("knockout")) {
        const kf = (s?.knockoutFormat || "").toLowerCase();
        flows.add(kf.includes("team") || kf.includes("davis") ? "team-knockouts" : "direct-knockout");
      }
    }
    return [...flows];
  };
  const handleManage = (t) => {
    const flows = getManageFlows(t);
    if (flows.length <= 1) {
      navigate(resolveManageUrl(t));
    } else {
      setChooserTournament(t);
    }
  };

  const handleEdit = async (tournamentId, e) => {
    e.stopPropagation();
    try {
      const { data } = await axios.get(`/api/tournaments/${tournamentId}`);
      setEditingTournament(data.tournament);
      setShowCreate(true);
    } catch (err) {
      console.error("Error fetching tournament details:", err);
      toast.error("Failed to load tournament details");
    }
  };

  const handleDelete = async (t, e) => {
    e?.stopPropagation();
    const name = t.title || t.name || "this tournament";
    if (!window.confirm(`Delete "${name}"? This permanently removes the tournament and cannot be undone.`)) return;
    try {
      await axios.delete(`/api/tournaments/${t._id}`);
      toast.success("Tournament deleted.");
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    } catch (err) {
      console.error("Error deleting tournament:", err);
      toast.error(err?.response?.data?.message || "Failed to delete tournament");
    }
  };

  // Scope the fetch to the logged-in manager. The manager-scoped endpoint
  // returns the manager's own tournaments (public + private) and ignores
  // tab/sport/q params, so we apply those client-side below.
  const filters = useMemo(
    () => (user?._id ? { managerId: user._id } : {}),
    [user?._id]
  );

  const { data: tournaments = [], isLoading } = useTournaments(filters);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tournaments.filter((t) => {
      if (tab !== "all" && t.status !== tab) return false;
      if (sport !== "All Sports" && t.sport !== sport) return false;
      if (needle) {
        const hay = `${t.title || ""} ${t.sport || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [tournaments, tab, sport, q]);

  const liveCount = tournaments.filter((t) => t.status === "live").length;

  return (
    <ManagerShell searchPlaceholder="Search tournaments…">
      {/* Welcome header — matches dashboard idiom */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Tournament Manager · Catalog
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Tournaments
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Manage your tournaments across registration, group stage, and knockout.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTournament(null);
            setShowCreate(true);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold shadow-sm shadow-orange-500/30 transition active:scale-[0.98] flex-shrink-0 w-auto"
        >
          <Plus className="w-4 h-4" /> Create tournament
        </button>
      </header>

      {/* Tabs + filters row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Pill tabs — same primitive as dashboard / tournament shell */}
        <div className="inline-flex items-center gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06] w-fit">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[12px] font-medium transition w-auto",
                  isActive
                    ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {t.label}
                {t.key === "live" && liveCount > 0 && (
                  <span
                    className="tabular-nums text-[10px] font-bold rounded-full px-1.5 min-w-[1.1rem] h-4 inline-flex items-center justify-center"
                    style={{
                      background: isActive ? "#f97316" : "rgba(255,255,255,0.08)",
                      color:      isActive ? "#fff"    : "#9ca3af",
                    }}
                  >
                    {liveCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or sport…"
            className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          />
        </div>

        {/* Sport filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="h-9 px-3 rounded-md text-[13px] font-medium text-gray-200 cursor-pointer outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {SPORTS.map((s) => (
              <option key={s} value={s} className="bg-[#181A22]">{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid / Empty / Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Trophy}
          message={tab === "all" && !q && sport === "All Sports"
            ? "No tournaments yet"
            : "No tournaments match these filters"}
          onClearFilters={tab !== "all" || q || sport !== "All Sports"
            ? () => { setTab("all"); setQ(""); setSport("All Sports"); }
            : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((t) => (
            <TournamentGridCard
              key={t._id}
              tournament={t}
              onClick={() => handleManage(t)}
              onEdit={(e) => handleEdit(t._id, e)}
              onDelete={(e) => handleDelete(t, e)}
              onBulkUpload={(e) => {
                e.stopPropagation();
                navigate(`/bulk-booking?tournamentId=${t._id}`);
              }}
            />
          ))}
        </div>
      )}

      <MCreateTournament
        key={editingTournament?._id || "create"}
        showPopup={showCreate}
        setShowPopup={(next) => {
          setShowCreate(next);
          if (!next) setEditingTournament(null);
        }}
        mode={editingTournament ? "edit" : "create"}
        initialData={editingTournament}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tournaments"] })}
      />

      {/* Play-format / stage chooser — shown for "Group Stage + Knockout"
          tournaments so the manager picks which phase to manage. */}
      {chooserTournament && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setChooserTournament(null)}
        >
          <div
            className="bg-[#1A1D27] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setChooserTournament(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-transparent w-auto"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">Choose what to manage</h3>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              “{chooserTournament.title || chooserTournament.name || "This tournament"}” spans more
              than one format. Pick which to open — each screen lets you switch between its sports.
            </p>
            <div className="space-y-2">
              {getManageFlows(chooserTournament).map((path) => {
                const META = {
                  "group-stage":     { icon: Users,  title: "Group stage",      desc: "Groups, matches, and progression" },
                  "team-knockouts":  { icon: Trophy, title: "Team knockout",    desc: "Team brackets / Davis Cup finals" },
                  "direct-knockout": { icon: Target, title: "Singles knockout", desc: "Direct elimination bracket (16 / 32 / 64)" },
                }[path];
                if (!META) return null;
                return (
                  <button
                    key={path}
                    onClick={() => {
                      const id = chooserTournament._id;
                      setChooserTournament(null);
                      navigate(`/tournament-management/${path}?tournamentId=${id}`);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-emerald-500/40 transition text-left w-auto"
                  >
                    <span className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <META.icon className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">{META.title}</span>
                      <span className="block text-xs text-gray-400">{META.desc}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-500 ml-auto flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ManagerShell>
  );
}

// ── Tournament card (grid variant) ──────────────────────────────────────────

function TournamentGridCard({ tournament, onClick, onEdit, onDelete, onBulkUpload }) {
  const t = tournament;
  const accent = SPORT_ACCENT[t.sport] || t.bannerColor || "#F97316";
  const status = STATUS_TONES[t.status] || STATUS_TONES.upcoming;
  const players = t.registered || 0;
  const capacity = t.capacity || 0;
  const fillPct = capacity > 0 ? Math.min(100, Math.round((players / capacity) * 100)) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group text-left bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden hover:border-white/[0.12] transition cursor-pointer focus:outline-none focus:border-white/[0.18]"
    >
      {/* Sport accent strip */}
      <div aria-hidden="true" style={{ height: 3, background: accent }} />

      <div className="p-4">
        {/* Top: sport tag + status + edit */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
            {t.sport || "—"}
          </span>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={t.status} />
            {onBulkUpload && (
              <button
                type="button"
                onClick={onBulkUpload}
                title="Upload players (Excel)"
                aria-label="Upload players from Excel"
                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); downloadTournamentExport(t._id, "participants"); }}
              title="Download participants (CSV)"
              aria-label="Download participants list as CSV"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); downloadTournamentExport(t._id, "results"); }}
              title="Download results (XLSX)"
              aria-label="Download group standings as Excel"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
            >
              <Trophy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); downloadTournamentExport(t._id, "pdf"); }}
              title="Download results (PDF)"
              aria-label="Download group standings as PDF"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); downloadTournamentExport(t._id, "csv"); }}
              title="Download results (CSV)"
              aria-label="Download results as CSV"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                title="Edit tournament"
                aria-label="Edit tournament"
                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                title="Delete tournament"
                aria-label="Delete tournament"
                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/[0.12] transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[14px] font-medium text-white leading-snug line-clamp-2 mb-2">
          {t.title || t.name || "Untitled tournament"}
        </h3>

        {/* Meta */}
        <div className="space-y-1 text-[11px] text-gray-400">
          <p className="inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> {fmtDate(t.startDate)} – {fmtDate(t.endDate)}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> {t.city || t.venue || "—"}
          </p>
        </div>

        {/* Registration progress */}
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="inline-flex items-center gap-1 text-gray-400">
              <Users className="w-3 h-3" /> Registration
            </span>
            <span className="font-mono tabular-nums text-gray-300">{players} / {capacity}</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                background: accent,
                width: `${fillPct}%`,
                transition: "width 200ms ease",
              }}
            />
          </div>
        </div>

        {/* Action */}
        <div className="mt-3 flex justify-between items-center">
          <span className="text-[11px] text-gray-500">
            {t.fee != null ? `₹${t.fee}` : ""}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-orange-400 group-hover:text-orange-300 transition">
            Manage <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────

const STATUS_TONES = {
  live:      { bg: "bg-red-500/15",   text: "text-red-400",    label: "Live",      dot: true  },
  upcoming:  { bg: "bg-blue-500/15",  text: "text-blue-300",   label: "Open",      dot: false },
  completed: { bg: "bg-white/[0.06]", text: "text-gray-400",   label: "Completed", dot: false },
};

function StatusBadge({ status }) {
  const s = STATUS_TONES[status] || STATUS_TONES.upcoming;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0",
        s.bg, s.text
      )}
    >
      {s.dot && <span className="w-1 h-1 rounded-full bg-current animate-pulse" />}
      {s.label}
    </span>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message, onClearFilters }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-[#181A22] border border-white/[0.06] rounded-lg">
      <Icon className="w-6 h-6 text-gray-600 mb-2" />
      <p className="text-[13px] text-gray-400">{message}</p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-orange-400 hover:text-orange-300 transition w-auto"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
