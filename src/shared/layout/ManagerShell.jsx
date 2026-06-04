import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Trophy, Plus, Grid3X3, ShieldCheck, Dumbbell,
  Briefcase, CreditCard, Tag, Settings, LogOut, Search, Bell,
  MessageSquare, MessageCircle, Newspaper, UserCheck,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { cn } from "../lib";

/**
 * Manager workspace shell — used by /mdashboard and any other manager pages
 * that need the dark-sidebar + dashboard-topbar (date / search / bell) chrome.
 *
 * Distinct from TournamentShell:
 *   - Different nav sections (Overview / Tournaments / Management / Finance /
 *     Account vs. tournament-focused tabs)
 *   - Topbar shows date + search + bell, not breadcrumbs + avatar
 *   - No pipeline / tab slot — caller renders its own content
 */
export default function ManagerShell({ children, searchPlaceholder }) {
  return (
    <div className="flex min-h-screen bg-[#0F1117]">
      <ManagerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ManagerTopbar searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto text-gray-200">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/mdashboard" },
    ],
  },
  {
    label: "Tournaments",
    items: [
      { label: "All tournaments",   icon: Trophy,  to: "/mtournament-management" },
      { label: "Create tournament", icon: Plus,    to: "/mtournament-management?create=1" },
      { label: "Slot booking",      icon: Grid3X3, to: "/mslot-Booking" },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Social feed", icon: MessageSquare, to: "/msocial" },
      { label: "Group chats", icon: MessageCircle, to: "/group-chat" },
      { label: "News",        icon: Newspaper,     to: "/mnews" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Referee",             icon: ShieldCheck, to: "/mrefree" },
      { label: "Trainers",            icon: Dumbbell,    to: "/mtrainers" },
      { label: "Staff applications",  icon: Briefcase,   to: "/staff-applications" },
      { label: "Hire requests",       icon: UserCheck,   to: "/hire-requests" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", icon: CreditCard, to: "/payments" },
      { label: "Coupons",  icon: Tag,        to: "/mcoupons" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", icon: Settings, to: "/msettings" },
    ],
  },
];

function ManagerSidebar() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const user = auth?.user || auth?.auth;
  const name = user?.name || "Manager";
  const initial = (name.trim()[0] || "M").toUpperCase();
  const role = user?.role || "manager";
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

  const isActive = (to) => {
    if (!to) return false;
    const [pathOnly] = to.split("?");
    return currentPath === pathOnly;
  };

  const logout = () => {
    auth?.logout?.();
    navigate("/l/home");
  };

  return (
    <aside className="w-[200px] flex-shrink-0 bg-[#0F1117] flex flex-col">
      {/* Logo */}
      <div
        className="px-5 py-5 flex items-center gap-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]" />
        <span className="text-[14px] font-medium tracking-wide text-white">Chalo Khelne</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mt-5 first:mt-3">
            <p
              className="text-[10px] uppercase text-gray-500 px-3 mb-1.5"
              style={{ letterSpacing: "0.08em" }}
            >
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.to);
                return (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className={cn(
                        "relative flex items-center gap-2.5 h-8 px-3 rounded-md text-[12px] transition-colors w-auto",
                        active
                          ? "text-white"
                          : "text-[#888] hover:text-white hover:bg-white/5"
                      )}
                      style={active ? { background: "rgba(249,115,22,0.14)" } : undefined}
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
      </nav>

      {/* Footer: user identity */}
      <div
        className="px-3 py-3 flex items-center gap-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-white text-[12px] font-bold flex-shrink-0">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[#aaa] truncate leading-tight">{name}</p>
          <p className="text-[10px] text-[#555] capitalize leading-tight mt-0.5">{role}</p>
        </div>
        <button
          onClick={logout}
          className="grid h-6 w-6 place-items-center rounded text-[#555] hover:text-white hover:bg-white/5 transition w-auto"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
}

// ── Topbar ───────────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function ManagerTopbar({ searchPlaceholder }) {
  const navigate = useNavigate();
  const [today] = useState(() => new Date());
  // Re-roll the date once at midnight in case the dashboard stays open. Cheap
  // — single interval, no fetch.
  const [, force] = useState(0);
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = tomorrow.getTime() - now.getTime();
    const id = setTimeout(() => force((v) => v + 1), ms);
    return () => clearTimeout(id);
  }, []);

  return (
    <header
      className="h-14 flex items-center justify-between gap-4 px-6"
      style={{ background: "#0F1117", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-[13px] text-gray-400">{DATE_FMT.format(today)}</span>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder || "Search tournaments, players…"}
            className="w-[200px] h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => navigate("/notification")}
          className="relative grid h-9 w-9 place-items-center rounded-md hover:bg-white/5 transition w-auto"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-gray-300" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500" />
        </button>
      </div>
    </header>
  );
}
