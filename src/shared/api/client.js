import axios from "axios";
import { toast } from "react-toastify";

import { getAuthToken } from "../../shared/api/authToken";
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

// Bare instance WITHOUT interceptors — used for /auth/refresh and /auth/logout
// so a 401 there can never recurse back into the refresh logic below.
const bare = axios.create({ baseURL, timeout: 15000 });

let _logoutFn = null;
let _isLoggingOut = false;

// ── Single-flight refresh state (Phase 8.1 web integration) ──
let _isRefreshing = false;
let _refreshQueue = [];
const _flushQueue = (err, token) => {
  _refreshQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  _refreshQueue = [];
};

export function registerLogout(fn) {
  _logoutFn = fn;
}

function decodeJWT(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const p = decodeJWT(token);
  if (!p?.exp) return false;
  return p.exp < Math.floor(Date.now() / 1000) + 60;
}

const AUTH_ENDPOINTS = [
  "/login",
  "/register",
  "/send-otp",
  "/verify-otp",
  "/forgot-password",
  "/auth/refresh",
  "/auth/logout",
];
const isAuthEndpoint = (url = "") => AUTH_ENDPOINTS.some((ep) => url.includes(ep));

function forceLogout(message) {
  if (_isLoggingOut) return;
  _isLoggingOut = true;
  // Best-effort server-side revoke of the refresh token (kill-switch).
  const rt = localStorage.getItem("refreshToken");
  if (rt) bare.post("/auth/logout", { refreshToken: rt }).catch(() => {});
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("loginTime");
  localStorage.removeItem("refreshToken");
  _logoutFn?.();
  toast.error(message || "Session expired. Please login again.", {
    position: "top-center",
    autoClose: 4000,
    toastId: "session-expired",
  });
  setTimeout(() => {
    _isLoggingOut = false;
  }, 2000);
}

// Exchange the refresh token for a new access token (rotates the refresh token).
async function doRefresh() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("no_refresh_token");
  const res = await bare.post("/auth/refresh", { refreshToken });
  const newToken = res.data?.token;
  if (!newToken) throw new Error("refresh_failed");
  localStorage.setItem("token", newToken);
  if (res.data?.refreshToken) localStorage.setItem("refreshToken", res.data.refreshToken);
  return newToken;
}

// Exposed so AuthContext's idle/cold-start guards can refresh-first instead of
// hard-logging-out. Works for User (multi-device) and Manager/Superadmin
// (single-session) alike — the server enforces the session policy.
export const refreshAccessToken = doRefresh;

export function setupApiInterceptors() {
  // Apply to both the named instance AND global axios (for legacy code paths
  // in untouched screens that still use `import axios from "axios"` directly).
  const targets = [api.interceptors, axios.interceptors];

  targets.forEach(({ request, response }) => {
    request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          // If the access token is expired but we have a refresh token, let the
          // request proceed — it will 401 and the response handler will refresh.
          // Only hard-logout when expired AND there's no refresh token.
          if (isTokenExpired(token) && !localStorage.getItem("refreshToken")) {
            forceLogout("Your session has expired. Please login again.");
            return Promise.reject(new axios.Cancel("Token expired"));
          }
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (err) => Promise.reject(err)
    );

    response.use(
      (res) => res,
      async (error) => {
        if (axios.isCancel(error)) return Promise.reject(error);
        const status = error.response?.status;
        const data = error.response?.data;
        const original = error.config;
        const url = original?.url;

        // ── Refresh-on-401 with single-flight queue ──
        if (
          status === 401 &&
          !isAuthEndpoint(url) &&
          !original?._skipAuthInterceptor &&
          !original?._retry
        ) {
          if (!localStorage.getItem("refreshToken")) {
            forceLogout(data?.message || "Session expired. Please login again.");
            return Promise.reject(error);
          }
          if (_isRefreshing) {
            // Wait for the in-flight refresh, then retry with the new token.
            return new Promise((resolve, reject) => _refreshQueue.push({ resolve, reject })).then(
              (token) => {
                original._retry = true;
                original.headers = original.headers || {};
                original.headers.Authorization = `Bearer ${token}`;
                return axios(original); // config carries its own baseURL → instance-agnostic
              }
            );
          }
          original._retry = true;
          _isRefreshing = true;
          try {
            const newToken = await doRefresh();
            _flushQueue(null, newToken);
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${newToken}`;
            return axios(original);
          } catch (refreshErr) {
            _flushQueue(refreshErr, null);
            forceLogout("Session expired. Please login again.");
            return Promise.reject(error);
          } finally {
            _isRefreshing = false;
          }
        } else if (status === 403) {
          toast.warn(data?.message || "You don't have permission for this action.", {
            toastId: "forbidden",
            autoClose: 3000,
          });
        } else if (status >= 500) {
          toast.error("Server error. Please try again later.", {
            toastId: "server-error",
            autoClose: 3000,
          });
        }
        return Promise.reject(error);
      }
    );
  });

  // Legacy: set global axios baseURL for absolute-URL deployments
  if (baseURL.startsWith("http")) {
    axios.defaults.baseURL = baseURL.replace(/\/api$/, "");
  }
}
