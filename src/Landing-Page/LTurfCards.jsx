import React from "react";
import { Star, MapPin, Navigation } from "lucide-react";
import { assetUrl } from "../shared/lib/assetUrl";
import { motion } from "framer-motion";

const TurfCards = ({ turf, onTurfClick }) => {
  const name = turf?.name || "Sports Turf";
  const rating = turf?.ratings?.average ? turf.ratings.average.toFixed(1) : null;
  const ratingCount = turf?.ratings?.count || 0;

  const address = turf?.address?.fullAddress || "Address unavailable";
  const areaCity = [turf?.address?.area, turf?.address?.city, turf?.address?.pincode].filter(Boolean).join(", ") || "";

  const sports = Array.isArray(turf?.sports) ? turf.sports : [];
  const minPrice = sports.length > 0 ? Math.min(...sports.map((s) => s.pricePerHour || 0)) : 0;
  const image = turf?.images?.[0] ? assetUrl(turf.images[0]) : null;

  return (
    <motion.div
      className="rounded-2xl overflow-hidden border border-gray-200 bg-white cursor-pointer hover:border-orange-300 hover:shadow-lg transition-all group h-full flex flex-col"
      onClick={() => onTurfClick?.(turf)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        {image ? (
          <img loading="lazy"
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
            <MapPin className="w-10 h-10 text-orange-200" />
          </div>
        )}

        {/* Rating badge */}
        {rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold text-white">{rating}</span>
          </div>
        )}

        {/* Price badge */}
        {minPrice > 0 && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg">
            <span className="text-xs font-bold text-gray-900">₹{minPrice}<span className="text-gray-400 font-normal">/hr</span></span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 flex-1">
            {name}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://maps.google.com/?q=${encodeURIComponent(address + " " + areaCity)}`, "_blank");
            }}
            className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors flex-shrink-0 w-auto"
            title="Get directions"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 line-clamp-1">{address}</p>
          {areaCity && <p className="text-[11px] text-gray-400 mt-0.5">{areaCity}</p>}
        </div>

        {/* Sports chips */}
        {sports.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {sports.slice(0, 3).map((sport, i) => (
              <span key={sport.name || i} className="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-0.5">
                {sport.name}
              </span>
            ))}
            {sports.length > 3 && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5">
                +{sports.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TurfCards;
