/**
 * §2.3 regression — every <ProtectedRoute> must receive a real role list.
 *
 * The guard used to treat a missing `allowedRoles` as "any authenticated user
 * is fine". Seven of eight call sites then failed to pass it: three passed
 * `role="…"` (React forwards unknown props silently, so the guard rendered its
 * Outlet and looked healthy) and four passed nothing. A logged-in player could
 * navigate to /home and get the SuperAdmin console shell.
 *
 * Two further portals — AgencyApp and ClubApp — had no guard of ANY kind.
 *
 * This is a source-level assertion on purpose: it holds for every current and
 * future call site without needing to render eleven route trees.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).map((f) => ({ file: f, text: fs.readFileSync(f, "utf8") }));

// The role shells that must be behind a guard. LandingApp is deliberately
// public; App.jsx is the dispatcher itself.
const GUARDED_SHELLS = [
  "ManagerApp.jsx",
  "PlayerApp.jsx",
  "ClubAdminApp.jsx",
  "ClubApp.jsx",
  "CorporateApp.jsx",
  "SuperAdminapp.jsx",
  "TrainerApp.jsx",
  "VendorApp.jsx",
  "AgencyApp.jsx",
];

describe("ProtectedRoute call sites (§2.3)", () => {
  const callSites = [];
  for (const { file, text } of FILES) {
    if (file.includes("features/auth/components/ProtectedRoute")) continue; // the impl + its docblock
    for (const m of text.matchAll(/<ProtectedRoute\b([^>]*?)\/?>/g)) {
      callSites.push({ file, props: m[1] });
    }
  }

  it("finds every call site", () => {
    expect(callSites.length).toBeGreaterThan(0);
  });

  it("every call site passes allowedRoles", () => {
    const offenders = callSites
      .filter((c) => !/\ballowedRoles\s*=/.test(c.props))
      .map((c) => `${path.relative(SRC, c.file)} → <ProtectedRoute${c.props}>`);
    expect(offenders).toEqual([]);
  });

  it("no call site uses the `role=` prop the component never read", () => {
    const offenders = callSites
      .filter((c) => /\brole\s*=/.test(c.props))
      .map((c) => `${path.relative(SRC, c.file)} → <ProtectedRoute${c.props}>`);
    expect(offenders).toEqual([]);
  });

  it("every role shell is guarded", () => {
    const unguarded = GUARDED_SHELLS.filter((shell) => {
      const entry = FILES.find((f) => f.file.endsWith(path.sep + shell));
      return !entry || !entry.text.includes("<ProtectedRoute");
    });
    expect(unguarded).toEqual([]);
  });
});

describe("ProtectedRoute fails closed (§2.3)", () => {
  const impl = fs.readFileSync(
    path.join(SRC, "features", "auth", "components", "ProtectedRoute.jsx"),
    "utf8"
  );

  it("refuses access when allowedRoles is missing or empty", () => {
    // The old shape was `if (allowedRoles?.length) { …check… }` — i.e. no list
    // meant no check. The guard must now bail out instead.
    expect(impl).toMatch(/!Array\.isArray\(allowedRoles\)\s*\|\|\s*allowedRoles\.length === 0/);
    expect(impl).not.toMatch(/if\s*\(\s*allowedRoles\?\.\s*length\s*\)/);
  });

  it("exports a ROLES map so call sites do not hand-write role strings", () => {
    expect(impl).toMatch(/export const ROLES/);
  });
});
