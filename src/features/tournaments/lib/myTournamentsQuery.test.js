import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../../../shared/api", () => ({
  api: { get: vi.fn() },
  USE_MOCK: false,
}));

import { api } from "../../../shared/api";
import { listTournaments } from "../api/tournaments";
import { myTournamentsQuery } from "./myTournamentsQuery";

/**
 * "My tournaments" must come from the manager-scoped endpoint. The dashboard
 * used to call the public listing instead and showed other clubs' events with a
 * page-size "20" as the count — these tests pin the rule.
 */
describe("myTournamentsQuery", () => {
  test("scopes to the manager when the user has _id", () => {
    const q = myTournamentsQuery({ _id: "mgr1", id: "mgr1" });
    expect(q.filters).toEqual({ managerId: "mgr1" });
    expect(q.enabled).toBe(true);
  });

  test("falls back to user.id when _id is absent", () => {
    const q = myTournamentsQuery({ id: "mgr2" });
    expect(q.filters).toEqual({ managerId: "mgr2" });
    expect(q.enabled).toBe(true);
  });

  test("is disabled (never the public listing) until the user is known", () => {
    for (const u of [null, undefined, {}]) {
      const q = myTournamentsQuery(u);
      expect(q.enabled).toBe(false);
      expect(q.managerId).toBeNull();
    }
  });

  test("uses the same cache key as useTournaments({ managerId })", () => {
    // useTournaments(filters) keys on ["tournaments", filters]; sharing the key
    // is what makes the dashboard and the list one request / one cache entry.
    expect(myTournamentsQuery({ _id: "abc" }).queryKey).toEqual([
      "tournaments",
      { managerId: "abc" },
    ]);
  });

  test("key is under the ['tournaments'] prefix so invalidateQueries refreshes it", () => {
    expect(myTournamentsQuery({ _id: "abc" }).queryKey[0]).toBe("tournaments");
  });
});

describe("listTournaments endpoint choice", () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: { success: true, tournaments: [] } });
  });

  test("a managerId hits /tournaments/manager/:id, not the public listing", async () => {
    await listTournaments(myTournamentsQuery({ _id: "mgr9" }).filters);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.mock.calls[0][0]).toBe("/tournaments/manager/mgr9");
  });

  test("no managerId hits the public /tournaments listing (player-facing)", async () => {
    await listTournaments({});
    expect(api.get.mock.calls[0][0]).toBe("/tournaments");
  });

  test("returns every tournament the endpoint returns (no page-size cap)", async () => {
    const many = Array.from({ length: 27 }, (_, i) => ({ _id: `t${i}`, title: `T${i}` }));
    api.get.mockResolvedValue({ data: { success: true, tournaments: many } });
    const out = await listTournaments({ managerId: "mgr9" });
    expect(out).toHaveLength(27);
  });
});
