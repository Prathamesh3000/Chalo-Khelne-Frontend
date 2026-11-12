/**
 * Does this account have a follow graph?
 *
 * The follow endpoints (GET /api/follow/:id/status …) look the account up in the
 * `User` collection. Managers are a separate collection, so for a manager the
 * server answers 404 "User not found" — every time. Asking is pointless, and the
 * "0 followers / 0 following" it would otherwise leave on screen is not a real
 * count. Callers skip the request (and the counts) for these roles.
 */
const ROLES_WITHOUT_FOLLOW_GRAPH = ["manager"];

export function supportsFollow(user) {
  const role = String(user?.role || "").toLowerCase();
  return !ROLES_WITHOUT_FOLLOW_GRAPH.includes(role);
}
