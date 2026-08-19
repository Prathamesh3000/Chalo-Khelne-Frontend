import { describe, test, expect } from "vitest";
import {
  getCategory,
  getGroupStageFormat,
  getKnockoutFormat,
  getQualifyPerGroup,
  getDrawSize,
  getTournamentType,
  getFormatScope,
  isDoublesCategory,
} from "./sportTrack";

/**
 * Per-category format resolution — the web mirror must agree with the server.
 *
 * server/utils/sportTrackUtils.js is authoritative and locked down by
 * server/tests/unit/categoryMatchFormat.test.js. These assertions mirror that
 * suite, because the manager screens read THIS file: when the two disagree, the
 * standings table shows a qualify cutoff the server will not apply, which is
 * how "Top 2 will qualify" ended up on screen for a category that advances 3.
 */

const TABLE_TENNIS = "69b7ce0cf50e303a19ed6110";
const BADMINTON = "69b7ce0cf50e303a19ed610d";

// The configuration a manager produces with the wizard's per-category mode.
const tournament = {
  sports: [
    {
      sportId: TABLE_TENNIS,
      sportName: "Table Tennis",
      formatScope: "category",
      type: "knockout + group stage",
      groupStageFormat: "Singles",
      knockoutFormat: "Singles",
      qualifyPerGroup: 2,
      drawSize: 16,
      categories: [
        {
          name: "Men's Doubles",
          groupStageFormat: "Singles",
          knockoutFormat: "Doubles",
          qualifyPerGroup: 3,
        },
        {
          name: "Women's Singles",
          type: "knockout",
          groupStageFormat: "Doubles",
          knockoutFormat: "Singles",
          qualifyPerGroup: 2,
          drawSize: 32,
        },
        { name: "Under 19" }, // inherits everything
      ],
    },
    // A track using the combined value, which cannot say which format a given
    // category is — resolution falls back to the category name.
    {
      sportId: BADMINTON,
      sportName: "Badminton",
      groupStageFormat: "Singles, Doubles",
      knockoutFormat: "Singles",
      categories: [{ name: "Men's Singles" }, { name: "Men's Doubles" }],
    },
  ],
};

describe("qualifyPerGroup resolves per category", () => {
  test("the category value wins over the track", () => {
    expect(getQualifyPerGroup(tournament, TABLE_TENNIS, "Men's Doubles")).toBe(3);
  });

  test("a category without one inherits the track", () => {
    expect(getQualifyPerGroup(tournament, TABLE_TENNIS, "Under 19")).toBe(2);
  });

  test("omitting the category keeps the old track-only behaviour", () => {
    expect(getQualifyPerGroup(tournament, TABLE_TENNIS)).toBe(2);
  });

  test("defaults to 2 when neither level sets one", () => {
    expect(getQualifyPerGroup({ sports: [{ sportId: TABLE_TENNIS }] }, TABLE_TENNIS)).toBe(2);
  });
});

describe("formats resolve per category", () => {
  test("Men's Doubles — singles group stage, doubles knockout", () => {
    expect(getGroupStageFormat(tournament, TABLE_TENNIS, "Men's Doubles")).toBe("Singles");
    expect(getKnockoutFormat(tournament, TABLE_TENNIS, "Men's Doubles")).toBe("Doubles");
  });

  test("Women's Singles — doubles group stage, singles knockout", () => {
    expect(getGroupStageFormat(tournament, TABLE_TENNIS, "Women's Singles")).toBe("Doubles");
    expect(getKnockoutFormat(tournament, TABLE_TENNIS, "Women's Singles")).toBe("Singles");
  });

  test("a category with no override inherits the track", () => {
    expect(getGroupStageFormat(tournament, TABLE_TENNIS, "Under 19")).toBe("Singles");
  });

  test('the combined "Singles, Doubles" track resolves from the category name', () => {
    expect(getGroupStageFormat(tournament, BADMINTON, "Men's Singles")).toBe("Singles");
    expect(getGroupStageFormat(tournament, BADMINTON, "Men's Doubles")).toBe("Doubles");
  });

  test("the combined value is never returned — callers compare one format", () => {
    expect(getGroupStageFormat(tournament, BADMINTON, "Men's Doubles")).not.toBe("Singles, Doubles");
  });
});

describe("type resolves per category", () => {
  test("a category can run a different stage set than its track", () => {
    expect(getTournamentType(tournament, TABLE_TENNIS, "Women's Singles")).toBe("knockout");
    expect(getTournamentType(tournament, TABLE_TENNIS, "Men's Doubles")).toBe("knockout + group stage");
  });

  test("without a category the track value applies", () => {
    expect(getTournamentType(tournament, TABLE_TENNIS)).toBe("knockout + group stage");
  });
});

describe("drawSize resolves per category", () => {
  test("category wins, then track, then null", () => {
    expect(getDrawSize(tournament, TABLE_TENNIS, "Women's Singles")).toBe(32);
    expect(getDrawSize(tournament, TABLE_TENNIS, "Men's Doubles")).toBe(16);
    expect(getDrawSize({ sports: [{ sportId: TABLE_TENNIS }] }, TABLE_TENNIS)).toBeNull();
  });
});

describe("getCategory lookup", () => {
  test("matching ignores casing and surrounding whitespace", () => {
    // BookingGroup.category is a free string, so casing will not always match.
    expect(getCategory(tournament, TABLE_TENNIS, "  men's doubles ")?.name).toBe("Men's Doubles");
  });

  test("an unknown category resolves to null and falls back to the track", () => {
    expect(getCategory(tournament, TABLE_TENNIS, "No Such Category")).toBeNull();
    expect(getQualifyPerGroup(tournament, TABLE_TENNIS, "No Such Category")).toBe(2);
  });
});

describe("isDoublesCategory — drives the partner requirement", () => {
  test("true when doubles in either stage", () => {
    // Men's Doubles plays a SINGLES group stage but a doubles knockout, so the
    // pair must still be registered together up front.
    expect(isDoublesCategory(tournament, TABLE_TENNIS, "Men's Doubles")).toBe(true);
    expect(isDoublesCategory(tournament, TABLE_TENNIS, "Women's Singles")).toBe(true);
  });

  test("false for a category that is singles in both stages", () => {
    expect(isDoublesCategory(tournament, TABLE_TENNIS, "Under 19")).toBe(false);
    expect(isDoublesCategory(tournament, BADMINTON, "Men's Singles")).toBe(false);
  });
});

describe("getFormatScope", () => {
  test('reports the authoring mode, defaulting to "sport"', () => {
    expect(getFormatScope(tournament, TABLE_TENNIS)).toBe("category");
    expect(getFormatScope(tournament, BADMINTON)).toBe("sport");
  });
});

describe("missing data does not throw", () => {
  test.each([
    ["null tournament", null],
    ["no sports", { sports: [] }],
    ["undefined", undefined],
  ])("%s resolves to null / default", (_label, input) => {
    expect(getGroupStageFormat(input, TABLE_TENNIS, "Men's Doubles")).toBeNull();
    expect(getQualifyPerGroup(input, TABLE_TENNIS, "Men's Doubles")).toBe(2);
    expect(isDoublesCategory(input, TABLE_TENNIS, "Men's Doubles")).toBe(false);
  });

  test("an unknown sportId falls back to the first track", () => {
    // getSportTrack's documented behaviour — kept so a stale sportId does not
    // blank the screen.
    expect(getGroupStageFormat(tournament, "f".repeat(24), "Under 19")).toBe("Singles");
  });
});
