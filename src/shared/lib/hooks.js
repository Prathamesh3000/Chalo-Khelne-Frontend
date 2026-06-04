import { useEffect, useRef, useState } from "react";

/**
 * Brief skeleton flash on tab change. Returns `true` for `durationMs` after
 * `tabKey` changes, then `false`. Use to cover the moment when a tab body
 * re-renders against new data and would otherwise show a blank flash.
 *
 *   const switching = useTabSwitchSkeleton(selectedTab);
 *   return switching ? <Skeleton... /> : <TabBody />;
 */
export function useTabSwitchSkeleton(tabKey, durationMs = 400) {
  const [switching, setSwitching] = useState(false);
  const prev = useRef(tabKey);
  useEffect(() => {
    if (prev.current === tabKey) return;
    prev.current = tabKey;
    setSwitching(true);
    const id = setTimeout(() => setSwitching(false), durationMs);
    return () => clearTimeout(id);
  }, [tabKey, durationMs]);
  return switching;
}

export function useInView({ threshold = 0.2, once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);

  return [ref, inView];
}

export function useCountUp(target, active, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setValue(target); return; }

    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-expo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}
