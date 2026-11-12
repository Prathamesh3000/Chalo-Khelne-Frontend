import { describe, test, expect } from "vitest";
import {
  deriveTournamentStatus as status,
  statusMatchesTab,
  canMarkCompleted,
  STATUS_LABEL,
} from "./tournamentStatus";

// Local-time constructors so the tests don't depend on the machine's timezone.
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const t = (start, end, stages = ["registration"]) => ({
  startDate: start,
  endDate: end,
  sports: stages.map((s) => ({ currentStage: s })),
});

const NOW = at(2026, 11, 12, 10); // Thu 12 Nov 2026, 10:00 local

describe("deriveTournamentStatus — dates", () => {
  test("before the start day is upcoming", () => {
    expect(status(t("2026-11-13", "2026-11-14"), NOW)).toBe("upcoming");
  });

  test("the start day itself is live (inclusive)", () => {
    expect(status(t("2026-11-12", "2026-11-14"), NOW)).toBe("live");
  });

  test("between start and end is live", () => {
    expect(status(t("2026-11-10", "2026-11-14"), NOW)).toBe("live");
  });

  test("the LAST day is still live, all day — even late evening (was 'completed' from 05:30 IST)", () => {
    for (const hour of [0, 6, 12, 23]) {
      expect(status(t("2026-11-10", "2026-11-12"), at(2026, 11, 12, hour, hour === 23 ? 59 : 0))).toBe("live");
    }
  });

  test("the day after the end date is no longer live", () => {
    expect(status(t("2026-11-10", "2026-11-11", ["knockout"]), NOW)).not.toBe("live");
  });

  test("time of day never changes the answer", () => {
    const tour = t("2026-11-12", "2026-11-12");
    expect(status(tour, at(2026, 11, 12, 0, 1))).toBe("live");
    expect(status(tour, at(2026, 11, 12, 23, 59))).toBe("live");
  });

  test("no dates at all is upcoming", () => {
    expect(status({ sports: [{ currentStage: "registration" }] }, NOW)).toBe("upcoming");
  });

  test("a single known date is a one-day event (same as mobile)", () => {
    expect(status(t("2026-11-12", undefined), NOW)).toBe("live");
    expect(status(t(undefined, "2026-11-12"), NOW)).toBe("live");
    expect(status(t("2026-11-13", undefined), NOW)).toBe("upcoming");
  });

  test("ISO timestamps are read as their calendar day", () => {
    expect(status(t("2026-11-12T00:00:00.000Z", "2026-11-12T00:00:00.000Z"), NOW)).toBe("live");
  });
});

describe("deriveTournamentStatus — after the end date", () => {
  const past = ["2026-10-01", "2026-10-02"];

  test("all sports still in registration: it never ran -> ended", () => {
    expect(status(t(...past, ["registration"]), NOW)).toBe("ended");
    expect(status(t(...past, ["registration", "registration"]), NOW)).toBe("ended");
  });

  test("matches were generated but it was never closed -> needs wrap-up", () => {
    for (const stage of ["group_stage", "group_completed", "knockout"]) {
      expect(status(t(...past, [stage]), NOW)).toBe("needs_wrapup");
    }
  });

  test("any one sport that progressed is enough (multi-sport)", () => {
    expect(status(t(...past, ["registration", "knockout"]), NOW)).toBe("needs_wrapup");
  });

  test("no sport tracks at all and past -> ended", () => {
    expect(status({ startDate: past[0], endDate: past[1] }, NOW)).toBe("ended");
  });
});

describe("deriveTournamentStatus — completed", () => {
  test("every sport completed -> completed, whatever the dates", () => {
    expect(status(t("2026-10-01", "2026-10-02", ["completed"]), NOW)).toBe("completed");
    expect(status(t("2026-11-10", "2026-11-14", ["completed", "completed"]), NOW)).toBe("completed");
    expect(status(t("2026-12-01", "2026-12-02", ["completed"]), NOW)).toBe("completed");
  });

  test("one sport completed and another not is NOT completed", () => {
    expect(status(t("2026-10-01", "2026-10-02", ["completed", "group_stage"]), NOW)).toBe("needs_wrapup");
    expect(status(t("2026-11-10", "2026-11-14", ["completed", "registration"]), NOW)).toBe("live");
  });
});

describe("deriveTournamentStatus — passthrough", () => {
  test("an object that already carries a status keeps it (mock data)", () => {
    expect(status({ status: "Live" }, NOW)).toBe("live");
  });
});

describe("filter tabs", () => {
  test("All matches everything", () => {
    for (const s of ["live", "upcoming", "completed", "ended", "needs_wrapup"]) {
      expect(statusMatchesTab(s, "all")).toBe(true);
    }
  });

  test("Live and Upcoming are exact", () => {
    expect(statusMatchesTab("live", "live")).toBe(true);
    expect(statusMatchesTab("needs_wrapup", "live")).toBe(false);
    expect(statusMatchesTab("upcoming", "upcoming")).toBe(true);
    expect(statusMatchesTab("live", "upcoming")).toBe(false);
  });

  test("Completed includes tournaments that ended without running", () => {
    expect(statusMatchesTab("completed", "completed")).toBe(true);
    expect(statusMatchesTab("ended", "completed")).toBe(true);
    expect(statusMatchesTab("needs_wrapup", "completed")).toBe(false);
  });

  test("Needs wrap-up only matches needs_wrapup", () => {
    expect(statusMatchesTab("needs_wrapup", "needs_wrapup")).toBe(true);
    expect(statusMatchesTab("ended", "needs_wrapup")).toBe(false);
  });
});

describe("mark as completed", () => {
  test("offered once started and not done", () => {
    expect(canMarkCompleted("live")).toBe(true);
    expect(canMarkCompleted("needs_wrapup")).toBe(true);
    expect(canMarkCompleted("ended")).toBe(true);
  });

  test("not offered for upcoming or already completed", () => {
    expect(canMarkCompleted("upcoming")).toBe(false);
    expect(canMarkCompleted("completed")).toBe(false);
  });

  test("every status has a label", () => {
    for (const s of ["live", "upcoming", "completed", "ended", "needs_wrapup"]) {
      expect(STATUS_LABEL[s]).toBeTruthy();
    }
  });
});
