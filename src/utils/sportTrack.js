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

export function getTournamentType(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.type || null;
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

export function getQualifyPerGroup(tournament, sportId) {
  const v = getSportTrack(tournament, sportId)?.qualifyPerGroup;
  return v ?? 2;
}

export function getDrawSize(tournament, sportId) {
  const v = getSportTrack(tournament, sportId)?.drawSize;
  return v ?? null;
}

export function getGroupStageFormat(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.groupStageFormat || null;
}

export function getKnockoutFormat(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.knockoutFormat || null;
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
