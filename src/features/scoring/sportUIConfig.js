/**
 * Sport UI Configuration Registry.
 *
 * Each sport defines how its scoring UI should render.
 * Adding a new sport = adding one entry here. No other file changes needed.
 *
 * scoringType:
 *   "sets"    → Sets → Games → Points (TT, Badminton, Tennis, Volleyball)
 *   "time"    → Halves/Quarters → Goals (Football, Basketball, Hockey)
 *   "innings" → Innings → Overs → Runs (Cricket)
 *   "rounds"  → Rounds → Points (Boxing, Wrestling)
 *   "single"  → Single score value (Chess, Carrom)
 */

const SPORT_UI = {
  "Table Tennis": {
    scoringType: "sets",
    icon: "🏓",
    color: "#F97316",
    labels: {
      set: "Set",
      game: "Game",
      point: "Point",
      matchResult: "Sets",
    },
    scoring: {
      inputType: "counter",      // +1 / -1 buttons
      showDeuce: true,
      showService: true,
      showGameScore: true,
    },
    defaults: {
      totalSets: 5,
      setsToWin: 3,
      gamesPerSet: 5,
      gamesToWin: 3,
      pointsToWin: 11,
      marginToWin: 2,
    },
  },

  "Badminton": {
    scoringType: "sets",
    icon: "🏸",
    color: "#059669",
    labels: {
      set: "Set",
      game: "Game",
      point: "Point",
      matchResult: "Sets",
    },
    scoring: {
      inputType: "counter",
      showDeuce: true,
      showService: true,
      showGameScore: true,
    },
    defaults: {
      totalSets: 3,
      setsToWin: 2,
      gamesPerSet: 1,
      gamesToWin: 1,
      pointsToWin: 21,
      marginToWin: 2,
    },
  },

  "Foosball": {
    scoringType: "sets",
    icon: "⚽",
    color: "#8B5CF6",
    labels: {
      set: "Game",        // a foosball match is a best-of-N GAMES (not "sets")
      game: "Game",
      point: "Goal",      // a "point" is a GOAL
      matchResult: "Games",
    },
    scoring: {
      inputType: "counter",   // +1 / -1 goal buttons
      showDeuce: false,       // win-by-2 but no "deuce" wording
      showService: false,     // no service in foosball
      showGameScore: true,
    },
    defaults: {
      totalSets: 3,
      setsToWin: 2,
      gamesPerSet: 1,
      gamesToWin: 1,
      pointsToWin: 10,        // first to 10 GOALS
      marginToWin: 2,
    },
  },

  "Tennis": {
    scoringType: "sets",
    icon: "🎾",
    color: "#84CC16",
    labels: {
      set: "Set",
      game: "Game",
      point: "Point",
      matchResult: "Sets",
    },
    scoring: {
      inputType: "counter",
      showDeuce: true,
      showService: true,
      showGameScore: true,
      showTiebreak: true,
    },
    defaults: {
      totalSets: 5,
      setsToWin: 3,
      gamesPerSet: 13,
      gamesToWin: 7,
      pointsToWin: 4,
      marginToWin: 2,
    },
  },

  "Pickleball": {
    scoringType: "sets",
    icon: "🥒",
    color: "#10B981",
    labels: {
      set: "Set",
      game: "Game",
      point: "Point",
      matchResult: "Sets",
    },
    scoring: {
      inputType: "counter",
      showDeuce: true,
      showService: true,
      showGameScore: true,
    },
    defaults: {
      totalSets: 3,
      setsToWin: 2,
      gamesPerSet: 1,
      gamesToWin: 1,
      pointsToWin: 11,
      marginToWin: 2,
    },
  },

  "Volleyball": {
    scoringType: "sets",
    icon: "🏐",
    color: "#F59E0B",
    labels: {
      set: "Set",
      game: "Game",
      point: "Point",
      matchResult: "Sets",
    },
    scoring: {
      inputType: "counter",
      showDeuce: true,
      showService: false,
      showGameScore: true,
    },
    defaults: {
      totalSets: 5,
      setsToWin: 3,
      gamesPerSet: 1,
      gamesToWin: 1,
      pointsToWin: 25,
      marginToWin: 2,
    },
  },

  "Football": {
    scoringType: "time",
    icon: "⚽",
    color: "#3B82F6",
    labels: {
      period: "Half",
      score: "Goal",
      matchResult: "Goals",
    },
    scoring: {
      inputType: "event",          // goal events with minute
      periods: 2,
      periodDuration: 45,
      extraTime: true,
      penalties: true,
    },
    defaults: {
      periods: 2,
      periodDuration: 45,
    },
  },

  "Basketball": {
    scoringType: "time",
    icon: "🏀",
    color: "#EF4444",
    labels: {
      period: "Quarter",
      score: "Point",
      matchResult: "Points",
    },
    scoring: {
      inputType: "event",
      periods: 4,
      periodDuration: 12,
      extraTime: true,
      penalties: false,
      pointValues: [1, 2, 3],     // free throw, 2pt, 3pt
    },
    defaults: {
      periods: 4,
      periodDuration: 12,
    },
  },

  "Cricket": {
    scoringType: "innings",
    icon: "🏏",
    color: "#1D6A8B",
    labels: {
      innings: "Innings",
      over: "Over",
      score: "Run",
      matchResult: "Runs",
      wicket: "Wicket",
    },
    scoring: {
      inputType: "ballByBall",
      ballValues: [0, 1, 2, 3, 4, 6],
      extras: ["wide", "no-ball", "bye", "leg-bye"],
      showWickets: true,
      showRunRate: true,
    },
    defaults: {
      overs: 20,
      innings: 2,
    },
  },

  "Chess": {
    scoringType: "single",
    icon: "♟️",
    color: "#374151",
    labels: {
      score: "Result",
      matchResult: "Result",
    },
    scoring: {
      inputType: "result",         // Win/Draw/Loss selector
      possibleResults: ["1-0", "0-1", "0.5-0.5"],
      resultLabels: { "1-0": "White wins", "0-1": "Black wins", "0.5-0.5": "Draw" },
    },
    defaults: {},
  },

  "Carrom": {
    scoringType: "board",
    icon: "🎯",
    color: "#92400E",
    labels: {
      set: "Board",
      score: "Point",
      matchResult: "Boards",
    },
    scoring: {
      inputType: "board",
      showCoinCount: true,
      queenBonus: 3,
    },
    defaults: {
      totalSets: 3,
      boardsToWin: 2,
      pointsPerBoard: 25,
      queenValue: 3,
    },
  },

  "Kabaddi": {
    scoringType: "time",
    icon: "🤼",
    color: "#7C3AED",
    labels: {
      period: "Half",
      score: "Point",
      matchResult: "Points",
    },
    scoring: {
      inputType: "event",
      periods: 2,
      periodDuration: 20,
      pointValues: [1, 2, 3],
    },
    defaults: {
      periods: 2,
      periodDuration: 20,
    },
  },

  "Hockey": {
    scoringType: "time",
    icon: "🏑",
    color: "#2196F3",
    labels: {
      period: "Half",
      score: "Goal",
      matchResult: "Goals",
    },
    scoring: {
      inputType: "event",
      periods: 2,
      periodDuration: 35,
      extraTime: true,
      penalties: true,
    },
    defaults: {
      periods: 2,
      periodDuration: 35,
    },
  },

  "Snooker": {
    scoringType: "single",
    icon: "���",
    color: "#607D8B",
    labels: {
      set: "Frame",
      score: "Point",
      matchResult: "Frames",
    },
    scoring: {
      inputType: "manual",
      showBreakScore: true,
    },
    defaults: {
      totalSets: 5,
      setsToWin: 3,
    },
  },

  "Turf Games": {
    scoringType: "single",
    icon: "🏟️",
    color: "#009688",
    labels: {
      set: "Round",
      score: "Point",
      matchResult: "Points",
    },
    scoring: {
      inputType: "manual",
    },
    defaults: {},
  },

  "Cricket Nets": {
    scoringType: "single",
    icon: "🏏",
    color: "#8BC34A",
    labels: {
      set: "Session",
      score: "Score",
      matchResult: "Score",
    },
    scoring: {
      inputType: "manual",
    },
    defaults: {},
  },
};

/**
 * Get sport config. Throws if sport is not recognized (no silent fallback).
 * Use `getSportConfigSafe` if you need graceful degradation for legacy data.
 */
export function getSportConfig(sportName) {
  if (!sportName) {
    console.error("[sportUIConfig] getSportConfig called with no sportName — using generic fallback");
    return FALLBACK_CONFIG;
  }
  const config = SPORT_UI[sportName];
  if (!config) {
    return FALLBACK_CONFIG;
  }
  return config;
}

const FALLBACK_CONFIG = {
  scoringType: "single",
  icon: "🏅",
  color: "#6B7280",
  labels: { set: "Round", game: "Game", score: "Score", point: "Point", matchResult: "Score" },
  scoring: { inputType: "manual", showDeuce: false, showService: false, showGameScore: false },
  defaults: {},
};

/**
 * Get the scoring renderer component name for a sport.
 */
export function getScoringRenderer(sportName) {
  const config = getSportConfig(sportName);
  switch (config.scoringType) {
    case "sets": return "SetBasedScorer";
    case "time": return "TimeBasedScorer";
    case "innings": return "InningsBasedScorer";
    case "board": return "BoardBasedScorer";
    case "single": return "SingleResultScorer";
    default: return "SetBasedScorer";
  }
}

export default SPORT_UI;
