import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, MapPin, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0A0A0A] text-white">
      {/* Backdrop — gradient orbs + dot grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[36rem] w-[36rem] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute -right-20 top-40 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-12 pt-32 sm:px-6 sm:pt-36 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:px-8 lg:pb-20 lg:pt-44">
        {/* Copy */}
        <div>
          <Eyebrow />

          <h1
            className="mt-6 font-black uppercase leading-[0.92] tracking-[-0.02em] text-white"
            style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}
          >
            <WordLine words={["India's", "Sports"]} delay={0} />
            <WordLine words={["Tournament", "Platform"]} delay={4} accent={1} />
          </h1>

          <p
            className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl animate-hero-rise"
            style={{ animationDelay: "700ms" }}
          >
            Run tournaments. Score live. Build your sports community.
            One platform — web for staff, mobile for everyone else.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 animate-hero-rise" style={{ animationDelay: "820ms" }}>
            <a href="#inquire" className="cta-primary group">
              <span className="relative z-10">Start Your Club</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 -z-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:animate-shine group-hover:opacity-100"
              />
            </a>
            <Link to="/login" className="cta-ghost">
              <PlayCircle className="h-5 w-5" />
              Staff Sign In
            </Link>
          </div>
        </div>

        {/* Live scoreboard */}
        <div className="relative animate-hero-rise" style={{ animationDelay: "500ms" }}>
          <LiveScoreboard />
        </div>
      </div>

      <style>{`
        .cta-primary {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          height: 3.25rem;
          padding: 0 1.75rem;
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #ffffff;
          background: #F97316;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 16px 40px -10px rgba(249, 115, 22, 0.45);
          transition: transform 200ms ease-out, box-shadow 200ms ease-out, background 150ms;
          isolation: isolate;
          width: auto;
        }
        .cta-primary:hover  { background: #EA580C; transform: translateY(-2px); }
        .cta-primary:active { transform: translateY(0) scale(0.98); }

        .cta-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          height: 3.25rem;
          padding: 0 1.75rem;
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 0.5rem;
          background: transparent;
          transition: background 150ms, border-color 150ms, transform 200ms ease-out;
          width: auto;
        }
        .cta-ghost:hover  { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.4); transform: translateY(-2px); }
        .cta-ghost:active { transform: translateY(0) scale(0.98); }
      `}</style>
    </section>
  );
}

function Eyebrow() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 backdrop-blur">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-2 w-2 animate-pulse-ring rounded-full bg-orange-500 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
      </span>
      Built for Indian sports clubs
    </span>
  );
}

function WordLine({ words, delay = 0, accent }) {
  return (
    <span className="block overflow-hidden pb-2">
      {words.map((word, i) => (
        <span
          key={word}
          className="mr-[0.25em] inline-block align-bottom animate-hero-rise"
          style={{ animationDelay: `${(delay + i) * 90}ms` }}
        >
          {i === accent ? (
            <span className="bg-gradient-to-br from-orange-500 to-orange-300 bg-clip-text text-transparent">
              {word}.
            </span>
          ) : word}
        </span>
      ))}
    </span>
  );
}

function LiveScoreboard() {
  const [teamA] = useState({ score: 142, wickets: 6, flashKey: 0 });
  const [teamB, setTeamB] = useState({ score: 98, wickets: 3, last: "1", flashKey: 0 });
  const [overs, setOvers] = useState(12.4);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = setInterval(() => {
      const runs = [1, 1, 2, 4, 6][Math.floor(Math.random() * 5)];
      setTeamB((p) => ({
        score: p.score + runs,
        wickets: p.wickets,
        last: String(runs),
        flashKey: p.flashKey + 1,
      }));
      setOvers((p) => Number((p + 0.1).toFixed(1)));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto max-w-[26rem]">
      {/* Backdrop card */}
      <div className="absolute -right-4 top-10 hidden w-[22rem] -rotate-[5deg] rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:block">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          <span>Up next</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Court 2
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-semibold">
          <span className="text-white">Nashik Strikers</span>
          <span className="text-white/50">vs</span>
          <span className="text-white">Pune Tigers</span>
        </div>
        <div className="mt-3 border-t border-white/10 pt-2 text-xs text-white/50">
          Today · 6:30 PM · Cricket T10
        </div>
      </div>

      {/* Foreground LIVE card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl"
           style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), 0 8px 16px -4px rgba(0,0,0,0.15)" }}>
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-orange-500/30 via-transparent to-blue-500/20 opacity-50 blur-2xl" />

        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-3">
          <div className="inline-flex items-center gap-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-2.5 w-2.5 animate-pulse-ring rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-red-500">Live</span>
            <span className="text-xs text-white/60">· Innings 2 · Over {overs}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
            <Zap className="h-3 w-3 text-orange-500" /> Cricket
          </span>
        </div>

        <div className="space-y-2 px-5 py-5">
          <ScoreRow color="primary" letter="M" name="Mumbai Marlins" score={teamA.score} wickets={teamA.wickets} overs="20" flashKey={teamA.flashKey} dim />
          <ScoreRow color="success" letter="B" name="Bangalore Blitz" score={teamB.score} wickets={teamB.wickets} overs={String(overs)} flashKey={teamB.flashKey} leading lastBall={teamB.last} />
        </div>

        <div className="border-t border-white/10 bg-white/[0.03] px-5 py-3 text-xs">
          <p className="truncate text-white/70">
            <span className="font-bold text-white">Khan to Sharma,</span>{" "}
            <span className="font-black text-orange-500">{teamB.last}!</span>{" "}
            {teamB.last === "4" ? "Crisp drive through covers."
              : teamB.last === "6" ? "OVER the rope — flat and fast."
              : "pushed to mid-on for a quick single."}
          </p>
        </div>
      </div>

      {/* Stat pill */}
      <div className="absolute -bottom-5 left-6 hidden items-center gap-2 rounded-full border border-white/15 bg-[#0A0A0A] px-3.5 py-2 sm:inline-flex"
           style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.6)" }}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Required</span>
        <span className="text-sm font-black tabular-nums text-white">
          {Math.max(0, teamA.score - teamB.score + 1)} off {Math.max(0, Math.round((20 - overs) * 6))}
        </span>
        <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
          LIVE
        </span>
      </div>
    </div>
  );
}

function ScoreRow({ color, letter, name, score, wickets, overs, flashKey, leading, dim, lastBall }) {
  const ringMap = {
    primary: "bg-orange-500 text-white",
    success: "bg-emerald-500 text-white",
  };
  return (
    <div className={`flex items-center justify-between rounded-xl px-3 py-3 transition-colors ${
      leading ? "bg-orange-500/10 ring-1 ring-inset ring-orange-500/20" : "bg-transparent"
    }`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${ringMap[color] ?? ringMap.primary}`}>
          {letter}
        </span>
        <div>
          <div className={`text-sm font-bold ${dim ? "text-white/60" : "text-white"}`}>{name}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">{overs} ov</div>
        </div>
      </div>
      <div className="relative h-9 overflow-hidden text-right">
        <div key={flashKey} className="animate-score-tick-in text-3xl font-black tabular-nums leading-none text-white">
          {score}
          <span className="text-base font-bold text-white/40">/{wickets}</span>
          {leading && lastBall && (
            <span className="ml-2 inline-block rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-black text-orange-400">
              +{lastBall}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Hero;
