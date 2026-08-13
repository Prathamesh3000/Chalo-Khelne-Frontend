/**
 * Frontend match result abstraction.
 * Mirrors server-side readMatchResult — normalizes match data for display.
 *
 * Usage:
 *   import { readMatchResult, getScoreDisplay, getResultLabels } from "../shared/utils/matchResultUtils";
 *   const result = readMatchResult(match);
 *   // result.type → "sets" | "time" | "innings" | "single"
 *   // result.player1Score, result.player2Score
 *   // result.labels → { round, score, result }
 */

// §6.1 — the sport→scoringType map and the label table used to be hardcoded
// HERE, and again in the mobile app, and again on the server; the three had
// drifted. They now come from the server via shared/utils/scoringConfig.js.
// Re-inlining either table here is how §6.1 comes back.
import { getScoringType, getLabelsFor } from "./scoringConfig";

export { getScoringType };

const KNOWN_SCORING_TYPES = ["sets", "time", "innings", "board", "single"];


/**
 * Normalize the winner from any match schema — mirrors the server's
 * utils/matchUtils.js#getWinner, which handles five different shapes:
 *
 *   Match, DirectKnockoutMatch → result.winner.playerId
 *   SuperMatch, KnockoutMatch  → winner.playerId
 *   TeamKnockoutMatch          → winnerId (bare ObjectId, no name)
 *   legacy semifinal           → winner as a plain team-name String
 *
 * Returns null when the match genuinely has no winner yet.
 */
export function resolveWinner(match) {
  if (!match) return null;

  if (match.result?.winner?.playerId) {
    return {
      playerId: match.result.winner.playerId,
      playerName: match.result.winner.playerName || null,
    };
  }
  // Some payloads carry result.winner as an object without playerId.
  if (match.result?.winner && typeof match.result.winner === "object") {
    return match.result.winner;
  }

  if (match.winner?.playerId) {
    return {
      playerId: match.winner.playerId,
      playerName: match.winner.playerName || null,
    };
  }

  // TeamKnockoutMatch — a bare ObjectId ref to the winning TEAM.
  if (match.winnerId) {
    return {
      playerId: match.winnerId,
      playerName: match.winnerTeamName || match.winnerName || null,
      isTeam: true,
    };
  }

  // Legacy semifinal schema — winner is the team name itself.
  if (typeof match.winner === "string" && match.winner) {
    return { playerId: null, playerName: match.winner, isTeam: true };
  }

  return null;
}

/**
 * Read normalized match result.
 * @param {Object} match — match object from API
 * @param {Object} [opts] — { tournament, sportName }
 * @returns {{ type, player1Score, player2Score, completed, winner, labels }}
 */
export function readMatchResult(match, opts = {}) {
  if (!match) return null;

  // FAST PATH: use pre-computed matchResult if available
  if (match.matchResult && match.matchResult.type) {
    return {
      ...match.matchResult,
      labels: getLabelsFor(match.matchResult.type),
    };
  }

  // Also check _normalizedResult (from socket events)
  if (match._normalizedResult && match._normalizedResult.type) {
    return {
      ...match._normalizedResult,
      labels: getLabelsFor(match._normalizedResult.type),
    };
  }

  // LEGACY PATH: extract from old schema fields.
  // STEP 13: prefer denormalized `match.sportName` (populated by
  // MatchFactory._stamp); legacy `sportsType`/`sport` retained for
  // matches created before STEP 9a stamping landed.
  const scoringType = match.matchFormat?.scoringType
    || getScoringType(match.sportName || match.sportsType || match.sport || opts.sportName)
    || "sets";

  const completed = (match.status || "").toUpperCase() === "COMPLETED";

  let p1Score = 0, p2Score = 0;

  if (match.result?.finalScore) {
    p1Score = match.result.finalScore.player1Sets || 0;
    p2Score = match.result.finalScore.player2Sets || 0;
  } else if (match.score) {
    p1Score = match.score.player1Sets || 0;
    p2Score = match.score.player2Sets || 0;
  } else if (match.setsWon) {
    p1Score = match.setsWon.home || 0;
    p2Score = match.setsWon.away || 0;
  }

  // §6.2 — resolve the winner from every shape the server can store.
  //
  // Five match schemas record the winner differently, and the server's
  // getWinner (utils/matchUtils.js) handles all five. This handled two, so a
  // completed TeamKnockoutMatch — which carries `winnerId` as a bare ObjectId
  // and neither `result.winner` nor `winner` — fell through to null and the UI
  // showed no winner at all for a finished team tie. That is the Davis Cup
  // format the corporate and corporate-league tournaments are built on.
  const winner = resolveWinner(match);

  return {
    type: scoringType,
    completed,
    player1Score: p1Score,
    player2Score: p2Score,
    winner,
    labels: getLabelsFor(scoringType),
  };
}

/**
 * Get display string for match score.
 */
export function getScoreDisplay(match, opts = {}) {
  const r = readMatchResult(match, opts);
  if (!r) return "-";
  return `${r.player1Score}-${r.player2Score}`;
}

/**
 * Get labels for a sport/scoringType.
 */
export function getResultLabels(scoringTypeOrSportName) {
  // Accepts either a scoring type ("board") or a sport name ("Carrom").
  const asType = getLabelsFor(scoringTypeOrSportName);
  const isKnownType = KNOWN_SCORING_TYPES.includes(scoringTypeOrSportName);
  if (isKnownType) return asType;

  // Not a type — treat it as a sport name. An unknown sport falls back to the
  // neutral "single" rendering, never to "sets" (§6.1: that fallback is what
  // labelled a Foosball match with racquet headings).
  return getLabelsFor(getScoringType(scoringTypeOrSportName));
}
