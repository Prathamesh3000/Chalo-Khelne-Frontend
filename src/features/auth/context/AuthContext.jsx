import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { initSocket, disconnectSocket } from "../../realtime";
import { registerLogout, refreshAccessToken } from "../../../shared/api";

export const AuthContext = createContext(null);

function isTokenExpired(token) {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (!decoded.exp) return false;
    return decoded.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

function normalizeUser(rawUser) {
  const u = rawUser || {};
  // Backend returns mixed casing — "Manager", "superadmin", "corporate_admin".
  // We lowercase once here so every downstream role check (App.jsx dispatch,
  // ROLE_HOME map, sidebarConfig, ProtectedRoute) compares apples to apples.
  const role = (u.role || "player").toLowerCase();
  return {
    _id: u.id || u._id || "",
    id: u.id || u._id || "",
    email: u.email || "",
    name: u.name?.trim() || "Unknown",
    role,
    mobile: u.mobile || "",
    image: u.profileImage || u.image || "",
    dob: u.dateOfBirth || u.dob || "",
    gender: u.sex || u.gender || "",
    sports: Array.isArray(u.sports) ? u.sports.join(", ") : (u.sports || ""),
    win: u.win || 0,
    lose: u.lose || 0,
    draw: u.draw || 0,
    isCorporate: u.isCorporate || false,
    clubId: u.clubId || null,
  };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    // Only treat an expired access token as "logged out" when there's NO refresh
    // token. With a refresh token present, keep the session — it refreshes on mount.
    if (storedToken && isTokenExpired(storedToken) && !localStorage.getItem("refreshToken")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");
      return null;
    }
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem("token");
    // Valid access OR a refresh token present (which can mint a fresh access).
    return !!token && (!isTokenExpired(token) || !!localStorage.getItem("refreshToken"));
  });

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("refreshToken");

    // §4.4 — tear the socket down WITH the session.
    //
    // Logging out cleared three localStorage keys and called this function,
    // and left the authenticated socket connected with all its room
    // memberships intact. On a shared machine — a club laptop at the
    // registration desk is exactly that — the next person to sign in inherited
    // the previous user's live socket and kept receiving their chat and match
    // traffic.
    try {
      disconnectSocket();
    } catch (_) {
      /* never let socket teardown block a logout */
    }

    setAuth(null);
    setIsAuthenticated(false);
  }, []);

  // §4.4 — the socket is created and destroyed by the AUTH lifecycle.
  //
  // It used to be initialised at module scope in main.jsx from a raw
  // localStorage read, which ran before this provider mounted, inside a
  // try/catch whose comment claimed "polling fallback handles it" — there is no
  // polling fallback. Owning it here means the socket exists exactly when a
  // session does.
  useEffect(() => {
    if (isAuthenticated) {
      try {
        initSocket();
      } catch (err) {
        console.error("[auth] socket init failed:", err);
      }
    }
    return undefined;
  }, [isAuthenticated]);

  useEffect(() => {
    registerLogout(logout);
  }, [logout]);

  // Refresh-aware session guard: silently refresh an expired access token
  // instead of hard-logging-out. Works for both User (multi-device) and
  // Manager/Superadmin (single-session) — the server enforces the policy.
  useEffect(() => {
    if (!auth) return;
    let cancelled = false;

    const tryRefresh = async () => {
      try {
        await refreshAccessToken();
      } catch {
        if (!cancelled) logout();
      }
    };

    const token = localStorage.getItem("token");
    if (!token) return;

    // Cold-start: access already expired but a refresh token exists → refresh now.
    if (isTokenExpired(token) && localStorage.getItem("refreshToken")) {
      tryRefresh();
      return () => { cancelled = true; };
    }

    try {
      const [, payload] = token.split(".");
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      if (!decoded.exp) return;
      const remaining = decoded.exp * 1000 - Date.now();
      const MAX = 24 * 60 * 60 * 1000;
      const id = setTimeout(() => {
        const current = localStorage.getItem("token");
        if (current && isTokenExpired(current)) {
          // ⚠️ 1h-ACTIVATION GUARD — when Manager/Superadmin access is shortened
          //    to 1h, THIS timer is what keeps them logged in. It must stay
          //    refresh-first (refresh → logout only on failure). Do NOT revert
          //    this to an immediate logout() when you flip access to 1h.
          if (localStorage.getItem("refreshToken")) tryRefresh();
          else logout();
        }
      }, Math.min(Math.max(remaining, 0), MAX));
      return () => { cancelled = true; clearTimeout(id); };
    } catch (err) {
      console.warn("Token refresh scheduling skipped (unparseable token):", err.message);
    }
  }, [auth, logout]);

  const login = (data) => {
    const userData = normalizeUser(data?.user);
    localStorage.setItem("token", data?.token || "");
    if (data?.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("loginTime", Date.now().toString());
    setAuth(userData);
    setIsAuthenticated(true);
    return userData;
  };

  return (
    <AuthContext.Provider value={{ auth, user: auth, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export default AuthProvider;
