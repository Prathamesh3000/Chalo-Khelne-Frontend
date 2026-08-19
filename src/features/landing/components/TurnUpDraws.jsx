import { useLayoutEffect, useRef, useState } from "react";
import { Check, X, UserPlus, Shuffle, IndianRupee } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* A believable desk roster. `paid` is deliberately independent of presence —
   that separation is the actual product rule, not decoration: an unpaid player
   standing at the desk can still be checked in and drawn, and the roster shows
   what they owe so it can be collected. */
const ROSTER = [
  { name: "Aarav Sharma", paid: true, present: true },
  { name: "Priya Nair", paid: true, present: true },
  { name: "Rohit Deshmukh", paid: false, present: true },
  { name: "Ananya Iyer", paid: true, present: false },
  { name: "Vikram Singh", paid: true, present: true },
  { name: "Meera Joshi", paid: true, present: false },
  { name: "Karan Patel", paid: false, present: false },
  { name: "Sneha Reddy", paid: true, present: true },
];

const STEPS = [
  "Check players in at the desk, on a phone or a tablet.",
  "Add the walk-in who paid cash two minutes ago.",
  "Generate — the draw is built from who is actually present.",
  "Byes are padded correctly, so the bracket is valid either way.",
];

/** Smallest power of two that fits n entrants — how a knockout bracket sizes. */
function bracketSize(n) {
  let size = 2;
  while (size < n) size *= 2;
  return Math.max(size, 2);
}

/**
 * The standout capability, given its own section because it is the one thing
 * on this page that competitors cannot answer. Standard tournament software
 * builds the draw from the REGISTRATION list; this builds it from attendance.
 */
export function TurnUpDraws() {
  const rootRef = useRef(null);
  const [players, setPlayers] = useState(ROSTER);
  const [walkIns, setWalkIns] = useState(0);

  const present = players.filter((p) => p.present).length + walkIns;
  const registered = players.length + walkIns;
  const size = bracketSize(present);
  const byes = present > 0 ? size - present : 0;
  const owed = players.filter((p) => p.present && !p.paid).length * 300;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".tud-reveal", {
        y: 26,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: { trigger: rootRef.current, start: "top 78%", once: true },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const toggle = (i) =>
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, present: !p.present } : p))
    );

  return (
    <section
      id="turn-up-draws"
      ref={rootRef}
      className="relative overflow-hidden border-y border-white/10 bg-[#0A0A0A] py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/3 h-[30rem] w-[30rem]"
        style={{ background: "radial-gradient(circle, rgba(21,167,101,0.10), transparent 68%)" }}
      />

      <div className="relative mx-auto grid max-w-[1300px] grid-cols-1 gap-14 px-6 sm:px-10 lg:grid-cols-2 lg:items-center lg:px-16">
        {/* ── the story ───────────────────────────────────────── */}
        <div>
          <p className="tud-reveal font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">
            The problem nobody else solves
          </p>
          <h2 className="tud-reveal mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
            53 registered.
            <br />
            <span className="text-green-600">22 turned up.</span>
          </h2>
          <p className="tud-reveal mt-6 max-w-xl leading-relaxed text-white/65">
            Every organizer knows the morning. Half the entry list is missing,
            three people have arrived with cash in hand, and the draw you
            printed last night is already wrong — so you redraw it by hand,
            on paper, while everyone stands around waiting.
          </p>
          <p className="tud-reveal mt-4 max-w-xl leading-relaxed text-white/65">
            Other tournament software builds the bracket from the entry list.
            Ours builds it from the people standing in front of you.
          </p>

          <ul className="tud-reveal mt-8 space-y-3">
            {STEPS.map((s) => (
              <li
                key={s}
                className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm text-white/75"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-green-600/15 text-green-400">
                  <Check className="h-4 w-4" />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* ── the interactive proof ───────────────────────────── */}
        <div className="tud-reveal overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E0E] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-3.5">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
              Check-in
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Tournament day
            </span>
          </div>

          <div className="p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-black text-white">
                  {present}
                  <span className="text-white/30"> / {registered}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                  Checked in
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWalkIns((w) => w + 1)}
                className="inline-flex w-auto items-center gap-2 rounded-lg border border-white/15 px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition-colors hover:border-green-600/60 hover:text-white"
              >
                <UserPlus className="h-4 w-4" />
                Walk-in
              </button>
            </div>

            <ul className="mt-5 space-y-1.5">
              {players.map((p, i) => (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={p.present}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                      p.present
                        ? "border-green-600/40 bg-green-600/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25"
                    }`}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${
                        p.present ? "bg-green-600 text-white" : "bg-white/[0.06] text-white/35"
                      }`}
                    >
                      {p.present ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </span>
                    <span className={p.present ? "text-white" : "text-white/45"}>{p.name}</span>
                    {!p.paid && (
                      <span className="ml-auto inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                        <IndianRupee className="h-3 w-3" />
                        300 due
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {walkIns > 0 && (
                <li className="flex items-center gap-3 rounded-lg border border-green-600/40 bg-green-600/10 px-3.5 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-green-600 text-white">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  <span className="text-white">
                    {walkIns} walk-in{walkIns > 1 ? "s" : ""} at the desk
                  </span>
                </li>
              )}
            </ul>

            {/* the payoff */}
            <div className="mt-5 rounded-xl border border-green-600/30 bg-green-600/[0.07] p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-green-400">
                <Shuffle className="h-3.5 w-3.5" />
                Generated draw
              </div>
              {present > 1 ? (
                <p className="mt-2 text-sm text-white/80">
                  <span className="font-black text-white">{size}-player bracket</span> from{" "}
                  {present} present
                  {byes > 0 && <> · {byes} bye{byes > 1 ? "s" : ""} padded</>}
                  {owed > 0 && (
                    <>
                      {" "}
                      · <span className="text-amber-400">₹{owed} to collect</span>
                    </>
                  )}
                </p>
              ) : (
                <p className="mt-2 text-sm text-white/50">
                  Check someone in to build a draw.
                </p>
              )}
            </div>

            <p className="mt-3 text-center text-[11px] text-white/35">
              Tap a name to check them in or out — the draw resizes as you go.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TurnUpDraws;
