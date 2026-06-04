import {
  getTournamentType,
  getKnockoutFormat,
} from "../../../utils/sportTrack";

/**
 * Where "Manage tournament" should land in the V1 flow.
 *
 * Mirrors the branch logic that already lives in MTournamentsList.openTournament
 * (line ~178) so card → manage and list → manage always agree. Centralising it
 * here means one place to evolve when V1 routes change, and zero risk of new
 * surfaces drifting to /tournaments/<id> (V2) by accident.
 *
 * Returns:
 *   - "/tournament-management/group-stage?tournamentId=..."   for group stage
 *   - "/tournament-management/team-knockouts?tournamentId=..." for team / Davis Cup
 *   - "/tournament-management/direct-knockout?tournamentId=..." for singles knockout
 *   - "/tournament-management/group-stage?tournamentId=..." (group stage first)
 *     for combined "group stage + knockout"
 *   - falls back to the same group-stage URL so we never end up on a V2 route.
 */
export function resolveManageUrl(tournament) {
  if (!tournament?._id) return "/mtournament-management";
  const id = tournament._id;
  const type = (getTournamentType(tournament) || "").toLowerCase();

  if (type.includes("group stage")) {
    return `/tournament-management/group-stage?tournamentId=${id}`;
  }
  if (type.includes("knockout")) {
    const kf = (getKnockoutFormat(tournament) || "").toLowerCase();
    if (kf.includes("team") || kf.includes("davis")) {
      return `/tournament-management/team-knockouts?tournamentId=${id}`;
    }
    return `/tournament-management/direct-knockout?tournamentId=${id}`;
  }
  // Unknown / legacy doc with no sports[] type — group-stage page handles
  // the "no setup yet" empty state gracefully.
  return `/tournament-management/group-stage?tournamentId=${id}`;
}

export default resolveManageUrl;
