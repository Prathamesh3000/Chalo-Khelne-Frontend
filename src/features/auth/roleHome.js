/**
 * Where each role lands — the single source of truth.
 *
 * §4.3 / §9.2: this decision was made in THREE places that disagreed:
 *   • App.jsx — a nine-branch nested ternary on the "/" route;
 *   • LoginForm.jsx — a ROLE_HOME map missing `club_admin`, `vendor` and every
 *     agency role, so those users fell through to "/phome" and a club admin
 *     landed on the PLAYER home immediately after signing in;
 *   • sidebarConfig.js — a third role list for navigation.
 *
 * Roles are compared lowercased (AuthContext.normalizeUser lowercases once at
 * the boundary), because the backend mints mixed casing: "ClubAdmin",
 * "club_admin", "Manager", "superadmin".
 *
 * ── The two club-admin destinations are DELIBERATE ────────────────────────
 * `clubadmin` → /club-dashboard  (ClubAdminApp — the academy / school flow)
 * `club_admin` → /club/dashboard (ClubApp — the facility-business revamp)
 *
 * These are two different products that happen to share a role name, and the
 * server emits both spellings: authRoutes/ClubAdminController write
 * `role: "ClubAdmin"`, clubFacilityController writes `role: "club_admin"`.
 * Collapsing them here would silently move users between two different
 * applications, so the split is preserved and named until the architecture
 * decision is made. Do not "tidy" these into one entry without that decision.
 */

export const ROLE_HOME = {
  superadmin: "/home",
  super_admin: "/home",

  manager: "/mdashboard",

  // See the note above — two products, two spellings, on purpose.
  clubadmin: "/club-dashboard",
  club_admin: "/club/dashboard",

  corporate_admin: "/corporate-dashboard",
  corporateadmin: "/corporate-dashboard",

  trainer: "/trainer-dashboard",
  vendor: "/vendor-dashboard",

  // Event OS (IONIX) office roles all share the agency shell.
  agencyadmin: "/agency/dashboard",
  agency_admin: "/agency/dashboard",
  event_manager: "/agency/dashboard",
  eventmanager: "/agency/dashboard",
  coordinator: "/agency/dashboard",

  // Players and everyone without a dedicated portal.
  player: "/phome",
  user: "/phome",
  referee: "/phome",
  substitute: "/phome",
};

/** Fallback for any role with no dedicated portal — PlayerApp is the catch-all. */
export const DEFAULT_HOME = "/phome";

/** Where an unauthenticated visitor goes. */
export const PUBLIC_HOME = "/l/home";

export function homeForRole(role) {
  if (!role) return DEFAULT_HOME;
  return ROLE_HOME[String(role).toLowerCase()] || DEFAULT_HOME;
}

export default ROLE_HOME;
