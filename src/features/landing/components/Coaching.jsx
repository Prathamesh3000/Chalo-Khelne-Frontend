import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Star, BadgeCheck, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { animate, stagger } from "animejs";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const COACHES = [
  { name: "Rohit Verma", sport: "Cricket", emoji: "🏏", rating: 4.9, exp: "12 yrs", tags: ["Batting", "Fielding", "Mentoring"], price: "₹800", av: "from-orange-500 to-red-700" },
  { name: "Anjali Desai", sport: "Badminton", emoji: "🏸", rating: 4.8, exp: "8 yrs", tags: ["Footwork", "Smash", "Strategy"], price: "₹600", av: "from-blue-500 to-indigo-700" },
  { name: "Sandeep Rao", sport: "Football", emoji: "⚽", rating: 4.7, exp: "10 yrs", tags: ["Striking", "Fitness", "Tactics"], price: "₹700", av: "from-green-500 to-emerald-800" },
  { name: "Meera Iyer", sport: "Tennis", emoji: "🎾", rating: 4.9, exp: "9 yrs", tags: ["Serve", "Baseline", "Footwork"], price: "₹900", av: "from-amber-500 to-orange-700" },
  { name: "Vikas Nair", sport: "Basketball", emoji: "🏀", rating: 4.6, exp: "7 yrs", tags: ["Shooting", "Defense"], price: "₹650", av: "from-red-500 to-rose-800" },
  { name: "Pooja Shah", sport: "Table Tennis", emoji: "🏓", rating: 4.8, exp: "11 yrs", tags: ["Spin", "Rallies", "Service"], price: "₹550", av: "from-pink-500 to-purple-800" },
];

export function Coaching() {
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const [index, setIndex] = useState(0);
  const n = COACHES.length;

  /* anime.js — stagger the front card's content whenever it changes */
  useEffect(() => {
    const front = stageRef.current?.querySelector('[data-front="true"]');
    if (!front) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(front.querySelectorAll(".deck-anim"), {
      translateY: [14, 0], opacity: [0, 1], delay: stagger(55), duration: 500, ease: "outExpo",
    });
  }, [index]);

  /* section reveal */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".coach-head > *", { y: 26, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: rootRef.current, start: "top 80%", once: true } });
      gsap.from(".coach-deck", { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: rootRef.current, start: "top 74%", once: true } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const go = (d) => setIndex((a) => (a + d + n) % n);

  return (
    <section id="coaching" ref={rootRef} className="relative overflow-hidden bg-[#0A0A0A] py-24">
      <div aria-hidden className="pointer-events-none absolute right-1/4 top-1/3 h-[30rem] w-[30rem]" style={{ background: "radial-gradient(circle, rgba(21,167,101,0.11), transparent 68%)" }} />

      <div className="relative mx-auto grid max-w-[1500px] grid-cols-1 items-center gap-14 px-6 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:px-16 xl:px-24">
        {/* Left — copy */}
        <div className="coach-head">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">Train</p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Match with a <span className="text-green-600">coach.</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/65">
            Certified coaches across 14 sports. Flip through the cards, find your
            fit, and book a session — all in the app.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
            {[["50+", "Certified coaches"], ["14", "Sports covered"], ["4.8★", "Avg rating"]].map(([v, l]) => (
              <div key={l}>
                <div className="text-3xl font-black text-white">{v}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-white/50">{l}</div>
              </div>
            ))}
          </div>

          <ul className="mt-7 space-y-2.5">
            {["Certified & background-verified", "Personalised training plans", "Book any slot, any sport"].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-white/70">
                <BadgeCheck className="h-5 w-5 shrink-0 text-green-500" /> {f}
              </li>
            ))}
          </ul>

          <a href="#inquire" className="mt-8 inline-flex w-auto items-center gap-2 rounded-lg border border-green-600/50 px-6 py-3 text-sm font-bold uppercase tracking-wide text-green-400 transition-all hover:bg-green-600/10">
            Browse all coaches <ArrowRight className="h-5 w-5" />
          </a>
        </div>

        {/* Right — swipe deck */}
        <div className="coach-deck flex flex-col items-center">
          <div ref={stageRef} className="relative h-[440px] w-full max-w-[360px]">
            {COACHES.map((c, i) => {
            const pos = (i - index + n) % n;
            const hidden = pos > 2;
            const front = pos === 0;
            return (
              <article
                key={c.name}
                data-front={front}
                onClick={!front ? () => setIndex(i) : undefined}
                className={`absolute left-1/2 top-0 w-[300px] -translate-x-1/2 overflow-hidden rounded-3xl border border-white/10 bg-[#141414] shadow-2xl sm:w-[340px] ${front ? "" : "cursor-pointer"}`}
                style={{
                  transform: `translateX(-50%) translateY(${pos * 20}px) scale(${1 - pos * 0.06}) rotate(${pos * 2}deg)`,
                  opacity: hidden ? 0 : 1 - pos * 0.16,
                  zIndex: n - pos,
                  pointerEvents: hidden ? "none" : "auto",
                  transition: "transform 0.55s cubic-bezier(.22,1,.36,1), opacity 0.55s",
                }}
              >
                <div className={`h-24 bg-gradient-to-br ${c.av}`} />
                <div className="flex flex-col items-center px-6 pb-6 text-center">
                  <div className="-mt-10 grid h-20 w-20 place-items-center rounded-full border-4 border-[#141414] bg-[#0A0A0A] text-4xl">
                    {c.emoji}
                  </div>
                  <h3 className="deck-anim mt-3 text-xl font-black text-white">{c.name}</h3>
                  <p className="deck-anim mt-0.5 inline-flex items-center gap-1 text-sm text-white/55">
                    {c.sport} Coach <BadgeCheck className="h-4 w-4 text-green-500" />
                  </p>
                  <div className="deck-anim mt-3 flex items-center justify-center gap-3 text-sm text-white/65">
                    <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {c.rating}</span>
                    <span>·</span>
                    <span>{c.exp} exp</span>
                  </div>
                  <div className="deck-anim mt-4 flex flex-wrap justify-center gap-2">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/70">{t}</span>
                    ))}
                  </div>
                  <div className="deck-anim mt-5 flex w-full items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-left">
                      <span className="text-lg font-black text-white">{c.price}</span>
                      <span className="text-sm text-white/50">/session</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                      Book <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
          </div>

          {/* controls */}
          <div className="mt-10 flex items-center justify-center gap-5">
            <button type="button" onClick={() => go(-1)} aria-label="Previous coach" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-green-600 hover:text-green-500">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-white/50">{index + 1} / {n}</span>
            <button type="button" onClick={() => go(1)} aria-label="Next coach" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-green-600 hover:text-green-500">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Coaching;
