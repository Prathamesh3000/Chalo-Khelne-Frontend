import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { animate, stagger } from "animejs";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const IMG = (id) => `https://images.unsplash.com/${id}?q=80&w=1000&auto=format&fit=crop`;

const TURFS = [
  { name: "Greenfield Turf Arena", area: "Baner, Pune", price: "₹1,200", rating: 4.8, sports: ["Football", "Cricket"], slots: ["6:30", "8:00", "9:30", "11:00"], grad: "from-[#15A765] to-[#052e16]", image: IMG("photo-1459865264687-595d652de67e") },
  { name: "Smash Court", area: "Andheri, Mumbai", price: "₹600", rating: 4.6, sports: ["Badminton", "Tennis"], slots: ["7:00", "8:30", "10:00"], grad: "from-[#3b82f6] to-[#1e3a8a]", image: IMG("photo-1626224583764-f87db24ac4ea") },
  { name: "PowerPlay Box Cricket", area: "HSR, Bangalore", price: "₹900", rating: 4.7, sports: ["Box Cricket"], slots: ["6:00", "7:30", "9:00"], grad: "from-[#F97316] to-[#7c2d12]", image: IMG("photo-1540747913346-19e32dc3e97e") },
  { name: "The Sports Hub", area: "Gachibowli, Hyderabad", price: "₹1,000", rating: 4.9, sports: ["Football", "Basketball"], slots: ["6:30", "8:00", "9:30"], grad: "from-[#ef4444] to-[#7f1d1d]", image: IMG("photo-1546519638-68e109498ffc") },
  { name: "Ace Pickle Park", area: "Saket, Delhi", price: "₹500", rating: 4.5, sports: ["Pickleball", "Tennis"], slots: ["7:00", "8:30", "10:00"], grad: "from-[#22c55e] to-[#14532d]", image: IMG("photo-1554068865-24cecd4e34b8") },
  { name: "Champions Ground", area: "College Rd, Nashik", price: "₹800", rating: 4.6, sports: ["Cricket", "Volleyball"], slots: ["6:00", "7:30", "9:00"], grad: "from-[#8b5cf6] to-[#3b0764]", image: IMG("photo-1593766827228-8737b4534aa6") },
  { name: "Arena 360", area: "Kothrud, Pune", price: "₹1,100", rating: 4.7, sports: ["Football", "Box Cricket"], slots: ["6:30", "8:00", "9:30"], grad: "from-[#0ea5e9] to-[#0c4a6e]", image: IMG("photo-1517466787929-bc90951d0974") },
  { name: "Net Practice", area: "Whitefield, Bangalore", price: "₹700", rating: 4.4, sports: ["Cricket Nets"], slots: ["7:00", "8:30"], grad: "from-[#eab308] to-[#713f12]", image: IMG("photo-1531415074968-036ba1b575da") },
  { name: "Smashville", area: "Powai, Mumbai", price: "₹650", rating: 4.6, sports: ["Badminton", "Pickleball"], slots: ["6:00", "7:30", "9:00"], grad: "from-[#14b8a6] to-[#134e4a]", image: IMG("photo-1599058917212-d750089bc07e") },
];

export function Turfs() {
  const rootRef = useRef(null);
  const featRef = useRef(null);
  const [active, setActive] = useState(0);
  const t = TURFS[active];

  /* anime.js — animate the featured panel whenever the selection changes */
  useEffect(() => {
    const root = featRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const img = root.querySelector(".feat-img");
    if (img) animate(img, { opacity: [0, 1], scale: [1.06, 1], duration: 700, ease: "outExpo" });
    animate(root.querySelectorAll(".feat-anim"), {
      translateY: [20, 0], opacity: [0, 1], delay: stagger(70), duration: 600, ease: "outExpo",
    });
    animate(root.querySelectorAll(".feat-slot"), {
      scale: [0.5, 1], opacity: [0, 1], delay: stagger(55, { start: 320 }), duration: 420, ease: "outBack",
    });
  }, [active]);

  /* section + list entrance on scroll */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".turf-head > *", {
        y: 28, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: rootRef.current, start: "top 80%", once: true },
      });
      gsap.from(".turf-split", {
        y: 40, opacity: 0, duration: 0.7, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".turf-split", start: "top 82%", once: true },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="turfs" ref={rootRef} className="bg-[#0A0A0A] py-24">
      <div className="turf-head mx-auto max-w-[1500px] px-6 sm:px-10 lg:px-16 xl:px-24">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">Play</p>
        <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Book a turf <span className="text-green-600">in seconds.</span>
        </h2>
        <p className="mt-4 max-w-xl text-white/60">
          Pick a venue, see live availability, and lock your slot — pay securely
          in the app.
        </p>
      </div>

      <div className="turf-split mx-auto mt-12 grid max-w-[1500px] grid-cols-1 gap-6 px-6 sm:px-10 lg:grid-cols-[1.3fr_1fr] lg:px-16 xl:px-24">
        {/* Featured panel */}
        <div ref={featRef} className="relative h-[460px] overflow-hidden rounded-3xl border border-white/10 lg:h-[540px]">
          <div className={`absolute inset-0 bg-gradient-to-br ${t.grad}`} />
          <img loading="lazy"
            key={t.image}
            src={t.image}
            alt={t.name}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="feat-img absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />

          <span className="feat-anim absolute left-5 top-5 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {t.rating}
          </span>

          <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
            <div className="feat-anim flex flex-wrap gap-2">
              {t.sports.map((sp) => (
                <span key={sp} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{sp}</span>
              ))}
            </div>
            <h3 className="feat-anim mt-3 text-3xl font-black leading-tight text-white lg:text-4xl">{t.name}</h3>
            <p className="feat-anim mt-1 inline-flex items-center gap-1.5 text-white/75">
              <MapPin className="h-4 w-4" /> {t.area}
            </p>

            <p className="feat-anim mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-green-400">Available today</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {t.slots.map((s) => (
                <span key={s} className="feat-slot rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-sm font-bold text-green-300">
                  {s}
                </span>
              ))}
            </div>

            <div className="feat-anim mt-6 flex items-center justify-between">
              <span className="text-2xl font-black text-white">{t.price}<span className="text-base font-semibold text-white/60">/hr</span></span>
              <button className="inline-flex w-auto items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-green-700">
                Book Now <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Turf list — scrolls internally on desktop */}
        <div
          data-lenis-prevent
          className="turf-list flex flex-col gap-3 overscroll-contain lg:max-h-[540px] lg:overflow-y-auto lg:pr-2"
        >
          {TURFS.map((turf, i) => {
            const on = i === active;
            return (
              <button
                key={turf.name}
                type="button"
                onClick={() => setActive(i)}
                className={`group flex items-center gap-4 rounded-2xl border p-3 text-left transition-all ${
                  on ? "border-green-600 bg-green-600/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                  <div className={`absolute inset-0 bg-gradient-to-br ${turf.grad}`} />
                  <img loading="lazy" src={turf.image} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate font-bold text-white">{turf.name}</h4>
                    <span className="shrink-0 text-sm font-black text-white">{turf.price}<span className="text-xs font-semibold text-white/50">/hr</span></span>
                  </div>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-white/50">
                    <MapPin className="h-3.5 w-3.5" /> {turf.area}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {turf.rating}</span>
                    <span>·</span>
                    <span className="truncate">{turf.sports.join(" · ")}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .turf-list { scrollbar-width: thin; scrollbar-color: rgba(21,167,101,0.6) transparent; }
        .turf-list::-webkit-scrollbar { width: 6px; }
        .turf-list::-webkit-scrollbar-thumb { background: rgba(21,167,101,0.6); border-radius: 9999px; }
        .turf-list::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </section>
  );
}

export default Turfs;
