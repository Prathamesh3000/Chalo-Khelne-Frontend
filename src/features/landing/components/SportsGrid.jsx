import { SPORTS } from "../data";

export function SportsGrid() {
  return (
    <section id="sports" className="bg-[#0A0A0A] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-500">
            Multi-sport platform
          </p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-tight tracking-tight text-white sm:text-5xl">
            Built for every sport<br />you play.
          </h2>
        </div>

        <ul className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SPORTS.map((s) => (
            <li
              key={s.name}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:-translate-y-1 hover:bg-white/[0.05]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                style={{ background: s.accent }}
              />
              <span className="relative text-3xl">{s.emoji}</span>
              <p className="relative mt-3 text-base font-black uppercase tracking-tight text-white">
                {s.name}
              </p>
              <p className="relative mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                {s.scoring} scoring
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default SportsGrid;
