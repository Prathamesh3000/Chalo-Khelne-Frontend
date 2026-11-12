import { describe, test, expect, vi } from "vitest";
import {
  loadTournamentSummaries,
  buildTournamentTabs,
  SUMMARY_BATCH_SIZE,
} from "./notificationTournaments";

const ids = (n, p = "t") => Array.from({ length: n }, (_, i) => `${p}${i}`);

describe("loadTournamentSummaries", () => {
  test("one batched request for a normal inbox; missing ids are simply absent", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({
        data: { success: true, tournaments: [{ _id: "t0", title: "A", endDate: "2026-01-02" }] },
      }),
    };
    const found = await loadTournamentSummaries(http, ["t0", "t1-deleted"]);

    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get.mock.calls[0][0]).toBe("/api/tournaments/summaries");
    expect(http.get.mock.calls[0][1].params.ids).toBe("t0,t1-deleted");
    expect([...found.keys()]).toEqual(["t0"]);
  });

  test("never calls the per-tournament endpoint when the batch works (no 404 noise)", async () => {
    const http = { get: vi.fn().mockResolvedValue({ data: { success: true, tournaments: [] } }) };
    await loadTournamentSummaries(http, ids(30));
    const urls = http.get.mock.calls.map((c) => c[0]);
    expect(urls.every((u) => u === "/api/tournaments/summaries")).toBe(true);
  });

  test("splits large inboxes into batches of SUMMARY_BATCH_SIZE", async () => {
    const http = { get: vi.fn().mockResolvedValue({ data: { success: true, tournaments: [] } }) };
    await loadTournamentSummaries(http, ids(SUMMARY_BATCH_SIZE * 2 + 10));
    expect(http.get).toHaveBeenCalledTimes(3);
    expect(http.get.mock.calls[0][1].params.ids.split(",")).toHaveLength(SUMMARY_BATCH_SIZE);
    expect(http.get.mock.calls[2][1].params.ids.split(",")).toHaveLength(10);
  });

  test("falls back to per-id lookups when the endpoint is missing (older server)", async () => {
    const http = {
      get: vi.fn(async (url) => {
        if (url === "/api/tournaments/summaries") throw new Error("500");
        if (url === "/api/tournaments/t0") return { data: { success: true, tournament: { _id: "t0", title: "A" } } };
        throw Object.assign(new Error("404"), { response: { status: 404 } }); // deleted
      }),
    };
    const found = await loadTournamentSummaries(http, ["t0", "t1"]);
    expect([...found.keys()]).toEqual(["t0"]);
    expect(found.get("t0").title).toBe("A");
  });

  test("falls back when the response shape is not what we expect", async () => {
    const http = {
      get: vi.fn(async (url) =>
        url === "/api/tournaments/summaries"
          ? { data: { success: false } }
          : { data: { success: true, tournament: { _id: "t0", title: "A" } } }
      ),
    };
    const found = await loadTournamentSummaries(http, ["t0"]);
    expect(found.get("t0").title).toBe("A");
  });
});

describe("buildTournamentTabs", () => {
  const now = new Date("2026-06-10T12:00:00");
  const found = new Map([
    ["live", { _id: "live", title: "Live Cup", endDate: "2026-06-12" }],
    ["done", { _id: "done", title: "Old Cup", endDate: "2026-05-01" }],
    ["today", { _id: "today", title: "Ends Today", endDate: "2026-06-10" }],
  ]);

  test("running events lead, then finished, then deleted", () => {
    const { tabs } = buildTournamentTabs({ ids: ["gone", "done", "live"], found, now });
    expect(tabs.map((t) => t._id)).toEqual(["live", "done", "gone"]);
    expect(tabs.map((t) => t.status)).toEqual(["active", "expired", "unknown"]);
  });

  test("a tournament ending today is still active (end of day, inclusive)", () => {
    const { statusMap } = buildTournamentTabs({ ids: ["today"], found, now });
    expect(statusMap.today).toBe("active");
  });

  test("a deleted tournament keeps the title captured in the notification message", () => {
    const titleFromMessage = new Map([["gone", "Deleted Cup"]]);
    const { tabs } = buildTournamentTabs({ ids: ["gone"], found, titleFromMessage, now });
    expect(tabs[0]).toEqual({ _id: "gone", title: "Deleted Cup", status: "unknown" });
  });

  test("order within a status group follows inbox order (stable)", () => {
    const f = new Map([
      ["a", { _id: "a", title: "A", endDate: "2026-01-01" }],
      ["b", { _id: "b", title: "B", endDate: "2026-01-01" }],
      ["c", { _id: "c", title: "C", endDate: "2026-01-01" }],
    ]);
    const { tabs } = buildTournamentTabs({ ids: ["c", "a", "b"], found: f, now });
    expect(tabs.map((t) => t._id)).toEqual(["c", "a", "b"]);
  });
});
