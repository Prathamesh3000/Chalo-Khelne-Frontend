import axios from "axios";

import { getAuthToken } from "../../shared/api/authToken";
let inflight = null;

export async function searchEntities(query, { types, limit, signal } = {}) {
  if (inflight) {
    inflight.abort();
  }
  const controller = new AbortController();
  inflight = controller;

  if (signal) {
    if (signal.aborted) {
      controller.abort();
      return null;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const params = { q: query };
  if (types?.length) params.types = types.join(",");
  if (limit) params.limit = limit;

  try {
    const token = getAuthToken();
    const res = await axios.get("/api/search", {
      params,
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      // Tell the global interceptor: do NOT force-logout on a 401 here.
      // Search failure is recoverable — the rest of the session must keep going.
      _skipAuthInterceptor: true,
    });
    return Array.isArray(res.data?.results) ? res.data.results : [];
  } catch (err) {
    if (
      axios.isCancel?.(err) ||
      err?.name === "CanceledError" ||
      err?.name === "AbortError" ||
      err?.code === "ERR_CANCELED"
    ) {
      return null;
    }
    throw err;
  } finally {
    if (inflight === controller) inflight = null;
  }
}
