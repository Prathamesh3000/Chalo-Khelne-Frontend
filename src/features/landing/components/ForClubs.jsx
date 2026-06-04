import { Check } from "lucide-react";
import { ROLE_CARDS } from "../data";

export function ForClubs() {
  return (
    <section id="for-clubs" className="bg-[#0A0A0A] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-500">
            For everyone
          </p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-tight tracking-tight text-white sm:text-5xl">
            One platform.<br />Every role.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {ROLE_CARDS.map((card) => (
            <article
              key={card.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-all hover:-translate-y-1"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25 blur-3xl transition-opacity group-hover:opacity-50"
                style={{ background: card.accent }}
              />
              <span
                className="relative inline-flex h-10 items-center rounded-full px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white"
                style={{ background: card.accent }}
              >
                {card.title}
              </span>
              <h3 className="relative mt-5 text-2xl font-black uppercase tracking-tight text-white">
                {card.tagline}
              </h3>
              <ul className="relative mt-5 space-y-3">
                {card.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-white/70">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: card.accent }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ForClubs;
