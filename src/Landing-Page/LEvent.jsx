import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { assetUrl } from "../shared/lib/assetUrl";
import {
  Share2, X, LogIn, MapPin, Calendar, Award, ArrowRight, IndianRupee, Users, Loader2, Trophy,
} from "lucide-react";
import Carousel from "./LCarousel.jsx";
import { getTournamentType } from "../utils/sportTrack";
import defaultImg from "../assets/tournament.avif";

// ─── Tournament Detail Modal ─────────────────────────────────
const TournamentDetailModal = ({ tournament, onClose, onSignInPrompt }) => {
  if (!tournament) return null;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBD";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center overflow-y-auto p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-500" />

        {/* Close */}
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition z-50 w-auto">
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Hero Image */}
        <div className="relative h-56 md:h-64 overflow-hidden">
          <img
            src={tournament.tournamentLogo ? assetUrl('tournaments/' + tournament.tournamentLogo.split("\\").pop()) : defaultImg}
            alt={tournament.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = defaultImg; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-5 left-6 right-16">
            <span className="px-3 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full mb-2 inline-block">
              {getTournamentType(tournament) || "Tournament"}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              {tournament.title}
            </h1>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { icon: Award, label: "Organizer", value: tournament.organizerName, color: "text-orange-500 bg-orange-50" },
              { icon: MapPin, label: "Venue", value: tournament.eventLocation, color: "text-emerald-600 bg-emerald-50" },
              { icon: Calendar, label: "Date", value: formatDate(tournament.selectedDate || tournament.startDate), color: "text-blue-600 bg-blue-50" },
              { icon: IndianRupee, label: "Entry Fee", value: tournament.tournamentFee > 0 ? `₹${tournament.tournamentFee}` : "Free", color: "text-amber-600 bg-amber-50" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{item.value || "TBD"}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {tournament.description && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">About</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{tournament.description}</p>
            </div>
          )}

          {/* Rules */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rules & Guidelines</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["Arrive 30 minutes before start", "Valid photo ID required", "Proper sports gear mandatory", "Referee decisions are final"].map((rule, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-gray-900">Ready to compete?</h4>
              <p className="text-xs text-gray-500 mt-0.5">Sign in to secure your spot in this tournament</p>
            </div>
            <button
              onClick={onSignInPrompt}
              className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-orange-200 flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              Join Tournament <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Sign In Modal ───────────────────────────────────────────
const SignInModal = ({ onClose, message }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 20, opacity: 0 }}
      className="bg-white rounded-2xl max-w-sm w-full p-8 relative shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400 absolute top-0 left-0 right-0 rounded-t-2xl" />

      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-gray-100 transition w-auto">
        <X className="w-4 h-4 text-gray-400" />
      </button>

      <div className="text-center mt-4">
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-7 h-7 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Sign in required</h2>
        <p className="text-sm text-gray-500 mt-2">{message || "Sign in to access all tournament features."}</p>
      </div>

      <div className="mt-6 space-y-3">
        <a href="/login" className="block w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all text-center shadow-sm shadow-orange-200">
          Sign In
        </a>
        <button onClick={onClose} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-3 rounded-xl font-semibold text-sm transition-all">
          Continue as Guest
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Main Event Page ─────────────────────────────────────────
const Event = () => {
  const [searchParams] = useSearchParams();
  const deepLinkedTournamentId = searchParams.get("tournamentId");

  const [activeTab, setActiveTab] = useState("Live");
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInMessage, setSignInMessage] = useState("");

  const tabs = ["Live", "Upcoming", "History"];

  const handleSignInPrompt = (message) => {
    setSignInMessage(message || "Sign in to access all tournament features.");
    setShowSignInModal(true);
  };

  // Deep linking
  useEffect(() => {
    if (deepLinkedTournamentId) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const playStoreLink = "https://play.google.com/store/apps/details?id=com.chalokhelnesport.client";
      const appScheme = `chalokhelne://tournament/details/${deepLinkedTournamentId}`;

      if (isMobile) {
        const start = Date.now();
        window.location.href = appScheme;
        const timeout = setTimeout(() => {
          if (!document.hidden && (Date.now() - start < 2000)) {
            window.location.href = playStoreLink;
          }
        }, 1200);
        return () => clearTimeout(timeout);
      }

      (async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`/api/tournaments/${deepLinkedTournamentId}`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.tournament) setSelectedTournament(data.tournament);
          }
        } catch (err) { console.error("Deep link error:", err); }
      })();
    }
  }, [deepLinkedTournamentId]);

  useEffect(() => {
    document.body.style.overflow = (selectedTournament || showSignInModal) ? "hidden" : "";
  }, [selectedTournament, showSignInModal]);

  return (
    <div className="min-h-screen bg-white">
      {/* Carousel */}
      <Carousel />

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-[3px] bg-orange-500 rounded-full" />
              <span className="text-xs font-bold text-orange-500 uppercase tracking-[0.15em]">Explore</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Tournaments</h1>
            <p className="text-sm text-gray-400 mt-1">Find and join tournaments near you</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all w-auto ${
                activeTab === tab
                  ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tournament Cards */}
        <TournamentCards onTournamentClick={(t) => setSelectedTournament(t)} />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {deepLinkedTournamentId && !selectedTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-white flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Loading tournament...</h2>
            <p className="text-sm text-gray-400">Fetching tournament details</p>
            <a
              href="https://play.google.com/store/apps/details?id=com.chalokhelnesport.client"
              className="mt-8 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
            >
              Open in Chalo Khelne App →
            </a>
          </motion.div>
        )}

        {selectedTournament && (
          <TournamentDetailModal
            tournament={selectedTournament}
            onClose={() => setSelectedTournament(null)}
            onSignInPrompt={() => handleSignInPrompt("Sign in to join this tournament.")}
          />
        )}
        {showSignInModal && (
          <SignInModal
            onClose={() => setShowSignInModal(false)}
            message={signInMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Tournament Cards Grid ───────────────────────────────────
const TournamentCards = ({ onTournamentClick }) => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/tournaments", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setTournaments(data.tournaments || data);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "TBD";

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => <div key={i} className="h-[360px] rounded-2xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="text-center py-16">
      <p className="text-sm text-red-500">{error}</p>
    </div>
  );

  if (tournaments.length === 0) return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
        <Trophy className="w-7 h-7 text-orange-300" />
      </div>
      <h3 className="text-base font-bold text-gray-700">No tournaments found</h3>
      <p className="text-sm text-gray-400 mt-1">Check back soon for upcoming events</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tournaments.map((tournament) => (
        <motion.div
          key={tournament._id}
          whileHover={{ y: -6 }}
          transition={{ duration: 0.2 }}
          className="group rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-orange-300 hover:shadow-lg cursor-pointer transition-all"
          onClick={() => onTournamentClick(tournament)}
        >
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={tournament.tournamentLogo ? assetUrl('tournaments/' + tournament.tournamentLogo.split("\\").pop()) : defaultImg}
              alt={tournament.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.target.src = defaultImg; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                {getTournamentType(tournament) || "Tournament"}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const link = `${window.location.origin}/l/event?tournamentId=${tournament._id}`;
                navigator.clipboard.writeText(link);
              }}
              className="absolute top-3 right-3 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-all w-auto"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1 mb-3">
              {tournament.title}
            </h3>

            <div className="space-y-2 mb-4">
              {tournament.eventLocation && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{tournament.eventLocation}</span>
                </div>
              )}
              <p className="text-xs font-semibold text-gray-400">{tournament.organizerName}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Entry Fee</p>
                <p className={`text-sm font-bold ${tournament.tournamentFee > 0 ? "text-gray-900" : "text-emerald-600"}`}>
                  {tournament.tournamentFee > 0 ? `₹${tournament.tournamentFee}` : "Free"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Date</p>
                <p className="text-xs font-bold text-gray-700">{formatDate(tournament.selectedDate || tournament.startDate)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Event;
