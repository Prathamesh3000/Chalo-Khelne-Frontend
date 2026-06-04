// Re-export shim — authoritative implementation lives in features/auth.
// Kept at this path so untouched screens that import from context/AuthContext
// keep working without per-file changes.
export { AuthContext, AuthProvider, useAuth } from "../features/auth";
export { default } from "../features/auth/context/AuthContext";
