import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Bell, ChevronRight, Search } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useCommandPalette } from "../search";

const SIG = "#5E6AD2";

const PAGE_META = {
  "/mdashboard": { title: "Dashboard", crumbs: [] },
  "/mtournament-management": { title: "Tournaments", crumbs: [] },
  "/tournament-management/check-in": {
    title: "Check-in",
    crumbs: [{ label: "Tournaments", path: "/mtournament-management" }],
  },
  "/invite-employees": { title: "Invite employees", crumbs: [{ label: "Tournaments", path: "/mtournament-management" }] },
  "/mslot-Booking": { title: "Slot booking", crumbs: [] },
  "/msocial": { title: "Social feed", crumbs: [] },
  "/mrefree": { title: "Referee panel", crumbs: [] },
  "/mtrainers": { title: "Trainers", crumbs: [] },
  "/mnews": { title: "News", crumbs: [] },
  "/group-chat": { title: "Group chats", crumbs: [] },
  "/payments": { title: "Payments", crumbs: [] },
  "/mcoupons": { title: "Coupons", crumbs: [] },
  "/notification": { title: "Notifications", crumbs: [] },
  "/msettings": { title: "Settings", crumbs: [] },
  "/club-dashboard": { title: "Dashboard", crumbs: [] },
  "/club-social": { title: "Social feed", crumbs: [] },
  "/club-refree": { title: "Referee panel", crumbs: [] },
  "/turf-management": { title: "Turf management", crumbs: [] },
  "/payment-history": { title: "Payments", crumbs: [] },
  "/club-finance": { title: "Financial overview", crumbs: [] },
  "/staff-admin": { title: "Staff admin", crumbs: [] },
  "/home": { title: "Dashboard", crumbs: [] },
  "/pending": { title: "Pending users", crumbs: [] },
  "/approved": { title: "Approved users", crumbs: [] },
  "/inquiries": { title: "Inquiries", crumbs: [] },
  "/create-club-admin": { title: "Create club admin", crumbs: [] },
  "/manage-clubs": { title: "Manage clubs", crumbs: [] },
  "/sports": { title: "Sports management", crumbs: [] },
  "/rule-books": { title: "Rule books", crumbs: [] },
  "/rbac": { title: "Roles & permissions", crumbs: [] },
  "/vendor-marketplace": { title: "Vendor marketplace", crumbs: [] },
  "/trainer-dashboard": { title: "Dashboard", crumbs: [] },
  "/trainer-sessions": { title: "All sessions", crumbs: [] },
  "/trainer-current": { title: "Current session", crumbs: [] },
  "/trainer-upcoming": { title: "Upcoming sessions", crumbs: [] },
  "/trainer-history": { title: "Session history", crumbs: [] },
  "/trainer-requests": { title: "Requests", crumbs: [] },
  "/trainer-profile": { title: "Profile", crumbs: [] },
  "/corporate-dashboard": { title: "Dashboard", crumbs: [] },
  "/corporate-tournaments": { title: "Tournaments", crumbs: [] },
  "/corporate-staff": { title: "Staff management", crumbs: [] },
  "/corporate-profile": { title: "Company profile", crumbs: [] },
  "/phome": { title: "Home", crumbs: [] },
  "/ptournament-management": { title: "Tournaments", crumbs: [] },
  "/pslot-booking": { title: "Slot booking", crumbs: [] },
  "/ptrainers": { title: "Trainers", crumbs: [] },
  "/psettings": { title: "Settings", crumbs: [] },
  "/pprofile": { title: "Profile", crumbs: [] },
  "/staff-applications": { title: "Staff applications", crumbs: [] },
};

function getPageMeta(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];

  if (pathname.match(/^\/tournaments\/[^/]+\/dashboard$/))
    return { title: "Tournament dashboard", crumbs: [{ label: "Tournaments", path: "/mtournament-management" }] };
  if (pathname.match(/^\/tournaments\/[^/]+\/players$/))
    return { title: "Players", crumbs: [{ label: "Tournaments", path: "/mtournament-management" }] };
  if (pathname.match(/^\/tournaments\/[^/]+\/groups\/[^/]+$/))
    return { title: "Group detail", crumbs: [{ label: "Tournaments", path: "/mtournament-management" }] };
  if (pathname.match(/^\/tournaments\/[^/]+\/groups$/))
    return { title: "Groups", crumbs: [{ label: "Tournaments", path: "/mtournament-management" }] };
  if (pathname.match(/^\/tournaments\/[^/]+\/knockout$/))
    return { title: "Knockout bracket", crumbs: [{ label: "Tournaments", path: "/mtournament-management" }] };
  if (pathname.match(/^\/tournaments\/[^/]+$/))
    return { title: "Tournament overview", crumbs: [{ label: "Tournaments", path: "/mtournament-management" }] };
  if (pathname.startsWith("/group-chat/"))
    return { title: "Chat", crumbs: [{ label: "Group chats", path: "/group-chat" }] };
  if (pathname.startsWith("/turf-details/"))
    return { title: "Turf details", crumbs: [{ label: "Turf management", path: "/turf-management" }] };

  return { title: "", crumbs: [] };
}

export default function TopBar({ onMenuClick }) {
  const { unreadCount, markAllRead } = useNotifications();
  const { openPalette } = useCommandPalette();
  const navigate = useNavigate();
  const location = useLocation();

  const { title, crumbs } = getPageMeta(location.pathname);
  const isMac =
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad|ipod/i.test(navigator.platform || "");
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <header className="h-14 bg-white border-b border-neutral-200 px-4 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-700"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center gap-1.5 min-w-0">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <button
                onClick={() => navigate(crumb.path)}
                className="text-[12px] font-medium text-neutral-500 hover:text-neutral-900 transition"
              >
                {crumb.label}
              </button>
              <ChevronRight className="w-3 h-3 text-neutral-300" />
            </span>
          ))}
          {title && (
            <h2 className="text-[13px] font-semibold text-neutral-950 truncate">
              {title}
            </h2>
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <button
          type="button"
          onClick={openPalette}
          className="w-full h-8 inline-flex items-center gap-2 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200/60 transition"
          aria-label={`Search (${modKey}+K)`}
          aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
        >
          <Search className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
          <span className="flex-1 text-[12px] text-neutral-500 text-left">
            Search venues, tournaments, players…
          </span>
          <span className="font-mono text-[10px] text-neutral-500 bg-white border border-neutral-200 rounded px-1 py-px">
            {modKey}K
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={openPalette}
          className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-700"
          aria-label={`Search (${modKey}+K)`}
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            navigate("/notification");
            markAllRead();
          }}
          className="relative h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-700 transition"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 inline-flex items-center justify-center font-mono tabular-nums text-[9px] font-semibold rounded-full text-white border border-white"
              style={{ backgroundColor: SIG }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
