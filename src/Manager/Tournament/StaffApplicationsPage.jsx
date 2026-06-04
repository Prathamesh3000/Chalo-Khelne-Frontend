import { Navigate } from "react-router-dom";

/**
 * V2 StaffApplicationsPage retired. The legacy /staff-applications page is
 * the canonical surface — same data, same actions, no extra hop.
 */
export default function StaffApplicationsPage() {
  return <Navigate to="/staff-applications" replace />;
}
