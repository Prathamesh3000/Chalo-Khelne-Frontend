import {
  LayoutDashboard, Calendar, Dribbble, Trophy, Users, Tag, Contact,
  GraduationCap, Briefcase, DollarSign, Package, BarChart3, Send, Star, Settings,
} from "lucide-react";

// The 15 facility-business Club modules (from the UI/UX prototype), grouped.
// `ready: true` = wired; the rest are placeholders (later phases).
export const NAV_GROUPS = [
  {
    title: "Operations",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
      { id: "calendar", label: "Booking Calendar", icon: Calendar },
      { id: "courts", label: "Courts", icon: Dribbble },
      { id: "tournaments", label: "Tournaments", icon: Trophy },
    ],
  },
  {
    title: "Members & CRM",
    items: [
      { id: "members", label: "Members & Packages", icon: Users },
      { id: "coupons", label: "Coupons", icon: Tag },
      { id: "crm", label: "CRM & Timeline", icon: Contact },
    ],
  },
  {
    title: "Team",
    items: [
      { id: "coaches", label: "Coaches", icon: GraduationCap },
      { id: "staff", label: "Staff & Roles", icon: Briefcase },
    ],
  },
  {
    title: "Business",
    items: [
      { id: "finance", label: "Finance & POS", icon: DollarSign },
      { id: "inventory", label: "Inventory", icon: Package },
      { id: "reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "Engagement",
    items: [
      { id: "communication", label: "Communication", icon: Send },
      { id: "reviews", label: "Reviews", icon: Star },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
