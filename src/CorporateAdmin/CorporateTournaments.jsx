import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { AuthContext } from "../context/AuthContext";
import { assetUrl } from "../shared/lib/assetUrl";
import {
  Trophy, Calendar, Users, MapPin, Loader2, ImageOff,
} from "lucide-react";
import { getSportName, getTournamentType } from "../utils/sportTrack";
import { CorporateShell } from "../shared/layout";

/** @typedef {import('@chalo/api-types').Tournament} Tournament */

const CorporateTournaments = () => {
  const { user } = useContext(AuthContext);

  // Phase 6: TanStack Query + shared client (was useState/useEffect + bare axios).
  // Caches by user, dedupes refetches, and routes through the auth/refresh
  // interceptors. Behavior (loading flag + tournaments list) is unchanged.
  const { data: tournaments = [], isLoading: loading } = useQuery({
    queryKey: ["corporate-tournaments", user?._id],
    queryFn: async () => {
      const res = await api.get(`/tournaments/corporate/${user._id}`);
      return res.data?.success ? res.data.tournaments : (res.data?.tournaments ?? []);
    },
    enabled: !!user?._id,
  });

  return (
    <CorporateShell searchPlaceholder="Search tournaments…">
      {/* Header */}
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
          <Trophy className="w-3.5 h-3.5" />
          Corporate · Tournaments
        </p>
        <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
          Our corporate tournaments
        </h1>
        <p className="mt-1 text-[13px] text-gray-400">
          View tournaments managed by your company's staff.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No tournaments found</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
            Your managers have not created any tournaments yet. Go to
            <span className="text-orange-300 font-semibold"> Staff Management </span>
            to add managers who can create tournaments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament._id} tournament={tournament} />
          ))}
        </div>
      )}
    </CorporateShell>
  );
};

function TournamentCard({ tournament }) {
  const isCompleted = new Date(tournament.endDate) < new Date();
  const tType = getTournamentType(tournament);
  const typeLabel = tType === "knockout + group stage" ? "Group + Knockout" : tType === "knockout" ? "Knockout" : "Group Stage";

  return (
    <article className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden transition hover:border-white/[0.12]">
      {/* Image */}
      <div className="h-36 bg-white/[0.04] overflow-hidden relative">
        {tournament.tournamentLogo ? (
          <img loading="lazy"
            src={assetUrl("tournaments/" + tournament.tournamentLogo.split("\\").pop())}
            alt={tournament.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-gray-600" />
          </div>
        )}
        <span className="absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/90 text-white"
          style={{ backdropFilter: "blur(8px)" }}>
          {getSportName(tournament)}
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-[14px] font-medium text-white mb-2 truncate" title={tournament.title}>
          {tournament.title}
        </h3>

        <div className="space-y-1.5 text-[12px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="font-mono tabular-nums">
              {new Date(tournament.startDate).toLocaleDateString()} — {new Date(tournament.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="truncate">{tournament.eventLocation || "TBD"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span>{typeLabel}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between items-center">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isCompleted ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"
          }`}>
            {isCompleted ? "Completed" : "Active"}
          </span>
        </div>
      </div>
    </article>
  );
}

export default CorporateTournaments;
