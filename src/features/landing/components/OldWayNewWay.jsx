import { useLayoutEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* The competitor here is not other software — it is a WhatsApp group and a
   spreadsheet, which are free and familiar. Naming that honestly, line by
   line, beats claiming to be "the complete solution". */
const ROWS = [
  ["Entries arrive in a WhatsApp group and get typed into a sheet",
   "One entry link. Players fill in their own details, by category"],
  ["“Has he paid?” — screenshots, memory, and a running argument",
   "Online, UPI QR or cash at the desk. Every rupee logged against a name"],
  ["The draw is printed the night before, then redone by hand at 8am",
   "Generated in seconds from whoever actually turned up"],
  ["Scores on a whiteboard, relayed to you by phone",
   "Scored on court by your referees, live everywhere the moment it happens"],
  ["Forty calls asking when their match is",
   "Every player sees their own next match and court"],
  ["Standings worked out at the end, and disputed",
   "Computed as each result lands, in front of everyone"],
  ["Results typed up on Monday, if at all",
   "Published before you leave the venue"],
  ["Last year's tournament exists on someone's dead phone",
   "Every event, entry and result kept and exportable"],
];

/**
 * Objection-handling in table form. An organizer who has run events on paper
 * for ten years does not need to be told software is good; they need to see
 * their own frustrations named accurately enough that it is obvious we have
 * stood at that desk too.
 */
export function OldWayNewWay() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ow-row", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: ".ow-table", start: "top 82%", once: true },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative overflow-hidden border-y border-white/10 bg-[#0A0A0A] py-24">
      <div className="relative mx-auto max-w-[1300px] px-6 sm:px-10 lg:px-16">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">
          What actually changes
        </p>
        <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
          You already have a system.
          <br />
          <span className="text-green-600">It runs on your Sunday.</span>
        </h2>

        <div className="ow-table mt-14 overflow-hidden rounded-2xl border border-white/10">
          {/* headers — hidden on mobile, where each row stacks and labels itself */}
          <div className="hidden grid-cols-2 border-b border-white/10 bg-white/[0.03] sm:grid">
            <div className="px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              WhatsApp + Excel
            </div>
            <div className="border-l border-white/10 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-green-400">
              Chalo Khelne
            </div>
          </div>

          {ROWS.map(([oldWay, newWay]) => (
            <div key={oldWay} className="ow-row grid grid-cols-1 border-b border-white/[0.07] last:border-b-0 sm:grid-cols-2">
              <div className="flex items-start gap-3 px-6 py-5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/35">
                  <X className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-relaxed text-white/45">{oldWay}</span>
              </div>
              <div className="flex items-start gap-3 border-t border-white/[0.07] bg-green-600/[0.04] px-6 py-5 sm:border-l sm:border-t-0">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-600/20 text-green-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-relaxed text-white/85">{newWay}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default OldWayNewWay;
