import { SPORTS } from "../data";

export function ScrollingSportStrip() {
  const loop = [...SPORTS, ...SPORTS];

  return (
    <div className="strip group relative overflow-hidden border-y border-white/10 bg-[#0A0A0A] py-6">
      {/* edge fades */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-[#0A0A0A] to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-[#0A0A0A] to-transparent" />

      <ul className="strip-track flex w-max items-center gap-12">
        {loop.map((sport, i) => (
          <li key={`${sport.name}-${i}`} className="inline-flex items-center gap-3 text-white">
            <span className="text-3xl" aria-hidden="true">{sport.emoji}</span>
            <span className="whitespace-nowrap text-xl font-black uppercase tracking-tight">
              {sport.name}
            </span>
            <span
              aria-hidden="true"
              className="ml-2 h-2 w-2 rounded-full"
              style={{ background: sport.accent, boxShadow: `0 0 12px ${sport.accent}` }}
            />
          </li>
        ))}
      </ul>

      <style>{`
        @keyframes strip-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .strip-track { animation: strip-scroll 36s linear infinite; }
        .strip:hover .strip-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .strip-track { animation: none; } }
      `}</style>
    </div>
  );
}

export default ScrollingSportStrip;
