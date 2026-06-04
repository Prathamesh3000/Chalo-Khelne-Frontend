import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Dumbbell, Mail, Globe, Calendar, Search, User, Loader2, AlertCircle } from "lucide-react";
import { ManagerShell } from "../shared/layout";

const MTrainers = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchTrainers = useCallback(async () => {
    try {
      const response = await axios.get("/api/trainer/trainers");
      setTrainers(response.data);
    } catch (err) {
      setError("Failed to load trainers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrainers(); }, [fetchTrainers]);

  const filtered = trainers.filter((t) => {
    const name = t.userId?.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <ManagerShell searchPlaceholder="Search trainers…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Dumbbell className="w-3.5 h-3.5" />
            Management · Trainers
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Trainers
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {trainers.length} trainer{trainers.length === 1 ? "" : "s"} available.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainers…"
            className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-[#181A22] border border-red-500/20 rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-red-500/15 inline-flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-[14px] font-medium text-white">{error}</p>
          <button
            onClick={fetchTrainers}
            className="mt-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Dumbbell className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No trainers found</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
            {search ? "Try a different search." : "No trainers registered yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((trainer) => (
            <TrainerCard key={trainer._id} trainer={trainer} />
          ))}
        </div>
      )}
    </ManagerShell>
  );
};

function TrainerCard({ trainer }) {
  const name = trainer.userId?.name || "Unknown";
  const email = trainer.userId?.email || "";
  const sports = trainer.sports || [];
  const languages = trainer.languages || [];
  const profileImage = trainer.profileImage ? `/uploads/${trainer.profileImage}` : null;
  const initial = name.charAt(0)?.toUpperCase() || "T";

  return (
    <article className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden group transition hover:border-white/[0.12]">
      {/* Avatar banner */}
      <div className="h-28 bg-gradient-to-br from-orange-500/[0.18] to-orange-500/[0.06] flex items-center justify-center relative">
        {profileImage ? (
          <img
            src={profileImage}
            alt={name}
            className="w-20 h-20 rounded-full object-cover"
            style={{ border: "3px solid #181A22" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-orange-500/15 grid place-items-center text-orange-400 text-[24px] font-medium" style={{ border: "3px solid #181A22" }}>
            {initial}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-[14px] font-medium text-white text-center truncate group-hover:text-orange-300 transition">{name}</h3>
        {email && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 mt-1 truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        )}

        {/* Sports tags */}
        {sports.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-3">
            {sports.map((s, i) => (
              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Details */}
        {(languages.length > 0 || trainer.dob || trainer.bio) && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
            {languages.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <Globe className="w-3 h-3 text-gray-500 flex-shrink-0" />
                <span className="truncate">{languages.join(", ")}</span>
              </div>
            )}
            {trainer.dob && (
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <Calendar className="w-3 h-3 text-gray-500 flex-shrink-0" />
                <span className="font-mono tabular-nums">{new Date(trainer.dob).toLocaleDateString("en-IN")}</span>
                {trainer.gender && <><span className="text-gray-600">·</span><span className="capitalize">{trainer.gender}</span></>}
              </div>
            )}
            {trainer.bio && (
              <p className="text-[11px] text-gray-500 line-clamp-2 mt-1.5">{trainer.bio}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default MTrainers;
