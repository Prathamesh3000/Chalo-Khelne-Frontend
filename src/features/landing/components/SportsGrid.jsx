import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Activity, Trophy, ArrowUpRight } from "lucide-react";
import { SPORTS } from "../data";

gsap.registerPlugin(ScrollTrigger);

const CATEGORY = {
  Cricket: "Team", Football: "Team", Basketball: "Team", Volleyball: "Team", Kabaddi: "Team", Hockey: "Team",
  Badminton: "Racket", Tennis: "Racket", Pickleball: "Racket",
  "Table Tennis": "Indoor", Squash: "Indoor", Carrom: "Indoor",
};

const ROW1 = SPORTS.slice(0, 6);
const ROW2 = SPORTS.slice(6);

function SportCard({ s }) {
  return (
    <div className="group relative w-[260px] shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:bg-white/[0.05] sm:w-[280px]">
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.16]" style={{ background: `radial-gradient(circle at 25% 0%, ${s.accent}, transparent 65%)` }} />
      <span aria-hidden className="pointer-events-none absolute -bottom-4 -right-1 text-8xl opacity-[0.06] transition-transform duration-500 group-hover:scale-110 group-hover:opacity-[0.1]">{s.emoji}</span>
      <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 -translate-y-1 text-white/0 transition-all duration-300 group-hover:translate-y-0 group-hover:text-white/50" />

      <div className="relative flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl text-3xl transition-transform duration-300 group-hover:scale-110" style={{ background: `${s.accent}22`, boxShadow: `inset 0 0 0 1px ${s.accent}55` }}>
          {s.emoji}
        </span>
        <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/55">{CATEGORY[s.name]}</span>
      </div>

      <h3 className="relative mt-5 text-xl font-black uppercase tracking-tight text-white">{s.name}</h3>

      <div className="relative mt-4 space-y-2 border-t border-white/[0.07] pt-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-white/55">
          <Activity className="h-3.5 w-3.5" style={{ color: s.accent }} /> {s.scoring} scoring engine
        </p>
        <p className="flex items-center gap-2 text-xs font-semibold text-white/55">
          <Trophy className="h-3.5 w-3.5" style={{ color: s.accent }} /> Brackets & leaderboards
        </p>
      </div>
    </div>
  );
}

export function SportsGrid() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".sports-head > *", { y: 26, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: rootRef.current, start: "top 80%", once: true } });
      gsap.from(".sports-rows", { opacity: 0, duration: 0.8, ease: "power2.out", immediateRender: false, scrollTrigger: { trigger: ".sports-rows", start: "top 85%", once: true } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="sports" ref={rootRef} className="relative overflow-hidden bg-[#0A0A0A] py-24">
      <style>{`
        @keyframes ck-row-l { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes ck-row-r { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .ck-row { display: flex; gap: 1rem; width: max-content; }
        .ck-row-l { animation: ck-row-l 38s linear infinite; }
        .ck-row-r { animation: ck-row-r 44s linear infinite; }
        .ck-marquee:hover .ck-row { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .ck-row { animation: none; } }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/4 h-[28rem] w-[28rem] -translate-x-1/2" style={{ background: "radial-gradient(circle, rgba(21,167,101,0.11), transparent 68%)" }} />

      <div className="sports-head relative mx-auto max-w-[1500px] px-6 text-center sm:px-10 lg:px-16">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">Multi-sport platform</p>
        <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Built for every sport <span className="text-green-600">you play.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          14 sports and counting — each with its own smart scoring engine,
          brackets and live leaderboards.
        </p>
      </div>

      {/* two auto-scrolling rows */}
      <div className="sports-rows ck-marquee relative mt-12 flex flex-col gap-4">
        <div className="ck-row ck-row-l">
          {[...ROW1, ...ROW1].map((s, i) => <SportCard key={`a${i}`} s={s} />)}
        </div>
        <div className="ck-row ck-row-r">
          {[...ROW2, ...ROW2].map((s, i) => <SportCard key={`b${i}`} s={s} />)}
        </div>

        {/* edge fades */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0A0A0A] to-transparent sm:w-28" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0A0A0A] to-transparent sm:w-28" />
      </div>
    </section>
  );
}

export default SportsGrid;
