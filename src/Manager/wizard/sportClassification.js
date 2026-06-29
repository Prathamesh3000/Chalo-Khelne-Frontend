// Sport classification + scoring/format defaults.
// Lifted out of MCreateTournament.jsx in Sub-step 5 so SportCard and
// MCreateTournament share one source of truth.

export const TEAM_SPORTS = new Set([
  "Cricket", "Football", "Kabaddi", "Volleyball", "Basketball", "Hockey",
]);

export const INDIVIDUAL_SPORTS = new Set([
  "Chess", "Carrom", "Snooker",
  // Foosball (table football) — singles or doubles, two-sided like a racquet
  // match, not a team-of-many. Scored as goals within games (engine: "sets").
  "Foosball",
  // Racquet sports — singles/doubles both score on the individual axis
  // (two sides, not a team-of-many). Previously absent from both sets,
  // which left them unconstrained in the create-tournament wizard.
  "Badminton", "Pickleball", "Table Tennis", "Tennis", "Squash",
]);

// Sports that use the 4-level nested shape (match → set → game → points).
// Mirror of server/factories/MatchFactory.js → hasNestedGames signal.
export const NESTED_SET_SPORTS = new Set(["Tennis"]);

export const SPORT_SCORING_TYPES = {
  "Table Tennis": "sets",
  "Badminton":    "sets",
  "Tennis":       "sets",
  "Pickleball":   "sets",
  "Volleyball":   "sets",
  "Squash":       "sets",
  "Cricket":      "innings",
  "Football":     "time",
  "Basketball":   "time",
  "Hockey":       "time",
  "Kabaddi":      "time",
  "Chess":        "single",
  "Carrom":       "single",
  "Foosball":     "sets",
};

export function isTeamOnlySport(sportName) {
  return !!sportName && TEAM_SPORTS.has(sportName);
}

export function isIndividualOnlySport(sportName) {
  return !!sportName && INDIVIDUAL_SPORTS.has(sportName);
}

export function isNestedSetSport(sportName) {
  return !!sportName && NESTED_SET_SPORTS.has(sportName);
}

export const slugifyForSport = (s) =>
  String(s || "").toLowerCase().replace(/\s+/g, "_");

// Sport-aware unranked match-format defaults. Keys use the dotted-path
// convention from ruleBookFormEngine (e.g. "format.totalSets") so they can
// be fed into buildSubmissionPayload at submit time.
export const UNRANKED_DEFAULTS = {
  // Flat-set default (Table Tennis, Badminton, Volleyball, Squash, Pickleball).
  // No gamesPerSet — these sports score each set directly to a point total.
  sets: {
    "format.totalSets":        3,
    "format.pointsPerSet":     11,
    "format.winByMargin":      2,
    "format.deuceEnabled":     true,
    "format.tiebreakEnabled":  false,
    "format.serviceAlternate": 2,
  },
  // Nested-set default (Tennis): 6 games/set, 4 points/game, tiebreak enabled.
  nestedSets: {
    "format.totalSets":        3,
    "format.gamesPerSet":      6,
    "format.pointsPerGame":    4,
    "format.winByMargin":      2,
    "format.deuceEnabled":     true,
    "format.tiebreakEnabled":  true,
    "format.serviceAlternate": 1,
  },
  innings: {
    "format.oversCount":   20,
    "format.inningsCount": 2,
    "format.totalSets":    2,
  },
  time: {
    "format.halvesCount":    2,
    "format.halvesDuration": 45,
    "format.totalSets":      2,
  },
  single: {
    "format.totalSets": 1,
  },
};

export function getUnrankedDefaults(sportName) {
  const type = SPORT_SCORING_TYPES[sportName] || "sets";
  if (type === "sets") {
    return { ...(isNestedSetSport(sportName) ? UNRANKED_DEFAULTS.nestedSets : UNRANKED_DEFAULTS.sets) };
  }
  return { ...(UNRANKED_DEFAULTS[type] || UNRANKED_DEFAULTS.sets) };
}
