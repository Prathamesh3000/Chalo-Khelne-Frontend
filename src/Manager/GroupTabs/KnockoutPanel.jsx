import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiFlag, FiEdit2, FiCheck, FiPlus, FiTable } from "react-icons/fi";
import { FaMedal } from "react-icons/fa";
import { assetUrl } from "../../shared/lib/assetUrl";
import { useGroupTabs } from "./GroupTabsContext";
import CourtPicker from "../components/CourtPicker";

export default function KnockoutPanel({ onOpenMatchModal, onOpenBulkScore }) {
  const navigate = useNavigate();
  const {
    tournamentId,
    knockoutMatchesByRound,
    setKnockoutMatchesByRound,
    tournamentCourts,
  } = useGroupTabs();
  const [openIndex, setOpenIndex] = useState(null);

  // Patches local state when CourtPicker changes a match's court — avoids
  // a full refetch. Walks every round, swaps the matching match in place.
  const handleCourtChange = (matchId, newName) => {
    setKnockoutMatchesByRound((prev) => {
      const next = {};
      Object.keys(prev).forEach((roundKey) => {
        next[roundKey] = (prev[roundKey] || []).map((m) =>
          m._id === matchId ? { ...m, courtNumber: newName } : m
        );
      });
      return next;
    });
  };

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }); }
    catch { return ""; }
  };

  if (Object.keys(knockoutMatchesByRound).length === 0) {
    return (
      <div className="w-full p-4 bg-white rounded-2xl">
        <div className="text-center py-8">
          <FiFlag size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Knockout Tournament Generated</h3>
          <p className="text-gray-500 mb-4">Generate knockout matches from the Super Players section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white rounded-2xl">
      {Object.entries(knockoutMatchesByRound).map(([roundName, matches], roundIndex) => (
        <div key={roundName} className="mb-6">
          {/* Round Header Accordion */}
          <div
            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${
              openIndex === roundIndex ? "bg-orange-500" : "bg-gray-100"
            }`}
            onClick={() => toggleAccordion(roundIndex)}
          >
            <h2 className={`text-[18px] font-[600] mb-0 ${openIndex === roundIndex ? "text-white" : "text-gray-900"}`}>
              {roundName.charAt(0).toUpperCase() + roundName.slice(1).replace("-", " ")} ({matches.length} matches)
            </h2>

            {matches.some((m) => m.status !== "completed" && m.status !== "COMPLETED") && (
              <button
                className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 mr-8 w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBulkScore(
                    matches,
                    null,
                    `Bulk Score Upload — ${roundName.charAt(0).toUpperCase() + roundName.slice(1).replace("-", " ")}`
                  );
                }}
              >
                Bulk Upload
              </button>
            )}

            <span className={`transform transition-transform duration-300 ${openIndex === roundIndex ? "rotate-180 text-white" : "text-gray-900"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" />
              </svg>
            </span>
          </div>

          {/* Expanded Matches */}
          <div className={`overflow-scroll transition-all duration-300 ${openIndex === roundIndex ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="space-y-4 mt-6">
              {matches.map((match) => (
                <KnockoutMatchCard
                  key={match._id}
                  match={match}
                  onClick={() => onOpenMatchModal(match)}
                  formatTime={formatTime}
                  courts={tournamentCourts}
                  onCourtChange={(newName) => handleCourtChange(match._id, newName)}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KnockoutMatchCard({ match, onClick, formatTime, courts, onCourtChange }) {
  const isP1Winner =
    match.winner?.playerId?.toString() === match.player1?.playerId?.toString() ||
    (match.winner?.playerName === match.player1?.playerName && match.player1?.playerName);
  const isP2Winner =
    match.winner?.playerId?.toString() === match.player2?.playerId?.toString() ||
    (match.winner?.playerName === match.player2?.playerName && match.player2?.playerName);
  const isCompleted = match.status === "completed" || match.status === "COMPLETED";
  const isInProgress = match.status === "in-progress" || match.status === "IN_PROGRESS";

  return (
    <div
      className={`relative bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden ${
        isCompleted ? "border-l-4 border-l-green-500" : isInProgress ? "border-l-4 border-l-yellow-500" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Left: Match Info */}
        <div className="flex-shrink-0 w-full lg:w-44 border-b lg:border-b-0 lg:border-r border-gray-100 pb-4 lg:pb-0 flex flex-col items-center lg:items-start pr-2">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="bg-[#F97316]/10 text-[#F97316] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
              {(match.roundName || match.round || "Knockout").replace("-", " ")}
            </span>
            <span className="bg-gray-100 text-gray-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
              M{match.matchNumber}
            </span>
            {[3, 5, 7].includes(match.matchFormat?.totalSets) && (
              <span className="bg-[#5E6AD2]/10 text-[#5E6AD2] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                Bo{match.matchFormat.totalSets}
              </span>
            )}
          </div>
          <div className="text-xl font-black text-gray-800">
            {formatTime(match.matchStartTime || match.startTime)}
            {match.matchEndTime && (
              <span className="text-sm font-bold text-gray-500 ml-1">
                → {formatTime(match.matchEndTime)}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 font-bold">
            <FiFlag size={12} className="text-[#F97316]" />
            <CourtPicker
              matchId={match._id}
              current={match.courtNumber}
              courts={courts}
              disabled={isCompleted}
              onChange={onCourtChange}
            />
          </div>
        </div>

        {/* Center: Players */}
        <div className="flex-1 flex items-center justify-between w-full px-4 sm:px-10">
          <PlayerAvatar player={match.player1} isWinner={isP1Winner} isCompleted={isCompleted} />

          <div className="flex flex-col items-center px-4 min-w-[80px]">
            <div className="text-[11px] font-black text-gray-300 italic mb-2 tracking-[0.2em]">VS</div>
            {isCompleted ? (
              <div className="bg-gray-900 text-white px-4 py-1.5 rounded-xl font-mono text-xl font-bold tracking-widest shadow-2xl">
                {(() => { const { readMatchResult } = require("../../shared/utils/matchResultUtils"); const r = readMatchResult(match); return r ? `${r.player1Score}-${r.player2Score}` : "0-0"; })()}
              </div>
            ) : isInProgress ? (
              <div className="flex flex-col items-center animate-pulse">
                <div className="text-yellow-600 font-black text-lg">
                  {match.liveScore?.player1Points || 0} : {match.liveScore?.player2Points || 0}
                </div>
                <div className="text-[10px] font-bold text-yellow-500 uppercase">Live Now</div>
              </div>
            ) : (
              <div className="w-16 h-1 bg-gray-100 rounded-full" />
            )}
          </div>

          <PlayerAvatar player={match.player2} isWinner={isP2Winner} isCompleted={isCompleted} />
        </div>

        {/* Right: Status */}
        <div className="flex-shrink-0 flex flex-row lg:flex-col items-center gap-3 lg:border-l border-gray-100 lg:pl-6">
          <div
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
              isCompleted ? "bg-green-100 text-green-700" : isInProgress ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {match.status?.toUpperCase()}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all"
          >
            <FiEdit2 size={18} />
          </button>
        </div>
      </div>

      {/* Winner Advancement */}
      {isCompleted && (
        <div className="flex items-center justify-center gap-3 mt-5 pt-4 border-t border-gray-50 border-dashed">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
            <FiCheck className="text-green-600" size={14} />
            <span className="text-[11px] font-black text-green-700 uppercase tracking-widest">
              {(isP1Winner ? match.player1?.playerName : match.player2?.playerName)} Advances
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerAvatar({ player, isWinner, isCompleted }) {
  if (!player) return null;
  return (
    <div className={`flex flex-col items-center text-center flex-1 transition-all ${isWinner ? "scale-110" : isCompleted ? "opacity-40" : ""}`}>
      <div className="relative">
        {player.playerId?.profileImage ? (
          <img
            src={assetUrl(player.playerId.profileImage)}
            alt={player.playerName}
            className={`w-16 h-16 rounded-full object-cover border-4 ${isWinner ? "border-green-400 shadow-xl" : "border-gray-100"}`}
          />
        ) : (
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black border-4 ${isWinner ? "border-green-400 bg-green-500 shadow-xl" : "border-gray-100 bg-[#F97316]"}`}>
            {player.playerName?.charAt(0) || "?"}
          </div>
        )}
        {isWinner && (
          <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-1 shadow-lg ring-2 ring-white">
            <FaMedal size={14} />
          </div>
        )}
      </div>
      <div className={`mt-3 font-black text-sm uppercase ${isWinner ? "text-green-700" : "text-gray-900"}`}>
        {player.playerName}
      </div>
      {player.seed && <div className="text-[10px] text-[#F97316] font-bold">SEED #{player.seed}</div>}
    </div>
  );
}
