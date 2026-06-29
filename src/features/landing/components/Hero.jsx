import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, MapPin, Calendar, Search } from "lucide-react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import Hero3D from "./Hero3D";
import { onPreloadDone } from "../preload";

gsap.registerPlugin(SplitText);

export function Hero() {
  const rootRef = useRef(null);
  const headingRef = useRef(null);
  const [show3D, setShow3D] = useState(false);

  useLayoutEffect(() => {
    let split;
    let unsub = () => {};
    let fallback;
    const ctx = gsap.context(() => {
      // hide everything up-front so nothing flashes behind the preloader
      gsap.set([".hero-eyebrow", ".hero-sub", ".hero-cta", ".hero-board"], { opacity: 0, y: 28 });
      gsap.set(headingRef.current, { autoAlpha: 0 });

      const run = () => {
        split = new SplitText(headingRef.current, {
          type: "lines,words,chars",
          mask: "lines",
          linesClass: "split-line",
        });
        gsap.set(headingRef.current, { autoAlpha: 1 });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(split.chars, { yPercent: 115, opacity: 0, duration: 0.7, stagger: 0.02 }, 0.1)
          .to(".hero-eyebrow", { opacity: 1, y: 0, duration: 0.6 }, 0)
          .to(".hero-board", { opacity: 1, y: 0, duration: 0.9 }, 0.35)
          .to(".hero-sub", { opacity: 1, y: 0, duration: 0.6 }, 0.55)
          .to(".hero-cta", { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, 0.75);
      };

      // start only once the preloader's reveal has finished (or immediately if none)
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
        else run();
        // mount the WebGL canvas a beat later so it never competes with the entrance
        setTimeout(() => setShow3D(true), 250);
      };
      unsub = onPreloadDone(start);
      fallback = setTimeout(start, 4500); // safety: never leave the hero hidden
    }, rootRef);
    return () => {
      unsub();
      clearTimeout(fallback);
      ctx.revert();
      split?.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-[#0A0A0A] text-white">
      {/* Backdrop — 3D spheres + gradient orbs + dot grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* 3D field (desktop only) — mounted after the preloader to avoid jank */}
        {show3D && <Hero3D />}

        {/* soft glows */}
        <div className="absolute -left-40 top-20 h-[36rem] w-[36rem]" style={{ background: "radial-gradient(circle, rgba(21,167,101,0.16), transparent 68%)" }} />
        <div className="absolute -right-20 top-40 h-[28rem] w-[28rem]" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.10), transparent 68%)" }} />

        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
          }}
        />

        {/* legibility scrim — darken left where the copy sits */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent" />
      </div>

      <div className="relative flex flex-col items-start gap-12 px-6 pb-12 pt-32 sm:px-10 sm:pt-36 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-16 lg:pb-20 lg:pt-44 xl:px-24">
        {/* Copy */}
        <div className="w-full lg:flex-1">
          <div className="hero-eyebrow">
            <Eyebrow />
          </div>

          <h1
            ref={headingRef}
            className="mt-6 break-words font-black uppercase leading-[0.92] tracking-[-0.02em] text-white"
            style={{ fontSize: "clamp(2.5rem, 9vw, 7rem)" }}
          >
            India's Sports{" "}
            <span className="text-green-600">Tournament Platform.</span>
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">
            Run tournaments. Score live. Build your sports community.
            One platform — web for staff, mobile for everyone else.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#inquire" className="cta-primary hero-cta group">
              <span className="relative z-10">Start Your Club</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 -z-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:animate-shine group-hover:opacity-100"
              />
            </a>
            <Link to="/login" className="cta-ghost hero-cta">
              <PlayCircle className="h-5 w-5" />
              Staff Sign In
            </Link>
          </div>
        </div>

        {/* App phone mockup */}
        <div className="hero-board relative">
          <PhoneMockup />
        </div>
      </div>

      <style>{`
        .cta-primary {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          height: 3.25rem;
          padding: 0 1.75rem;
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #ffffff;
          background: #15A765;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 16px 40px -10px rgba(21, 167, 101, 0.45);
          transition: transform 200ms ease-out, box-shadow 200ms ease-out, background 150ms;
          isolation: isolate;
          width: auto;
        }
        .cta-primary:hover  { background: #138A56; transform: translateY(-2px); }
        .cta-primary:active { transform: translateY(0) scale(0.98); }

        .cta-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          height: 3.25rem;
          padding: 0 1.75rem;
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 0.5rem;
          background: transparent;
          transition: background 150ms, border-color 150ms, transform 200ms ease-out;
          width: auto;
        }
        .cta-ghost:hover  { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.4); transform: translateY(-2px); }
        .cta-ghost:active { transform: translateY(0) scale(0.98); }

        @keyframes phoneFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50%      { transform: translate3d(0, -14px, 0); }
        }
        .phone-float { animation: phoneFloat 4s ease-in-out infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .phone-float { animation: none; } }
      `}</style>
    </section>
  );
}

function Eyebrow() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-green-600/30 bg-green-600/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 backdrop-blur">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-2 w-2 animate-pulse-ring rounded-full bg-green-600 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
      </span>
      Built for Indian sports clubs
    </span>
  );
}

function PhoneMockup() {
  const [b, setB] = useState({ runs: 98, wk: 3, over: 12.4 });

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const r = [1, 1, 2, 4, 6][Math.floor(Math.random() * 5)];
      setB((p) => ({ runs: p.runs + r, wk: p.wk, over: Number((p.over + 0.1).toFixed(1)) }));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const G = "#15A765"; // Chalo Khelne app green

  return (
    <div className="phone-float relative mx-auto w-[270px] sm:w-[300px]">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-green-600/15 blur-3xl" />
      <div className="rounded-[2.8rem] border border-white/10 bg-[#0b0b0d] p-2.5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]">
        <div className="relative overflow-hidden rounded-[2.3rem] bg-white">
          {/* dynamic island */}
          <div className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          {/* status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold text-black">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-black/80" />
              <span className="inline-block h-2.5 w-3.5 rounded-sm bg-black/80" />
            </span>
          </div>

          <div className="px-4 pb-5">
            <h4 className="mt-1 text-sm font-bold text-slate-800">Events</h4>

            <div className="mt-2 flex rounded-full bg-slate-100 p-1 text-[11px] font-semibold">
              <span className="flex-1 rounded-full py-1.5 text-center text-white" style={{ background: G }}>
                Events
              </span>
              <span className="flex-1 py-1.5 text-center text-slate-500">Leaderboard</span>
            </div>

            <div className="mt-3 flex gap-4 text-[10px] font-medium">
              <span className="border-b-2 pb-1" style={{ color: G, borderColor: G }}>Live</span>
              <span className="text-slate-400">Upcoming</span>
              <span className="text-slate-400">Past</span>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-[10px] text-slate-400">
              <Search className="h-3.5 w-3.5" /> Search sports, turfs or players
            </div>

            {/* LIVE cricket card */}
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
              <div className="relative flex h-20 items-center justify-center" style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)" }}>
                <span className="text-3xl">🏏</span>
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-bold text-white">
                  <span className="h-1 w-1 rounded-full bg-white" /> Live
                </span>
              </div>
              <div className="p-3">
                <span className="text-[9px] font-semibold" style={{ color: G }}>Cricket · T10</span>
                <h5 className="text-[13px] font-bold text-slate-800">Sunday Cup — Final</h5>
                <p className="text-[10px] text-slate-500">Sideline Club · Pune</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Bangalore Blitz</span>
                  <span className="text-sm font-extrabold tabular-nums text-slate-800">
                    {b.runs}/{b.wk}{" "}
                    <span className="text-[10px] font-medium text-slate-400">({b.over})</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Upcoming football card */}
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
              <div className="relative flex h-16 items-center justify-center" style={{ background: "linear-gradient(135deg,#15803d,#052e16)" }}>
                <span className="text-3xl">⚽</span>
              </div>
              <div className="p-3">
                <span className="text-[9px] font-semibold" style={{ color: G }}>Football · 5s</span>
                <h5 className="text-[13px] font-bold text-slate-800">Friday Night League</h5>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Apr 26
                  </span>
                  <span className="font-semibold text-slate-700">₹350</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[9px] text-slate-500">
                    <MapPin className="h-3 w-3" /> Hinjewadi Turf
                  </span>
                  <button className="rounded-md px-3 py-1 text-[10px] font-semibold text-white" style={{ background: G }}>
                    Register
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
