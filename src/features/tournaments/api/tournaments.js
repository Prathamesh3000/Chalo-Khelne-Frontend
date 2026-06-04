import { api, USE_MOCK } from "../../../shared/api";
import * as mocks from "./mocks";

/**
 * Map a real backend tournament (rich, nested) into the flat shape the card
 * expects. Keeps the card dumb and gives us one place to evolve as the schema
 * grows. Mocks pass through unchanged — they already match this shape.
 */
function normalizeTournament(t) {
  if (!t || typeof t !== "object") return t;
  if (t._id && String(t._id).startsWith("mock-")) return t; // mock pre-shaped

  const firstSport = Array.isArray(t.sports) && t.sports[0] ? t.sports[0] : null;
  const firstCategory =
    firstSport && Array.isArray(firstSport.categories) && firstSport.categories[0]
      ? firstSport.categories[0]
      : null;

  const sport =
    firstSport?.sportName ||
    t.sportsType ||
    (Array.isArray(t.sports) ? t.sports.map((s) => s.sportName).filter(Boolean).join(", ") : "") ||
    "";

  const city =
    (Array.isArray(t.eventLocation) ? t.eventLocation[0] : t.eventLocation) ||
    t.venue ||
    t.city ||
    "";

  const fee =
    typeof t.fee === "number"
      ? t.fee
      : firstCategory && typeof firstCategory.fee === "number"
      ? firstCategory.fee
      : null;

  return {
    _id: t._id,
    // Real backend stores the tournament name in `title`. `name` is reserved
    // for sub-documents (categories, courts). Keep both keys populated so any
    // legacy consumer reading `.name` still works.
    name: t.title || t.name || "Untitled tournament",
    title: t.title || t.name || "Untitled tournament",
    sport,
    city,
    venue: t.venue || "",
    organizerName: t.organizerName || "",
    startDate: t.startDate || null,
    endDate: t.endDate || null,
    status: deriveStatus(t),
    fee,
    // Capacity + registered come from separate endpoints in the legacy API.
    // Leave undefined here so the card hides the progress bar instead of
    // showing 0/0. We can fill these in later via a join hook.
    capacity: t.capacity ?? null,
    registered: t.registered ?? null,
    // Preserved so route-resolution helpers can branch by per-sport type /
    // knockout format (utils/sportTrack reads from tournament.sports[]).
    sports: Array.isArray(t.sports) ? t.sports : [],
    tournamentLevel: t.tournamentLevel || null,
    isPrivate: !!t.isPrivate,
  };
}

function deriveStatus(t) {
  if (t.status) return String(t.status).toLowerCase();
  const start = t.startDate ? new Date(t.startDate) : null;
  const end = t.endDate ? new Date(t.endDate) : null;
  const now = new Date();
  if (start && end && start <= now && now <= end) return "live";
  if (start && now < start) return "upcoming";
  if (end && now > end) return "completed";
  return "upcoming";
}

export async function listTournaments(filters = {}) {
  if (USE_MOCK) return mocks.mockListTournaments(filters);
  // When a managerId is supplied, hit the manager-scoped endpoint so the
  // caller sees their private tournaments too. The public /tournaments
  // route drops anything with isPrivate: true and ignores tab/sport/q
  // filters entirely — those are applied client-side now.
  const { managerId, ...rest } = filters;
  const url = managerId ? `/tournaments/manager/${managerId}` : "/tournaments";
  const { data } = await api.get(url, { params: rest });
  const list = Array.isArray(data) ? data : data?.tournaments || [];
  return list.map(normalizeTournament);
}

export async function getTournament(id) {
  if (USE_MOCK) return mocks.mockGetTournament(id);
  const { data } = await api.get(`/tournaments/${id}`);
  return normalizeTournament(data);
}

export async function listTournamentsByManager(managerId) {
  if (USE_MOCK) {
    const all = await mocks.mockListTournaments();
    return all.slice(0, 6);
  }
  const { data } = await api.get(`/tournaments/manager/${managerId}`);
  const list = Array.isArray(data) ? data : data?.tournaments || [];
  return list.map(normalizeTournament);
}
