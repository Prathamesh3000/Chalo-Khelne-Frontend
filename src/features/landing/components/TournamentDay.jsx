import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Written as the organizer's own day, in their order, not as a feature list.
   Someone deciding whether to use this for an event three weeks out is not
   buying "live scoring" — they are buying a Sunday that does not go wrong. */
const TIMELINE = [
  {
    when: "2 weeks before",
    title: "Entries open with one link",
    body: "Drop it in the WhatsApp group. Players enter their own details and pay as they register, by category. No forwarding forms, no re-typing names into a spreadsheet.",
  },
  {
    when: "The night before",
    title: "You already know who is coming",
    body: "The entry list is one list, not four. Paid, unpaid and pending are visible at a glance — so the only chasing left is the chasing worth doing.",
  },
  {
    when: "7:00 AM",
    title: "The desk opens",
    body: "Check players in on a phone as they arrive. Someone turns up who never registered? Add them at the desk, take the cash, and they are in.",
  },
  {
    when: "9:00 AM",
    title: "The draw, in seconds",
    body: "Generated from the people standing in front of you — not the list from last night. Byes padded, courts assigned, sheet printed or shared. This is the hour that used to cost you an hour.",
  },
  {
    when: "All day",
    title: "Your phone stops ringing",
    body: "Every player can see their own next match and court. Referees score from their own phones. Families who could not come watch it live. Nobody has to ask you.",
  },
  {
    when: "6:00 PM",
    title: "Results are already done",
    body: "Standings computed as the last score landed. Winners published before you have packed up the nets, instead of typed out on Monday night.",
  },
];

/**
 * The empathy section. TurnUpDraws proves the one capability nobody else has;
 * this one shows the organizer their whole day with it, which is what actually
 * gets a decision — people buy the outcome, not the module.
 */
export function TournamentDay() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".td-item", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.09,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".td-list", start: "top 80%", once: true },
      });
      gsap.from(".td-rail", {
        scaleY: 0,
        transformOrigin: "top center",
        duration: 1.1,
        ease: "power2.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".td-list", start: "top 80%", once: true },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="tournament-day"
      ref={rootRef}
      className="relative overflow-hidden bg-[#0A0A0A] py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/4 h-[32rem] w-[32rem]"
        style={{ background: "radial-gradient(circle, rgba(21,167,101,0.10), transparent 68%)" }}
      />

      <div className="relative mx-auto max-w-[1300px] px-6 sm:px-10 lg:px-16">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">
          Your next tournament
        </p>
        <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
          One Sunday, <span className="text-green-600">start to finish.</span>
        </h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-white/60">
          Not a feature list — the actual day, in the order it happens to you.
        </p>

        <ol className="td-list relative mt-14 max-w-3xl">
          {/* the rail */}
          <span
            aria-hidden="true"
            className="td-rail absolute bottom-6 left-[7px] top-3 w-px bg-gradient-to-b from-green-600 via-green-600/40 to-transparent"
          />
          {TIMELINE.map((step) => (
            <li key={step.when} className="td-item relative pb-10 pl-10 last:pb-0">
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 grid h-4 w-4 place-items-center rounded-full border-2 border-green-600 bg-[#0A0A0A]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-green-400">
                {step.when}
              </p>
              <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-white/60">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default TournamentDay;
