import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Open/closed state for the workspace sidebar.
 *
 * The shells hard-coded a 200px column with `flex-shrink-0` and no way to
 * dismiss it. On a tablet in portrait that left ~572px of content on an iPad
 * and ~520px on a Mini, which is roughly a phone-width column running a desktop
 * layout. Collapsing it back is the single biggest width win available.
 *
 * Behaviour:
 *   • At lg (1024px) and up the sidebar is a static column, always open. This
 *     is the existing laptop experience and it does not change.
 *   • Below lg it becomes an off-canvas drawer, closed by default.
 *   • Navigating closes the drawer — otherwise it covers the page you just
 *     asked for.
 *
 * Deliberately not persisted. A manual choice made on a phone-width screen
 * should not follow the user to a laptop, and the correct default at each width
 * is obvious enough that remembering adds more surprise than convenience.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

export function useSidebarCollapse() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );
  const [open, setOpen] = useState(isDesktop);
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => {
      setIsDesktop(e.matches);
      // Crossing the boundary resets to that width's correct default: open as
      // a static column on desktop, closed as a drawer below it.
      setOpen(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Close on navigation, but only where it is a drawer covering the content.
  useEffect(() => {
    if (!isDesktop) setOpen(false);
  }, [pathname, isDesktop]);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return { open, isDesktop, toggle, close };
}

export default useSidebarCollapse;
