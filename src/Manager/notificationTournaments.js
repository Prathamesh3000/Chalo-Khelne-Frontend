/**
 * Tournament lookups for the manager notifications inbox.
 *
 * The inbox needs a title and an end date for every distinct tournament its
 * rows mention, to build the filter tabs. That used to be one
 * GET /api/tournaments/:id per tournament — and rows outlive deleted
 * tournaments, so a long-lived inbox produced a wall of 404s (and N round
 * trips). Now it is one GET /api/tournaments/summaries per 50 ids, where
 * missing ids are simply absent.
 *
 * `http` is axios (or anything with .get(url, config)) so this is unit-testable.
 */

export const SUMMARY_BATCH_SIZE = 50;
const FALLBACK_CONCURRENCY = 6;

// Server without /summaries yet (or a transient failure): look up one by one.
// A 404 here means the tournament was deleted, which is an expected state.
async function loadOneByOne(http, ids, found) {
  for (let i = 0; i < ids.length; i += FALLBACK_CONCURRENCY) {
    const results = await Promise.all(
      ids.slice(i, i + FALLBACK_CONCURRENCY).map(async (id) => {
        try {
          const r = await http.get(`/api/tournaments/${id}`);
          if (r.data?.success && r.data.tournament) return r.data.tournament;
        } catch {
          /* deleted */
        }
        return null;
      })
    );
    for (const t of results) if (t) found.set(String(t._id), t);
  }
}

/** @returns {Promise<Map<string, {_id:string,title?:string,endDate?:string}>>} */
export async function loadTournamentSummaries(http, ids) {
  const found = new Map();
  for (let i = 0; i < ids.length; i += SUMMARY_BATCH_SIZE) {
    const chunk = ids.slice(i, i + SUMMARY_BATCH_SIZE);
    try {
      const { data } = await http.get("/api/tournaments/summaries", {
        params: { ids: chunk.join(",") },
      });
      if (!data?.success || !Array.isArray(data.tournaments)) {
        throw new Error("Unexpected summaries response");
      }
      for (const t of data.tournaments) found.set(String(t._id), t);
    } catch {
      await loadOneByOne(http, chunk, found);
    }
  }
  return found;
}

/**
 * One filter tab per tournament in the inbox, plus a status map.
 *   active  - hasn't finished (end date is today or later)
 *   expired - finished
 *   unknown - the tournament document is gone; title falls back to the one
 *             captured in the notification message
 * Running events lead; the sort is stable so recency holds within each group.
 */
export function buildTournamentTabs({ ids, found, titleFromMessage = new Map(), now = new Date() }) {
  const statusMap = {};
  const tabs = [];

  for (const id of ids) {
    const t = found.get(String(id));
    if (!t) {
      statusMap[id] = "unknown";
      tabs.push({ _id: id, title: titleFromMessage.get(id) || null, status: "unknown" });
      continue;
    }
    const endDate = t.endDate ? new Date(t.endDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    statusMap[id] = endDate && endDate < now ? "expired" : "active";
    tabs.push({
      _id: id,
      title: t.title || titleFromMessage.get(id) || null,
      status: statusMap[id],
    });
  }

  const rank = { active: 0, expired: 1, unknown: 2 };
  tabs.sort((a, b) => rank[a.status] - rank[b.status]);
  return { statusMap, tabs };
}
