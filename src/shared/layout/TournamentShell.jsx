import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, ChevronRight, Check, LogOut, Trophy, Dumbbell,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { cn, useTabSwitchSkeleton } from "../lib";
import { Skeleton } from "../ui";
import { getSidebarForRole } from "./sidebarConfig";

/**
 * Tournament-management shell — sidebar + topbar + page header + pipeline +
 * tab-bar slot + content. Replaces AppLayout for /tournament-management/*
 * routes so the tournament workspace gets its own focused chrome.
 *
 * Props:
 *  - tournament: { title, sportName?, status?, ... }
 *  - steps:      [{ key, label, sublabel?, done?, active? }]  (5 expected)
 *  - activeStep: string (matches one step's `key`)            (optional override)
 *  - breadcrumbs: [{ label, to? }]
 *  - tabBar:     ReactNode (the page's <TabBar/>)
 *  - subTabBar:  ReactNode (only when current tab has sub-views)
 *  - banner:     ReactNode (Round-2 banner etc.) — sits between pipeline and tabBar
 *  - children:   the tab body
 */
export default function TournamentShell({
  tournament,
  steps = [],
  activeStep,
  breadcrumbs = [],
  tabBar = null,
  subTabBar = null,
  banner = null,
  // `activeTabKey` enables the 400 ms tab-switch skeleton. Pass the current
  // tab string (e.g. `selectedTab` or `activeTab`); the shell flashes a
  // skeleton over `children` whenever the value changes — so users never see
  // a blank body while the tab body remounts against new data.
  activeTabKey,
  children,
}) {
  const switching = useTabSwitchSkeleton(activeTabKey);
  return (
    <div className="ck-dark flex min-h-[100vh] bg-[#0F1117]">
      <ShellSidebar />

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <ShellTopbar breadcrumbs={breadcrumbs} />

        <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto text-gray-200">
          {tournament && <PageHeader tournament={tournament} />}
          {steps.length > 0 && (
            <div className="mt-5">
              <Pipeline steps={steps} activeStep={activeStep} />
            </div>
          )}
          {banner && <div className="mt-5">{banner}</div>}
          {tabBar && <div className="mt-5">{tabBar}</div>}
          {subTabBar && <div className="mt-4">{subTabBar}</div>}
          <div className="mt-5">
            {switching ? <TabSwitchSkeleton /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}

function TabSwitchSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <Skeleton className="h-[360px] rounded-lg" />
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
// Global nav comes from the single role-based sidebarConfig (same source as
// AppLayout + ManagerShell) so navigation is identical across every shell.

function ShellSidebar() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user || auth?.auth;
  const role = user?.role || "manager";
  const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

  const navSections = getSidebarForRole(role).map((section) => ({
    label: section.label, // may be null (Dashboard / Settings groups) → header hidden
    items: section.items.map((it) => ({ label: it.label, icon: it.icon, to: it.path })),
  }));

  const logout = () => {
    auth?.logout?.();
    navigate("/l/home");
  };

  const isActive = (to) => {
    if (!to) return false;
    // Exact match for `/path` only, ignore query params for the active highlight.
    const [pathOnly] = to.split("?");
    return currentPath.startsWith(pathOnly);
  };

  return (
    <aside className="w-[200px] flex-shrink-0 bg-[#0F1117] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
        <span className="text-[13px] font-bold tracking-wide text-white">Chalo Khelne</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={section.label || `section-${idx}`} className="mt-5 first:mt-2">
            {section.label && (
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 px-3 mb-1.5">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.to);
                return (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className={cn(
                        "relative flex items-center gap-2.5 h-8 px-3 rounded-md text-[12px] font-medium transition-colors w-auto",
                        active
                          ? "bg-orange-500/10 text-white"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-orange-500"
                        />
                      )}
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="mt-5">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 h-8 px-3 rounded-md text-[12px] font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors w-auto"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </nav>

      <div className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600 border-t border-white/5">
        Chalo Khelne · MVP
      </div>
    </aside>
  );
}

// ── Topbar ───────────────────────────────────────────────────────────────────

function ShellTopbar({ breadcrumbs }) {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const user = auth?.user || auth?.auth;
  const name = user?.name || "Manager";
  const initial = (name.trim()[0] || "M").toUpperCase();

  // Back goes to the previous tournament-mgmt step. Use history.back so we
  // respect the user's path (came from /mtournament-management? or from a
  // drill-down?). React Router's navigate(-1) handles this cleanly.
  return (
    <header
      className="h-14 flex items-center justify-between gap-4 px-6"
      style={{ background: "#0F1117", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => navigate(-1)}
          className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/5 text-gray-400 transition w-auto flex-shrink-0"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={`${i}-${crumb.label}`} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0" />}
                {isLast || !crumb.to ? (
                  <span className="text-[13px] font-semibold text-white truncate max-w-[16rem]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="text-[13px] text-gray-400 hover:text-white transition truncate max-w-[12rem]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-white text-[12px] font-bold">
          {initial}
        </span>
        <span className="hidden sm:inline text-[13px] font-medium text-gray-200 truncate max-w-[10rem]">
          {name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
      </div>
    </header>
  );
}

// ── Page header (tournament name + status + sport) ───────────────────────────

// Dark-theme status tones — translucent bg + light text.
const STATUS_TONES = {
  open:               { bg: "bg-emerald-500/15", text: "text-emerald-300", label: "Open for registration" },
  live:               { bg: "bg-red-500/15",     text: "text-red-400",     label: "Live" },
  group_stage:        { bg: "bg-blue-500/15",    text: "text-blue-300",    label: "Group Stage" },
  qualifier_knockout: { bg: "bg-amber-500/15",   text: "text-amber-300",   label: "Qualifier Knockout" },
  knockout:           { bg: "bg-amber-500/15",   text: "text-amber-300",   label: "Knockout" },
  completed:          { bg: "bg-white/[0.06]",   text: "text-gray-400",    label: "Completed" },
};

function PageHeader({ tournament }) {
  const stage = String(tournament.currentStage || "open").toLowerCase();
  const tone =
    STATUS_TONES[stage] ||
    STATUS_TONES[stage === "registration" ? "open" : "group_stage"] ||
    STATUS_TONES.open;
  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[20px] font-medium text-white leading-tight">
          {tournament.title || "Tournament"}
        </h1>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
            tone.bg, tone.text
          )}
        >
          <span className="w-1 h-1 rounded-full bg-current" />
          {tone.label}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[12px] text-gray-400">
        {tournament.sportName && (
          <span className="inline-flex items-center gap-1.5">
            <Dumbbell className="w-3 h-3" />
            {tournament.sportName}
          </span>
        )}
        {tournament.formatDescriptor && (
          <>
            <span className="text-gray-600">·</span>
            <span>{tournament.formatDescriptor}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Pipeline step indicator ──────────────────────────────────────────────────

function Pipeline({ steps, activeStep }) {
  // If an activeStep is explicitly set, mark anything before it as done.
  // Otherwise rely on each step's own `done`/`active` flags.
  const activeIdx = activeStep ? steps.findIndex((s) => s.key === activeStep) : -1;

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "#181A22",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-stretch">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const isDone = step.done || (activeIdx > -1 && i < activeIdx);
          const isActive = step.active || (activeIdx > -1 && i === activeIdx);
          const isFuture = !isDone && !isActive;

          // Premium circle treatment:
          //   done    — solid orange fill + white checkmark
          //   active  — orange ring + orange number, slight orange-glow halo
          //   future  — muted slate circle, muted number
          let circleClasses, circleStyle;
          if (isDone) {
            circleClasses = "text-white";
            circleStyle   = { background: "#f97316", border: "1px solid #f97316" };
          } else if (isActive) {
            circleClasses = "text-orange-400";
            circleStyle   = {
              background: "rgba(249,115,22,0.10)",
              border:     "1.5px solid #f97316",
              boxShadow:  "0 0 0 4px rgba(249,115,22,0.10)",
            };
          } else {
            circleClasses = "text-gray-500";
            circleStyle   = {
              background: "rgba(255,255,255,0.03)",
              border:     "1px solid rgba(255,255,255,0.08)",
            };
          }

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center text-center min-w-0 flex-shrink-0 w-24">
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold transition",
                    circleClasses
                  )}
                  style={circleStyle}
                >
                  {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "mt-2 text-[11px] font-semibold whitespace-nowrap",
                    isActive ? "text-white" : isDone ? "text-gray-200" : "text-gray-500"
                  )}
                >
                  {step.label}
                </span>
                {step.sublabel && (
                  <span
                    className={cn(
                      "text-[10px] mt-0.5 truncate max-w-full",
                      isActive ? "text-orange-300/80" : "text-gray-600"
                    )}
                  >
                    {step.sublabel}
                  </span>
                )}
              </div>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="flex-1 h-px mx-1 transition mt-4 self-start"
                  style={{
                    background: (isDone || (isActive && activeIdx > -1 && i + 1 <= activeIdx))
                      ? "#f97316"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Round-2 banner — exported so pages can drop it into `banner` slot ────────

export function Round2Banner({ onCancel }) {
  return (
    <div
      className="rounded-lg px-4 py-3 flex items-center gap-3"
      style={{
        background: "rgba(245,158,11,0.10)",
        border: "1px solid rgba(245,158,11,0.25)",
      }}
    >
      <div
        className="grid h-8 w-8 place-items-center rounded-md text-white flex-shrink-0"
        style={{ background: "rgba(245,158,11,0.85)" }}
      >
        <Trophy className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-amber-200">
          Round 2 in progress
        </p>
        <p className="text-[12px] text-amber-200/70 mt-0.5">
          Super Players selection is locked until Round 2 winners are determined.
        </p>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-[11px] font-semibold text-amber-300 hover:text-amber-100 transition px-3 py-1.5 rounded-md hover:bg-amber-500/10 w-auto flex-shrink-0 border border-transparent hover:border-amber-500/30"
        >
          Cancel Round 2
        </button>
      )}
    </div>
  );
}
