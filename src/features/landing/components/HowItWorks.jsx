import { DoorOpen, GitBranch, Radio } from "lucide-react";
import { HOW_STEPS } from "../data";

const ICONS = [DoorOpen, GitBranch, Radio];

export function HowItWorks() {
  return (
    <section className="bg-[#0A0A0A] text-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-500">
            How it works
          </p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-tight tracking-tight sm:text-5xl">
            From inquiry to live<br />in three steps.
          </h2>
          <p className="mt-4 text-white/60 sm:text-lg">
            Your club is up and running in under a week. No setup fees, no migration drama.
          </p>
        </div>

        <ol className="mt-16 grid gap-6 lg:grid-cols-3">
          {HOW_STEPS.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <li
                key={step.n}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-colors hover:border-orange-500/40 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500/10 text-orange-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-5xl font-black tabular-nums text-white/15 group-hover:text-orange-500/30 transition-colors">
                    0{step.n}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black uppercase tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
