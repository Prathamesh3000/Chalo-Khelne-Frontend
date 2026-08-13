/**
 * Scoring configuration — fed by the server, read synchronously.
 *
 * §6.1: the sport→scoringType mapping and its display labels used to be a
 * hardcoded object literal in this codebase, another in the mobile app, and a
 * third on the server. The three had drifted:
 *
 *   • Carrom was "single" here and "board" on the server and mobile, so a
 *     board-by-board scoreline was collapsed into one value on the web manager
 *     while mobile rendered the same match correctly;
 *   • this file's LABELS had no `board` entry at all;
 *   • Foosball was unknown to both clients, and `LABELS[type] || LABELS.sets`
 *     silently labelled it as a racquet match — "Set", "Game", "Sets" over what
 *     the server had stored as goals within games.
 *
 * The server is now the source of truth (GET /api/sports/scoring-config). This
 * module keeps a synchronous view of it, because readMatchResult() is called
 * during render and cannot await.
 *
 * SEED_CONFIG below is a cache warmed from the server so the first paint (before
 * the fetch resolves) is correct rather than blank. It is NOT an independent
 * table: tests/scoringConfig.test.js asserts it matches the server's, so the
 * drift this defect describes cannot silently return.
 */

import axios from "axios";

// Mirror of server/utils/matchFormatUtils.js — keep in sync (the test enforces it).
const SEED_CONFIG = {
  sports: {
    "Table Tennis": "sets",
    Badminton: "sets",
    Tennis: "sets",
    Pickleball: "sets",
    Volleyball: "sets",
    Squash: "sets",
    Cricket: "innings",
    Football: "time",
    Basketball: "time",
    Hockey: "time",
    Kabaddi: "time",
    Chess: "single",
    Carrom: "board",
    Foosball: "sets",
  },
  labels: {
    sets: { round: "Set", subRound: "Game", score: "Points", result: "Sets" },
    time: { round: "Period", subRound: null, score: "Goals", result: "Score" },
    innings: { round: "Innings", subRound: "Over", score: "Runs", result: "Score" },
    board: { round: "Board", subRound: null, score: "Points", result: "Boards" },
    single: { round: "Game", subRound: null, score: "Result", result: "Result" },
  },
  defaultScoringType: "single",
};

let config = {
  sports: { ...SEED_CONFIG.sports },
  labels: { ...SEED_CONFIG.labels },
  defaultScoringType: SEED_CONFIG.defaultScoringType,
};

let loaded = false;
let inFlight = null;

/**
 * Fetch the authoritative config. Safe to call more than once; concurrent calls
 * share one request. Failures are non-fatal — the seed keeps rendering correct.
 */
export function loadScoringConfig() {
  if (inFlight) return inFlight;
  inFlight = axios
    .get("/api/sports/scoring-config")
    .then((res) => {
      const data = res?.data?.data;
      if (data && data.sports && data.labels) {
        config = {
          sports: { ...SEED_CONFIG.sports, ...data.sports },
          labels: { ...SEED_CONFIG.labels, ...data.labels },
          defaultScoringType: data.defaultScoringType || SEED_CONFIG.defaultScoringType,
        };
        loaded = true;
      }
      return config;
    })
    .catch(() => config)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function isScoringConfigLoaded() {
  return loaded;
}

/**
 * Resolve a sport's scoring type. Case-insensitive.
 * Returns null for an unknown sport so callers can decide — getResultLabels
 * falls back to the neutral "single" rendering rather than inventing sets.
 */
export function getScoringType(sportName) {
  if (!sportName) return null;
  const key = Object.keys(config.sports).find(
    (k) => k.toLowerCase() === String(sportName).toLowerCase()
  );
  return key ? config.sports[key] : null;
}

/**
 * Labels for a scoring type.
 *
 * The fallback is the neutral `single` rendering, NOT `sets`. The old
 * `LABELS[type] || LABELS.sets` is precisely what mislabelled an unmapped
 * Foosball match as a racquet match.
 */
export function getLabelsFor(scoringType) {
  return (
    config.labels[scoringType] ||
    config.labels[config.defaultScoringType] ||
    config.labels.single
  );
}

// Exposed for the drift test.
export const __SEED_CONFIG = SEED_CONFIG;
