import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const IMG = (id) => `https://images.unsplash.com/${id}?q=80&w=800&auto=format&fit=crop`;

const POSTS = [
  { user: "Aarav S.", sport: "Cricket", caption: "Hat-trick today! 🔥", time: "2h", likes: 124, comments: 18, av: "from-orange-500 to-red-600", grad: "from-[#15A765] to-[#052e16]", image: IMG("photo-1540747913346-19e32dc3e97e") },
  { user: "Priya N.", sport: "Badminton", caption: "Finals tomorrow 💪", time: "4h", likes: 89, comments: 12, av: "from-pink-500 to-rose-600", grad: "from-[#3b82f6] to-[#1e3a8a]", image: IMG("photo-1626224583764-f87db24ac4ea") },
  { user: "Rahul K.", sport: "Football", caption: "We won the league! 🏆", time: "6h", likes: 256, comments: 41, av: "from-blue-500 to-indigo-600", grad: "from-[#F97316] to-[#7c2d12]", image: IMG("photo-1431324155629-1a6deb1dec8d") },
  { user: "Sneha P.", sport: "Tennis", caption: "New PR on my serve 🎾", time: "8h", likes: 67, comments: 9, av: "from-amber-500 to-orange-600", grad: "from-[#eab308] to-[#713f12]", image: IMG("photo-1554068865-24cecd4e34b8") },
  { user: "Vikram R.", sport: "Basketball", caption: "Buzzer beater! 🤯", time: "12h", likes: 198, comments: 27, av: "from-emerald-500 to-green-700", grad: "from-[#ef4444] to-[#7f1d1d]", image: IMG("photo-1546519638-68e109498ffc") },
  { user: "Megha D.", sport: "Volleyball", caption: "Spike of the day 💥", time: "1d", likes: 143, comments: 21, av: "from-cyan-500 to-blue-700", grad: "from-[#ec4899] to-[#831843]", image: IMG("photo-1612872087720-bb876e2e67d1") },
];

function PostCard({ p }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.6rem] bg-white shadow-2xl ring-1 ring-black/5">
      {/* media */}
      <div className="relative flex-1 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${p.grad}`} />
        <img
          src={p.image}
          alt={p.sport}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />

        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-900">{p.sport}</span>
        <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{p.time}</span>

        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
          <span className={`h-9 w-9 rounded-full bg-gradient-to-br ${p.av} ring-2 ring-white`} />
          <span className="text-sm font-bold text-white drop-shadow">{p.user}</span>
          <BadgeCheck className="h-4 w-4 text-green-400" />
        </div>
      </div>

      {/* footer */}
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-4 text-slate-800">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold"><Heart className="h-5 w-5 fill-red-500 text-red-500" /> {p.likes}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold"><MessageCircle className="h-5 w-5" /> {p.comments}</span>
          <Share2 className="ml-auto h-5 w-5 text-slate-500" />
        </div>
        <p className="mt-2 text-sm text-slate-700"><span className="font-bold">{p.user}</span> {p.caption}</p>
      </div>
    </div>
  );
}

export function Social() {
  const rootRef = useRef(null);
  const innerRef = useRef(null);
  const [active, setActive] = useState(2);
  const [paused, setPaused] = useState(false);
  const n = POSTS.length;

  /* auto-advance */
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % n), 3200);
    return () => clearInterval(id);
  }, [paused, n]);

  /* cursor tilt on the whole stack */
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = innerRef.current;
    const stage = el?.parentElement;
    if (!stage) return;
    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const ny = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `rotateX(${-ny * 6}deg) rotateY(${nx * 8}deg)`;
    };
    const reset = () => { el.style.transform = "rotateX(0deg) rotateY(0deg)"; };
    stage.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseleave", reset);
    return () => { stage.removeEventListener("mousemove", onMove); stage.removeEventListener("mouseleave", reset); };
  }, []);

  /* section reveal */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".social-head > *", {
        y: 26, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: rootRef.current, start: "top 78%", once: true },
      });
      gsap.from(".social-stage", {
        y: 50, opacity: 0, duration: 0.9, ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: rootRef.current, start: "top 72%", once: true },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const go = (dir) => setActive((a) => (a + dir + n) % n);

  return (
    <section id="social" ref={rootRef} className="relative overflow-hidden bg-[#0A0A0A] py-24">
      {/* glow */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2" style={{ background: "radial-gradient(circle, rgba(21,167,101,0.16), transparent 68%)" }} />

      <div className="social-head relative mx-auto max-w-[1500px] px-6 text-center sm:px-10 lg:px-16">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">Community</p>
        <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Your sports <span className="text-green-600">community.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          Follow players, share match highlights, and celebrate every win —
          a social feed built for your local sports scene.
        </p>
      </div>

      {/* 3D coverflow */}
      <div
        className="social-stage relative mx-auto mt-14 flex h-[460px] max-w-[1320px] items-center justify-center [perspective:1700px] sm:h-[580px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={innerRef} className="relative h-full w-full [transform-style:preserve-3d] [transition:transform_300ms_ease-out]">
          {POSTS.map((p, i) => {
            let offset = i - active;
            if (offset > n / 2) offset -= n;
            if (offset < -n / 2) offset += n;
            const abs = Math.abs(offset);
            const visible = abs <= 2;
            return (
              <button
                key={p.user}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${p.user} post`}
                className="absolute left-1/2 top-1/2 h-[400px] w-[300px] sm:h-[500px] sm:w-[360px]"
                style={{
                  transform: `translate(-50%, -50%) translateX(${offset * 60}%) translateZ(${-abs * 240}px) rotateY(${offset * -40}deg) scale(${Math.max(0.72, 1 - abs * 0.1)})`,
                  opacity: visible ? 1 - abs * 0.25 : 0,
                  zIndex: 100 - abs,
                  pointerEvents: visible ? "auto" : "none",
                  transition: "transform 0.6s cubic-bezier(.22,1,.36,1), opacity 0.6s",
                  filter: abs === 0 ? "none" : "brightness(0.7)",
                }}
              >
                <PostCard p={p} />
              </button>
            );
          })}
        </div>
      </div>

      {/* controls */}
      <div className="relative mt-6 flex items-center justify-center gap-5">
        <button type="button" onClick={() => go(-1)} aria-label="Previous" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-green-600 hover:text-green-500">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {POSTS.map((_, i) => (
            <button key={i} type="button" onClick={() => setActive(i)} aria-label={`Go to ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === active ? "w-7 bg-green-600" : "w-2 bg-white/25 hover:bg-white/40"}`} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-green-600 hover:text-green-500">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}

export default Social;
