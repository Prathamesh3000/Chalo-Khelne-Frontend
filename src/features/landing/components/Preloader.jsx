import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { preloaderWillRun, beginPreload, notifyPreloadDone } from "../preload";

export function Preloader() {
  const rootRef = useRef(null);
  const darkRef = useRef(null);
  const greenRef = useRef(null);
  const logoRef = useRef(null);
  const wordRef = useRef(null);
  const barRef = useRef(null);
  const countRef = useRef(null);
  const groupRef = useRef(null);

  const [done, setDone] = useState(() => !preloaderWillRun());

  useLayoutEffect(() => {
    if (done) return;
    beginPreload();
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const ctx = gsap.context(() => {
      const counter = { p: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          body.style.overflow = prevOverflow;
          notifyPreloadDone();
          setDone(true);
        },
      });

      tl.from(logoRef.current, { opacity: 0, scale: 0.82, y: 16, duration: 0.75, ease: "power3.out" })
        .from(wordRef.current, { opacity: 0, y: 18, duration: 0.55, ease: "power3.out" }, "-=0.35")
        .from(barRef.current.parentElement, { opacity: 0, duration: 0.4 }, "-=0.25")
        .to(counter, {
          p: 100,
          duration: 1.35,
          ease: "power1.inOut",
          onUpdate: () => {
            const v = Math.round(counter.p);
            if (countRef.current) countRef.current.textContent = v + "%";
            if (barRef.current) barRef.current.style.transform = `scaleX(${counter.p / 100})`;
          },
        }, "-=0.1")
        .to({}, { duration: 0.25 })
        .to(groupRef.current, { opacity: 0, y: -24, duration: 0.4, ease: "power2.in" })
        .to(darkRef.current, { yPercent: -100, duration: 0.75, ease: "power4.inOut" }, "-=0.05")
        .to(greenRef.current, { yPercent: -100, duration: 0.75, ease: "power4.inOut" }, "-=0.55");
    }, rootRef);

    return () => { ctx.revert(); body.style.overflow = prevOverflow; };
  }, [done]);

  if (done) return null;

  return (
    <div ref={rootRef} className="fixed inset-0 z-[200]">
      {/* back green curtain */}
      <div ref={greenRef} className="absolute inset-0 bg-green-600" />
      {/* front dark panel with content */}
      <div ref={darkRef} className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]">
        <div ref={groupRef} className="flex flex-col items-center px-8">
          <img ref={logoRef} src="/CK.png" alt="Chalo Khelne" className="h-24 w-auto sm:h-28" />
          <span ref={wordRef} className="mt-5 text-lg font-black uppercase tracking-[0.4em] text-white sm:text-xl">
            Chalo&nbsp;Khelne
          </span>

          <div className="mt-9 flex items-center gap-4">
            <div className="h-[3px] w-48 overflow-hidden rounded-full bg-white/10 sm:w-60">
              <div ref={barRef} className="h-full w-full origin-left rounded-full bg-green-500" style={{ transform: "scaleX(0)" }} />
            </div>
            <span ref={countRef} className="w-10 text-right font-mono text-xs font-bold tabular-nums text-white/60">0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Preloader;
