/**
 * Production-grade Axios interceptor for web frontend.
 *
 * Features:
 * - Auto-attaches Bearer token to every request
 * - Decodes JWT and checks expiry BEFORE sending (60s buffer)
 * - Handles 401 responses → auto-logout + redirect to login
 * - Handles 403, 500, network errors with user-friendly messages
 * - Prevents duplicate logout calls
 * - Works with all existing axios.get/post/put/delete calls (no code changes needed)
 */

import axios from "axios";
import { disconnectSocket } from "../features/realtime";
import { toast } from "react-toastify";

let _logoutFn = null;
let _isLoggingOut = false;

/**
 * Register the logout function from AuthContext.
 * Called once when AuthProvider mounts.
 */
export function registerLogout(logoutFn) {
  _logoutFn = logoutFn;
}

/**
 * Decode JWT payload (no verification — just base64 decode).
 */
function decodeJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Check if JWT is expired (with 60s buffer).
 */
function isTokenExpired(token) {
  const payload = decodeJWT(token);
  if (!payload?.exp) return false;
  return payload.exp < Math.floor(Date.now() / 1000) + 60;
}

/**
 * Routes that should NOT trigger auto-logout on 401.
 */
const AUTH_ENDPOINTS = ["/login", "/register", "/send-otp", "/verify-otp", "/forgot-password"];

function isAuthEndpoint(url) {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((ep) => url.includes(ep));
}

/**
 * Force logout — clear storage, call AuthContext logout, redirect.
 */
function forceLogout(message) {
  if (_isLoggingOut) return;
  _isLoggingOut = true;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("loginTime");

  // §4.4 — an expired session must drop the socket as well. _logoutFn is the
  // AuthContext logout (which disconnects), but it is only registered once the
  // provider has mounted; disconnect here too so a 401 during startup cannot
  // leave an authenticated socket behind.
  try {
    disconnectSocket();
  } catch (_) {
    /* teardown is best-effort */
  }

  if (_logoutFn) _logoutFn();

  toast.error(message || "Session expired. Please login again.", {
    position: "top-center",
    autoClose: 4000,
    toastId: "session-expired",
  });

  // Reset flag after delay (no hard reload — React handles navigation)
  setTimeout(() => {
    _isLoggingOut = false;
  }, 2000);
}

/**
 * Initialize axios interceptors.
 * Call this ONCE at app startup (main.jsx).
 */
export function setupAxiosInterceptors() {
  // ── Request Interceptor: attach token + check expiry ──
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");

      if (token) {
        // Check expiry before sending
        if (isTokenExpired(token)) {
          forceLogout("Your session has expired. Please login again.");
          return Promise.reject(new axios.Cancel("Token expired"));
        }
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // ── Response Interceptor: handle errors centrally ──
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Cancelled request (from token expiry check)
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      if (error.response) {
        const { status, data } = error.response;

        // 401 — Token invalid/expired on server
        // Skip for auth endpoints (login returns 401 for bad credentials — not a session issue)
        if (status === 401) {
          if (isAuthEndpoint(error.config?.url)) {
            // Let the component handle auth endpoint errors (e.g. wrong password)
            return Promise.reject(error);
          }
          // Per-call opt-out: callers can set `_skipAuthInterceptor: true` on the
          // axios config to treat a 401 as a recoverable error instead of forcing
          // a global logout. Used by the command-palette search so a transient
          // search failure never boots the user out of the app.
          if (error.config?._skipAuthInterceptor) {
            return Promise.reject(error);
          }
          forceLogout(data?.message || "Session expired. Please login again.");
          return Promise.reject(error);
        }

        // 403 — Forbidden
        if (status === 403) {
          toast.warn(data?.message || "You don't have permission for this action.", {
            toastId: "forbidden",
            autoClose: 3000,
          });
          return Promise.reject(error);
        }

        // 500+ — Server error
        if (status >= 500) {
          toast.error("Server error. Please try again later.", {
            toastId: "server-error",
            autoClose: 3000,
          });
          return Promise.reject(error);
        }
      }

      // Network error
      if (!error.response && error.message) {
        if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
          toast.warn("Request timed out. Check your connection.", {
            toastId: "timeout",
            autoClose: 3000,
          });
        }
        // Don't toast for every network error — it's noisy
      }

      return Promise.reject(error);
    }
  );
}
