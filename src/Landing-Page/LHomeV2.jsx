import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Carousel from "./LCarousel";
import { getSportName } from "../utils/sportTrack";

// ─── Animation helpers ──────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

const Section = ({ children, className = "" }) => (
  <motion.section
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-60px" }}
    className={className}
  >
    {children}
  </motion.section>
);

// ─── HERO ───────────────────────────────────────────────────────
const Hero = ({ navigate }) => (
  <section className="relative min-h-[100vh] flex items-center bg-gray-950 overflow-hidden">
    {/* Background image — full cover */}
    <div className="absolute inset-0">
      <img loading="lazy"
        src="https://images.unsplash.com/photo-1686776619157-1fa56b168992?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        alt=""
        className="w-full h-full object-cover"
      />
      {/* Dark overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/85 to-gray-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/60" />
    </div>

    {/* Content */}
    <div className="relative z-10 w-full px-6 sm:px-8 lg:px-16 py-24 lg:py-32">
      <div className="max-w-3xl">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-10 bg-gray-500" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
              Sports Management Platform
            </span>
          </div>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight"
        >
          Play. Compete.
          <br />
          <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            Dominate.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mt-6 text-lg text-slate-300/80 max-w-lg leading-relaxed"
        >
          Tournaments, venue booking, live scoring, coaching — the all-in-one
          platform for players, managers, and sports clubs across India.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-10 flex flex-wrap gap-4"
        >
          <button
            onClick={() => navigate("/l/event")}
            className="group px-7 py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 flex items-center gap-2"
          >
            Join Tournament
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
          <button
            onClick={() => navigate("/l/turf-content")}
            className="px-7 py-3.5 bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm font-bold rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all backdrop-blur-sm"
          >
            Book a Turf
          </button>
        </motion.div>

        {/* Metric chips */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="mt-14 flex flex-wrap gap-3"
        >
          {[
            { val: "15+", label: "Sports", dot: "bg-orange-400" },
            { val: "Live", label: "Scoring Engine", dot: "bg-red-400" },
            { val: "6", label: "User Roles", dot: "bg-green-400" },
            { val: "4", label: "Tournament Levels", dot: "bg-amber-400" },
          ].map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl backdrop-blur-sm"
            >
              <span className={`w-1.5 h-1.5 ${m.dot} rounded-full`} />
              <span className="text-white font-bold text-sm">{m.val}</span>
              <span className="text-slate-500 text-xs font-medium">{m.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>

    {/* Bottom gradient fade into next section */}
    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none" />
  </section>
);

// ─── FEATURES ───────────────────────────────────────────────────
import { MapPin as MapPinIcon, Trophy as TrophyIcon, Zap as ZapIcon, Users as UsersIcon, Newspaper as NewsIcon, ArrowLeftRight, ArrowRight as ArrowRightIcon } from "lucide-react";

import { activatable } from "../shared/utils/activatable";
const featureList = [
  { title: "Turf & Venue Booking", desc: "Browse facilities, check live slot availability, and book slots instantly with hourly pricing.", link: "/l/turf-content", icon: MapPinIcon, color: "bg-orange-500", light: "bg-orange-50 text-orange-500" },
  { title: "Tournament Engine", desc: "Group stage, knockout, team events with auto match generation, live scoring, and leaderboards.", link: "/l/event", icon: TrophyIcon, color: "bg-amber-500", light: "bg-amber-50 text-amber-600" },
  { title: "Training & Coaching", desc: "Find certified coaches near you. Book personal or group sessions and track your progress.", link: "/l/trainer", icon: ZapIcon, color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-600" },
  { title: "Player Community", desc: "Connect with players, share achievements, invite friends to tournaments. Built-in chat and feed.", link: "/l/social", icon: UsersIcon, color: "bg-violet-500", light: "bg-violet-50 text-violet-600" },
  { title: "Sports News", desc: "Tournament announcements, club updates, and training tips — all sports news in one feed.", link: "/l/news", icon: NewsIcon, color: "bg-cyan-500", light: "bg-cyan-50 text-cyan-600" },
  { title: "Equipment Exchange", desc: "Buy, sell, or donate sports gear. Top players pass on legacy equipment to upcoming talent.", link: "/l/event", icon: ArrowLeftRight, color: "bg-rose-500", light: "bg-rose-50 text-rose-600" },
];

const Features = ({ navigate }) => (
  <Section id="features" className="py-20 bg-[#F5F7FA]">
    <div className="max-w-6xl mx-auto px-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-14">
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-[3px] bg-orange-500 rounded-full" />
            <span className="text-xs font-bold text-orange-500 uppercase tracking-[0.15em]">Core Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
            Everything you need to
            <br />
            <span className="text-orange-500">dominate sports.</span>
          </h2>
        </motion.div>
        <motion.p variants={fadeUp} custom={1} className="mt-4 lg:mt-0 text-sm text-gray-500 max-w-xs lg:text-right leading-relaxed">
          From booking turfs to running full tournaments — one platform, every sport.
        </motion.p>
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {featureList.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              onClick={() => navigate(f.link)}
              className="group bg-white rounded-2xl border border-gray-100 hover:border-orange-200 p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Icon */}
              <div className={`w-12 h-12 ${f.light} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-5 h-5" />
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                {f.desc}
              </p>

              {/* Explore link */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 opacity-0 group-hover:opacity-100 transition-all duration-300">
                Explore <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </Section>
);

// ─── HOW IT WORKS ───────────────────────────────────────────────
const steps = [
  { num: "01", title: "Pick Your Sport", desc: "Choose from 15+ sports with pre-configured rules and scoring systems." },
  { num: "02", title: "Set Up", desc: "Create a tournament, book a venue, or find a trainer in minutes." },
  { num: "03", title: "Add Participants", desc: "Invite players, form groups, generate brackets automatically." },
  { num: "04", title: "Go Live", desc: "Track scores in real-time, manage matches, view live leaderboards." },
];

const HowItWorks = () => (
  <Section className="py-20 bg-slate-50">
    <div className="max-w-6xl mx-auto px-6">
      <motion.div variants={fadeUp} className="mb-12">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">How It Works</p>
        <h2 className="text-3xl font-bold text-slate-900">Up and running in 4 steps</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((s, i) => (
          <motion.div key={s.num} variants={fadeUp} custom={i} className="p-6 bg-white rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">{s.num}</span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </Section>
);

// ─── SPORTS GRID ────────────────────────────────────────────────
const sports = [
  "Cricket", "Football", "Badminton", "Table Tennis", "Tennis", "Basketball",
  "Volleyball", "Chess", "Hockey", "Kabaddi", "Pickleball", "Carrom",
];

const SportsGrid = () => (
  <Section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-6">
      <motion.div variants={fadeUp} className="mb-12">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Multi-Sport</p>
        <h2 className="text-3xl font-bold text-slate-900">15+ Sports Supported</h2>
        <p className="mt-2 text-sm text-slate-500">Each sport has custom scoring rules, match formats, and tournament configs.</p>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} className="flex flex-wrap gap-2">
        {sports.map((s) => (
          <span
            key={s}
            className="px-4 py-2 bg-slate-50 hover:bg-orange-50 hover:text-orange-700 border border-slate-100 hover:border-orange-200 rounded-lg text-sm font-medium text-slate-700 transition-colors cursor-default"
          >
            {s}
          </span>
        ))}
      </motion.div>
    </div>
  </Section>
);

// ─── TOURNAMENTS ────────────────────────────────────────────────
const Tournaments = ({ tournaments, navigate }) => (
  <Section className="py-20 bg-slate-50">
    <div className="max-w-6xl mx-auto px-6">
      <motion.div variants={fadeUp} className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Tournaments</p>
          <h2 className="text-3xl font-bold text-slate-900">Upcoming Events</h2>
        </div>
        <button
          onClick={() => navigate("/l/event")}
          className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
        >
          View all &rarr;
        </button>
      </motion.div>

      {tournaments.length === 0 ? (
        <motion.p variants={fadeUp} className="text-slate-400 text-sm py-12 text-center">
          No tournaments right now. Check back soon.
        </motion.p>
      ) : (
        <div className="space-y-3">
          {tournaments.slice(0, 5).map((t, i) => (
            <motion.div
              key={t._id}
              variants={fadeUp}
              custom={i}
              onClick={() => navigate("/l/event")}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                    {t.title}
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold uppercase shrink-0">
                    {getSportName(t) || "Sport"}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-400">
                  {t.eventLocation && <span>📍 {t.eventLocation}</span>}
                  {t.startDate && (
                    <span>
                      📅 {new Date(t.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                  <span>👤 {t.organizerName || "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className={`text-sm font-semibold ${t.tournamentFee > 0 ? "text-slate-900" : "text-green-600"}`}>
                  {t.tournamentFee > 0 ? `₹${t.tournamentFee}` : "Free"}
                </span>
                <span className="text-xs text-gray-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  View →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  </Section>
);

// ─── VENUES ─────────────────────────────────────────────────────
const Venues = ({ venues, navigate }) => (
  <Section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-6">
      <motion.div variants={fadeUp} className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Venues</p>
          <h2 className="text-3xl font-bold text-slate-900">Book a Facility</h2>
        </div>
        <button
          onClick={() => navigate("/l/turf-content")}
          className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
        >
          Browse all &rarr;
        </button>
      </motion.div>

      {venues.length === 0 ? (
        <motion.p variants={fadeUp} className="text-slate-400 text-sm py-12 text-center">
          No venues available yet.
        </motion.p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {venues.slice(0, 6).map((v, i) => {
            const minPrice = Math.min(...(v.sports || []).map((s) => s.pricePerHour || 0));
            return (
              <motion.div
                key={v._id}
                variants={fadeUp}
                custom={i}
                onClick={() => navigate("/l/turf-content")}
                className="bg-slate-50 hover:bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm overflow-hidden transition-all cursor-pointer group"
              >
                {/* Image */}
                <div className="h-36 bg-slate-200 overflow-hidden">
                  {v.images?.[0] ? (
                    <img loading="lazy"
                      src={v.images[0].startsWith("http") ? v.images[0] : `/uploads/${v.images[0]}`}
                      alt={v.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-slate-400">🏟️</div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                    {v.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {v.address?.area || v.address?.fullAddress || ""}{v.address?.city ? `, ${v.address.city}` : ""}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {(v.sports || []).slice(0, 2).map((s, si) => (
                        <span key={si} className="px-2 py-0.5 bg-white border border-slate-100 rounded text-[10px] font-medium text-slate-600">
                          {s.name}
                        </span>
                      ))}
                      {(v.sports || []).length > 2 && (
                        <span className="px-2 py-0.5 bg-white border border-slate-100 rounded text-[10px] text-slate-400">
                          +{v.sports.length - 2}
                        </span>
                      )}
                    </div>
                    {minPrice > 0 && (
                      <span className="text-xs font-semibold text-slate-700">₹{minPrice}/hr</span>
                    )}
                  </div>

                  {v.ratings?.average > 0 && (
                    <div className="mt-2 text-xs text-slate-400">
                      ⭐ {v.ratings.average.toFixed(1)} ({v.ratings.count})
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  </Section>
);

// ─── CTA ────────────────────────────────────────────────────────
const CTA = ({ navigate }) => (
  <Section className="py-20 bg-gray-900">
    <div className="max-w-3xl mx-auto px-6 text-center">
      <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white">
        Ready to get started?
      </motion.h2>
      <motion.p variants={fadeUp} custom={1} className="mt-3 text-sm text-slate-400">
        Join players, coaches, and organizers across India.
      </motion.p>
      <motion.div variants={fadeUp} custom={2} className="mt-8 flex justify-center gap-3">
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-orange-500/20"
        >
          Sign In
        </button>
        <button
          onClick={() => navigate("/l/event")}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold rounded-lg border border-white/10 transition-colors"
        >
          Browse Events
        </button>
      </motion.div>
    </div>
  </Section>
);

// ─── FOOTER ─────────────────────────────────────────────────────
const Footer = ({ navigate }) => (
  <footer className="bg-gray-950 pt-16 pb-8">
    <div className="max-w-6xl mx-auto px-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <div>
          <div className="text-lg font-bold text-white">Chalo Khelne</div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Multi-sport platform for tournament management, venue booking, and player community.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Platform</p>
          <div className="space-y-2 text-sm text-slate-500">
            {[
              ["Tournaments", "/l/event"],
              ["Venues", "/l/turf-content"],
              ["Trainers", "/l/trainer"],
              ["News", "/l/news"],
            ].map(([label, to]) => (
              <div key={label} {...activatable(() => navigate(to))} className="hover:text-slate-300 cursor-pointer transition-colors">
                {label}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Company</p>
          <div className="space-y-2 text-sm text-slate-500">
            {[
              ["About", "/about-us"],
              ["FAQ", "/faq"],
              ["Privacy", "/privacy-policy"],
              ["Terms", "/terms-and-conditions"],
            ].map(([label, to]) => (
              <div key={label} {...activatable(() => navigate(to))} className="hover:text-slate-300 cursor-pointer transition-colors">
                {label}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact</p>
          <div className="space-y-2 text-sm text-slate-500">
            <div>sales@chalokhelne.com</div>
            <div>+91 9272090926</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-6 text-xs text-slate-600 text-center">
        &copy; {new Date().getFullYear()} Chalo Khelne. All rights reserved.
      </div>
    </div>
  </footer>
);

// ─── MAIN ───────────────────────────────────────────────────────
export default function LHomeV2() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    axios
      .get("/api/tournaments")
      .then((r) => {
        const list = r.data?.tournaments || r.data || [];
        setTournaments(Array.isArray(list) ? list : []);
      })
      .catch(() => { });

    axios
      .get("/api/turfs?limit=200")
      .then((r) => {
        const list = r.data?.turfs || r.data || [];
        setVenues(Array.isArray(list) ? list : []);
      })
      .catch(() => { });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Hero navigate={navigate} />
      <Carousel />
      <Features navigate={navigate} />
      <HowItWorks />
      <SportsGrid />
      <Tournaments tournaments={tournaments} navigate={navigate} />
      <Venues venues={venues} navigate={navigate} />
      <CTA navigate={navigate} />
      <Footer navigate={navigate} />
    </div>
  );
}
