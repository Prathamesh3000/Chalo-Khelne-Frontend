import React, { useEffect, useState } from "react";
import { Share2, MapPin, Calendar, IndianRupee, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import defaultImg from "../assets/tournament.avif";
import { getTournamentType } from "../utils/sportTrack";
import { assetUrl } from "../shared/lib/assetUrl";

import { getAuthToken } from "../shared/api/authToken";
const TournamentsCard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch("/api/tournaments", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!response.ok) throw new Error("Failed to fetch tournaments");
        const data = await response.json();
        setTournaments(data.tournaments || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-[380px]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">Failed to load tournaments. Please try again.</p>
      </div>
    );
  }

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-7 h-7 text-orange-300" />
        </div>
        <h3 className="text-base font-bold text-gray-700">No tournaments available</h3>
        <p className="text-sm text-gray-400 mt-1">Check back soon for upcoming events</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {tournaments.map((tournament) => (
        <motion.div
          key={tournament._id}
          whileHover={{ y: -6 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-orange-300 hover:shadow-lg cursor-pointer transition-all group"
        >
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <img loading="lazy"
              src={
                tournament.tournamentLogo
                  ? assetUrl('tournaments/' + tournament.tournamentLogo.split("\\").pop())
                  : defaultImg
              }
              alt={tournament.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.target.src = defaultImg; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            {/* Type badge */}
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                {getTournamentType(tournament) || "Tournament"}
              </span>
            </div>

            {/* Share */}
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
              {tournament.organizerName && (
                <p className="text-xs font-semibold text-gray-500">{tournament.organizerName}</p>
              )}
              {tournament.eventLocation && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{tournament.eventLocation}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(tournament.selectedDate || tournament.startDate)}</span>
              </div>
              <span className={`text-sm font-bold ${tournament.tournamentFee > 0 ? "text-gray-900" : "text-emerald-600"}`}>
                {tournament.tournamentFee > 0 ? `₹${tournament.tournamentFee}` : "Free"}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default TournamentsCard;
