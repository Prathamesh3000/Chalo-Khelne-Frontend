import { toast } from "react-toastify";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiX } from "react-icons/fi";
import axios from "axios";
import { GroupTabsProvider, useGroupTabs } from "./GroupTabs";
import LeaguePanel from "./GroupTabs/LeaguePanel";
import TopPlayersPanel from "./GroupTabs/TopPlayersPanel";
import KnockoutPanel from "./GroupTabs/KnockoutPanel";
import BulkScoreUploadModal from "./BulkScoreUploadModal";
import BulkResultUploadModal from "./BulkResultUploadModal";
import { getCategories } from "../utils/sportTrack";

// ================================================
// THIN ORCHESTRATOR — 300 lines instead of 4000
// All panel logic lives in GroupTabs/ subfolder
// ================================================

export default function MGrouptabsV2({ tournamentId: propTournamentId }) {
  return (
    <GroupTabsProvider tournamentId={propTournamentId}>
      <TournamentGroupTabs />
    </GroupTabsProvider>
  );
}

function TournamentGroupTabs() {
  const navigate = useNavigate();
  const ctx = useGroupTabs();
  const {
    tournamentId, tournament, loading, error, groups,
    activeTab, setActiveTab,
    selectedCategory, setSelectedCategory,
    activeGroup, matchesData,
    activeRound2Group, round2MatchesData,
    currentGroup, currentRound2Group,
    getMatchFormat,
    fetchMatches, fetchRound2Groups, fetchKnockoutMatches,
    // STEP 11c — Multi-sport switcher
    activeSportId, handleSportSwitch,
  } = ctx;

  // ---- Modal State (kept local — only the orchestrator manages modals) ----
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [courtNumber, setCourtNumber] = useState("");
  const [matchInterval, setMatchInterval] = useState("");
  const [startTime, setStartTime] = useState("");

  // Match popup removed — now navigates to dedicated scoring page

  const [bulkScoreModal, setBulkScoreModal] = useState({ open: false, matches: [], groupId: null, title: "" });
  const [showCsvUpload, setShowCsvUpload] = useState(false);

  // ---- Early Returns ----
  if (!tournamentId) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error: No Tournament Selected</h2>
        <button onClick={() => navigate("/mtournament-management")} className="mt-4 bg-orange-500 text-white px-4 py-2 rounded">
          Back to Tournament Management
        </button>
      </div>
    );
  }
  if (loading) return <div className="p-4 text-center">Loading groups...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  if (!Array.isArray(groups) || groups.length === 0) return <div className="p-4 text-center">No groups found</div>;

  // ---- Handlers ----
  const handleGenerateMatches = async () => {
    const groupId = activeTab === "Top Players" ? activeRound2Group : activeGroup;
    if (!groupId) return;
    try {
      await axios.post("/api/tournaments/matches/generate", {
        tournamentId,
        groupId,
        courtNumber,
        matchInterval,
        startTime,
      });
      toast.success("Matches generated successfully!");
      setIsGenerateModalOpen(false);
      if (activeTab === "Top Players") {
        fetchRound2Groups();
      } else {
        fetchMatches(groupId);
      }
    } catch (err) {
      toast.error("Failed to generate matches: " + (err.response?.data?.message || err.message));
    }
  };

  const openMatchModal = (match) => {
    // Navigate to dedicated scoring page instead of modal
    navigate(`/tournament-management/match/${tournamentId}/${match._id}/score`, {
      state: { backTo: `/tournament-management/group-stage?tournamentId=${tournamentId}` },
    });
  };

  const openBulkScoreModal = (matchesArr, gId, title) => {
    const pending = matchesArr.filter((m) => m.status !== "completed" && m.status !== "COMPLETED");
    if (pending.length === 0) { toast.warn("No pending matches to score."); return; }
    setBulkScoreModal({ open: true, matches: pending, groupId: gId, title: title || "Bulk Score Upload" });
  };

  const handleEditGroup = (group) => {
    // Navigate to edit or open inline editor
    toast.info(`Edit group: ${group.groupName} (implement edit modal)`);
  };

  const { maxSets, setsToWin } = getMatchFormat();

  return (
    <div className="mt-6 bg-white p-4 rounded-[16px] shadow">
      {/* STEP 11c — Sport switcher (multi-sport tournaments only). Hidden
          for single-sport / legacy tournaments. */}
      {Array.isArray(tournament?.sports) && tournament.sports.length > 1 && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-3 flex items-center gap-2 overflow-x-auto mb-4">
          <span className="text-[11px] uppercase tracking-wider font-bold text-gray-500 mr-2 whitespace-nowrap flex-shrink-0">
            Sport
          </span>
          {tournament.sports.map((s) => {
            const isActive = String(s.sportId) === String(activeSportId);
            return (
              <button
                key={String(s.sportId)}
                onClick={() => handleSportSwitch(s.sportId)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {s.sportName}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-[20px]">
        {["League", "Top Players", "Knockout"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-[24px] py-[8px] rounded-full text-sm font-[400] w-auto transition lg:text-[18px] ${
              activeTab === tab ? "text-gray-900" : "text-gray-900 hover:text-black"
            }`}
            style={{
              border: activeTab === tab ? "1px solid #F97316" : "1px solid #EDEAEB",
              backgroundColor: activeTab === tab ? "transparent" : "#EDEAEB",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Category Filter — STEP 17b.ii: per-sport categories via helper */}
      {(() => {
        const _cats = getCategories(tournament, activeSportId);
        return _cats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
            Filter by Category
          </div>
          {_cats.map((cat) => (
            <button
              key={cat._id || cat.name}
              onClick={() => setSelectedCategory(cat.name === selectedCategory ? "" : cat.name)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all w-auto ${
                selectedCategory === cat.name
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-orange-500 hover:text-orange-500"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        );
      })()}

      {/* Panel Content */}
      {activeTab === "League" && (
        <LeaguePanel
          onEditGroup={handleEditGroup}
          onOpenMatchModal={openMatchModal}
          onOpenBulkScore={() =>
            openBulkScoreModal(matchesData[activeGroup] || [], activeGroup, `Bulk Score Upload — ${currentGroup?.groupName || "Group"}`)
          }
          onOpenCsvUpload={() => setShowCsvUpload(true)}
          onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
        />
      )}

      {activeTab === "Top Players" && (
        <TopPlayersPanel
          onOpenMatchModal={openMatchModal}
          onOpenBulkScore={() =>
            openBulkScoreModal(round2MatchesData[activeRound2Group] || [], activeRound2Group, `Bulk Score Upload — ${currentRound2Group?.groupName || "Round 2 Group"}`)
          }
          onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
          onOpenDirectKnockoutSchedule={() => toast.info("Open Direct Knockout Schedule (implement)")}
        />
      )}

      {activeTab === "Knockout" && (
        <KnockoutPanel
          onOpenMatchModal={openMatchModal}
          onOpenBulkScore={openBulkScoreModal}
        />
      )}

      {/* ---- MODALS ---- */}

      {/* Match Generation Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
          <div className="bg-white w-96 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Match Settings</h3>
              <FiX className="cursor-pointer" onClick={() => setIsGenerateModalOpen(false)} />
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="court-number">Court Number</label>
                <input id="court-number" type="text" className="w-full border p-2 mt-1 rounded" value={courtNumber} onChange={(e) => setCourtNumber(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="match-interval-minutes">Match Interval (minutes)</label>
                <input id="match-interval-minutes" type="number" className="w-full border p-2 mt-1 rounded" value={matchInterval} onChange={(e) => setMatchInterval(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="match-start-time">Match Start Time</label>
                <input id="match-start-time" type="time" className="w-full border p-2 mt-1 rounded" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <button
                className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold mt-4 hover:bg-gray-800"
                onClick={handleGenerateMatches}
              >
                {activeTab === "Top Players" ? "Generate Round 2 Matches" : "Generate Matches"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match scoring now uses dedicated page at /tournament-management/match/:tournamentId/:matchId/score */}

      {/* Bulk Score Upload Modal */}
      <BulkScoreUploadModal
        isOpen={bulkScoreModal.open}
        onClose={() => setBulkScoreModal({ open: false, matches: [], groupId: null, title: "" })}
        onSuccess={() => {
          fetchMatches();
          fetchRound2Groups();
          fetchKnockoutMatches();
        }}
        matches={bulkScoreModal.matches}
        tournamentId={tournamentId}
        groupId={bulkScoreModal.groupId}
        matchType="player"
        maxSets={maxSets}
        setsToWin={setsToWin}
        title={bulkScoreModal.title}
      />

      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <BulkResultUploadModal
          isOpen={showCsvUpload}
          onClose={() => setShowCsvUpload(false)}
          tournamentId={tournamentId}
          groupId={activeGroup}
          onSuccess={() => fetchMatches()}
        />
      )}
    </div>
  );
}
