import { HERO_SPORTS } from "../data";

export function ScrollingSportStrip() {
  const row = [...HERO_SPORTS, ...HERO_SPORTS];

  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-[#0A0A0A] py-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent" />

      <ul className="flex w-max gap-12 animate-marquee">
        {row.map((sport, i) => (
          <li key={`${sport.name}-${i}`} className="inline-flex items-center gap-3 text-white">
            <span className="text-3xl" aria-hidden="true">{sport.emoji}</span>
            <span className="whitespace-nowrap text-xl font-black uppercase tracking-tight">{sport.name}</span>
            <span className="ml-3 h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ScrollingSportStrip;
