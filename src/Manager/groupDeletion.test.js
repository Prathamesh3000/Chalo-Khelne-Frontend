import { describe, test, expect } from "vitest";
import { describeGroupDeletion, groupDeletionLines } from "./groupDeletion";

const group = (n = 4, name = "Group B") => ({
  groupName: name,
  players: Array.from({ length: n }, (_, i) => ({ _id: `p${i}` })),
});
const match = (status) => ({ status });

describe("describeGroupDeletion", () => {
  test("counts players, matches and completed matches", () => {
    const d = describeGroupDeletion({
      group: group(5),
      matches: [match("COMPLETED"), match("completed"), match("SCHEDULED"), match("IN_PROGRESS")],
    });
    expect(d).toMatchObject({
      name: "Group B",
      playerCount: 5,
      matchCount: 4,
      completedCount: 2,
      hasResults: true,
    });
  });

  test("status matching is case-insensitive (the API mixes COMPLETED / completed)", () => {
    expect(describeGroupDeletion({ group: group(), matches: [match("Completed")] }).completedCount).toBe(1);
  });

  test("no matches: zero counts, no results", () => {
    const d = describeGroupDeletion({ group: group(3), matches: [] });
    expect(d).toMatchObject({ matchCount: 0, completedCount: 0, hasResults: false });
  });

  test("tolerates missing group / matches", () => {
    const d = describeGroupDeletion({ group: undefined, matches: undefined });
    expect(d).toEqual({ name: "this group", playerCount: 0, matchCount: 0, completedCount: 0, hasResults: false });
  });
});

describe("groupDeletionLines", () => {
  test("warns when completed results will be lost", () => {
    const lines = groupDeletionLines(
      describeGroupDeletion({ group: group(5), matches: [match("COMPLETED"), match("SCHEDULED")] })
    );
    expect(lines[0].tone).toBe("warn");
    expect(lines[0].text).toBe("2 matches will be deleted, including 1 completed match with recorded scores.");
  });

  test("unplayed matches are not a warning", () => {
    const lines = groupDeletionLines(describeGroupDeletion({ group: group(2), matches: [match("SCHEDULED")] }));
    expect(lines[0]).toEqual({ text: "1 match will be deleted (none have been played).", tone: "info" });
  });

  test("no matches says so, and still mentions the players", () => {
    const lines = groupDeletionLines(describeGroupDeletion({ group: group(1), matches: [] }));
    expect(lines[0].text).toBe("No matches have been generated for this group yet.");
    expect(lines[1].text).toMatch(/^1 player will be removed/);
  });

  test("singular / plural wording", () => {
    const one = groupDeletionLines(describeGroupDeletion({ group: group(1), matches: [match("COMPLETED")] }));
    expect(one[0].text).toBe("1 match will be deleted, including 1 completed match with recorded scores.");
    const many = groupDeletionLines(describeGroupDeletion({ group: group(3), matches: [] }));
    expect(many[1].text).toMatch(/^3 players will be removed/);
  });

  test("an empty group does not mention players", () => {
    const lines = groupDeletionLines(describeGroupDeletion({ group: group(0), matches: [] }));
    expect(lines).toHaveLength(1);
  });
});
