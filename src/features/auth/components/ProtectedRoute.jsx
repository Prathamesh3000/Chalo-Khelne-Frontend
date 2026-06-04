import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Supports both patterns:
 *   <Route element={<ProtectedRoute />}><Route ... /></Route>   // outlet
 *   <ProtectedRoute><Page/></ProtectedRoute>                    // children
 */
export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/l/home" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length) {
    const role = user?.role?.toLowerCase();
    const allowed = allowedRoles.map((r) => r.toLowerCase());
    if (!allowed.includes(role)) return <Navigate to="/" replace />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
