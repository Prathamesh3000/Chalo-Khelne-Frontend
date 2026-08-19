// sports_app/src/utils/sportTrack.js
//
// Frontend mirror of server/utils/sportTrackUtils.js — read-only.
// Used by manager / club-admin / corporate-admin / landing screens to
// read per-sport fields off `tournament.sports[]` instead of the
// deprecated root scalars (sportsType, type, matchFormat, …).
//
// No legacy synthesize fallback: after STEP 16 every tournament has
// sports[] populated. Returns null/[]/{} when the track is missing,
// and call sites apply their own display defaults (`|| "—"` etc.).

export function getSportTrack(tournament, sportId) {
  if (!tournament) return null;
  const tracks = Array.isArray(tournament.sports) ? tournament.sports : [];
  if (tracks.length === 0) return null;
  if (!sportId) return tracks[0];
  const idStr = String(sportId);
  return tracks.find((t) => String(t?.sportId) === idStr) || tracks[0];
}

export function getSportName(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.sportName || null;
}

export function getTournamentType(tournament, sportId, categoryName) {
  const category = getCategory(tournament, sportId, categoryName);
  return category?.type || getSportTrack(tournament, sportId)?.type || null;
}

export function getMatchFormat(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.matchFormat || null;
}

/**
 * How many set wins actually decide a match. Mirrors resolveSetsToWin in
 * server/utils/matchFormatUtils.js — keep the two in step.
 *
 * Best-of-N is first to ceil(N/2): 2 of 3, 3 of 5, 4 of 7 — never all N. A
 * stored setsToWin larger than that is a stale default (every match model
 * defaults it to 3, paired with maxSets: 5), so it is clamped to the container.
 * Passing the raw value through made a legitimate 2-0 in a best-of-3 look
 * incomplete.
 */
export function resolveSetsToWin(format) {
  const f = format || {};
  const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

  const container = num(f.totalSets) ?? num(f.maxSets);
  const stored = num(f.setsToWin);

  if (!container) return stored || 1;
  const derived = Math.ceil(container / 2);
  if (!stored) return derived;
  return Math.min(stored, derived);
}

export function getCategories(tournament, sportId) {
  const cats = getSportTrack(tournament, sportId)?.categories;
  return Array.isArray(cats) ? cats : [];
}

/**
 * Find one category row by name — case-insensitive and trimmed, because the
 * category name is a free string on the booking side and will not always match
 * the tournament's casing. Mirrors getCategory in sportTrackUtils.js.
 */
export function getCategory(tournament, sportId, categoryName) {
  if (!categoryName) return null;
  const wanted = String(categoryName).trim().toLowerCase();
  if (!wanted) return null;
  return (
    getCategories(tournament, sportId).find(
      (c) => String(c?.name || "").trim().toLowerCase() === wanted
    ) || null
  );
}

// A track holds ONE format for all its categories, and the enum allows the
// combined "Singles, Doubles" for tracks running both. Resolution order —
// identical to server/utils/sportTrackUtils.js, which is authoritative:
//
//   1. the category's own override;
//   2. the track value, when it names a single format;
//   3. for the combined value, the category name (the only signal left);
//   4. null — the caller applies its own display default.
//
// Omitting categoryName gives the old track-only behaviour, so existing call
// sites are unaffected.
const COMBINED_FORMAT = "Singles, Doubles";

function resolveFormat(trackValue, categoryValue, categoryName) {
  if (categoryValue) return categoryValue;
  if (trackValue && trackValue !== COMBINED_FORMAT) return trackValue;
  if (trackValue === COMBINED_FORMAT) {
    return /doubles/i.test(String(categoryName || "")) ? "Doubles" : "Singles";
  }
  return null;
}

export function getQualifyPerGroup(tournament, sportId, categoryName) {
  const category = getCategory(tournament, sportId, categoryName);
  const track = getSportTrack(tournament, sportId);
  return category?.qualifyPerGroup ?? track?.qualifyPerGroup ?? 2;
}

export function getDrawSize(tournament, sportId, categoryName) {
  const category = getCategory(tournament, sportId, categoryName);
  const track = getSportTrack(tournament, sportId);
  return category?.drawSize ?? track?.drawSize ?? null;
}

export function getGroupStageFormat(tournament, sportId, categoryName) {
  const track = getSportTrack(tournament, sportId);
  if (!track) return null;
  const category = getCategory(tournament, sportId, categoryName);
  return resolveFormat(track.groupStageFormat || null, category?.groupStageFormat || null, categoryName);
}

export function getKnockoutFormat(tournament, sportId, categoryName) {
  const track = getSportTrack(tournament, sportId);
  if (!track) return null;
  const category = getCategory(tournament, sportId, categoryName);
  return resolveFormat(track.knockoutFormat || null, category?.knockoutFormat || null, categoryName);
}

// Authoring mode the manager chose in the wizard. Never gates resolution — a
// category override is honoured in either mode.
export function getFormatScope(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.formatScope === "category" ? "category" : "sport";
}

/**
 * Does entering this category require a partner? True when it is played as
 * doubles in EITHER stage — a category that reaches a doubles knockout must be
 * entered as a pair from the start, since nothing later pairs anyone up.
 */
export function isDoublesCategory(tournament, sportId, categoryName) {
  return (
    getGroupStageFormat(tournament, sportId, categoryName) === "Doubles" ||
    getKnockoutFormat(tournament, sportId, categoryName) === "Doubles"
  );
}

export function getDavisCupFormatId(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.davisCupFormatId || null;
}

export function getSportRules(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.sportRules || null;
}

export function getCurrentStage(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.currentStage || null;
}

export function getStageConfig(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.stageConfig || {};
}
