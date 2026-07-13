import {
  LayoutDashboard, Sparkles, Calendar, Trophy, ClipboardCheck, Clock,
  Users, School, Building2, Warehouse, ShieldAlert, Briefcase, MapPin,
  Package, Ticket, Video, DollarSign, Megaphone, BarChart3, Settings,
} from "lucide-react";

// The 21 Event-OS modules, grouped as in the IONIX prototype.
// `ready: true` = wired in Phase 0; the rest are placeholders (later phases).
export const NAV_GROUPS = [
  {
    title: "Operations",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "ai-assistant", label: "AI Planner", icon: Sparkles, badge: "Soon" },
      { id: "planner", label: "Event Planner", icon: Calendar, ready: true },
      { id: "tournament", label: "Tournament Board", icon: Trophy },
      { id: "checklist", label: "Event Checklist", icon: ClipboardCheck },
      { id: "schedule", label: "Schedule Planner", icon: Clock },
    ],
  },
  {
    title: "Directory",
    items: [
      { id: "teams", label: "Teams & Players", icon: Users },
      { id: "schools", label: "Schools", icon: School },
      { id: "corporate", label: "Corporate Clients", icon: Building2 },
      { id: "clubs", label: "Clubs", icon: Warehouse },
    ],
  },
  {
    title: "Roster & Venues",
    items: [
      { id: "officials", label: "Officials Hub", icon: ShieldAlert },
      { id: "staff", label: "Staff Hub", icon: Briefcase },
      { id: "venue", label: "Venue Manager", icon: MapPin },
      { id: "equipment", label: "Equipment Log", icon: Package },
    ],
  },
  {
    title: "Logistics",
    items: [
      { id: "registration", label: "Registrations", icon: Ticket },
      { id: "media", label: "Media & Streaming", icon: Video },
      // Medical Console — deferred to future enhancement (removed 2026-07-04).
    ],
  },
  {
    title: "Administration",
    items: [
      { id: "finance", label: "Finance Ledger", icon: DollarSign },
      { id: "sponsors", label: "Sponsors Hub", icon: Megaphone },
      { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
