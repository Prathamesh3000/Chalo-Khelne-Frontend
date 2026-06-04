import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Zap } from "lucide-react";
import { BrandMark, Eyebrow, PageTitle } from "../../shared/ui";
import { LoginForm, ForgotPasswordForm } from "../../features/auth";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // 'login' | 'forgot'
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="relative flex items-center justify-center bg-[#F9FAFB] px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>

          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Eyebrow>Staff portal</Eyebrow>
                <PageTitle accent="back." size="lg" className="mt-4">
                  Welcome back.
                </PageTitle>
                <p className="mt-4 text-base text-gray-600 sm:text-lg">
                  Sign in to run tournaments, score matches, and manage your club.
                </p>

                <div className="mt-10">
                  <LoginForm
                    onSuccess={(path) => navigate(path)}
                    onForgotPassword={() => setMode("forgot")}
                  />
                </div>

                <div className="mt-10 rounded-xl border border-gray-200 bg-white p-4 text-xs leading-relaxed text-gray-500">
                  <p className="font-bold uppercase tracking-[0.18em] text-gray-900">
                    Staff access only
                  </p>
                  <p className="mt-2">
                    Provisioned by your administrator. Players and referees use the mobile app.
                  </p>
                  <Link
                    to="/l/home"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-orange-500 transition-colors hover:text-orange-600 w-auto"
                  >
                    Back to home <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Eyebrow>Reset password</Eyebrow>
                <PageTitle accent="password." size="lg" className="mt-4">
                  Reset password.
                </PageTitle>
                <div className="mt-10">
                  <ForgotPasswordForm onBack={() => setMode("login")} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#0A0A0A] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      {/* Decorative orbs + dot grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-orange-500/25 blur-[120px]" />
        <div className="absolute right-[-6rem] bottom-[-4rem] h-[24rem] w-[24rem] rounded-full bg-blue-500/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 80% 80% at 30% 30%, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 30% 30%, black 30%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative">
        <BrandMark tone="light" to="/l/home" />
      </div>

      <div className="relative z-10">
        <Eyebrow tone="light">Live · Now</Eyebrow>
        <h2 className="mt-5 max-w-md text-4xl font-black uppercase leading-[0.95] tracking-tight text-white xl:text-5xl">
          Score the moment.{" "}
          <span className="bg-gradient-to-br from-orange-500 to-orange-300 bg-clip-text text-transparent">
            Win the season.
          </span>
        </h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
          Real-time scoring, smart brackets, multi-sport from day one. Built for Indian amateur sports clubs.
        </p>
        <MiniScoreboard />
      </div>

      <div className="relative z-10 grid max-w-md grid-cols-3 gap-3 border-t border-white/10 pt-6">
        <Stat value="14" label="Sports" />
        <Stat value="Real-time" label="Scoring" />
        <Stat value="Web + Mobile" label="Surfaces" />
      </div>
    </aside>
  );
}

function MiniScoreboard() {
  return (
    <div
      className="relative mt-10 max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur"
      style={{ boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)" }}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-500/20 via-transparent to-blue-500/15 opacity-60 blur-2xl" />

      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <div className="inline-flex items-center gap-2">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-pulse-ring rounded-full bg-red-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Live</span>
          <span className="text-xs text-white/60">Over 12.4</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
          <Zap className="h-3 w-3 text-orange-500" /> Cricket
        </span>
      </div>

      <div className="space-y-1 px-4 py-4">
        <ScoreRow letter="M" color="bg-orange-500" name="Marlins" score="142" sub="/6" />
        <ScoreRow letter="B" color="bg-emerald-500" name="Blitz" score="98" sub="/3" leading />
      </div>

      <div className="border-t border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3 w-3" /> Court 2 · Pune Open
        </span>
      </div>
    </div>
  );
}

function ScoreRow({ letter, color, name, score, sub, leading }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-2 py-2 ${
      leading ? "bg-orange-500/10 ring-1 ring-inset ring-orange-500/20" : ""
    }`}>
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black text-white ${color}`}>
          {letter}
        </span>
        <span className="text-sm font-bold text-white">{name}</span>
      </div>
      <span className="text-xl font-black tabular-nums leading-none text-white">
        {score}<span className="text-sm font-bold text-white/40">{sub}</span>
      </span>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="text-lg font-black tabular-nums text-white">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</div>
    </div>
  );
}
