import { useEffect } from "react";

/**
 * Page chrome for the dark, full-bleed landing pages (/l/home, /for-organizers).
 *
 * Two things must hold while one of them is mounted:
 *
 *   • <html> and <body> painted #0A0A0A. index.html hardcodes an INLINE
 *     `background-color: #F5F7FA` on <body> and index.css repeats it, so any
 *     region the content does not cover shows through as an off-white band.
 *     index.css also paints it dark under `.ck-landing` with `!important` —
 *     which is what actually beats the inline attribute — so this JS is the
 *     belt to that braces, not the only defence.
 *
 *   • The `ck-landing` class on <html>, which index.css keys off to hide the
 *     page scrollbars (the global ones are styled light, #F5F7FA, and read as
 *     a pale bar against black) and to clip horizontal overflow.
 *
 * Everything is reverted on unmount, so the dashboards keep their light
 * surfaces and their normal scrollbars.
 *
 * Lives here rather than inline in a page because there are now two callers,
 * and a second copy would drift from the first the moment either changed.
 */
export function useDarkLandingChrome() {
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;

    html.style.backgroundColor = "#0A0A0A";
    body.style.backgroundColor = "#0A0A0A";
    html.classList.add("ck-landing");

    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
      html.classList.remove("ck-landing");
    };
  }, []);
}

export default useDarkLandingChrome;
