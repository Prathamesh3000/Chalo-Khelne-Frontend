import { STATS } from "../data";
import { useInView, useCountUp } from "../../../shared/lib";

export function StatsBar() {
  const [ref, inView] = useInView({ threshold: 0.3 });

  return (
    <section
      ref={ref}
      className="relative bg-[#0A0A0A] py-20 sm:py-24"
      style={{ clipPath: "polygon(0 24px, 100% 0, 100% calc(100% - 24px), 0 100%)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "repeating-linear-gradient(135deg, transparent 0, transparent 12px, white 12px, white 13px)",
        }}
      />
      <div className="absolute inset-x-0 top-6 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-6 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-y-10 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <StatItem key={stat.label} stat={stat} active={inView} divider={i > 0} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatItem({ stat, active, divider }) {
  const value = useCountUp(stat.value, active);
  const formatted = stat.value >= 1000 ? value.toLocaleString("en-IN") : String(value);

  return (
    <li className={`flex flex-col items-center text-center sm:items-start sm:text-left ${divider ? "sm:border-l sm:border-white/10 sm:pl-8" : ""}`}>
      <span className="text-5xl font-black tabular-nums leading-none tracking-tight text-white sm:text-6xl lg:text-7xl">
        {formatted}<span className="text-orange-500">{stat.suffix}</span>
      </span>
      <span className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 sm:text-xs">
        {stat.label}
      </span>
    </li>
  );
}

export default StatsBar;
