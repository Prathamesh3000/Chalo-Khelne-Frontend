import {
  LayoutDashboard, Trophy, Users, Grid3X3,
  Newspaper, MessageSquare, Shield, CreditCard, Tag,
  Settings, BarChart3, Dumbbell, MapPin, MessageCircle, Briefcase,
  Home, ClipboardCheck, CheckCircle, HelpCircle, BookOpen, ShieldCheck, Store,
  Calendar, User, Building2, UserCheck, ReceiptText, Package, Plus, Upload,
} from "lucide-react";

/**
 * Sidebar navigation config — ALL roles in one place.
 * Grouped sections with icons — auto-filtered by role.
 *
 * Roles: "manager" | "clubadmin" | "superadmin" | "trainer" | "corporate_admin" | "player"
 */
export const SIDEBAR_SECTIONS = [
  // ─── Dashboard ───
  {
    key: "main",
    label: null,
    icon: null,
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/mdashboard", roles: ["manager"] },
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/club-dashboard", roles: ["clubadmin"] },
      { key: "dashboard", label: "Dashboard", icon: Home, path: "/home", roles: ["superadmin"] },
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/trainer-dashboard", roles: ["trainer"] },
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/corporate-dashboard", roles: ["corporate_admin"] },
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/vendor-dashboard", roles: ["vendor"] },
      { key: "dashboard", label: "Home", icon: Home, path: "/phome", roles: ["player"] },
    ],
  },

  // ─── Tournaments ───
  {
    key: "tournament",
    label: "Tournaments",
    icon: Trophy,
    items: [
      { key: "tournaments", label: "All Tournaments", icon: Trophy, path: "/mtournament-management", roles: ["manager"] },
      { key: "create-tournament", label: "Create Tournament", icon: Plus, path: "/mtournament-management?create=1", roles: ["manager"] },
      { key: "tournaments", label: "Tournaments", icon: Trophy, path: "/ptournament-management", roles: ["player"] },
      { key: "tournaments", label: "Tournaments", icon: Trophy, path: "/corporate-tournaments", roles: ["corporate_admin"] },
      { key: "bookings", label: "Slot Booking", icon: Grid3X3, path: "/mslot-Booking", roles: ["manager"] },
      { key: "bookings", label: "Slot Booking", icon: Grid3X3, path: "/pslot-booking", roles: ["player"] },
    ],
  },

  // ─── Facility ───
  {
    key: "facility",
    label: "Facility",
    icon: MapPin,
    items: [
      { key: "turfs", label: "Turf Management", icon: MapPin, path: "/turf-management", roles: ["clubadmin"] },
      { key: "register-turf", label: "Register a Turf", icon: Plus, path: "/register-turf", roles: ["clubadmin", "corporate_admin", "trainer", "vendor", "player"] },
    ],
  },

  // ─── Sessions (Trainer) ───
  {
    key: "sessions",
    label: "Sessions",
    icon: Calendar,
    items: [
      { key: "sessions", label: "All Sessions", icon: Calendar, path: "/trainer-sessions", roles: ["trainer"] },
      { key: "current", label: "Current Session", icon: Dumbbell, path: "/trainer-current", roles: ["trainer"] },
      { key: "upcoming", label: "Upcoming", icon: Calendar, path: "/trainer-upcoming", roles: ["trainer"] },
      { key: "history", label: "History", icon: ClipboardCheck, path: "/trainer-history", roles: ["trainer"] },
      { key: "requests", label: "Requests", icon: HelpCircle, path: "/trainer-requests", roles: ["trainer"] },
    ],
  },

  // ─── Community ───
  {
    key: "community",
    label: "Community",
    icon: MessageSquare,
    items: [
      { key: "social", label: "Social Feed", icon: MessageSquare, path: "/msocial", roles: ["manager"] },
      { key: "social", label: "Social Feed", icon: MessageSquare, path: "/club-social", roles: ["clubadmin"] },
      { key: "social", label: "Social Feed", icon: MessageSquare, path: "/psocial", roles: ["player"] },
      { key: "social", label: "Social Feed", icon: MessageSquare, path: "/trainer-social", roles: ["trainer"] },
      { key: "social", label: "Social Feed", icon: MessageSquare, path: "/vendor-social", roles: ["vendor"] },
      { key: "group-chat", label: "Group Chats", icon: MessageCircle, path: "/group-chat", roles: ["manager", "clubadmin", "superadmin", "corporate_admin"] },
      { key: "news", label: "News", icon: Newspaper, path: "/mnews", roles: ["manager"] },
      { key: "news", label: "News", icon: Newspaper, path: "/news", roles: ["superadmin"] },
      { key: "news", label: "News", icon: Newspaper, path: "/pnews", roles: ["player"] },
      { key: "news", label: "News", icon: Newspaper, path: "/trainer-news", roles: ["trainer"] },
      { key: "news", label: "News", icon: Newspaper, path: "/vendor-news", roles: ["vendor"] },
    ],
  },

  // ─── Management ───
  {
    key: "management",
    label: "Management",
    icon: Shield,
    items: [
      { key: "referee", label: "Referee", icon: Shield, path: "/mrefree", roles: ["manager"] },
      { key: "referee", label: "Referee", icon: Shield, path: "/club-refree", roles: ["clubadmin"] },
      { key: "trainers", label: "Trainers", icon: Dumbbell, path: "/mtrainers", roles: ["manager"] },
      { key: "trainers", label: "Trainers", icon: Dumbbell, path: "/ptrainers", roles: ["player"] },
      { key: "staff-applications", label: "Staff Applications", icon: Briefcase, path: "/staff-applications", roles: ["manager"] },
      { key: "hire-requests", label: "Hire Requests", icon: UserCheck, path: "/hire-requests", roles: ["manager"] },
      { key: "staff", label: "Staff Admin", icon: Users, path: "/staff-admin", roles: ["clubadmin"] },
      { key: "staff", label: "Staff", icon: Users, path: "/corporate-staff", roles: ["corporate_admin"] },
    ],
  },

  // ─── Users & Access (SuperAdmin) ───
  {
    key: "users-access",
    label: "Users & Access",
    icon: Users,
    items: [
      { key: "pending", label: "Pending Users", icon: ClipboardCheck, path: "/pending", roles: ["superadmin"] },
      { key: "approved", label: "Approved Users", icon: CheckCircle, path: "/approved", roles: ["superadmin"] },
      { key: "inquiries", label: "Inquiries", icon: HelpCircle, path: "/inquiries", roles: ["superadmin"] },
      { key: "rbac", label: "Roles & Permissions", icon: ShieldCheck, path: "/rbac", roles: ["superadmin"] },
      { key: "bulk-user-upload", label: "Bulk User Upload", icon: Upload, path: "/bulk-user-upload", roles: ["superadmin"] },
    ],
  },

  // ─── Clubs (SuperAdmin) ───
  {
    key: "clubs",
    label: "Clubs",
    icon: Building2,
    items: [
      { key: "create-club", label: "Create Club Admin", icon: Building2, path: "/create-club-admin", roles: ["superadmin"] },
      { key: "manage-clubs", label: "Manage Clubs", icon: Store, path: "/manage-clubs", roles: ["superadmin"] },
    ],
  },

  // ─── Sports Setup (SuperAdmin) ───
  {
    key: "sports-config",
    label: "Sports Setup",
    icon: Dumbbell,
    items: [
      { key: "sports", label: "Sports", icon: Dumbbell, path: "/sports", roles: ["superadmin"] },
      { key: "sports-library", label: "Sports Library", icon: BookOpen, path: "/sports-library", roles: ["superadmin"] },
      { key: "rule-books", label: "Rule Books", icon: BookOpen, path: "/rule-books", roles: ["superadmin"] },
      { key: "category-templates", label: "Category Templates", icon: Tag, path: "/category-templates", roles: ["superadmin"] },
    ],
  },

  // ─── Marketplace (SuperAdmin) ───
  {
    key: "marketplace",
    label: "Marketplace",
    icon: Store,
    items: [
      { key: "vendor", label: "Vendor Marketplace", icon: Store, path: "/vendor-marketplace", roles: ["superadmin"] },
      { key: "turf-approvals", label: "Turf Approvals", icon: MapPin, path: "/turf-approvals", roles: ["superadmin"] },
      { key: "v-incoming", label: "Incoming Products", icon: Package, path: "/vendor-incoming", roles: ["vendor"] },
      { key: "v-acquisitions", label: "My Acquisitions", icon: Store, path: "/vendor-acquisitions", roles: ["vendor"] },
    ],
  },

  // ─── Finance ───
  {
    key: "finance",
    label: "Finance",
    icon: CreditCard,
    items: [
      { key: "payments", label: "Payments", icon: CreditCard, path: "/payments", roles: ["manager"] },
      { key: "payment-reviews", label: "Payment Reviews", icon: ReceiptText, path: "/payment-proof-review", roles: ["manager"] },
      { key: "payments", label: "Payments", icon: CreditCard, path: "/payment-history", roles: ["clubadmin"] },
      { key: "coupons", label: "Coupons", icon: Tag, path: "/mcoupons", roles: ["manager"] },
      { key: "finance", label: "Financial Overview", icon: BarChart3, path: "/club-finance", roles: ["clubadmin"] },
    ],
  },

  // ─── Settings / Profile ───
  {
    key: "settings",
    label: null,
    icon: null,
    items: [
      { key: "settings", label: "Settings", icon: Settings, path: "/msettings", roles: ["manager"] },
      { key: "settings", label: "Settings", icon: Settings, path: "/psettings", roles: ["player"] },
      { key: "profile", label: "Profile", icon: User, path: "/pprofile", roles: ["player"] },
      { key: "profile", label: "Profile", icon: User, path: "/trainer-profile", roles: ["trainer"] },
      { key: "profile", label: "Profile", icon: Building2, path: "/corporate-profile", roles: ["corporate_admin"] },
      { key: "profile", label: "Store Profile", icon: Store, path: "/vendor-profile", roles: ["vendor"] },
    ],
  },
];

/**
 * Filter sections by role.
 */
export function getSidebarForRole(role) {
  return SIDEBAR_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}
