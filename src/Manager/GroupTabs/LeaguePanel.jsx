import { toast } from "react-toastify";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiFlag, FiTable, FiEdit2, FiCheck, FiInfo, FiUpload } from "react-icons/fi";
import { useGroupTabs } from "./GroupTabsContext";
import { assetUrl } from "../../shared/lib/assetUrl";
import groupTabsApi from "./groupTabsApi";
import { getTournamentType, getCurrentStage, getQualifyPerGroup } from "../../utils/sportTrack";
import CourtPicker from "../components/CourtPicker";

export default function LeaguePanel({ onEditGroup, onOpenMatchModal, onOpenBulkScore, onOpenCsvUpload, onOpenGenerateModal }) {
  const navigate = useNavigate();
  const {
    tournamentId, tournament, groups,
    activeGroup, setActiveGroup,
    matchesData, setMatchesData, groupsWithMatches,
    filteredGroups, currentGroup,
    fetchMatches,
    activeSportId,
    tournamentCourts,
  } = useGroupTabs();

  const [standingsData, setStandingsData] = useState({});
  const [showStandings, setShowStandings] = useState(false);
  const [transitionLoading, setTransitionLoading] = useState(false);

  const fetchStandings = async (groupId) => {
    try {
      const res = await groupTabsApi.fetchStandings(tournamentId, groupId);
      if (res.data.success) {
        setStandingsData((prev) => ({ ...prev, [groupId]: res.data.data }));
      }
    } catch (err) {
      console.error("Error fetching standings:", err.message);
    }
  };

  const handleTransitionToKnockout = async () => {
    setTransitionLoading(true);
    try {
      const res = await groupTabsApi.transitionToKnockout(tournamentId);
      if (res.data.success) {
        toast.success("Transitioned to knockout successfully!");
      } else {
        toast.info(res.data.message || "Failed to transition");
      }
    } catch (err) {
      toast.info(err.response?.data?.message || "Error transitioning to knockout");
    } finally {
      setTransitionLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "Not scheduled";
    try {
      return new Date(isoString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return "Invalid Date"; }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return ""; }
  };

  const isCompleted = (status) => status === "completed" || status === "COMPLETED";
  const isInProgress = (status) => status === "in_progress" || status === "IN_PROGRESS";

  return (
    <div>
      {/* Group Selection Tabs */}
      <div className="flex space-x-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
        {filteredGroups.map((group, index) => (
          <button
            key={group._id}
            onClick={async () => {
              setActiveGroup(group._id);
              await fetchMatches(group._id);
            }}
            className={`px-4 py-2 text-sm w-auto font-semibold rounded-lg transition-all groupstabs whitespace-nowrap ${
              activeGroup === group._id
                ? "bg-[#F97316] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {group.groupName || `Group ${index + 1}`}
          </button>
        ))}
      </div>

      {currentGroup ? (
        <div className="w-full p-4 bg-white rounded-2xl">
          {/* Group Header */}
          <div className="flex justify-between items-center mb-0">
            <h2 className="text-[18px] font-[500] text-orange-500">
              {currentGroup.groupName || `Group ${groups.indexOf(currentGroup) + 1}`}
            </h2>
            {groupsWithMatches.has(currentGroup._id) ? (
              <div className="relative group">
                <button className="text-gray-400 cursor-not-allowed" disabled>
                  <FiEdit2 />
                </button>
                <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg py-2 px-3 bottom-full right-0 mb-2 w-56 z-50 shadow-lg text-center">
                  You can only edit groups if matches haven't been generated
                </div>
              </div>
            ) : (
              <button className="text-orange-500 hover:text-orange-700" onClick={() => onEditGroup(currentGroup)}>
                <FiEdit2 />
              </button>
            )}
          </div>

          {/* Player List */}
          <ol className="list-decimal pl-5 space-y-2 text-lg mb-4">
            {currentGroup.players?.map((player, index) => (
              <li key={player._id || index}>
                {player.userId?.name || player.userName || `Player ${index + 1}`}
              </li>
            ))}
          </ol>

          {/* Action Buttons */}
          <div className="flex items-center gap-[24px]">
            <button
              className="w-full bg-orange-500 text-white py-2 rounded-full text-[16px] font-[400] flex items-center justify-center gap-3"
              onClick={onOpenGenerateModal}
            >
              <FiFlag /> Generate Matches
            </button>

            <button
              className="w-full py-2 rounded-full text-[16px] font-[400] flex items-center justify-center gap-3 text-orange-500 bg-white hover:bg-transparent"
              style={{ border: "1px solid #F97316" }}
              onClick={() => {
                if (showStandings && standingsData[activeGroup]) {
                  setShowStandings(false);
                } else {
                  fetchStandings(activeGroup);
                  setShowStandings(true);
                }
              }}
            >
              <FiTable />
              {showStandings && standingsData[activeGroup] ? "Hide Standings" : "Standings"}
            </button>

            <button
              className="w-full py-2 rounded-full text-[16px] font-[400] flex items-center justify-center gap-3 text-gray-600 bg-white hover:bg-gray-50"
              style={{ border: "1px solid #E5E7EB" }}
              onClick={() =>
                navigate(`/tournament-management/group-stage/${tournamentId}/${activeGroup}/points-table`, {
                  state: { tournamentId, groupId: activeGroup, round: 1 },
                })
              }
            >
              Points Table (Full View)
            </button>

            {/* Bulk Upload Buttons */}
            {matchesData[activeGroup]?.length > 0 &&
              matchesData[activeGroup].some((m) => !isCompleted(m.status)) && (
                <>
                  <button
                    className="w-full py-2 rounded-full font-[500] flex items-center justify-center gap-3 text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md"
                    onClick={onOpenBulkScore}
                  >
                    <FiCheck /> Bulk Score Upload
                  </button>
                  <button
                    className="w-full py-2 rounded-full font-[500] flex items-center justify-center gap-3 text-orange-600 border-2 border-orange-300 bg-orange-50 hover:bg-orange-100"
                    onClick={onOpenCsvUpload}
                  >
                    <FiUpload /> Upload CSV/Excel
                  </button>
                </>
              )}
          </div>

          {/* Standings Table — STEP 17b.ii: per-sport qualifyPerGroup */}
          {showStandings && standingsData[activeGroup] && (
            <StandingsTable data={standingsData[activeGroup]} qualifyPerGroup={getQualifyPerGroup(tournament, activeSportId)} />
          )}

          {/* Transition to Knockout — STEP 17b.ii: per-sport type/stage */}
          {getTournamentType(tournament, activeSportId) === "knockout + group stage" &&
            getCurrentStage(tournament, activeSportId) !== "knockout" &&
            getCurrentStage(tournament, activeSportId) !== "completed" && (
              <div className="mt-4">
                <button
                  className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md disabled:opacity-50"
                  onClick={handleTransitionToKnockout}
                  disabled={transitionLoading}
                >
                  {transitionLoading ? "Processing..." : <><FiFlag /> Transition to Knockout</>}
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-1">
                  All group matches must be completed. Top {getQualifyPerGroup(tournament, activeSportId)} per group will qualify.
                </p>
              </div>
            )}

          {/* Matches List */}
          {matchesData[activeGroup]?.length > 0 && (
            <div className="mt-6">
              <h5 className="mb-3 text-lg font-semibold text-orange-500">
                Matches — {currentGroup.groupName || `Group ${groups.indexOf(currentGroup) + 1}`}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchesData[activeGroup].map((match, index) => (
                  <MatchCard
                    key={match._id || index}
                    match={match}
                    onClick={() => onOpenMatchModal(match)}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    courts={tournamentCourts}
                    onCourtChange={(newName) => {
                      setMatchesData((prev) => ({
                        ...prev,
                        [activeGroup]: (prev[activeGroup] || []).map((m) =>
                          m._id === match._id ? { ...m, courtNumber: newName } : m
                        ),
                      }));
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 mt-4">
          <FiInfo className="text-gray-400 text-3xl mb-4" />
          <p className="text-gray-600 font-semibold text-lg">No groups found for this category</p>
          <p className="text-gray-400 text-sm mt-1 max-w-sm text-center">
            Go to the <strong>Registered Players</strong> tab and create groups.
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function StandingsTable({ data, qualifyPerGroup }) {
  return (
    <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5">
        <h6 className="text-white text-sm font-bold">{data.groupName} — Standings</h6>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-center">P</th>
              <th className="px-3 py-2 text-center">W</th>
              <th className="px-3 py-2 text-center">L</th>
              <th className="px-3 py-2 text-center">Sets +/-</th>
              <th className="px-3 py-2 text-center">Pts +/-</th>
              <th className="px-3 py-2 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.standings.map((p, idx) => (
              <tr
                key={p.playerId}
                className={`border-t border-gray-100 ${p.qualified ? "bg-green-50" : ""} ${idx < qualifyPerGroup ? "font-semibold" : ""}`}
              >
                <td className="px-3 py-2 text-gray-500">{p.rank}</td>
                <td className="px-3 py-2 text-gray-900 flex items-center gap-1.5">
                  {p.playerName}
                  {p.qualified && <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">Q</span>}
                </td>
                <td className="px-3 py-2 text-center text-gray-600">{p.played}</td>
                <td className="px-3 py-2 text-center text-green-600 font-medium">{p.won}</td>
                <td className="px-3 py-2 text-center text-red-500">{p.lost}</td>
                <td className="px-3 py-2 text-center text-gray-600">{p.setsWon}-{p.setsLost}</td>
                <td className="px-3 py-2 text-center text-gray-600">{p.pointsScored}-{p.pointsConceded}</td>
                <td className="px-3 py-2 text-center font-bold text-orange-600">{p.totalPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchCard({ match, onClick, formatDate, formatTime, courts, onCourtChange }) {
  const isCompleted = match.status === "completed" || match.status === "COMPLETED";
  const isInProgress = match.status === "in_progress" || match.status === "IN_PROGRESS";

  const isWinner = (player) => {
    if (!match.winner || !player) return false;
    return (
      match.winner?.playerId?.toString() === player?.playerId?.toString() ||
      match.winner?.playerName === player?.userName
    );
  };

  return (
    <div
      className={`shadow-md rounded-lg p-4 cursor-pointer ${
        isCompleted ? "bg-green-50 border-l-4 border-green-500" :
        isInProgress ? "bg-yellow-50 border-l-4 border-yellow-500" : "bg-[#F5F7FA]"
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-orange-100 text-orange-600 rounded-full text-[12px] font-[500] px-2 py-1">
            R1 - M{match.matchNumber}
          </span>
          {[3, 5, 7].includes(match.matchFormat?.totalSets) && (
            <span className="bg-[#5E6AD2]/10 text-[#5E6AD2] rounded-full text-[12px] font-[500] px-2 py-1">
              Bo{match.matchFormat.totalSets}
            </span>
          )}
          <CourtPicker
            matchId={match._id}
            current={match.courtNumber}
            courts={courts}
            disabled={isCompleted}
            onChange={onCourtChange}
          />
          {isCompleted && <span className="bg-green-500 text-white text-[12px] px-2 py-1 rounded-full">Completed</span>}
          {isInProgress && <span className="bg-yellow-500 text-white text-[12px] px-2 py-1 rounded-full">In Progress</span>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="text-gray-500 bg-transparent w-auto">
          <FiEdit2 />
        </button>
      </div>

      <p className="text-center text-[16px] text-gray-900 font-[400] mb-2">
        {formatDate(match.startTime)}
        {formatTime(match.startTime) && ` • ${formatTime(match.startTime)}`}
        {match.matchEndTime && formatTime(match.matchEndTime) && ` → ${formatTime(match.matchEndTime)}`}
      </p>

      <div className="flex flex-col items-center">
        <PlayerRow player={match.player1} isWinner={isWinner(match.player1)} matchType={match.matchType} />
        <div className="text-gray-900 text-[14px] my-1 flex items-center gap-2">
          VS
          {isCompleted && (() => { const { readMatchResult } = require("../../shared/utils/matchResultUtils"); const r = readMatchResult(match); return r?.completed ? (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {r.player1Score}-{r.player2Score}
            </span>
          ) : null; })()}
        </div>
        <PlayerRow player={match.player2} isWinner={isWinner(match.player2)} matchType={match.matchType} />
      </div>

      {/* Live Score */}
      {isInProgress && match.liveScore && (
        <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
          <div className="text-sm text-yellow-700 font-medium flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" /> Live
          </div>
          <div className="text-lg font-bold text-gray-800">
            {match.liveScore.player1Points || 0} - {match.liveScore.player2Points || 0}
          </div>
          <div className="text-xs text-yellow-600 mt-1">
            Set {match.currentSet || 1}, Game {match.currentGame || 1}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player, isWinner, matchType }) {
  if (!player) return null;
  return (
    <div className="flex items-center gap-2 mb-1">
      {player.playerId?.profileImage ? (
        <img
          src={assetUrl(player.playerId.profileImage)}
          alt={player.userName}
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
          {player.userName?.charAt(0) || "?"}
        </div>
      )}
      <span className={`font-[500] text-[14px] ${isWinner ? "text-green-600" : "text-orange-500"}`}>
        {player.userName}
        {matchType === "doubles" && player.partner?.userName && (
          <span className="text-gray-400 font-normal"> & {player.partner.userName}</span>
        )}
      </span>
    </div>
  );
}
