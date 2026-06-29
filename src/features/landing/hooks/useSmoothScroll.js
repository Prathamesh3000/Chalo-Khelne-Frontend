import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Inertia smooth-scrolling via Lenis, driven by GSAP's ticker and kept in sync
 * with ScrollTrigger. Also upgrades in-page anchor links to a smooth eased
 * scroll, and starts every load at the top. Respects prefers-reduced-motion.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const lenis = new Lenis({ duration: 1.15, lerp: 0.1, smoothWheel: true });
    lenis.scrollTo(0, { immediate: true });
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const hash = a.getAttribute("href");
      if (hash.length <= 1) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -72, duration: 1.2 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
}
