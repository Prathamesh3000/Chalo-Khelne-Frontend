import { describe, test, expect } from "vitest";
import {
  DEFAULT_DAILY_WINDOW,
  MAX_CATEGORY_TIME_SLOTS,
  defaultTimeSlot,
  nextTimeSlot,
  timeSlotError,
  usableTimeSlots,
} from "./categoryTimeSlots";

/**
 * Per-category time slots — the wizard half of the contract.
 *
 * `toTimeSlots` in server/controllers/tournamentController.js is authoritative
 * and pinned by the "per-category time slots" block in
 * server/tests/integration/tournamentCreate.test.js. These assertions mirror
 * it, because when the two disagree the manager sees slots that the save then
 * silently drops.
 */

describe("defaultTimeSlot", () => {
  test("adopts the tournament's daily window, so it pins nothing new", () => {
    expect(defaultTimeSlot({ startTime: "08:00", endTime: "20:00" })).toEqual({
      startTime: "08:00",
      endTime: "20:00",
    });
  });

  test("falls back to the step-3 default when there is no window yet", () => {
    expect(defaultTimeSlot(null)).toEqual(DEFAULT_DAILY_WINDOW);
    expect(defaultTimeSlot({})).toEqual(DEFAULT_DAILY_WINDOW);
  });
});

describe("timeSlotError", () => {
  test("accepts a well-formed slot", () => {
    expect(timeSlotError({ startTime: "09:00", endTime: "11:00" })).toBeNull();
  });

  test("a half-filled slot is not usable", () => {
    expect(timeSlotError({ startTime: "09:00" })).toMatch(/both a start and an end/);
    expect(timeSlotError({ endTime: "11:00" })).toMatch(/both a start and an end/);
    expect(timeSlotError(undefined)).toMatch(/both a start and an end/);
  });

  test("rejects a reversed or zero-length block — usually an AM/PM slip", () => {
    expect(timeSlotError({ startTime: "17:00", endTime: "15:00" })).toMatch(/after the start/);
    expect(timeSlotError({ startTime: "10:00", endTime: "10:00" })).toMatch(/after the start/);
  });

  test("rejects anything that isn't a real clock time", () => {
    expect(timeSlotError({ startTime: "25:00", endTime: "26:00" })).toMatch(/24-hour/);
    expect(timeSlotError({ startTime: "09:70", endTime: "11:00" })).toMatch(/24-hour/);
    expect(timeSlotError({ startTime: "half nine", endTime: "11:00" })).toMatch(/24-hour/);
  });

  // The server accepts an unpadded hour and pads it, so the wizard must agree.
  // Compared as text, "11:00" < "9:30" — a string compare calls this reversed.
  test("accepts an unpadded hour, like the server does", () => {
    expect(timeSlotError({ startTime: "9:30", endTime: "11:00" })).toBeNull();
  });
});

describe("nextTimeSlot — what the Add button appends", () => {
  test("the first slot is the daily window", () => {
    expect(nextTimeSlot([], { startTime: "08:00", endTime: "20:00" })).toEqual({
      startTime: "08:00",
      endTime: "20:00",
    });
  });

  test("continues from the last slot's end, reusing its length", () => {
    const slots = [{ startTime: "09:00", endTime: "11:00" }]; // 2 hours
    expect(nextTimeSlot(slots, DEFAULT_DAILY_WINDOW)).toEqual({
      startTime: "11:00",
      endTime: "13:00",
    });
  });

  test("clamps to 23:59 rather than running past midnight", () => {
    const slots = [{ startTime: "19:00", endTime: "23:00" }];
    expect(nextTimeSlot(slots, DEFAULT_DAILY_WINDOW)).toEqual({
      startTime: "23:00",
      endTime: "23:59",
    });
  });

  test("never produces a slot its own validator would reject", () => {
    const cases = [
      [],
      [{ startTime: "09:00", endTime: "11:00" }],
      [{ startTime: "23:30", endTime: "23:59" }], // no room left in the day
      [{ startTime: "", endTime: "" }],           // a row the manager blanked
      [{ startTime: "17:00", endTime: "15:00" }], // a row that is itself broken
    ];
    for (const slots of cases) {
      expect(timeSlotError(nextTimeSlot(slots, DEFAULT_DAILY_WINDOW))).toBeNull();
    }
  });
});

describe("usableTimeSlots — what gets submitted", () => {
  test("drops unusable rows and keeps the rest", () => {
    expect(usableTimeSlots([
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "17:00", endTime: "15:00" }, // reversed
      { startTime: "14:00" },                   // half-filled
      { startTime: "15:00", endTime: "16:00" },
    ])).toEqual([
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "15:00", endTime: "16:00" },
    ]);
  });

  test("sorts earliest first, so timeSlots[0] is when the category starts", () => {
    expect(usableTimeSlots([
      { startTime: "15:00", endTime: "17:00" },
      { startTime: "09:00", endTime: "11:00" },
    ])).toEqual([
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "15:00", endTime: "17:00" },
    ]);
  });

  test("de-duplicates — Add clicked twice shouldn't store the slot twice", () => {
    expect(usableTimeSlots([
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "09:00", endTime: "12:00" }, // same start, different end: kept
    ])).toEqual([
      { startTime: "09:00", endTime: "11:00" },
      { startTime: "09:00", endTime: "12:00" },
    ]);
  });

  test("caps at the server's limit, so nothing sent is silently truncated", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      startTime: `${String(i % 24).padStart(2, "0")}:00`,
      endTime: `${String(i % 24).padStart(2, "0")}:30`,
    }));
    expect(usableTimeSlots(many).length).toBeLessThanOrEqual(MAX_CATEGORY_TIME_SLOTS);
  });

  test("an empty or missing list stays empty — nothing is invented", () => {
    expect(usableTimeSlots([])).toEqual([]);
    expect(usableTimeSlots(undefined)).toEqual([]);
  });

  test("zero-pads, so a saved slot doesn't appear to change on the next load", () => {
    expect(usableTimeSlots([{ startTime: "9:30", endTime: "11:00" }])).toEqual([
      { startTime: "09:30", endTime: "11:00" },
    ]);
  });

  test("drops extra keys — only startTime and endTime are sent", () => {
    expect(usableTimeSlots([
      { startTime: "09:00", endTime: "11:00", _id: "abc", label: "morning" },
    ])).toEqual([{ startTime: "09:00", endTime: "11:00" }]);
  });
});
