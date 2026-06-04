/**
 * assetUrl(path) — resolve a backend image path to a usable <img> src.
 *
 * Backend stores image fields inconsistently: relative ("turfs/x.jpg"),
 * with a leading "uploads/" ("uploads/certificates/x.jpg"), with Windows
 * backslashes ("turfs\\x.jpg"), and a few fields already return a FULL URL
 * (e.g. payment QR). This helper handles ALL of those, in dev and prod.
 *
 * Origin derivation:
 *   VITE_API_BASE_URL = "/api"            (dev)  → ORIGIN ""           → "/uploads/.." (hits Vite proxy)
 *   VITE_API_BASE_URL = "https://x/api"   (prod) → ORIGIN "https://x"  → "https://x/uploads/.."
 */
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const ORIGIN = RAW_BASE.replace(/\/api\/?$/i, ""); // "" in dev, "https://host" in prod

// 1x1 gray pixel — safe inline fallback (no missing-file risk).
export const IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='2'%3E%3Crect width='2' height='2' fill='%23e5e7eb'/%3E%3C/svg%3E";

export function assetUrl(path, fallback = IMAGE_PLACEHOLDER) {
  if (!path || typeof path !== "string") return fallback;
  const t = path.trim();
  if (!t) return fallback;
  if (/^(https?:)?\/\//i.test(t)) return t; // already absolute (http/https/protocol-relative)
  if (/^data:/i.test(t)) return t; // data URI
  let p = t.replace(/\\/g, "/").replace(/^\/+/, ""); // backslashes → slashes, drop leading slashes
  p = p.replace(/^uploads\//i, ""); // drop a leading "uploads/" so we don't double it
  return `${ORIGIN}/uploads/${p}`;
}

export default assetUrl;
