import { X, Award, Calendar, MapPin, Phone, Mail, Star } from "lucide-react";

export default function RefereeDetailModal({ referee, onClose }) {
  if (!referee) return null;

  const name = referee.name || referee.userName || "Unknown";
  const sports = referee.sports || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-[#1D6A8B] p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg w-auto">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            {referee.profileImage ? (
              <img loading="lazy" src={referee.profileImage} alt={name} className="w-16 h-16 rounded-full object-cover border-3 border-white/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                {name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold">{name}</h2>
              {referee.email && <p className="text-blue-200 text-sm">{referee.email}</p>}
              {referee.certification && (
                <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full mt-1">
                  <Award className="w-3 h-3" /> {referee.certification}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {referee.bio && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">About</h4>
              <p className="text-sm text-gray-700">{referee.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {referee.experience && (
              <InfoItem icon={Calendar} label="Experience" value={`${referee.experience} years`} />
            )}
            {referee.location && (
              <InfoItem icon={MapPin} label="Location" value={referee.location} />
            )}
            {referee.phone && (
              <InfoItem icon={Phone} label="Phone" value={referee.phone} />
            )}
            {referee.rating && (
              <InfoItem icon={Star} label="Rating" value={`${referee.rating}/5`} />
            )}
          </div>

          {sports.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Sports</h4>
              <div className="flex flex-wrap gap-2">
                {sports.map((s, i) => (
                  <span key={i} className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                    {typeof s === "string" ? s : s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {referee.availability && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Availability</h4>
              <p className="text-sm text-gray-700">{referee.availability}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="text-sm font-semibold text-gray-800">{value}</div>
    </div>
  );
}
