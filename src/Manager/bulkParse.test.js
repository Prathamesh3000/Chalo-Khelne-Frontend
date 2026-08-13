import { describe, test, expect } from "vitest";
import {
  normalizeName,
  splitPair,
  pairLabel,
  isDoublesCategory,
  parsePastedLines,
  parseConsolidatedWorkbook,
} from "./bulkParse";

// bulkParse feeds /api/tournaments/bookings/bulk-create, which creates a real
// registration per entry and (for doubles) one bracket entrant per pair. A
// parsing slip here becomes a wrong or duplicated registration, so the edge
// cases below are the ones real client spreadsheets actually contain.

describe("normalizeName", () => {
  test("collapses whitespace and trims", () => {
    expect(normalizeName("  Rahul   Sharma \n")).toBe("Rahul Sharma");
  });

  test("flips a single 'Last, First' into 'First Last'", () => {
    expect(normalizeName("Sharma, Rahul")).toBe("Rahul Sharma");
  });

  test("leaves a name with two commas alone", () => {
    expect(normalizeName("Sharma, Rahul, Jr")).toBe("Sharma, Rahul, Jr");
  });

  test("handles null and empty input", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName("   ")).toBe("");
  });
});

describe("splitPair", () => {
  test.each([
    ["Rahul & Amit", ["Rahul", "Amit"]],
    ["Rahul and Amit", ["Rahul", "Amit"]],
    ["Rahul/Amit", ["Rahul", "Amit"]],
    ["Rahul  &  Amit", ["Rahul", "Amit"]],
  ])("splits %s", (input, expected) => {
    expect(splitPair(input)).toEqual(expected);
  });

  test("a lone name yields an empty partner", () => {
    expect(splitPair("Rahul")).toEqual(["Rahul", ""]);
  });

  test("empty input yields two blanks", () => {
    expect(splitPair("")).toEqual(["", ""]);
  });
});

describe("pairLabel", () => {
  test("joins two names with an ampersand", () => {
    expect(pairLabel("Rahul", "Amit")).toBe("Rahul & Amit");
  });

  test("drops an empty partner", () => {
    expect(pairLabel("Rahul", "")).toBe("Rahul");
  });
});

describe("isDoublesCategory", () => {
  test("uses the explicit category format first", () => {
    expect(isDoublesCategory({ name: "Open", knockoutFormat: "Doubles" }, null)).toBe(true);
    expect(isDoublesCategory({ name: "Mixed Doubles", knockoutFormat: "Singles" }, null)).toBe(false);
  });

  test("falls back to the sport track's format", () => {
    expect(isDoublesCategory({ name: "Open" }, { knockoutFormat: "Doubles" })).toBe(true);
  });

  test("falls back to a name heuristic when no format is set", () => {
    expect(isDoublesCategory({ name: "Men's Doubles" }, null)).toBe(true);
    expect(isDoublesCategory({ name: "Mixed" }, null)).toBe(true);
    expect(isDoublesCategory({ name: "Doubles Pair" }, null)).toBe(true);
    expect(isDoublesCategory({ name: "Open Singles" }, null)).toBe(false);
  });
});

describe("parsePastedLines — singles", () => {
  test("one registrant per line, carrying sport and category", () => {
    const out = parsePastedLines("Rahul\nAmit\nPriya", { category: "Open", sport: "Badminton" });
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ name: "Rahul", category: "Open", sport: "Badminton", seed: null });
    expect(out.map((p) => p.name)).toEqual(["Rahul", "Amit", "Priya"]);
  });

  test("blank lines are ignored", () => {
    expect(parsePastedLines("Rahul\n\n  \nAmit", {})).toHaveLength(2);
  });

  test("duplicate lines are dropped case-insensitively", () => {
    const out = parsePastedLines("Rahul\nrahul\nRAHUL", {});
    expect(out).toHaveLength(1);
  });

  test("seedFromOrder numbers entrants from 1 in paste order", () => {
    const out = parsePastedLines("A\nB\nC", { seedFromOrder: true });
    expect(out.map((p) => p.seed)).toEqual([1, 2, 3]);
  });

  test("without seedFromOrder every seed is null but order is preserved", () => {
    const out = parsePastedLines("A\nB", {});
    expect(out.map((p) => p.seed)).toEqual([null, null]);
    expect(out.map((p) => p.name)).toEqual(["A", "B"]);
  });
});

describe("parsePastedLines — doubles", () => {
  test("a pair becomes ONE registrant labelled 'A & B'", () => {
    const out = parsePastedLines("Rahul & Amit\nPriya/Neha", { doubles: true, category: "Mixed Doubles" });
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe("Rahul & Amit");
    expect(out[1].name).toBe("Priya & Neha");
  });

  test("a doubles line with only one name registers that name alone", () => {
    const out = parsePastedLines("Rahul", { doubles: true });
    expect(out[0].name).toBe("Rahul");
  });
});

// ── Suspected defects ───────────────────────────────────────────────────────
// Written to find out definitively rather than to assert current behaviour.

describe("doubles — pair identity", () => {
  test("the same pair entered in reversed order is treated as one entrant", () => {
    const out = parsePastedLines("Rahul & Amit\nAmit & Rahul", { doubles: true });
    // Both lines name the SAME two people, so this is one pair, not two.
    expect(out).toHaveLength(1);
  });
});

describe("comma handling is consistent between singles and doubles", () => {
  test("'Sharma, Rahul' is one person in a doubles category too", () => {
    const singles = parsePastedLines("Sharma, Rahul", { doubles: false });
    const doubles = parsePastedLines("Sharma, Rahul", { doubles: true });
    expect(singles[0].name).toBe("Rahul Sharma");
    // The same text must not become a two-person pair just because the
    // category is doubles.
    expect(doubles[0].name).toBe("Rahul Sharma");
  });

  test("a genuine comma-separated pair still splits", () => {
    const out = parsePastedLines("Rahul Sharma, Amit Patel", { doubles: true });
    expect(out[0].name).toBe("Rahul Sharma & Amit Patel");
  });
});

// ── Consolidated workbook importer ──────────────────────────────────────────

const SPORTS = [
  { sportName: "Badminton", categories: [{ name: "Men's Singles" }, { name: "Men's Doubles" }] },
  { sportName: "Chess", categories: [{ name: "Open" }] },
];

describe("parseConsolidatedWorkbook", () => {
  test("one group per category column, with entries read downward", () => {
    const sheets = [{
      name: "Badminton",
      rows: [
        ["Men's Singles", "Men's Doubles"],
        ["Rahul", "Priya & Neha"],
        ["Amit", "Kiran & Sana"],
      ],
    }];
    const { groups } = parseConsolidatedWorkbook(sheets, { sports: SPORTS });

    expect(groups).toHaveLength(2);
    const singles = groups.find((g) => g.header === "Men's Singles");
    expect(singles.sportGuess).toBe("Badminton");
    expect(singles.categoryGuess).toBe("Men's Singles");
    expect(singles.isDoubles).toBe(false);
    expect(singles.entries).toEqual(["Rahul", "Amit"]);

    const dbl = groups.find((g) => g.header === "Men's Doubles");
    expect(dbl.isDoubles).toBe(true);
    expect(dbl.entries).toEqual(["Priya & Neha", "Kiran & Sana"]);
  });

  test("two-column doubles (partner in an unheaded next column) is paired up", () => {
    const sheets = [{
      name: "Badminton",
      rows: [
        ["Men's Doubles", ""],
        ["Priya", "Neha"],
        ["Kiran", "Sana"],
      ],
    }];
    const { groups } = parseConsolidatedWorkbook(sheets, { sports: SPORTS });

    expect(groups).toHaveLength(1);
    expect(groups[0].isDoubles).toBe(true);
    expect(groups[0].entries).toEqual(["Priya & Neha", "Kiran & Sana"]);
  });

  test("a single-category sport falls back to its only category", () => {
    const sheets = [{ name: "Chess", rows: [["Name"], ["Rahul"], ["Amit"]] }];
    const { groups } = parseConsolidatedWorkbook(sheets, { sports: SPORTS });

    expect(groups).toHaveLength(1);
    expect(groups[0].sportGuess).toBe("Chess");
    expect(groups[0].categoryGuess).toBe("Open");
  });

  test("ad-hoc 'Extra Players' sheets are skipped with a reason, not imported", () => {
    const sheets = [{ name: "Extra Players", rows: [["Whatever"], ["Someone"]] }];
    const { groups, skipped } = parseConsolidatedWorkbook(sheets, { sports: SPORTS });

    expect(groups).toHaveLength(0);
    expect(skipped[0].sheet).toBe("Extra Players");
  });

  test("sheets with no data rows are skipped", () => {
    const { groups, skipped } = parseConsolidatedWorkbook(
      [{ name: "Empty", rows: [["Men's Singles"]] }],
      { sports: SPORTS }
    );
    expect(groups).toHaveLength(0);
    expect(skipped[0].reason).toMatch(/no data rows/i);
  });

  test("duplicate names within a column are dropped", () => {
    const sheets = [{
      name: "Badminton",
      rows: [["Men's Singles"], ["Rahul"], ["rahul"], ["Amit"]],
    }];
    const { groups } = parseConsolidatedWorkbook(sheets, { sports: SPORTS });
    expect(groups[0].entries).toEqual(["Rahul", "Amit"]);
  });

  test("a stray repeat of the header inside the column is ignored", () => {
    const sheets = [{
      name: "Badminton",
      rows: [["Men's Singles"], ["Men's Singles"], ["Rahul"]],
    }];
    const { groups } = parseConsolidatedWorkbook(sheets, { sports: SPORTS });
    expect(groups[0].entries).toEqual(["Rahul"]);
  });

  test("an unmatched sheet name still parses, leaving the sport unguessed", () => {
    const sheets = [{ name: "Sheet1", rows: [["Men's Singles"], ["Rahul"]] }];
    const { groups } = parseConsolidatedWorkbook(sheets, { sports: SPORTS });
    expect(groups).toHaveLength(1);
    expect(groups[0].sportGuess).toBe("");
    expect(groups[0].entries).toEqual(["Rahul"]);
  });
});
