import { useLayoutEffect, useRef } from "react";
import { Zap, Trophy, Activity, CreditCard, GraduationCap, Users, Check, Star } from "lucide-react";
import { animate, stagger } from "animejs";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SPORTS } from "../data";

gsap.registerPlugin(ScrollTrigger);

const TILE = "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-green-600/40 hover:bg-white/[0.05]";
const CHIP = "grid h-11 w-11 place-items-center rounded-xl bg-green-600/10 text-green-500";

export function WhyChaloKhelne() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".why-head > *", { y: 26, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: rootRef.current, start: "top 80%", once: true } });
      gsap.from(".why-grid > *", { y: 36, opacity: 0, scale: 0.97, duration: 0.6, stagger: 0.08, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: ".why-grid", start: "top 82%", once: true } });

      ScrollTrigger.create({
        trigger: ".why-grid",
        start: "top 78%",
        once: true,
        onEnter: () => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          const r = rootRef.current;
          animate(r.querySelectorAll(".why-emoji"), { translateY: [0, -9], loop: true, alternate: true, ease: "inOutSine", duration: 1400, delay: stagger(110) });
          animate(r.querySelectorAll(".why-bar"), { scaleY: [0.35, 1], loop: true, alternate: true, ease: "inOutSine", duration: 850, delay: stagger(140) });
          animate(r.querySelectorAll(".why-star"), { scale: [0, 1], opacity: [0, 1], delay: stagger(120), duration: 500, ease: "outBack" });
          animate(r.querySelector(".why-check"), { scale: [0.6, 1], loop: true, alternate: true, duration: 1200, ease: "inOutQuad" });
          animate(r.querySelector(".why-booked"), { opacity: [0.45, 1], scale: [0.96, 1], loop: true, alternate: true, duration: 1000, ease: "inOutSine" });
          animate(r.querySelectorAll(".why-dot"), { scale: [0.6, 1.15], loop: true, alternate: true, duration: 800, delay: stagger(160), ease: "inOutSine" });
          const num = r.querySelector(".why-count");
          if (num) { const o = { n: 0 }; gsap.to(o, { n: 12000, duration: 1.6, ease: "power2.out", onUpdate: () => (num.textContent = Math.round(o.n).toLocaleString() + "+") }); }
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="why" ref={rootRef} className="bg-[#0A0A0A] py-24">
      <div className="why-head mx-auto max-w-[1500px] px-6 text-center sm:px-10 lg:px-16">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">Why Chalo Khelne</p>
        <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Everything sport, <span className="text-green-600">in one app.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          From booking a turf to running a tournament — Chalo Khelne brings your
          whole sports life together.
        </p>
      </div>

      <div className="why-grid mx-auto mt-12 grid max-w-[1300px] auto-rows-[minmax(176px,auto)] grid-cols-2 gap-4 px-6 sm:px-10 lg:grid-cols-4 lg:px-16">
        {/* Big — all sports */}
        <div className={`group relative col-span-2 row-span-2 overflow-hidden rounded-2xl border border-green-600/30 bg-gradient-to-br from-green-600/15 to-white/[0.02] p-7`}>
          <h3 className="text-2xl font-black leading-tight text-white sm:text-3xl">All your sports.<br /><span className="text-green-500">One app.</span></h3>
          <p className="mt-2 max-w-xs text-sm text-white/60">Cricket, football, badminton, pickleball and more — play, book, compete and connect in one place.</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {SPORTS.slice(0, 10).map((s) => (
              <span key={s.name} className="why-emoji grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-2xl">{s.emoji}</span>
            ))}
          </div>
          <div className="absolute bottom-6 right-7 text-right">
            <div className="text-3xl font-black text-white">14</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-green-500">Sports</div>
          </div>
        </div>

        {/* Instant booking */}
        <div className={`col-span-2 ${TILE}`}>
          <div className="flex items-start gap-4">
            <span className={CHIP}><Zap className="h-6 w-6" /></span>
            <div>
              <h3 className="text-lg font-black text-white">Instant booking</h3>
              <p className="mt-1 text-sm text-white/55">Lock a turf or join a tournament in seconds.</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-white/60">6:30</span>
            <span className="why-booked inline-flex items-center gap-1 rounded-lg border border-green-500/50 bg-green-500/15 px-3 py-1.5 text-sm font-bold text-green-300"><Check className="h-4 w-4" /> 8:00 Booked</span>
            <span className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-bold text-white/60">9:30</span>
          </div>
        </div>

        {/* Pro tools */}
        <div className={TILE}>
          <span className={CHIP}><Trophy className="h-6 w-6" /></span>
          <h3 className="mt-4 text-base font-black text-white">Pro tools</h3>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="why-dot h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="h-px flex-1 bg-white/20" />
            <span className="why-dot h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="h-px flex-1 bg-white/20" />
            <span className="why-dot h-2.5 w-2.5 rounded-full bg-green-500" />
          </div>
          <p className="mt-2 text-xs text-white/50">Brackets · scheduling · officials</p>
        </div>

        {/* Fair scoring */}
        <div className={TILE}>
          <span className={CHIP}><Activity className="h-6 w-6" /></span>
          <h3 className="mt-4 text-base font-black text-white">Fair scoring</h3>
          <div className="mt-3 flex h-8 items-end gap-1.5">
            {[0.5, 0.8, 0.4, 0.9, 0.6].map((h, i) => (
              <span key={i} className="why-bar w-2 origin-bottom rounded-sm bg-green-500" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
          <p className="mt-2 text-xs text-white/50">Referee-scored, every match</p>
        </div>

        {/* Secure payments */}
        <div className={`col-span-2 ${TILE}`}>
          <div className="flex items-start gap-4">
            <span className={CHIP}><CreditCard className="h-6 w-6" /></span>
            <div>
              <h3 className="text-lg font-black text-white">Secure payments</h3>
              <p className="mt-1 text-sm text-white/55">UPI, cards & instant receipts.</p>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2">
            <span className="why-check grid h-8 w-8 place-items-center rounded-full bg-green-600 text-white"><Check className="h-5 w-5" /></span>
            <span className="text-sm font-bold text-white">Paid via UPI · <span className="text-white/60">₹600</span></span>
          </div>
        </div>

        {/* Certified coaches */}
        <div className={TILE}>
          <span className={CHIP}><GraduationCap className="h-6 w-6" /></span>
          <h3 className="mt-4 text-base font-black text-white">Certified coaches</h3>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="why-star h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="mt-2 text-xs text-white/50">Train across 14 sports</p>
        </div>

        {/* Trusted community */}
        <div className={TILE}>
          <span className={CHIP}><Users className="h-6 w-6" /></span>
          <h3 className="mt-4 text-base font-black text-white">Trusted community</h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="flex shrink-0 -space-x-3">
              {["from-orange-500 to-red-600", "from-blue-500 to-indigo-700", "from-pink-500 to-rose-700", "from-green-500 to-emerald-700"].map((g, i) => (
                <span key={i} className={`h-8 w-8 rounded-full border-2 border-[#0A0A0A] bg-gradient-to-br ${g}`} />
              ))}
            </div>
            <span className="why-count text-xl font-black text-white">0+</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhyChaloKhelne;
