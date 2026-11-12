import { describe, test, expect } from "vitest";
import { supportsFollow } from "./followSupport";

describe("supportsFollow", () => {
  test("managers have no follow graph (server 404s for them)", () => {
    expect(supportsFollow({ role: "manager" })).toBe(false);
    expect(supportsFollow({ role: "Manager" })).toBe(false);
  });

  test("players and other User-collection roles do", () => {
    for (const role of ["player", "trainer", "referee", undefined, ""]) {
      expect(supportsFollow({ role })).toBe(true);
    }
  });

  test("missing user is treated as followable (caller guards on the id)", () => {
    expect(supportsFollow(null)).toBe(true);
    expect(supportsFollow(undefined)).toBe(true);
  });
});
