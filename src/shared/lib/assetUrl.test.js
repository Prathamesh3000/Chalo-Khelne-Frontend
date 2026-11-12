import { describe, test, expect } from "vitest";
import { assetUrl } from "./assetUrl";

// Regression: the manager Trainers page built `/uploads/${trainer.profileImage}`
// from values the API already returns as "/uploads/trainer-profiles/…", giving
// "/uploads//uploads/…" (404). It now goes through assetUrl.
describe("assetUrl — trainer profile images", () => {
  const countUploads = (s) => (s.match(/\/uploads\//g) || []).length;

  test("a value that already starts with /uploads/ is not prefixed twice", () => {
    const u = assetUrl("/uploads/trainer-profiles/trainer-1.jpg");
    expect(countUploads(u)).toBe(1);
    expect(u.endsWith("/uploads/trainer-profiles/trainer-1.jpg")).toBe(true);
    expect(u).not.toContain("//uploads");
  });

  test("bare, relative and windows-style values all resolve to one /uploads/ segment", () => {
    for (const v of ["trainer-profiles/t.jpg", "uploads/trainer-profiles/t.jpg", "trainer-profiles\\t.jpg"]) {
      const u = assetUrl(v);
      expect(countUploads(u)).toBe(1);
      expect(u.endsWith("/uploads/trainer-profiles/t.jpg")).toBe(true);
    }
  });

  test("absolute URLs are left alone", () => {
    expect(assetUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });
});
