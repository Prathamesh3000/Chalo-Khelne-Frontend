import { useLayoutEffect, useRef } from "react";
import { ArrowRight, PlayCircle, CalendarCheck } from "lucide-react";
import { gsap } from "gsap";
import { SPORTS } from "../data";

gsap.registerPlugin();

/**
 * Hero for /for-organizers.
 *
 * Deliberately narrower than the home hero: one buyer (whoever runs the
 * event), one promise, one primary action. The home page has to serve players,
 * clubs, trainers and turf owners at once — this page does not, and the pitch
 * is stronger for it.
 */
export function OrganizerHero() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".oh-rise", {
        y: 28,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-[#0A0A0A] pb-20 pt-32 text-white sm:pt-40"
    >
      {/* ambient glow — clipped by the section's own overflow-hidden */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 top-10 h-[34rem] w-[34rem]"
          style={{ background: "radial-gradient(circle, rgba(21,167,101,0.16), transparent 68%)" }}
        />
        <div
          className="absolute -right-24 top-52 h-[26rem] w-[26rem]"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.10), transparent 68%)" }}
        />
      </div>

      <div className="relative mx-auto max-w-[1300px] px-6 sm:px-10 lg:px-16">
        <span className="oh-rise inline-flex items-center gap-2 rounded-full border border-green-600/40 bg-green-600/10 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-green-400">
          <CalendarCheck className="h-3.5 w-3.5" />
          For tournament organizers
        </span>

        <h1 className="oh-rise mt-7 max-w-4xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
          Run your tournament
          <br />
          <span className="text-green-600">without the paper draw.</span>
        </h1>

        <p className="oh-rise mt-7 max-w-2xl text-lg leading-relaxed text-white/65">
          Entries, fees, draws, live scores and results — in one place. Built
          around how tournaments actually run in India, right down to the
          players who register and never show up.
        </p>

        <div className="oh-rise mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#inquire"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-7 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:bg-green-500"
          >
            Book a 20-minute walkthrough
            <ArrowRight className="h-5 w-5" />
          </a>
          <a
            href="#turn-up-draws"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-4 text-sm font-bold uppercase tracking-wide text-white/85 transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/5"
          >
            <PlayCircle className="h-5 w-5" />
            See how draws work
          </a>
        </div>

        {/* Only claims that can be checked in the codebase itself. The stat
            strip on the home page (500+ tournaments, 12,000+ players, 98%
            match accuracy) is NOT repeated here on purpose — those figures
            are unverified, and a B2B buyer who asks "which 500?" and gets a
            vague answer ends the conversation. Put real numbers back once
            they have been queried from the database. */}
        <dl className="oh-rise mt-14 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/10 pt-8">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Sports supported
            </dt>
            <dd className="mt-1 text-3xl font-black text-white">{SPORTS.length}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Draw formats
            </dt>
            <dd className="mt-1 text-3xl font-black text-white">4</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Setup time
            </dt>
            <dd className="mt-1 text-3xl font-black text-white">1 day</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export default OrganizerHero;
