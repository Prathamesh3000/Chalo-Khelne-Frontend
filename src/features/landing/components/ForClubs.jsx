import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Building2, Trophy, Flag, Check, ArrowRight, LayoutDashboard, MapPin, Wallet, Users, Settings } from "lucide-react";
import { animate, stagger } from "animejs";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ROLES = [
  {
    key: "admin",
    title: "Club Admin",
    tagline: "Your club, your rules.",
    icon: Building2,
    nav: "Finance",
    stats: [["₹4.2L", "Revenue / mo"], ["8", "Managers"], ["12", "Turfs live"]],
    bullets: ["Set up your club profile & turfs", "Create and manage your managers", "Full finance, payouts & reports"],
  },
  {
    key: "manager",
    title: "Manager",
    tagline: "Run tournaments like a pro.",
    icon: Trophy,
    nav: "Tournaments",
    stats: [["24", "Tournaments"], ["96%", "On-time"], ["5", "Sports run"]],
    bullets: ["Generate brackets in one click", "Auto-schedule courts & windows", "Score matches live, any device"],
  },
  {
    key: "referee",
    title: "Referee",
    tagline: "Be part of every match.",
    icon: Flag,
    nav: "Officials",
    stats: [["142", "Matches"], ["4.9★", "Rating"], ["₹28K", "Earned"]],
    bullets: ["Apply to tournaments from mobile", "Get matched to your sport", "Score live with smart controls"],
  },
];

const NAV = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Tournaments", icon: Trophy },
  { label: "Turfs", icon: MapPin },
  { label: "Finance", icon: Wallet },
  { label: "Officials", icon: Users },
  { label: "Settings", icon: Settings },
];

export function ForClubs() {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [active, setActive] = useState(0);
  const role = ROLES[active];

  /* anime.js — re-stagger the dashboard panel on role change */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = panelRef.current;
    if (!el) return;
    animate(el.querySelectorAll(".dash-anim"), {
      translateY: [12, 0], opacity: [0, 1], delay: stagger(50), duration: 480, ease: "outExpo",
    });
  }, [active]);

  /* section reveal */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".clubs-head > *", { y: 26, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: rootRef.current, start: "top 80%", once: true } });
      gsap.from(".clubs-tab", { x: -24, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: ".clubs-body", start: "top 80%", once: true } });
      gsap.from(".clubs-window", { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: ".clubs-body", start: "top 80%", once: true } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="for-clubs" ref={rootRef} className="relative overflow-hidden bg-[#0A0A0A] py-24">
      <div aria-hidden className="pointer-events-none absolute left-1/4 top-1/4 h-[32rem] w-[32rem]" style={{ background: "radial-gradient(circle, rgba(21,167,101,0.11), transparent 68%)" }} />

      <div className="clubs-head relative mx-auto max-w-[1500px] px-6 text-center sm:px-10 lg:px-16">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">For Clubs</p>
        <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Run your club <span className="text-green-600">like a pro.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          One dashboard for every role — pick yours and see exactly what
          Chalo Khelne puts at your fingertips.
        </p>
      </div>

      <div className="clubs-body relative mx-auto mt-14 grid max-w-[1300px] grid-cols-1 gap-8 px-6 sm:px-10 lg:grid-cols-[minmax(0,340px)_1fr] lg:px-16">
        {/* Left — role tabs */}
        <div className="flex flex-col gap-3">
          {ROLES.map((r, i) => {
            const RIcon = r.icon;
            const on = i === active;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setActive(i)}
                className={`clubs-tab group flex w-auto items-center gap-4 rounded-2xl border p-4 text-left transition-all ${on ? "border-green-600/60 bg-green-600/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"}`}
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors ${on ? "bg-green-600 text-white" : "bg-white/[0.06] text-white/60 group-hover:text-white"}`}>
                  <RIcon className="h-6 w-6" />
                </span>
                <span>
                  <span className={`block font-black ${on ? "text-white" : "text-white/80"}`}>{r.title}</span>
                  <span className="block text-sm text-white/45">{r.tagline}</span>
                </span>
                <ArrowRight className={`ml-auto h-5 w-5 shrink-0 transition-all ${on ? "text-green-500 opacity-100" : "text-white/30 opacity-0 group-hover:opacity-100"}`} />
              </button>
            );
          })}

          <a href="#inquire" className="mt-2 inline-flex w-auto items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-green-500">
            Request a demo <ArrowRight className="h-5 w-5" />
          </a>
        </div>

        {/* Right — dashboard window mockup */}
        <div className="clubs-window overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E0E] shadow-2xl">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-amber-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 rounded-md bg-white/[0.06] px-3 py-1 font-mono text-xs text-white/45">
              app.chalokhelne.com/admin
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" /> Live
            </span>
          </div>

          <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[180px_1fr]">
            {/* sidebar */}
            <aside className="border-r border-white/10 bg-white/[0.02] p-3">
              <div className="mb-4 hidden items-center gap-2 px-2 sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-green-600 text-xs font-black text-white">CK</span>
                <span className="text-sm font-black text-white">Console</span>
              </div>
              <nav className="space-y-1">
                {NAV.map((item) => {
                  const NIcon = item.icon;
                  const on = item.label === role.nav;
                  return (
                    <div key={item.label} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${on ? "bg-green-600/15 text-green-400" : "text-white/45"}`}>
                      <NIcon className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </div>
                  );
                })}
              </nav>
            </aside>

            {/* main panel */}
            <div ref={panelRef} className="min-h-[420px] p-6 sm:p-8">
              <span className="dash-anim inline-flex items-center gap-2 rounded-full bg-green-600/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-green-400">
                <role.icon className="h-3.5 w-3.5" /> {role.title}
              </span>
              <h3 className="dash-anim mt-4 text-2xl font-black text-white sm:text-3xl">{role.tagline}</h3>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {role.stats.map(([v, l]) => (
                  <div key={l} className="dash-anim rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xl font-black text-white sm:text-2xl">{v}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/45">{l}</div>
                  </div>
                ))}
              </div>

              <ul className="mt-7 space-y-3">
                {role.bullets.map((b) => (
                  <li key={b} className="dash-anim flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-white/75">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-green-600/15 text-green-400">
                      <Check className="h-4 w-4" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ForClubs;
