// Per-category time slots.
//
// A category plays in one or more blocks on its day — "U14 group stage
// 09:00-11:00, U14 finals 15:00-17:00" — so a category carries a LIST of
// slots, not one window like the tournament-wide `selectedTime`.
//
// These helpers live in their own module because both MCreateTournament (the
// step-2 validator and the submit payload) and SportCard (the editor) need
// them. Keeping one copy means the inline error the manager sees and the rows
// that actually get sent can't disagree. `toTimeSlots` in
// server/controllers/tournamentController.js is the matching gate server-side.

// Mirrors the step-3 "Daily schedule" default, so a category created before
// the manager touches that field starts from the same window they'll see there.
export const DEFAULT_DAILY_WINDOW = { startTime: "10:00", endTime: "18:00" };

// Matches MAX_CATEGORY_TIME_SLOTS in the controller — past this the server
// truncates, so the button stops adding rows that would be silently dropped.
export const MAX_CATEGORY_TIME_SLOTS = 12;

const LAST_MINUTE = 24 * 60 - 1; // 23:59

// Hours and minutes are range-checked separately: a single total-minutes
// check lets "09:70" through as 10:10, which the server's toTimeOrNull then
// rejects — the manager would see a valid-looking slot that never saved.
function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function toHHmm(mins) {
  const v = Math.max(0, Math.min(LAST_MINUTE, mins));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

/**
 * The slot a new category starts with: the tournament's whole daily window.
 * The manager always has a row to edit rather than an empty list, and because
 * it equals the daily window it pins nothing they haven't already said.
 */
export function defaultTimeSlot(dailyWindow) {
  return {
    startTime: dailyWindow?.startTime || DEFAULT_DAILY_WINDOW.startTime,
    endTime: dailyWindow?.endTime || DEFAULT_DAILY_WINDOW.endTime,
  };
}

/**
 * The slot "+ Add time slot" appends: it starts where the last one ended and
 * runs for the same length, so adding a second two-hour session gives another
 * two-hour session instead of an arbitrary default.
 *
 * Falls back to the daily window when there is no usable previous slot, and
 * never returns a slot running past midnight or one `timeSlotError` would
 * reject — the Add button should not be able to create a broken row.
 */
export function nextTimeSlot(slots, dailyWindow) {
  const last = (slots || [])[(slots || []).length - 1];
  const start = toMinutes(last?.endTime);
  const prevStart = toMinutes(last?.startTime);
  if (start === null || start >= LAST_MINUTE) return defaultTimeSlot(dailyWindow);
  const span = prevStart !== null && start > prevStart ? start - prevStart : 60;
  return { startTime: toHHmm(start), endTime: toHHmm(Math.min(start + span, LAST_MINUTE)) };
}

/**
 * Why a slot is unusable, or null when it is fine. A zero- or negative-length
 * block is a typo, not a schedule — most often an AM/PM slip.
 */
export function timeSlotError(slot) {
  if (!slot?.startTime || !slot?.endTime) return "Set both a start and an end time";
  const start = toMinutes(slot.startTime);
  const end = toMinutes(slot.endTime);
  if (start === null || end === null) return "Use a 24-hour time like 09:30";
  // Compared as minutes, not strings: "9:30" sorts after "11:00" as text, so a
  // string compare would call a perfectly good morning slot reversed.
  if (end <= start) return "End time must be after the start time";
  return null;
}

/**
 * The slots worth sending: well-formed, zero-padded, in order, no duplicates.
 *
 * Padding happens here as well as on the server so that what comes back on the
 * next edit-load is identical to what was sent — otherwise a hand-typed "9:30"
 * would appear to change by itself on save.
 */
export function usableTimeSlots(slots) {
  const seen = new Set();
  return (slots || [])
    .filter((s) => !timeSlotError(s))
    .map((s) => ({
      startTime: toHHmm(toMinutes(s.startTime)),
      endTime: toHHmm(toMinutes(s.endTime)),
    }))
    .filter((s) => {
      const key = `${s.startTime}-${s.endTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, MAX_CATEGORY_TIME_SLOTS);
}
