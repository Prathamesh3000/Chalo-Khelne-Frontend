/**
 * Tablet responsiveness regressions.
 *
 * Two things were broken in a way that only shows up below 1024px, which is
 * where every tablet in portrait sits:
 *
 *   1. All five workspace shells hard-coded a 200px sidebar with
 *      `flex-shrink-0`, no breakpoint prefix and no way to dismiss it. On an
 *      iPad in portrait that left ~572px of content — a phone-width column
 *      running a desktop layout.
 *   2. Only /l/home rendered a landing header and footer. The other five /l/*
 *      routes had no navigation chrome at all: no logo, no menu, no links.
 *
 * Source-level assertions on purpose — they hold for every current and future
 * shell without rendering five route trees, and they are what someone would
 * otherwise have to remember.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const LAYOUT = path.join(SRC, "shared", "layout");

const SHELLS = [
  "ManagerShell.jsx",
  "SuperAdminShell.jsx",
  "ClubAdminShell.jsx",
  "CorporateShell.jsx",
  "TournamentShell.jsx",
];

const read = (p) => fs.readFileSync(p, "utf8");

describe("workspace shells collapse below lg", () => {
  it.each(SHELLS)("%s positions its sidebar through SidebarFrame", (shell) => {
    const src = read(path.join(LAYOUT, shell));
    expect(src).toContain("SidebarFrame");
    expect(src).toContain("useSidebarCollapse");
  });

  it.each(SHELLS)("%s has no bare fixed-width <aside>", (shell) => {
    const src = read(path.join(LAYOUT, shell));
    // The whole defect in one assertion: an <aside> the user cannot dismiss.
    expect(src).not.toMatch(/<aside[^>]*w-\[\d+px\][^>]*flex-shrink-0/);
    expect(src).not.toContain("<aside");
  });

  it.each(SHELLS)("%s exposes a way to open the drawer", (shell) => {
    const src = read(path.join(LAYOUT, shell));
    expect(src).toContain("ShellHamburger");
    expect(src).toMatch(/onMenuClick/);
  });

  it("SidebarFrame keeps the desktop column static and untouched", () => {
    const src = read(path.join(LAYOUT, "SidebarFrame.jsx"));
    // Desktop must stay a normal in-flow column — if this becomes fixed/absolute
    // the laptop layout silently loses its 200px gutter.
    expect(src).toMatch(/if \(isDesktop\)/);
    expect(src).toMatch(/flex-shrink-0/);
  });

  it("the drawer is dismissible by keyboard", () => {
    const src = read(path.join(LAYOUT, "SidebarFrame.jsx"));
    expect(src).toContain("Escape");
  });
});

describe("landing chrome is on the route tree", () => {
  const landingApp = read(path.join(SRC, "LandingApp.jsx"));
  const layout = read(path.join(SRC, "features", "landing", "LandingLayout.jsx"));

  it("every /l/* route inherits LandingLayout", () => {
    expect(landingApp).toContain("LandingLayout");
    // A route sitting outside the layout element would render bare.
    const routeBlock = landingApp.slice(landingApp.indexOf("<LandingLayout"));
    for (const p of ["home", "event", "turf-content", "trainer", "social", "news"]) {
      expect(routeBlock).toContain(`path="${p}"`);
    }
  });

  it("the layout renders both header and footer", () => {
    expect(layout).toContain("LandingHeader");
    expect(layout).toContain("LandingFooter");
  });

  it("inner pages get the opaque header — transparent is invisible on white", () => {
    expect(layout).toMatch(/solid=\{!isHome\}/);
  });

  it("Home no longer renders its own chrome, which would stack two of each", () => {
    const home = read(path.join(SRC, "pages", "landing", "Home.jsx"));
    expect(home).not.toContain("<LandingHeader");
    expect(home).not.toContain("<LandingFooter");
  });

  it("the header keeps the hamburger until lg, not md", () => {
    const header = read(path.join(SRC, "features", "landing", "components", "LandingHeader.jsx"));
    // Switching the desktop nav on at md (768px) put five nav items, two CTAs
    // and the wordmark into ~800px: the logo wrapped onto two lines, "For
    // Clubs" and "Sign in" broke, and "Get Started" ran off the right edge.
    // Every tablet in portrait sits in that band.
    expect(header).not.toMatch(/\bmd:flex\b/);
    expect(header).not.toMatch(/\bmd:hidden\b/);
    expect(header).toMatch(/\blg:flex\b/);
    expect(header).toMatch(/\blg:hidden\b/);
  });

  it("header items do not wrap mid-label", () => {
    const header = read(path.join(SRC, "features", "landing", "components", "LandingHeader.jsx"));
    expect(header).toMatch(/whitespace-nowrap/);
  });

  it("the footer has a step between one column and four", () => {
    const footer = read(path.join(SRC, "features", "landing", "components", "LandingFooter.jsx"));
    // Straight 1 -> 4 at lg meant tablets got the phone layout.
    expect(footer).toMatch(/sm:grid-cols-2/);
  });
});

describe("orphaned duplicates stay deleted", () => {
  it.each([
    ["Manager", "MLayout.jsx"],
    ["Manager", "MSidebar.jsx"],
    ["Landing-Page", "LNavbar.jsx"],
    ["Landing-Page", "LFooter.jsx"],
  ])("%s/%s is gone", (dir, file) => {
    expect(fs.existsSync(path.join(SRC, dir, file))).toBe(false);
  });
});
