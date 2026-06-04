import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";

export function CTABanner() {
  return (
    <section id="inquire" className="relative overflow-hidden bg-[#0A0A0A] py-24 sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/15 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Trophy className="mx-auto h-12 w-12 text-orange-500" />
        <h2 className="mt-6 text-4xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-6xl">
          Run your club's next<br />tournament with us.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/60 sm:text-lg">
          Tell us about your club and we'll set you up with a Club Admin account in under a business day.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a href="#contact" className="cta-primary group">
            <span className="relative z-10">Talk to us</span>
            <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link to="/login" className="cta-ghost">Staff Sign In</Link>
        </div>

        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
          No setup fees · No migration drama · 1-day onboarding
        </p>
      </div>
    </section>
  );
}

export default CTABanner;
