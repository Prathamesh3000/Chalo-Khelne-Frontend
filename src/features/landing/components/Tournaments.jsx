import { useLayoutEffect, useRef } from "react";
import { MapPin, Calendar, ArrowUpRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const IMG = (id) => `https://images.unsplash.com/${id}?q=80&w=800&auto=format&fit=crop`;

const TOURNAMENTS = [
  { name: "Mumbai Premier League", sport: "Cricket", date: "May 4", city: "Mumbai", meta: "₹50,000 Prize", status: "live", grad: "from-[#F97316] to-[#7c2d12]", image: IMG("photo-1540747913346-19e32dc3e97e") },
  { name: "Pune Futsal Showdown", sport: "Football · 5s", date: "Apr 28", city: "Pune", meta: "₹20,000 Pool", status: "filling", grad: "from-[#15A765] to-[#052e16]", image: IMG("photo-1431324155629-1a6deb1dec8d") },
  { name: "Bangalore Smash Open", sport: "Badminton", date: "May 2", city: "Bangalore", meta: "Singles & Doubles", status: "open", grad: "from-[#3b82f6] to-[#1e3a8a]", image: IMG("photo-1626224583764-f87db24ac4ea") },
  { name: "Nashik Box Cricket Bash", sport: "Box Cricket", date: "May 10", city: "Nashik", meta: "Corporate Cup", status: "open", grad: "from-[#8b5cf6] to-[#3b0764]", image: IMG("photo-1593766827228-8737b4534aa6") },
  { name: "Delhi Pickleball Classic", sport: "Pickleball", date: "May 6", city: "Delhi", meta: "Open Draw", status: "open", grad: "from-[#22c55e] to-[#14532d]", image: IMG("photo-1554068865-24cecd4e34b8") },
  { name: "Hyderabad Hoops", sport: "Basketball", date: "May 14", city: "Hyderabad", meta: "3x3 League", status: "open", grad: "from-[#ef4444] to-[#7f1d1d]", image: IMG("photo-1546519638-68e109498ffc") },
  { name: "Chennai Volley Cup", sport: "Volleyball", date: "May 18", city: "Chennai", meta: "Club Teams", status: "upcoming", grad: "from-[#ec4899] to-[#831843]", image: IMG("photo-1612872087720-bb876e2e67d1") },
];

const STATUS = {
  live: { label: "Live", cls: "bg-red-500 text-white", dot: true },
  filling: { label: "Filling fast", cls: "bg-amber-500 text-black", dot: false },
  open: { label: "Registration open", cls: "bg-green-600 text-white", dot: false },
  upcoming: { label: "Upcoming", cls: "bg-white/15 text-white", dot: false },
};

function Card({ t }) {
  const s = STATUS[t.status];
  return (
    <article className="group relative h-[440px] w-[300px] shrink-0 overflow-hidden rounded-3xl border border-white/10 sm:w-[340px]">
      {/* gradient fallback */}
      <div className={`absolute inset-0 bg-gradient-to-br ${t.grad}`} />

      {/* photo */}
      <img
        src={t.image}
        alt={t.name}
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />

      {/* status badge */}
      <span className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${s.cls}`}>
        {s.dot && (
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        )}
        {s.label}
      </span>

      {/* content */}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-green-400">{t.sport}</span>
        <h3 className="mt-1.5 text-2xl font-black leading-[1.05] text-white">{t.name}</h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/75">
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {t.date}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {t.city}</span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-4">
          <span className="text-sm font-bold text-white">{t.meta}</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-transform group-hover:translate-x-0.5">
            Register <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function Tournaments() {
  const rootRef = useRef(null);
  const trackRef = useRef(null);

  useLayoutEffect(() => {
    // Desktop/laptop ONLY (>=1024px): pin the section and scrub the cards
    // horizontally. gsap.matchMedia() auto-reverts (kills the ScrollTrigger and
    // clears the x transform) below 1024px, so phones/tablets keep their native
    // horizontal swipe-scroll and never get pinned — even after a resize.
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const track = trackRef.current;
      const amount = () => track.scrollWidth - window.innerWidth + 96;
      gsap.to(track, {
        x: () => -amount(),
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: () => "+=" + amount(),
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      id="tournaments"
      ref={rootRef}
      className="relative overflow-hidden bg-[#0A0A0A] py-20 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:py-0"
    >
      {/* Heading */}
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">
          Compete
        </p>
        <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Tournaments <span className="text-green-600">every week.</span>
        </h2>
        <p className="mt-4 max-w-xl text-white/60">
          Discover open tournaments near you, register in seconds, and pay
          through the app — across 14 sports.
        </p>
      </div>

      {/* Cards track */}
      <div className="mt-10 flex gap-6 overflow-x-auto px-6 pb-4 [scrollbar-width:none] sm:px-10 lg:mt-12 lg:overflow-visible lg:px-16 xl:px-24 [&::-webkit-scrollbar]:hidden">
        <div ref={trackRef} className="flex gap-6 will-change-transform">
          {TOURNAMENTS.map((t) => (
            <Card key={t.name} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Tournaments;
