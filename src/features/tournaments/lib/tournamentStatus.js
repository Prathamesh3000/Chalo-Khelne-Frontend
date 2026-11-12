/**
 * The one definition of a tournament's status, shared by the dashboard, the
 * tournaments list and the card.
 *
 *   completed     every sport track has reached the `completed` stage
 *   live          today is within [start, end] (both days inclusive)
 *   upcoming      today is before the start day
 *   needs_wrapup  the end date has passed but matches were generated and the
 *                 tournament was never closed (stage is group_stage /
 *                 group_completed / knockout) — the manager should finish it
 *   ended         the end date has passed and every sport is still in
 *                 registration, i.e. it never ran
 *
 * Whole local days, end date inclusive — the same rule as the mobile app
 * (client/src/screens/player/Event.js). Dates are calendar days ("YYYY-MM-DD"),
 * so they are read as local days, NOT as midnight UTC: parsing "2026-11-12" with
 * `new Date()` is 00:00 UTC, which flipped a tournament to "completed" in the
 * morning of its last day.
 *
 * The old rule looked at dates only and never at the sport stages, so every
 * finished or abandoned tournament read "Completed" and nothing was ever "Live"
 * unless today fell inside its dates.
 */

export const STATUS_LABEL = {
  live: "Live",
  upcoming: "Open",
  completed: "Completed",
  ended: "Ended",
  needs_wrapup: "Needs wrap-up",
};

// Stages that mean "matches were generated / play began".
const PROGRESSED_STAGES = new Set(["group_stage", "group_completed", "knockout"]);

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Calendar day of a "YYYY-MM-DD…" string or a Date, as a local midnight Date. */
function parseDay(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfDay(value);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export function deriveTournamentStatus(t, now = new Date()) {
  // Pre-shaped objects (mock data) already carry a status.
  if (t?.status) return String(t.status).toLowerCase();

  const stages = (Array.isArray(t?.sports) ? t.sports : []).map(
    (s) => s?.currentStage || "registration"
  );
  if (stages.length > 0 && stages.every((s) => s === "completed")) return "completed";

  let start = parseDay(t?.startDate);
  let end = parseDay(t?.endDate);
  if (!start && !end) return "upcoming";
  if (!start) start = end; // a single known date is a one-day event,
  if (!end) end = start; // as on mobile

  const today = startOfDay(now);
  if (today < start) return "upcoming";
  if (today <= end) return "live";
  return stages.some((s) => PROGRESSED_STAGES.has(s)) ? "needs_wrapup" : "ended";
}

/** Does a tournament with `status` belong under the filter tab `tab`? */
export function statusMatchesTab(status, tab) {
  switch (tab) {
    case "all":
      return true;
    case "live":
      return status === "live";
    case "upcoming":
      return status === "upcoming";
    case "completed": // finished, or it never ran — both are "done"
      return status === "completed" || status === "ended";
    case "needs_wrapup":
      return status === "needs_wrapup";
    default:
      return status === tab;
  }
}

/** "Mark as completed" is offered once a tournament has started and isn't done. */
export function canMarkCompleted(status) {
  return status === "live" || status === "needs_wrapup" || status === "ended";
}
