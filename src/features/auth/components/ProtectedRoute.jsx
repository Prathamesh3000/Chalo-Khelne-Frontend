import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Supports both patterns:
 *   <Route element={<ProtectedRoute allowedRoles={ROLES.manager} />}>…</Route>  // outlet
 *   <ProtectedRoute allowedRoles={ROLES.vendor}><Page/></ProtectedRoute>        // children
 *
 * `allowedRoles` is REQUIRED and the guard fails closed without it.
 *
 * It used to be optional and default to "any authenticated user is fine". Seven
 * of the eight call sites then failed to pass it — three passed `role="…"`,
 * which React forwards silently as an unknown prop, and four passed nothing at
 * all — so the SuperAdmin console, the manager portal and the player portal
 * rendered for anyone with a valid session. The guard looked like it worked
 * because it still rendered its Outlet.
 */

// Backend role strings are not normalised — the same conceptual role appears as
// "ClubAdmin", "club_admin" and "clubadmin" depending on which controller
// minted the token, and User.role has no enum to constrain it. Comparison is
// case-insensitive, so the variants that differ only by case collapse; the
// underscore/no-underscore pairs have to be listed explicitly.
export const ROLES = {
  superAdmin: ["superadmin", "super_admin"],
  manager: ["manager"],
  clubAdmin: ["clubadmin", "club_admin"],
  corporate: ["corporate_admin", "corporateadmin"],
  trainer: ["trainer"],
  vendor: ["vendor"],
  // PlayerApp is the FALLBACK portal — App.jsx's role dispatch sends anything
  // it does not recognise to /phome. So this list must cover every role that is
  // not served by one of the dedicated shells above, or those users land in a
  // portal that immediately bounces them back to "/" and loops.
  // Roles the server actually mints: Player, referee, Substitute (plus the
  // admin roles listed above). Add here when a new non-admin role appears.
  player: ["player", "user", "referee", "substitute"],
  agency: ["agencyadmin", "agency_admin", "event_manager", "eventmanager", "coordinator"],
};

export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/l/home" replace state={{ from: location }} />;
  }

  // Fail closed. A guard with no role list is a bug, not "allow everyone" —
  // that default is exactly what made §2.3 invisible for so long.
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.error(
        "[ProtectedRoute] rendered without `allowedRoles`. Refusing to grant " +
          "access. Pass a role list, e.g. allowedRoles={ROLES.manager}."
      );
    }
    return <Navigate to="/" replace />;
  }

  const role = user?.role?.toLowerCase();
  const allowed = allowedRoles.map((r) => String(r).toLowerCase());
  if (!allowed.includes(role)) return <Navigate to="/" replace />;

  return children ?? <Outlet />;
}

export default ProtectedRoute;
