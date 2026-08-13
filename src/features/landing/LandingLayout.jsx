import { Outlet, useLocation } from "react-router-dom";
import { LandingHeader } from "./components/LandingHeader";
import { LandingFooter } from "./components/LandingFooter";

/**
 * Chrome for every public /l/* route.
 *
 * Before this existed, only /l/home rendered a header and footer —
 * LandingFooter was referenced in exactly one file. A visitor who opened
 * /l/event, /l/turf-content, /l/trainer, /l/social or /l/news got a bare page
 * with no logo, no menu and no links, and no way to reach anything else.
 * (Landing-Page/LNavbar.jsx and LFooter.jsx were built for those pages and then
 * never imported; LandingApp.jsx documented the intent to opt each page in, and
 * none did. Hanging the chrome off the route tree instead means a new /l/*
 * route cannot forget it.)
 *
 * Home vs inner pages differ in two ways that matter:
 *
 *   • Home is dark and the header floats transparently over its hero. The inner
 *     pages are light (bg-white / #F5F7FA), where a transparent header is white
 *     text on white — invisible until you scroll. They get `solid`.
 *   • The header is `fixed`, so content needs to clear its 64px. Home's hero
 *     already accounts for it; the inner pages do not, so the layout adds the
 *     offset for them.
 */
export default function LandingLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/l" || pathname === "/l/" || pathname === "/l/home";

  return (
    <>
      <LandingHeader solid={!isHome} />
      {/* h-16 header. Home paints its own full-bleed hero underneath it. */}
      <div className={isHome ? undefined : "pt-16"}>
        <Outlet />
      </div>
      <LandingFooter />
    </>
  );
}
