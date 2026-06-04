import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Trophy, ArrowLeft, User, Crown } from "lucide-react";
import { Breadcrumbs } from "../shared/ui";

const SIG = "#5E6AD2";

const TIER_COLORS = {
  1: "#F5C31C",
  2: "#A8B2C0",
  3: "#CD7F32",
};

export default function TournamentLeaderboard() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard", tournamentId],
    queryFn: async () => {
      const res = await axios.get(
        `/api/tournaments/leaderboard/${tournamentId}/players`
      );
      return res.data;
    },
    enabled: !!tournamentId,
  });

  const players = data?.data?.players || data?.leaderboard || data?.players || [];
  const tournament = data?.data?.tournament || data?.tournament || {};

  if (isLoading) {
    return (
      <div className="p-6 max-w-[960px] mx-auto">
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-48 bg-neutral-200 rounded" />
          <div className="h-44 bg-neutral-100 rounded-2xl" />
          <div className="h-72 bg-neutral-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-[960px] mx-auto">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 text-center">
          <p className="text-[14px] font-semibold text-neutral-900">
            Couldn't load the leaderboard
          </p>
          <p className="text-[13px] text-neutral-500 mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="p-6 max-w-[960px] mx-auto">
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: "Tournaments", to: "/mtournament-management" },
          { label: tournament.title || "Manage tournament", to: `/tournament-management/group-stage?tournamentId=${tournamentId}` },
          { label: "Leaderboard" },
        ]}
      />
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-8 w-8 inline-flex items-center justify-center bg-white border border-neutral-200 hover:border-neutral-300 rounded-lg transition flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-0.5">
            Final rankings
          </p>
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-neutral-950 truncate">
            {tournament.title || "Tournament"}
          </h1>
        </div>
      </div>

      {top3.length >= 3 && (
        <div className="bg-neutral-950 rounded-2xl p-6 mb-5 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 30%, white 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 mb-5 text-center">
            Champions
          </p>
          <div className="relative grid grid-cols-3 gap-3 items-end">
            <PodiumSpot place={2} player={top3[1]} height="h-24" />
            <PodiumSpot place={1} player={top3[0]} height="h-32" />
            <PodiumSpot place={3} player={top3[2]} height="h-20" />
          </div>
        </div>
      )}

      <section>
        <div className="flex items-end justify-between mb-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-900">
            All players
            <span className="ml-2 font-mono tabular-nums text-neutral-500">
              {players.length}
            </span>
          </p>
        </div>

        {players.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl px-6 py-14 text-center">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 inline-flex items-center justify-center mb-3">
              <User className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-[14px] font-semibold text-neutral-900">
              No ranking data available
            </p>
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100">
                  <Th className="w-12 text-center">#</Th>
                  <Th>Player</Th>
                  <Th className="text-center">P</Th>
                  <Th className="text-center">W</Th>
                  <Th className="text-center">L</Th>
                  <Th className="text-right">Win %</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(rest.length ? rest : players).map((p, idx) => {
                  const rank = (rest.length ? 4 : 1) + idx;
                  const winRate =
                    p.totalMatches > 0
                      ? Math.round((p.totalWins / p.totalMatches) * 100)
                      : 0;
                  return (
                    <tr key={p.playerId || idx} className="hover:bg-neutral-50/60 transition">
                      <td className="px-4 py-2.5 text-center font-mono tabular-nums text-[12px] text-neutral-500">
                        {rank}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-[13px] font-medium text-neutral-900 truncate">
                          {p.playerName || "Unknown"}
                        </p>
                        {p.stageReached && (
                          <p className="text-[11px] text-neutral-500">
                            {p.stageReached}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono tabular-nums text-[12px] text-neutral-700">
                        {p.totalMatches || 0}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono tabular-nums text-[12px] text-emerald-700">
                        {p.totalWins || 0}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono tabular-nums text-[12px] text-rose-600">
                        {p.totalLosses || 0}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className="font-mono tabular-nums text-[13px] font-semibold"
                          style={{ color: SIG }}
                        >
                          {winRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PodiumSpot({ place, player, height }) {
  if (!player)
    return (
      <div className="flex flex-col items-center">
        <div className={`${height} w-full bg-white/5 rounded-t-xl`} />
      </div>
    );
  const color = TIER_COLORS[place];
  return (
    <div className="flex flex-col items-center text-center">
      {place === 1 && <Crown className="w-5 h-5 text-amber-300 mb-1" />}
      <p className="text-[13px] font-semibold text-white truncate max-w-full">
        {player.playerName || "—"}
      </p>
      <p className="text-[11px] text-neutral-400 mt-0.5 font-mono tabular-nums">
        {player.totalWins || 0}W · {player.totalLosses || 0}L
      </p>
      <div
        className={`${height} w-full rounded-t-xl mt-3 inline-flex items-center justify-center`}
        style={{
          background: `linear-gradient(180deg, ${color}40, ${color}10)`,
          borderTop: `2px solid ${color}`,
        }}
      >
        <span
          className="font-mono tabular-nums text-[28px] font-semibold"
          style={{ color }}
        >
          {place}
        </span>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400 ${className}`}
    >
      {children}
    </th>
  );
}
