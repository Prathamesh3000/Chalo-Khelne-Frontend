import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Calendar, Users, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import defaultTournamentImg from "../assets/tournament.avif";

const fallbackSlides = [
  { _id: "f1", title: "State Badminton Championship 2026", sportsType: "Badminton", eventLocation: "Shivaji Sports Complex, Pune", startDate: "2026-04-10", status: "upcoming", tournamentFee: 500, participantCount: 64 },
  { _id: "f2", title: "Inter-Club Table Tennis League", sportsType: "Table Tennis", eventLocation: "PCMC Indoor Stadium", startDate: "2026-04-05", status: "active", tournamentFee: 0, participantCount: 32 },
  { _id: "f3", title: "Weekend Cricket Knockout", sportsType: "Cricket", eventLocation: "Balewadi Sports Complex", startDate: "2026-04-15", status: "upcoming", tournamentFee: 300, participantCount: 128 },
  { _id: "f4", title: "Chess Rapid Open 2026", sportsType: "Chess", eventLocation: "FC Road Chess Cafe, Pune", startDate: "2026-04-08", status: "upcoming", tournamentFee: 200, participantCount: 48 },
  { _id: "f5", title: "City Football 5-a-Side", sportsType: "Football", eventLocation: "T12 Sports Turf, Kothrud", startDate: "2026-04-12", status: "upcoming", tournamentFee: 1000, participantCount: 80 },
];


const formatDate = (d) => {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function Carousel() {
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);
  const [active, setActive] = useState(0);
  const touchStart = useRef(0);
  const autoRef = useRef(null);

  useEffect(() => {
    axios
      .get("/api/tournaments")
      .then((r) => {
        const list = r.data?.tournaments || r.data || [];
        const arr = Array.isArray(list) && list.length >= 3 ? list.slice(0, 7) : fallbackSlides;
        setSlides(arr);
        setActive(0);
      })
      .catch(() => {
        setSlides(fallbackSlides);
        setActive(0);
      });
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    autoRef.current = setInterval(() => {
      setActive((p) => (p + 1) % slides.length);
    }, 5000);
    return () => clearInterval(autoRef.current);
  }, [slides.length]);

  const resetAuto = () => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      setActive((p) => (p + 1) % slides.length);
    }, 5000);
  };

  const prev = () => { setActive((p) => (p - 1 + slides.length) % slides.length); resetAuto(); };
  const next = () => { setActive((p) => (p + 1) % slides.length); resetAuto(); };

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
  };

  if (slides.length === 0) return null;

  return (
    <div className="py-16 lg:py-24 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-orange-400 uppercase tracking-[0.2em]">Trending Now</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Upcoming Tournaments</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={prev} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-600 transition-colors w-auto">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={next} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-600 transition-colors w-auto">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cards Row */}
        <div
          className="relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <motion.div
            className="flex gap-5"
            animate={{ x: `-${active * (100 / Math.min(slides.length, 3))}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          >
            {slides.map((slide, i) => {
              const isLive = slide.status === "active";
              const hasImage = slide.tournamentLogo;

              return (
                <motion.div
                  key={slide._id || i}
                  className="flex-shrink-0 w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] cursor-pointer group"
                  onClick={() => navigate("/l/event")}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all h-full bg-white">
                    {/* Card Image */}
                    <div className="relative h-48">
                      <img loading="lazy"
                        src={hasImage ? slide.tournamentLogo : defaultTournamentImg}
                        alt={slide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.src = defaultTournamentImg; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent" />
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      {isLive ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500 text-white shadow-lg shadow-red-500/30">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          Live
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-sm text-white/90">
                          Upcoming
                        </span>
                      )}
                    </div>

                    {/* Sport Tag */}
                    <div className="absolute top-4 right-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/40 backdrop-blur-sm text-white/80">
                        {slide.sportsType || "Sport"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 bg-white">
                      <h3 className="text-gray-900 text-base font-bold leading-tight line-clamp-2 mb-3 group-hover:text-orange-600 transition-colors">
                        {slide.title}
                      </h3>

                      <div className="space-y-1.5 mb-4">
                        {slide.eventLocation && (
                          <div className="flex items-center gap-2 text-gray-500 text-xs">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{slide.eventLocation}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-gray-500 text-xs">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(slide.startDate)}</span>
                          </div>
                          {(slide.participantCount || slide.participants?.length > 0) && (
                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                              <Users className="w-3 h-3" />
                              <span>{slide.participantCount || slide.participants?.length} players</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className={`text-sm font-bold ${slide.tournamentFee > 0 ? "text-gray-900" : "text-emerald-600"}`}>
                          {slide.tournamentFee > 0 ? `₹${slide.tournamentFee}` : "Free Entry"}
                        </span>
                        <span className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-[11px] font-bold rounded-lg transition-colors group-hover:shadow-lg group-hover:shadow-orange-500/20">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActive(i); resetAuto(); }}
              className={`h-1.5 rounded-full transition-all duration-300 w-auto ${
                i === active ? "w-8 bg-orange-500" : "w-1.5 bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
