/**
 * Tiny coordination bus so the Hero entrance + 3D canvas don't initialise while
 * the preloader is animating (which causes jank). The preloader calls
 * beginPreload() when it starts and notifyPreloadDone() when its reveal
 * finishes; the Hero subscribes via onPreloadDone().
 *
 * State lives at module scope, so it RESETS on every real page reload (the
 * preloader plays each reload) but PERSISTS across in-app SPA navigation (so it
 * never replays when routing back to the landing in the same session).
 */
const REDUCED = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let played = false; // has the preloader run in this page-load context
let done = false; // has it finished (or will it never run)
const listeners = new Set();

export function preloaderWillRun() {
  return !REDUCED && !played;
}

export function beginPreload() {
  played = true;
  done = false;
}

export function notifyPreloadDone() {
  done = true;
  const fns = [...listeners];
  listeners.clear();
  fns.forEach((fn) => fn());
}

export function onPreloadDone(cb) {
  // wait while a preloader is actively running; otherwise fire immediately
  if (!REDUCED && !done) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }
  cb();
  return () => {};
}
