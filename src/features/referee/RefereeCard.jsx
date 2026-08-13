import { Award, Star, Mail } from "lucide-react";

/**
 * Single referee display card. Used in grid views.
 *
 * Props:
 * - referee: object
 * - onClick: () => void (optional — opens detail)
 * - compact: boolean (simpler card for read-only views)
 */
export default function RefereeCard({ referee, onClick, compact }) {
  const name = referee.name || referee.userName || "Unknown";
  const initial = name.charAt(0).toUpperCase();
  const sports = referee.sports || [];
  const certification = referee.certification || referee.level || "—";
  const experience = referee.experience || referee.yearsOfExperience || "—";
  const rating = referee.rating || referee.ratings?.average;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 overflow-hidden transition-all ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-gray-200" : ""
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 flex items-center gap-3">
        {referee.profileImage ? (
          <img loading="lazy" src={referee.profileImage} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-800 text-sm truncate">{name}</h3>
          {referee.email && !compact && (
            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 flex-shrink-0" /> {referee.email}
            </p>
          )}
        </div>
        {rating && (
          <div className="flex items-center gap-0.5 bg-yellow-50 px-2 py-1 rounded-lg">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold text-yellow-700">{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        {!compact && (
          <>
            <div className="flex items-center gap-2 text-xs">
              <Award className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-800">{certification}</span> • {experience} {typeof experience === "number" ? "yrs" : ""}
              </span>
            </div>
          </>
        )}

        {/* Sports Tags */}
        {sports.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sports.slice(0, compact ? 3 : 6).map((sport, i) => (
              <span key={i} className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                {typeof sport === "string" ? sport : sport.name || sport}
              </span>
            ))}
            {sports.length > (compact ? 3 : 6) && (
              <span className="text-[10px] text-gray-400">+{sports.length - (compact ? 3 : 6)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
