import { ChevronDown } from "lucide-react";
import { SPORTS } from "../data";

/* The questions that quietly kill a deal if nobody answers them. Every answer
   below describes something that exists in the product today — deliberately,
   because the fastest way to lose an organizer is to promise on a landing page
   what the demo then cannot show. */
const FAQ = [
  {
    q: "Half my entries never turn up. Doesn't that wreck the draw?",
    a: "That is the part we built first. Players are checked in at the desk on the day, and the draw is generated from whoever is actually present — byes padded correctly — so a 53-entry list that becomes 22 players is a normal Sunday, not a crisis.",
  },
  {
    q: "Can I still take cash at the desk?",
    a: "Yes. Entry fees can be paid online, by UPI QR, or in cash at the desk — cash and transfers are recorded against the player with proof, and your manager verifies them. Presence and payment are tracked separately, so an unpaid player standing in front of you can still be drawn while the roster shows what they owe.",
  },
  {
    q: "Does it handle my sport?",
    a: `${SPORTS.length} sports today — ${SPORTS.slice(0, 6).map((s) => s.name).join(", ")} and more — each with its own scoring type and rules, served from our side rather than hardcoded per app. If yours is missing, ask: adding one is configuration, not a rebuild.`,
  },
  {
    q: "We run team events, not just singles.",
    a: "Team knockouts are supported with tie formats, alongside individual knockout, group stages and Swiss pairing. You pick the format per category, so a single tournament can mix them.",
  },
  {
    q: "My referees aren't technical.",
    a: "They score from their own phone, on a screen built for one match — their match. Officials are assigned per fixture with scoped permissions, so nobody can score a game they are not on, and there is nothing else on screen to get lost in.",
  },
  {
    q: "I need the draw on paper for the noticeboard.",
    a: "Bracket sheets export to PDF and entry lists to Excel. Print them, share them in the group, or send them to the association — the digital version keeps updating either way.",
  },
  {
    q: "My event is in three weeks. Is that enough time?",
    a: "Yes. Onboarding is a day, and the work you have already done carries over — an existing entry list imports straight from your spreadsheet rather than being re-typed. For a first event we will sit with you through the day itself.",
  },
  {
    q: "What does it cost?",
    // TODO(pricing): replace with the real number once it is set — this is one
    // of the four open blanks. Until then the honest move is to quote per
    // event, which is also the pricing shape organizers expect, and to use the
    // question to pull them into the form rather than fake a figure.
    a: "It depends on the size of the event, so we quote per tournament rather than publishing a number that would be wrong for most of them. Tell us your date and expected entries below and you will have a figure the same day.",
  },
];

/**
 * Rendered with native <details>/<summary> — keyboard accessible, works with
 * JavaScript disabled, and needs no state. The chevron rotates via the
 * `open` attribute rather than a class we would have to keep in sync.
 */
export function OrganizerFAQ() {
  return (
    <section id="faq" className="relative overflow-hidden bg-[#0A0A0A] py-24">
      <div className="relative mx-auto max-w-[900px] px-6 sm:px-10">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">
          Before you ask
        </p>
        <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
          The questions organizers <span className="text-green-600">actually ask.</span>
        </h2>

        <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-lg font-bold text-white transition-colors group-hover:text-green-400">
                  {q}
                </span>
                <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-white/40 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="mt-3 max-w-[70ch] pr-11 leading-relaxed text-white/60">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default OrganizerFAQ;
