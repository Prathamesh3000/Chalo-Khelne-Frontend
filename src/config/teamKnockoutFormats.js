/**
 * Central Registry — Team Knockout Match Formulas
 *
 * Each format defines:
 * - id: unique key stored in tournament
 * - name: display name
 * - shortName: compact label
 * - totalSets: max sets in a match
 * - setsToWin: sets needed to win
 * - hasDoubles: whether any set is doubles
 * - minPlayers: minimum players per team
 * - sets: ordered list of set definitions
 *   - setNumber: 1-based
 *   - type: "singles" | "doubles"
 *   - label: display label (e.g. "Singles A vs X")
 *   - home: player positions from home team
 *   - away: player positions from away team
 *   - isDecider: true if this set only plays when needed
 *
 * Adding a new format = add one entry. No other file changes needed.
 */

const TEAM_KNOCKOUT_FORMATS = [
  // ═══════════════════════════════════════════
  // SINGLES FORMATS
  // ═══════════════════════════════════════════
  {
    id: "singles_bo3",
    name: "Singles — Best of 3",
    shortName: "Singles BO3",
    description: "3 singles sets. Captain vs Captain, Player vs Player, cross-match decider.",
    totalSets: 3,
    setsToWin: 2,
    hasDoubles: false,
    minPlayers: 2,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      { setNumber: 3, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: true },
    ],
  },
  {
    id: "singles_bo5",
    name: "Singles — Best of 5",
    shortName: "Singles BO5",
    description: "5 singles sets. All players cross-match. Captain rematch as tie-breaker.",
    totalSets: 5,
    setsToWin: 3,
    hasDoubles: false,
    minPlayers: 2,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      { setNumber: 3, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: false },
      { setNumber: 4, type: "singles", label: "Singles B vs X", home: ["B"], away: ["X"], isDecider: false },
      { setNumber: 5, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: true },
    ],
  },
  {
    id: "singles_bo7",
    name: "Singles — Best of 7",
    shortName: "Singles BO7",
    description: "7 singles sets. Full rotation with reverse cross-matches and final showdown.",
    totalSets: 7,
    setsToWin: 4,
    hasDoubles: false,
    minPlayers: 2,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      { setNumber: 3, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: false },
      { setNumber: 4, type: "singles", label: "Singles B vs X", home: ["B"], away: ["X"], isDecider: false },
      { setNumber: 5, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 6, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: true },
      { setNumber: 7, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: true },
    ],
  },

  // ═══════════════════════════════════════════
  // DOUBLES FORMATS (Mixed Singles + Doubles)
  // ═══════════════════════════════════════════
  {
    id: "doubles_bo3",
    name: "Doubles — Best of 3",
    shortName: "Doubles BO3",
    description: "Singles opener, doubles middle, singles decider.",
    totalSets: 3,
    setsToWin: 2,
    hasDoubles: true,
    minPlayers: 2,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "doubles", label: "Doubles AB vs XY", home: ["A", "B"], away: ["X", "Y"], isDecider: false },
      { setNumber: 3, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: true },
    ],
  },
  {
    id: "doubles_bo5",
    name: "Doubles — Best of 5",
    shortName: "Doubles BO5",
    description: "2 singles, 1 doubles, then cross-match singles. True Davis Cup format.",
    totalSets: 5,
    setsToWin: 3,
    hasDoubles: true,
    minPlayers: 2,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      { setNumber: 3, type: "doubles", label: "Doubles AB vs XY", home: ["A", "B"], away: ["X", "Y"], isDecider: false },
      { setNumber: 4, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: false },
      { setNumber: 5, type: "singles", label: "Singles B vs X", home: ["B"], away: ["X"], isDecider: true },
    ],
  },
  {
    id: "doubles_bo7",
    name: "Doubles — Best of 7",
    shortName: "Doubles BO7",
    description: "Extended format with 2 doubles sets. Maximum tactical depth.",
    totalSets: 7,
    setsToWin: 4,
    hasDoubles: true,
    minPlayers: 2,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      { setNumber: 3, type: "doubles", label: "Doubles AB vs XY", home: ["A", "B"], away: ["X", "Y"], isDecider: false },
      { setNumber: 4, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: false },
      { setNumber: 5, type: "singles", label: "Singles B vs X", home: ["B"], away: ["X"], isDecider: false },
      { setNumber: 6, type: "doubles", label: "Doubles AB vs XY", home: ["A", "B"], away: ["X", "Y"], isDecider: true },
      { setNumber: 7, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: true },
    ],
  },

  // ═══════════════════════════════════════════
  // 3-PLAYER TEAM FORMATS (A,B,C vs X,Y,Z)
  // ═══════════════════════════════════════════
  {
    id: "singles_3p_bo3",
    name: "3-Player Singles — Best of 3",
    shortName: "3P Singles BO3",
    description: "Each player plays one singles set. All 3 players participate.",
    totalSets: 3,
    setsToWin: 2,
    hasDoubles: false,
    minPlayers: 3,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      { setNumber: 3, type: "singles", label: "Singles C vs Z", home: ["C"], away: ["Z"], isDecider: true },
    ],
  },
  {
    id: "singles_3p_bo5",
    name: "3-Player Singles — Best of 5",
    shortName: "3P Singles BO5",
    description: "5 singles sets with cross-matches. Full 3-player rotation.",
    totalSets: 5,
    setsToWin: 3,
    hasDoubles: false,
    minPlayers: 3,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      { setNumber: 3, type: "singles", label: "Singles C vs Z", home: ["C"], away: ["Z"], isDecider: false },
      { setNumber: 4, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: false },
      { setNumber: 5, type: "singles", label: "Singles B vs Z", home: ["B"], away: ["Z"], isDecider: true },
    ],
  },
  {
    id: "doubles_3p_bo5",
    name: "3-Player Mixed — Best of 5",
    shortName: "3P Mixed BO5",
    description: "2 singles + 1 doubles (captain picks pairing) + 2 cross-match singles. True Davis Cup.",
    totalSets: 5,
    setsToWin: 3,
    hasDoubles: true,
    minPlayers: 3,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      {
        setNumber: 3,
        type: "doubles",
        label: "Doubles (Captain's Choice)",
        isDecider: false,
        requiresSelection: true,
        options: [
          { id: "bc_xy", label: "B+C vs X+Y", home: ["B", "C"], away: ["X", "Y"] },
          { id: "ab_yz", label: "A+B vs Y+Z", home: ["A", "B"], away: ["Y", "Z"] },
          { id: "ac_xz", label: "A+C vs X+Z", home: ["A", "C"], away: ["X", "Z"] },
        ],
        // Defaults used if no selection made
        home: ["B", "C"],
        away: ["X", "Y"],
      },
      { setNumber: 4, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: false },
      { setNumber: 5, type: "singles", label: "Singles C vs Z", home: ["C"], away: ["Z"], isDecider: true },
    ],
  },
  {
    id: "doubles_3p_bo5_v2",
    name: "3-Player Mixed — Best of 5 (Classic)",
    shortName: "3P Classic BO5",
    description: "A vs X, B vs Y, doubles pick (AB or BC), cross A vs Y, then C vs Z decider.",
    totalSets: 5,
    setsToWin: 3,
    hasDoubles: true,
    minPlayers: 3,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      {
        setNumber: 3,
        type: "doubles",
        label: "Doubles (Captain's Choice)",
        isDecider: false,
        requiresSelection: true,
        options: [
          { id: "ab_xz", label: "A+B vs X+Z", home: ["A", "B"], away: ["X", "Z"] },
          { id: "bc_yx", label: "B+C vs Y+X", home: ["B", "C"], away: ["Y", "X"] },
          { id: "ac_xy", label: "A+C vs X+Y", home: ["A", "C"], away: ["X", "Y"] },
        ],
        home: ["A", "B"],
        away: ["X", "Z"],
      },
      { setNumber: 4, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: false },
      { setNumber: 5, type: "singles", label: "Singles C vs Z", home: ["C"], away: ["Z"], isDecider: true },
    ],
  },
  {
    id: "doubles_3p_bo7",
    name: "3-Player Mixed — Best of 7",
    shortName: "3P Mixed BO7",
    description: "Full rotation: 3 singles + 2 doubles (both captain's choice) + 2 cross-matches.",
    totalSets: 7,
    setsToWin: 4,
    hasDoubles: true,
    minPlayers: 3,
    sets: [
      { setNumber: 1, type: "singles", label: "Singles A vs X", home: ["A"], away: ["X"], isDecider: false },
      { setNumber: 2, type: "singles", label: "Singles B vs Y", home: ["B"], away: ["Y"], isDecider: false },
      { setNumber: 3, type: "singles", label: "Singles C vs Z", home: ["C"], away: ["Z"], isDecider: false },
      {
        setNumber: 4,
        type: "doubles",
        label: "Doubles 1 (Captain's Choice)",
        isDecider: false,
        requiresSelection: true,
        options: [
          { id: "ab_xy", label: "A+B vs X+Y", home: ["A", "B"], away: ["X", "Y"] },
          { id: "ac_xz", label: "A+C vs X+Z", home: ["A", "C"], away: ["X", "Z"] },
          { id: "bc_yz", label: "B+C vs Y+Z", home: ["B", "C"], away: ["Y", "Z"] },
        ],
        home: ["A", "B"],
        away: ["X", "Y"],
      },
      { setNumber: 5, type: "singles", label: "Singles A vs Y", home: ["A"], away: ["Y"], isDecider: false },
      {
        setNumber: 6,
        type: "doubles",
        label: "Doubles 2 (Captain's Choice)",
        isDecider: true,
        requiresSelection: true,
        options: [
          { id: "bc_xy", label: "B+C vs X+Y", home: ["B", "C"], away: ["X", "Y"] },
          { id: "ac_yz", label: "A+C vs Y+Z", home: ["A", "C"], away: ["Y", "Z"] },
          { id: "ab_xz", label: "A+B vs X+Z", home: ["A", "B"], away: ["X", "Z"] },
        ],
        home: ["B", "C"],
        away: ["X", "Y"],
      },
      { setNumber: 7, type: "singles", label: "Singles B vs Z", home: ["B"], away: ["Z"], isDecider: true },
    ],
  },

  // ═══════════════════════════════════════════
  // RAPID RALLIES S1 (Kharadi TT) — 5-player, 5-rubber team tie.
  // Dynamic Selection System: doubles partners (rubbers 2 & 4) and the
  // rubber-5 singles player are captain's choice. Valid choices are computed
  // from the shared rules (female@P3, partner pool P3-P5, all-5-play,
  // rubber-5 not-played-singles) — NOT from fixed `options`. All 5 rubbers
  // always played (playAllSets). See RAPID_RALLIES_PLAN.md.
  // ═══════════════════════════════════════════
  {
    id: "rapid_rallies_s1",
    name: "Rapid Rallies S1 — 5-Player Dynamic",
    shortName: "Rapid Rallies",
    description: "5-player team tie: 3 singles + 2 doubles. Female plays rubber 3. Captain picks doubles partners + rubber-5 player live. All 5 rubbers played.",
    totalSets: 5,
    setsToWin: 3,
    hasDoubles: true,
    minPlayers: 5,
    sport: "Table Tennis",
    pointsToWin: 11,
    playAllSets: true,      // no dead rubbers
    femaleSlot: "P3",       // P3 must be female (plays rubber 3)
    noSubstitutes: true,    // exactly 5, no subs
    sets: [
      { setNumber: 1, type: "singles", label: "Singles P1 vs P2", home: ["P1"], away: ["P2"], isDecider: false },
      {
        setNumber: 2, type: "doubles", label: "Doubles — P2 + partner (Captain's Choice)",
        requiresSelection: true, homeAnchor: "P2", awayAnchor: "P1", partnerPool: ["P3", "P4", "P5"],
        options: [], home: ["P2", "P3"], away: ["P1", "P3"], isDecider: false,
      },
      { setNumber: 3, type: "singles", label: "Singles (Female) P3 vs P3", home: ["P3"], away: ["P3"], female: true, isDecider: false },
      {
        setNumber: 4, type: "doubles", label: "Doubles — P1 + partner (Captain's Choice)",
        requiresSelection: true, homeAnchor: "P1", awayAnchor: "P2", partnerPool: ["P3", "P4", "P5"],
        options: [], home: ["P1", "P3"], away: ["P2", "P3"], isDecider: false,
      },
      {
        setNumber: 5, type: "singles", label: "Singles — remaining player (Captain's Choice)",
        requiresSelection: true, homeAnchor: "P2", awayAnchor: "P1",
        homeEligible: ["P2", "P4", "P5"], awayEligible: ["P1", "P4", "P5"], eligibility: "notPlayedSingles",
        options: [], home: ["P2"], away: ["P1"], isDecider: true,
      },
    ],
  },
];

/**
 * Get a format by ID. Throws if not found.
 */
export function getTeamKnockoutFormat(formatId) {
  const format = TEAM_KNOCKOUT_FORMATS.find((f) => f.id === formatId);
  if (!format) throw new Error(`Unknown team knockout format: "${formatId}"`);
  return format;
}

/**
 * Get all available formats (for selector UI).
 */
export function getAllTeamKnockoutFormats() {
  return TEAM_KNOCKOUT_FORMATS;
}

/**
 * Get formats filtered by type.
 */
export function getFormatsByType(hasDoubles) {
  return TEAM_KNOCKOUT_FORMATS.filter((f) => f.hasDoubles === hasDoubles);
}

/**
 * Map old backend format string to new format ID.
 * For backward compatibility with existing tournaments.
 */
export function legacyFormatToId(formatString) {
  const map = {
    "Singles - 3 Sets": "singles_bo3",
    "Singles - 5 Sets": "singles_bo5",
    "Singles - 3 Sets (2 Players)": "singles_bo3",
    "Singles - 5 Sets (2 Players)": "singles_bo5",
    "Doubles - 3 Sets": "doubles_bo3",
    "Doubles - 5 Sets": "doubles_bo5",
    "Doubles - 3 Sets (2 Players)": "doubles_bo3",
    "Doubles - 5 Sets (2 Players)": "doubles_bo5",
  };
  return map[formatString] || "singles_bo3";
}

/**
 * Map format ID to backend format string.
 */
export function formatIdToLegacy(formatId) {
  const map = {
    singles_bo3: "Singles - 3 Sets",
    singles_bo5: "Singles - 5 Sets",
    singles_bo7: "Singles - 5 Sets",
    doubles_bo3: "Doubles - 3 Sets",
    doubles_bo5: "Doubles - 5 Sets",
    doubles_bo7: "Doubles - 5 Sets",
    singles_3p_bo3: "Singles - 3 Sets",
    singles_3p_bo5: "Singles - 5 Sets",
    doubles_3p_bo5: "Doubles - 5 Sets",
    doubles_3p_bo5_v2: "Doubles - 5 Sets",
    doubles_3p_bo7: "Doubles - 5 Sets",
  };
  return map[formatId] || "Singles - 3 Sets";
}

/**
 * Get formats filtered by minPlayers.
 */
export function getFormatsForTeamSize(playerCount) {
  return TEAM_KNOCKOUT_FORMATS.filter((f) => f.minPlayers <= playerCount);
}

/**
 * Resolve a set's players after captain makes doubles selection.
 *
 * @param {object} set — set definition from format
 * @param {string|null} selectionId — chosen option id (e.g. "bc_xy")
 * @returns {{ home: string[], away: string[], label: string }}
 */
export function resolveSetPlayers(set, selectionId = null) {
  if (!set.requiresSelection) {
    return { home: set.home, away: set.away, label: set.label };
  }

  if (selectionId) {
    const option = set.options.find((o) => o.id === selectionId);
    if (option) {
      return { home: option.home, away: option.away, label: option.label };
    }
  }

  // Fallback to defaults
  return { home: set.home, away: set.away, label: set.label };
}

/**
 * Map position letters to actual player names from team rosters.
 *
 * @param {string[]} positions — e.g. ["A", "B"]
 * @param {object} team — team object with playerPositions { A: "John", B: "Mike", C: "Sarah" }
 * @returns {string[]} — resolved player names
 */
export function resolvePlayerNames(positions, team) {
  const posMap = team?.playerPositions || {};
  return positions.map((pos) => {
    const player = posMap[pos];
    if (!player) return `Player ${pos}`;
    return typeof player === "string" ? player : player.name || player.userName || `Player ${pos}`;
  });
}

/**
 * Get all sets that require captain selection for a format.
 */
export function getSelectableSets(formatId) {
  const format = getTeamKnockoutFormat(formatId);
  return format.sets.filter((s) => s.requiresSelection);
}

/**
 * Check if a format supports 3-player teams.
 */
export function is3PlayerFormat(formatId) {
  const format = getTeamKnockoutFormat(formatId);
  return format.minPlayers >= 3;
}

export default TEAM_KNOCKOUT_FORMATS;
