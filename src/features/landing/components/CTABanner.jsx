import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STATS } from "../data";
import { useInView, useCountUp } from "../../../shared/lib";

gsap.registerPlugin(ScrollTrigger);

function StatItem({ stat, active }) {
  const value = useCountUp(stat.value, active);
  const formatted = stat.value >= 1000 ? value.toLocaleString("en-IN") : String(value);
  return (
    <div className="text-center">
      <div className="text-3xl font-black tabular-nums leading-none tracking-tight text-white sm:text-4xl lg:text-5xl">
        {formatted}<span className="text-green-500">{stat.suffix}</span>
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 sm:text-xs">{stat.label}</div>
    </div>
  );
}

export function CTABanner() {
  const rootRef = useRef(null);
  const [statsRef, statsInView] = useInView({ threshold: 0.3 });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".cta-anim", { y: 30, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: rootRef.current, start: "top 78%", once: true } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="inquire" ref={rootRef} className="relative overflow-hidden bg-[#0A0A0A] py-24 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2" style={{ background: "radial-gradient(circle, rgba(21,167,101,0.16), transparent 68%)" }} />

      <div className="relative mx-auto max-w-[1100px] px-6 sm:px-10 lg:px-12">
        {/* finale panel */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-green-600/15 via-white/[0.02] to-transparent px-6 py-16 sm:px-12 sm:py-20">
          {/* faint grid */}
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64" style={{ background: "radial-gradient(circle, rgba(34,197,94,0.20), transparent 68%)" }} />

          <div className="relative mx-auto max-w-2xl text-center">
            <p className="cta-anim font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-400">Get started</p>
            <h2 className="cta-anim mt-4 text-4xl font-black uppercase leading-[1.02] tracking-tight text-white sm:text-6xl">
              Run your club's next <span className="text-green-500">tournament</span> with us.
            </h2>
            <p className="cta-anim mx-auto mt-5 max-w-xl text-base text-white/65 sm:text-lg">
              Tell us about your club and we'll set you up with a Club Admin
              account in under a business day.
            </p>
            <div className="cta-anim mt-9 flex flex-wrap items-center justify-center gap-3">
              <a href="#contact" className="cta-primary group">
                <span className="relative z-10">Talk to us</span>
                <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link to="/login" className="cta-ghost">Staff Sign In</Link>
            </div>
            <p className="cta-anim mt-7 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              No setup fees · No migration drama · 1-day onboarding
            </p>
          </div>

          {/* stats as social proof */}
          <div ref={statsRef} className="cta-anim relative mt-14 grid grid-cols-2 gap-y-10 border-t border-white/10 pt-12 sm:grid-cols-4">
            {STATS.map((stat) => (
              <StatItem key={stat.label} stat={stat} active={statsInView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CTABanner;
