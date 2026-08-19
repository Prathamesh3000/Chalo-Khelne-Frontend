import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { FaMedal } from "react-icons/fa";
import { assetUrl } from "../shared/lib/assetUrl";
// TODO(runtime): confirm profile-image DB format. If it stores a BARE filename
// (not "profiles/x.jpg"), switch these avatars to assetUrl('profiles/' + x).
import {
  FiFlag,
  FiTable,
  FiX,
  FiEdit2,
  FiCheck,
  FiInfo,
  FiPlus,
  FiUpload,
  FiTrash2,
  FiUserPlus,
  FiShield,
} from "react-icons/fi";
import sports_tennis from "../assets/sports_tennis.png";
import medal from "../assets/medal.png";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import BulkScoreUploadModal from "./BulkScoreUploadModal";
import BulkResultUploadModal from "./BulkResultUploadModal";
import AssignUmpireModal from "./Tournament/AssignUmpireModal";
import CourtPoolPreview from "./components/CourtPoolPreview";
import CourtPicker from "./components/CourtPicker";
import KnockoutFormatPanel, { hasFormatPanelErrors } from "./components/KnockoutFormatPanel";
import { buildRequestRounds, isSetBasedSport } from "./utils/knockoutDefaults";
import { getAuthToken } from "../shared/api/authToken";
import DialogA11y from "../shared/components/DialogA11y";
import {
  getCategories,
  getMatchFormat as getMatchFormatHelper,
  getQualifyPerGroup,
  getTournamentType,
  getCurrentStage,
  resolveSetsToWin,
} from "../utils/sportTrack";

// Resolve umpire display name from match.referee (Phase 2).
// Handles nested object (group-style) and bare ObjectId (direct-knockout) shapes.
const getUmpireName = (referee) => {
  if (!referee) return null;
  if (typeof referee === "string") return "Assigned";
  return referee.name || referee.userName || "Assigned";
};

// ── Cricket-aware score helpers ──────────────────────────────────────────────
// Cricket (scoringType "innings") never writes sets/liveScore.player1Points; its
// runs/wickets live in result.innings[]. The list/modal must read that instead.
const isCricketMatch = (m) => {
  const st = (m?.scoringType || m?.matchFormat?.scoringType || m?.liveMatchData?.scoringType || "").toLowerCase();
  if (st === "innings") return true;
  return /cricket|baseball/i.test(m?.sportName || m?.liveMatchData?.sportName || "");
};
// Pull the freshest innings array (live-state first, then persisted result).
const getCricketInnings = (m) => {
  const ls = m?.liveMatchData?.liveScore;
  if (ls && ls.scoringType === "innings" && Array.isArray(ls.innings) && ls.innings.length) return ls.innings;
  if (Array.isArray(m?.liveMatchData?.result?.innings) && m.liveMatchData.result.innings.length) return m.liveMatchData.result.innings;
  if (Array.isArray(m?.result?.innings) && m.result.innings.length) return m.result.innings;
  return [];
};
// "120/5" + "18.4" for one side, or null if that side hasn't batted.
const cricketSideScore = (innings, side) => {
  const inn = innings.find((i) => i.battingSide === side);
  if (!inn) return null;
  return {
    text: `${inn.runs ?? 0}/${inn.wickets ?? 0}`,
    overs: `${inn.oversBowled ?? 0}.${inn.ballsBowled ?? 0}`,
    inProgress: inn.status === "IN_PROGRESS",
  };
};
// Football (scoringType "time"): goals live in result.finalScore (player1/2Sets).
const isFootballMatch = (m) => {
  const st = (m?.scoringType || m?.matchFormat?.scoringType || m?.liveMatchData?.scoringType || "").toLowerCase();
  if (st === "time") return true;
  return /football|soccer/i.test(m?.sportName || m?.liveMatchData?.sportName || "");
};
const getFootballResult = (m) => {
  const fs = m?.liveMatchData?.result?.finalScore || m?.result?.finalScore;
  const g1 = fs?.player1Sets ?? null, g2 = fs?.player2Sets ?? null;
  const tiebreak = m?.liveMatchData?.matchResult?.tiebreak || m?.matchResult?.tiebreak || null;
  return { g1, g2, tiebreak };
};
const cricketResultText = (m) => {
  const cr = m?.liveMatchData?.result?.cricketResult || m?.result?.cricketResult;
  if (!cr) return "";
  if (cr.isTie && cr.marginType !== "super_over") return "Match tied";
  if (cr.marginType === "super_over") return "Decided by Super Over";
  if (cr.marginType === "runs") return `Won by ${cr.marginValue} run${cr.marginValue === 1 ? "" : "s"}`;
  if (cr.marginType === "wickets") return `Won by ${cr.marginValue} wicket${cr.marginValue === 1 ? "" : "s"}`;
  return "";
};

export default function Tournament({
  tournamentId: propTournamentId,
  // Sport currently selected in MGroupStageManagement's per-sport tab strip.
  // Without this, the knockout-bracket fetch can't filter to the right sport
  // and ends up displaying matches from every sport in the tournament.
  activeSportId: propActiveSportId = null,
  // Initial sub-tab inside the Groups view ("League" | "Top Players" |
  // "Knockout"). Defaults to "League". The parent can pass "Knockout" right
  // after creating a bracket so the user lands on the bracket view instead
  // of having to click the sub-tab manually.
  defaultSubTab = "League",
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get tournamentId from URL parameters or props
  const tournamentId = searchParams.get('tournamentId') || propTournamentId;

  // 🎯 TOURNAMENT DATA STATE
  const [tournament, setTournament] = useState(null);

  const [activeSubGroupTab, setactiveSubGroupTab] = useState(defaultSubTab);
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(""); // Add this line
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courtNumber, setCourtNumber] = useState("");
  const [matchInterval, setMatchInterval] = useState(""); // legacy — kept until v2 fully removed
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(20);
  const [startTime, setStartTime] = useState("");
  // Active court pool for the active sport. Empty array → modal falls back
  // to the legacy single-court input. Populated → shows CourtPoolPreview
  // and the server uses tournament.courts to round-robin assign matches.
  const [tournamentCourts, setTournamentCourts] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [activeKnockoutRound, setActiveKnockoutRound] = useState(0);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [matchesData, setMatchesData] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null);

  // State to track if matches have been generated
  const [matchesGenerated, setMatchesGenerated] = useState(false);
  // State to track if any matches are currently in progress
  const [hasMatchesInProgress, setHasMatchesInProgress] = useState(false);

  // Standings data per group
  const [standingsData, setStandingsData] = useState({});
  const [showStandings, setShowStandings] = useState(false);
  const [transitionLoading, setTransitionLoading] = useState(false);

  // Round 2 Top Players groups
  const [round2Groups, setRound2Groups] = useState([]);
  const [activeRound2Group, setActiveRound2Group] = useState(null);
  const [round2MatchesData, setRound2MatchesData] = useState({});

  // Knockout matches
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [knockoutMatchesByRound, setKnockoutMatchesByRound] = useState({});
  // Tracks the in-flight knockout fetch so the empty state isn't shown while
  // the bracket is still loading (avoids the post-generate flash where the
  // panel renders "No knockout matches yet" before the fetch resolves).
  const [knockoutLoading, setKnockoutLoading] = useState(true);

  // Umpire assignment modal (Phase 2 — single shared modal across all three sub-tabs)
  const [assignModalMatch, setAssignModalMatch] = useState(null);

  // 🔥 DIRECT KNOCKOUT - The new beast!
  const [tournamentMode, setTournamentMode] = useState("round2-plus-knockout");
  const [directKnockoutMatches, setDirectKnockoutMatches] = useState([]);
  const [selectedPlayersForKnockout, setSelectedPlayersForKnockout] = useState([]);
  const [validationStatus, setValidationStatus] = useState({ isValid: false, message: "" });
  const [availablePlayersForKnockout, setAvailablePlayersForKnockout] = useState([]);

  // 🏆 DIRECT KNOCKOUT SCHEDULE MODAL - Enhanced scheduling
  const [isDirectKnockoutScheduleModalOpen, setIsDirectKnockoutScheduleModalOpen] = useState(false);
  const [directKnockoutSchedule, setDirectKnockoutSchedule] = useState({
    courtNumber: "",
    startDate: "",
    startTime: "",
    slotDurationMinutes: 30,
    matchDurationMinutes: 20,
    estimatedDuration: 45,
    // Per-round knockout format (Step 4 of flexible bestOf).
    customizeRounds: false,
    uniformBestOf: 3,
    roundOverrides: [],
    breakBetweenRoundsMinutes: 15,
  });
  const [isCreatingKnockout, setIsCreatingKnockout] = useState(false);

  // 🚀 GROUP-SPECIFIC MATCH FORMAT CONFIGURATION
  const [groupMatchFormat, setGroupMatchFormat] = useState({
    totalSets: 5,
    totalGames: 5,
    pointsToWinGame: 11,
    marginToWin: 2,
    deuceRule: true
  });
  const [isUpdatingFormat, setIsUpdatingFormat] = useState(false);

  const [groupsWithMatches, setGroupsWithMatches] = useState(new Set());

  // State for edit group modal
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [currentEditGroup, setCurrentEditGroup] = useState(null);

  // State for groups without matches (available for player movement)
  const [groupsWithoutMatches, setGroupsWithoutMatches] = useState([]);

  // State for player movement
  const [selectedPlayerForMovement, setSelectedPlayerForMovement] = useState(null);
  const [destinationGroupId, setDestinationGroupId] = useState('');

  // Bulk Score Upload state
  const [bulkScoreModal, setBulkScoreModal] = useState({ open: false, matches: [], groupId: null, title: "" });
  const [showCsvUpload, setShowCsvUpload] = useState(false);

  // Group-management bulk-action state (Sub-step Plan A — per-sport scoped).
  // selectionMode: when true, group cards show a checkbox and a sticky action
  // bar appears at the top with bulk actions for the selected set.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toggleGroupSelected = (gid) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid); else next.add(gid);
      return next;
    });
  };
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedGroupIds(new Set());
  };

  const handleEditGroup = async (group) => {
    // Set the current group to be edited
    setCurrentEditGroup(group);

    // \ud83c\udfaf Initialize match format based on group's existing format or tournament's setFormat
    try {
      // First, try to get group's existing match format
      const groupFormatResponse = await axios.get(
        `/api/tournaments/bookinggroups/${group._id}/match-format`
      );

      if (groupFormatResponse.data.success && groupFormatResponse.data.matchFormat) {
        setGroupMatchFormat(groupFormatResponse.data.matchFormat);
      } else {
        // Fallback to tournament's setFormat
        if (tournament && tournament.setFormat) {
          const defaultFormat = convertSetFormatToMatchFormat(tournament.setFormat);
          setGroupMatchFormat(defaultFormat);
        }
      }
    } catch (error) {
      // If no group format exists, use tournament's setFormat
      if (tournament && tournament.setFormat) {
        const defaultFormat = convertSetFormatToMatchFormat(tournament.setFormat);
        setGroupMatchFormat(defaultFormat);
      }
    }

    // Open the edit group modal
    setIsEditGroupModalOpen(true);
  };

  // Function to handle group update
  const handleUpdateGroup = async (updatedGroupData) => {
    try {
      // The backend expects an array of USER IDs (not subdocument IDs)
      // Extract the actual player IDs from each player object
      const playerIds = updatedGroupData.players.map(player => {
        // For player objects from the database, we need the playerId field
        // which corresponds to the User ID in the Booking collection
        // The playerId field may be an ObjectId object { $oid: "..." } or a string
        const playerIdValue = player.playerId;
        // If playerId is an ObjectId object with $oid, extract the value
        if (playerIdValue && typeof playerIdValue === 'object' && playerIdValue.$oid) {
          return playerIdValue.$oid;
        }
        // Otherwise, use the playerId directly or fallback to other fields
        return typeof player.playerId === 'object'
          ? player.playerId.$oid
          : player.playerId;
      }).filter(id => id); // Filter out any undefined/null values


      // Call API to update the group
      const response = await axios.put(`/api/tournaments/bookinggroups/${updatedGroupData._id}`, {
        groupName: updatedGroupData.groupName,
        players: playerIds,
        category: updatedGroupData.category || 'Open Category'  // Include category to satisfy backend validation
      });

      if (response.data.success) {
        // Update the groups state with the updated group
        setGroups(prevGroups =>
          prevGroups.map(g => g._id === updatedGroupData._id ? response.data.data : g)
        );

        // Close the modal
        setIsEditGroupModalOpen(false);
        setCurrentEditGroup(null);

        toast.info('Group updated successfully!');
      } else {
        toast.info('Failed to update group: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast.info('Error updating group: ' + error.message);
    }
  };

  const fetchMatches = async () => {
    if (!tournamentId || !activeGroup) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `/api/tournaments/matches/${tournamentId}/${activeGroup}`
      );

      if (response.data.success) {
        // Check if matches have been generated
        if (response.data.matches && response.data.matches.length > 0) {
          setMatchesGenerated(true);
          // Add this group to the groupsWithMatches set
          setGroupsWithMatches(prev => new Set([...prev, activeGroup]));
        } else {
          setMatchesGenerated(false);
          // Remove this group from the groupsWithMatches set if no matches exist
          setGroupsWithMatches(prev => {
            const newSet = new Set(prev);
            newSet.delete(activeGroup);
            return newSet;
          });
        }

        // Enrich matches with score data and live state if available
        let hasInProgress = false;
        const matchesWithScores = await Promise.all(
          response.data.matches.map(async (match) => {
            // Validate match data
            if (!match._id) {
              return { ...match, hasScores: false, status: 'pending' };
            }

            try {
              const token = getAuthToken();
              const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
              // PRIMARY: Use the live-state endpoint (this is what scoreboard uses)
              const liveStateResponse = await fetch(
                `/api/tournaments/matches/${match._id}/live-state?autoInit=false`,
                { headers: { ...authHeaders } }
              );

              if (liveStateResponse.ok) {
                const liveData = await liveStateResponse.json();
                if (liveData.success && liveData.match) {
                  const liveMatch = liveData.match;

                  // Check if match has completed sets or is in progress
                  if (liveMatch.status === 'COMPLETED' && liveMatch.result?.winner) {
                    return {
                      ...match,
                      hasScores: true,
                      isLiveMatch: true,
                      liveMatchData: liveMatch,
                      winner: liveMatch.result.winner.playerName,
                      status: 'completed'
                    };
                  } else if (liveMatch.status === 'IN_PROGRESS') {
                    hasInProgress = true;
                    return {
                      ...match,
                      hasScores: true,
                      isLiveMatch: true,
                      liveMatchData: liveMatch,
                      status: 'in_progress'
                    };
                  } else if (liveMatch.sets && liveMatch.sets.length > 0) {
                    // Check if there are any completed sets
                    const hasCompletedSets = liveMatch.sets.some(set => set.status === 'COMPLETED');
                    if (hasCompletedSets) {
                      hasInProgress = true;
                      return {
                        ...match,
                        hasScores: true,
                        isLiveMatch: true,
                        liveMatchData: liveMatch,
                        status: 'in_progress'
                      };
                    }
                  }
                }
              }

              // SECONDARY: Try the array scores endpoint (now fixed with route reordering)
              const scoresArrayResponse = await fetch(
                `/api/tournaments/matches/${match._id}/scores`,
                { headers: { ...authHeaders } }
              );

              if (scoresArrayResponse.ok) {
                const scoresArray = await scoresArrayResponse.json();
                if (Array.isArray(scoresArray) && scoresArray.length > 0) {
                  const latestScore = scoresArray[0]; // Most recent score
                  if (!latestScore.winner) {
                    hasInProgress = true;
                  }
                  return {
                    ...match,
                    hasScores: true,
                    currentScore: latestScore,
                    winner: latestScore.winner?.name || latestScore.winner?.userId?.name || latestScore.winner,
                    status: latestScore.winner ? 'completed' : 'in_progress'
                  };
                }
              }

              // TERTIARY: Fallback to single score endpoint
              const scoreResponse = await fetch(
                `/api/tournaments/scores/${match._id}`,
                { headers: { ...authHeaders } }
              );

              if (scoreResponse.ok) {
                const scoreData = await scoreResponse.json();
                if (scoreData.score) {
                  if (!scoreData.score.winner) {
                    hasInProgress = true;
                  }
                  return {
                    ...match,
                    hasScores: true,
                    currentScore: scoreData.score,
                    winner: scoreData.score.winner?.name || scoreData.score.winner?.userId?.name || scoreData.score.winner,
                    status: scoreData.score.winner ? 'completed' : 'in_progress'
                  };
                }
              }

              return { ...match, hasScores: false, status: 'pending' };
            } catch {
              return { ...match, hasScores: false, status: 'pending' };
            }
          })
        );

        setMatchesData(prev => ({
          ...prev,
          [activeGroup]: matchesWithScores,
        }));

        // Update the hasMatchesInProgress state
        setHasMatchesInProgress(hasInProgress);
      } else {
        setMatchesData(prev => ({ ...prev, [activeGroup]: [] }));
        setMatchesGenerated(false);
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
      setError(err.message);
      setMatchesData(prev => ({ ...prev, [activeGroup]: [] }));
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FETCH TOURNAMENT MODE - Detect Direct Knockout capability
  const fetchTournamentMode = async () => {
    try {
      const response = await axios.get(
        `/api/tournaments/${tournamentId}`
      );

      if (response.data.success && response.data.tournament) {
        const mode = response.data.tournament.roundTwoMode || "round2-plus-knockout";
        setTournamentMode(mode);
      }
    } catch (error) {
      console.error("Error fetching tournament mode:", error);
      setTournamentMode("round2-plus-knockout"); // Default fallback
    }
  };

  // 🚀 FETCH AVAILABLE PLAYERS FOR DIRECT KNOCKOUT
  const fetchAvailablePlayersForKnockout = async () => {
    try {
      // Get all players from Round 1 groups who can participate in Direct Knockout
      const allPlayers = [];

      for (const group of groups) {
        if (group.players && group.players.length > 0) {
          // Add players with their group context
          const groupPlayers = group.players.map(player => ({
            ...player,
            sourceGroup: group.groupName || `Group ${groups.indexOf(group) + 1}`,
            sourceGroupId: group._id
          }));
          allPlayers.push(...groupPlayers);
        }
      }

      setAvailablePlayersForKnockout(allPlayers);
    } catch (error) {
      console.error("Error fetching available players:", error);
      setAvailablePlayersForKnockout([]);
    }
  };

  // 🎯 FETCH TOURNAMENT DATA
  const fetchTournamentData = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      if (response.data.success && response.data.tournament) {
        setTournament(response.data.tournament);
        return response.data.tournament;
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
    }
    return null;
  };

  // 🔄 CONVERT setFormat TO MATCH FORMAT CONFIGURATION
  const convertSetFormatToMatchFormat = (setFormat) => {
    const formatMap = {
      'bestOf3': { totalSets: 3, setsToWin: 2 },
      'bestOf5': { totalSets: 5, setsToWin: 3 },
      'bestOf7': { totalSets: 7, setsToWin: 4 },
      '3': { totalSets: 3, setsToWin: 2 },
      '5': { totalSets: 5, setsToWin: 3 },
      '7': { totalSets: 7, setsToWin: 4 }
    };

    const format = formatMap[setFormat] || formatMap[String(setFormat)] || formatMap['bestOf5'];

    return {
      totalSets: format.totalSets,
      setsToWin: format.setsToWin,
      totalGames: 5, // Default games per set
      gamesToWin: 3,
      pointsToWinGame: 11,
      marginToWin: 2,
      deuceRule: true
    };
  };

  // 🚀 UPDATE GROUP MATCH FORMAT
  const updateGroupMatchFormat = async (groupId, newFormat) => {
    try {
      setIsUpdatingFormat(true);
      const response = await axios.put(
        `/api/tournaments/bookinggroups/${groupId}/match-format`,
        { matchFormat: newFormat }
      );

      if (response.data.success) {
        return { success: true, message: "Match format updated successfully!" };
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Error updating group match format:", error);
      return { success: false, message: error.message || "Failed to update match format" };
    } finally {
      setIsUpdatingFormat(false);
    }
  };

  // 💎 POWER-OF-2 VALIDATION - Real-time validation
  const validateSelectedPlayers = async (selectedPlayers) => {
    const count = selectedPlayers.length;

    if (count === 0) {
      setValidationStatus({ isValid: false, message: "Select players for Direct Knockout" });
      return;
    }

    try {
      const response = await axios.post(
        `/api/tournaments/direct-knockout/validate-players`,
        {
          tournamentId,
          // STEP 16d — backend now requires sportId. Legacy MGrouptabs
          // has no sport-switcher UI; default to sports[0].sportId.
          sportId: tournament?.sports?.[0]?.sportId || null,
          selectedPlayers: selectedPlayers.map(p => ({ playerId: p.playerId || p._id, userName: p.userName }))
        }
      );

      if (response.data.success) {
        setValidationStatus({
          isValid: true,
          message: `✅ Valid! ${count} players → ${response.data.rounds} rounds tournament`
        });
      } else {
        setValidationStatus({
          isValid: false,
          message: response.data.message || "Invalid player selection"
        });
      }
    } catch (error) {
      const validSizes = [4, 8, 16, 32];
      const isPowerOfTwo = count > 0 && (count & (count - 1)) === 0;

      if (!isPowerOfTwo) {
        setValidationStatus({
          isValid: false,
          message: `❌ Must be power of 2. Valid: ${validSizes.join(", ")} players`
        });
      } else {
        setValidationStatus({
          isValid: false,
          message: error.response?.data?.message || "Validation error"
        });
      }
    }
  };

  useEffect(() => {
    // Reset the hasMatchesInProgress state when component mounts
    setHasMatchesInProgress(false);

    let _resolvedTournament = null;
    const fetchGroups = async () => {
      try {
        setLoading(true);

        // 🎯 Fetch tournament data first. Capture the resolved value so we
        // can pass it into fetchKnockoutMatches below — React state updates
        // are async and the closure won't see the new tournament.
        _resolvedTournament = await fetchTournamentData();

        // Fetch groups - only Round 1 league groups (Round 2 is handled in
        // Top Players section). Sport-scoped so multi-sport tournaments don't
        // leak the other sport's groups into this view.
        const _sportQ = propActiveSportId ? `?sportId=${propActiveSportId}` : "";
        const response = await axios.get(
          `/api/tournaments/bookinggroups/tournament/${tournamentId}${_sportQ}`
        );

        const groupsArray = response?.data?.data;

        if (Array.isArray(groupsArray)) {
          // Only show Round 1 groups in the Groups/League tab
          const round1Groups = groupsArray.filter(group => !group.round || group.round === 1);
          setGroups(round1Groups);

          // Resolve a category that ACTUALLY matches the fetched groups.
          // Bug fix: previously this only ran when selectedCategory was empty
          // (`!selectedCategory`). Switching sports kept the prior sport's
          // category (e.g. "Open") which filters out the new sport's groups
          // (e.g. "singles") → "0 groups" until a remount. Now we re-resolve
          // whenever the current category doesn't match any fetched group.
          let _resolvedCat = selectedCategory;
          if (round1Groups.length > 0) {
            const _norm = (s) => (s || "").toLowerCase().trim().replace(/_/g, " ");
            const groupCats = round1Groups.map((g) => _norm(g.category));
            const curOk = selectedCategory && groupCats.includes(_norm(selectedCategory));
            if (!curOk) {
              // Prefer the ACTIVE sport's category that exists in the groups,
              // else fall back to the first group's own category.
              const sportCats = getCategories(tournament, propActiveSportId) || [];
              const sportCat = sportCats.find((c) => groupCats.includes(_norm(c.name)));
              _resolvedCat = (sportCat && sportCat.name) || round1Groups[0].category || "";
              setSelectedCategory(_resolvedCat);
            }
          }

          // Use the resolved category for the initial active group.
          const _normCat = (s) => (s || "").toLowerCase().trim().replace(/_/g, " ");
          const filteredForInitial = _resolvedCat
            ? round1Groups.filter((g) => _normCat(g.category) === _normCat(_resolvedCat))
            : round1Groups;

          if (filteredForInitial.length > 0) {
            setActiveGroup(filteredForInitial[0]._id);

            // Check if matches have already been generated for this group
            try {
              const matchesResponse = await axios.get(
                `/api/tournaments/matches/${tournamentId}/${filteredForInitial[0]._id}`
              );

              if (matchesResponse.data.success && matchesResponse.data.matches && matchesResponse.data.matches.length > 0) {
                setMatchesGenerated(true);
                // Add this group to the groupsWithMatches set
                setGroupsWithMatches(prev => new Set([...prev, filteredForInitial[0]._id]));
              } else {
                setMatchesGenerated(false);
                setGroupsWithMatches(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(filteredForInitial[0]._id);
                  return newSet;
                });
              }
            } catch (err) {
              setMatchesGenerated(false);
              setGroupsWithMatches(prev => {
                const newSet = new Set(prev);
                newSet.delete(filteredForInitial[0]._id);
                return newSet;
              });
            }
          }
        } else {
          console.error('Expected array but got:', response.data);
          setError('Invalid data format received from server');
          setGroups([]);
        }

      } catch (err) {
        console.error('Error fetching groups:', err);
        setError(err.message);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    // Sequence: fetchGroups awaits fetchTournamentData (which sets _resolvedTournament),
    // then we fire fetchKnockoutMatches with the resolved tournament so it
    // doesn't read the closure-stale null value.
    (async () => {
      await fetchGroups();
      fetchRound2Groups();
      fetchKnockoutMatches(_resolvedTournament);
      fetchTournamentMode(); // 🔥 Detect tournament mode
      fetchTournamentCourts(); // Sub-step 3 — court catalog for the active sport
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, propActiveSportId]);

  // Fetch the court catalog for the active sport. Re-runs on sport tab
  // change (deps include propActiveSportId via the parent effect above).
  // Server filters: active only + (sportId null OR matches active sport).
  // When the catalog is empty, the generation modal falls back to the
  // legacy single-court input (Sub-step 3).
  const fetchTournamentCourts = async () => {
    if (!tournamentId) return;
    try {
      const sportQuery = propActiveSportId ? `?sportId=${propActiveSportId}` : "";
      const res = await axios.get(`/api/tournaments/${tournamentId}/courts${sportQuery}`);
      setTournamentCourts(res.data?.courts || []);
    } catch (err) {
      console.error("Failed to fetch courts:", err.message);
      setTournamentCourts([]);
    }
  };

  // 🎯 Secondary useEffect to fetch available players after groups are loaded
  useEffect(() => {
    if (groups.length > 0) {
      fetchAvailablePlayersForKnockout();
    }
  }, [groups]);


  // Fetch Round 2 groups (Top Players groups)
  const fetchRound2Groups = async () => {
    try {
      const _sportQ = propActiveSportId ? `?sportId=${propActiveSportId}` : "";
      const response = await axios.get(
        `/api/tournaments/bookinggroups/tournament/${tournamentId}${_sportQ}`
      );

      const groupsArray = response?.data?.data;

      if (Array.isArray(groupsArray)) {
        // Only show Round 2 groups in Top Players section (handle both number and string)
        const round2GroupsFiltered = groupsArray.filter(group => group.round == 2 || group.groupName?.startsWith("Round 2"));
        setRound2Groups(round2GroupsFiltered);
        if (round2GroupsFiltered.length > 0 && !activeRound2Group) {
          setActiveRound2Group(round2GroupsFiltered[0]._id);
        }

        // Fetch matches for each Round 2 group
        if (round2GroupsFiltered.length > 0) {
          fetchRound2Matches(round2GroupsFiltered);
        }
      }
    } catch (err) {
      console.error('Error fetching Round 2 groups:', err);
      setRound2Groups([]);
    }
  };

  // Fetch knockout matches - SuperMatch objects support live-state integration.
  // Accepts an optional tournamentOverride so callers that have just loaded
  // the tournament can pass it in without waiting for React state to commit.
  // Without this, the first call after mount reads `tournament` as null from
  // closure, sees no sport type, skips both endpoint calls, and renders empty
  // until something else triggers a refetch.
  const fetchKnockoutMatches = async (tournamentOverride = null) => {
    setKnockoutLoading(true);
    try {
      const _t = tournamentOverride || tournament;
      // Resolve the active sport — fall back to sports[0] if no per-sport
      // switcher is wired (legacy single-sport rendering).
      const _activeSportId = propActiveSportId || _t?.sports?.[0]?.sportId || null;
      const _activeSport = (_t?.sports || []).find(
        (s) => String(s.sportId) === String(_activeSportId)
      ) || _t?.sports?.[0] || null;
      const _type = String(_activeSport?.type || "");
      const _sportQuery = _activeSportId ? `?sportId=${_activeSportId}` : "";

      // Pick the right knockout source per sport type:
      //   - "knockout + group stage"  → SuperMatch (the Round-2 KO from group standings)
      //   - "knockout"                → DirectKnockoutMatch (direct-elimination bracket)
      // Previously this fetched both endpoints and merged the results, which
      // caused stale DirectKnockout records from earlier experiments to leak
      // into a GS+KO tournament's bracket display, making it look identical
      // to the Singles Knockout view.
      const _useSuperMatch = _type.includes("group stage");
      const _useDirectKO = _type === "knockout";

      const [superMatchResponse, directKnockoutResponse] = await Promise.all([
        _useSuperMatch
          ? axios.get(`/api/tournaments/knockout/matches/${tournamentId}${_sportQuery}`)
              .catch(err => ({ data: { success: false, matches: [] } }))
          : Promise.resolve({ data: { success: false, matches: [] } }),

        _useDirectKO
          ? axios.get(`/api/tournaments/direct-knockout/${tournamentId}/matches${_sportQuery}`)
              .catch(err => ({ data: { success: false, matches: [] } }))
          : Promise.resolve({ data: { success: false, matches: [] } }),
      ]);

      let allMatches = [];

      let hasInProgress = false;
      // Process SuperMatch knockout matches
      if (superMatchResponse.data.success && superMatchResponse.data.matches?.length > 0) {

        const enrichedSuperMatches = await Promise.all(
          superMatchResponse.data.matches.map(async (match) => {
            // Validate match data
            if (!match._id) {
              return { ...match, hasScores: false, status: 'scheduled', type: 'super-knockout' };
            }

            let normalizedStatus = match.status;
            let enrichedMatch = { ...match, type: 'super-knockout' };

            try {
              const token = getAuthToken();
              const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
              // If match is in-progress, get live state for current score/set/game data
              if (match.status === 'in-progress') {
                hasInProgress = true;
                const liveStateResponse = await fetch(
                  `/api/tournaments/matches/${match._id}/live-state?autoInit=false`,
                  { headers: { ...authHeaders } }
                );

                if (liveStateResponse.ok) {
                  const liveData = await liveStateResponse.json();
                  if (liveData.success && liveData.match) {
                    const liveMatch = liveData.match;

                    enrichedMatch = {
                      ...match,
                      currentSet: liveMatch.currentSet || 1,
                      currentGame: liveMatch.currentGame || 1,
                      liveScore: liveMatch.liveScore || { player1Points: 0, player2Points: 0 },
                      sets: liveMatch.sets || [],
                      hasScores: true,
                      isLiveMatch: true,
                      status: 'in-progress',
                      type: 'super-knockout'
                    };
                  }
                }
              } else if (match.status === 'completed' && match.winner?.playerName) {
                normalizedStatus = 'completed';
                enrichedMatch = {
                  ...match,
                  status: normalizedStatus,
                  hasScores: true,
                  winner: match.winner.playerName,
                  type: 'super-knockout'
                };
              } else {
                normalizedStatus = match.status || 'scheduled';
                enrichedMatch = {
                  ...match,
                  status: normalizedStatus,
                  hasScores: false,
                  type: 'super-knockout'
                };
              }
            } catch (error) {
              enrichedMatch = {
                ...match,
                status: normalizedStatus,
                hasScores: !!match.winner?.playerName || !!match.score?.setScores,
                winner: match.winner?.playerName,
                type: 'super-knockout'
              };
            }

            return enrichedMatch;
          })
        );

        allMatches = [...allMatches, ...enrichedSuperMatches];
      }

      // Process Direct Knockout matches
      if (directKnockoutResponse.data.success && directKnockoutResponse.data.matches?.length > 0) {

        const enrichedDirectMatches = directKnockoutResponse.data.matches.map(match => {
          const status = match.status?.toLowerCase() === 'scheduled' ? 'scheduled' :
            match.status?.toLowerCase() === 'in_progress' ? 'in-progress' :
              match.status?.toLowerCase() === 'completed' ? 'completed' : 'scheduled';

          // Check if match is in progress
          if (status === 'in-progress') {
            hasInProgress = true;
          }

          return {
            ...match,
            _id: match._id || match.matchId, // Ensure _id for compatibility
            status,
            hasScores: match.status === 'COMPLETED' || !!match.result?.winner?.playerId,
            type: 'direct-knockout',
            player1: match.player1,
            player2: match.player2,
            round: match.round,
            roundNumber: match.roundNumber, // Add this!
            court: match.courtNumber,
            startTime: match.matchStartTime,
            winner: match.result?.winner?.playerName
          };
        });

        allMatches = [...allMatches, ...enrichedDirectMatches];
      }


      // Re-organize all matches by rounds
      const matchesByRound = {};
      allMatches.forEach(match => {
        const roundKey = match.round;
        if (!matchesByRound[roundKey]) {
          matchesByRound[roundKey] = [];
        }
        matchesByRound[roundKey].push(match);
      });

      // Sort matches within each round by match number if available
      Object.keys(matchesByRound).forEach(round => {
        matchesByRound[round].sort((a, b) => {
          const aMatchNum = a.matchNumber || 0;
          const bMatchNum = b.matchNumber || 0;
          return aMatchNum - bMatchNum;
        });
      });

      setKnockoutMatches(allMatches);
      setKnockoutMatchesByRound(matchesByRound);

      // If we found knockout matches, set matchesGenerated to true
      if (allMatches.length > 0) {
        setMatchesGenerated(true);
      }

      // Update the hasMatchesInProgress state
      if (hasInProgress) {
        setHasMatchesInProgress(true);
      }


    } catch (err) {
      console.error('Error fetching knockout matches:', err);
      setKnockoutMatches([]);
      setKnockoutMatchesByRound({});
    } finally {
      setKnockoutLoading(false);
    }
  };

  // Fetch matches for Round 2 groups - IDENTICAL logic to Round 1
  const fetchRound2Matches = async (groups) => {
    const matchesDataTemp = {};

    for (const group of groups) {
      try {
        // Use the correct endpoint structure for Round 2 matches
        const response = await axios.get(
          `/api/tournaments/matches/${tournamentId}/${group._id}`
        );

        if (response.data.success && response.data.matches) {
          // Enrich matches with score data EXACTLY like Round 1
          let hasInProgress = false;
          const matchesWithScores = await Promise.all(
            response.data.matches.map(async (match) => {
              // Validate match data
              if (!match._id) {
                return { ...match, hasScores: false, status: 'pending' };
              }

              try {
                const token = getAuthToken();
                const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
                // PRIMARY: Use the live-state endpoint (same as Round 1 and scoreboard)
                const liveStateResponse = await fetch(
                  `/api/tournaments/matches/${match._id}/live-state?autoInit=false`,
                  { headers: { ...authHeaders } }
                );
                if (liveStateResponse.ok) {
                  const liveData = await liveStateResponse.json();
                  if (liveData.success && liveData.match) {
                    const liveMatch = liveData.match;
                    if (liveMatch.status === 'IN_PROGRESS') {
                      hasInProgress = true;
                    } else if (liveMatch.sets && liveMatch.sets.length > 0) {
                      // Check if there are any completed sets
                      const hasCompletedSets = liveMatch.sets.some(set => set.status === 'COMPLETED');
                      if (!hasCompletedSets) {
                        hasInProgress = true;
                      }
                    }
                    return {
                      ...match,
                      isLiveMatch: true,
                      hasScores: true,
                      liveMatchData: liveMatch,
                      status: liveMatch.status || match.status,
                      currentSet: liveMatch.currentSet || 1,
                      currentGame: liveMatch.currentGame || 1,
                      liveScore: liveMatch.liveScore || { player1Points: 0, player2Points: 0 },
                      result: liveMatch.result || null,
                      sets: liveMatch.sets || []
                    };
                  }
                }

                // SECONDARY: Try the array scores endpoint
                const scoresArrayResponse = await fetch(
                  `/api/tournaments/matches/${match._id}/scores`,
                  { headers: { ...authHeaders } }
                );
                if (scoresArrayResponse.ok) {
                  const scoresArray = await scoresArrayResponse.json();
                  if (Array.isArray(scoresArray) && scoresArray.length > 0) {
                    const latestScore = scoresArray[0]; // Most recent score
                    if (!latestScore.winner) {
                      hasInProgress = true;
                    }
                    return {
                      ...match,
                      hasScores: true,
                      currentScore: latestScore,
                      winner: latestScore.winner?.name || latestScore.winner?.userId?.name || latestScore.winner,
                      status: latestScore.winner ? 'completed' : 'in_progress'
                    };
                  }
                }

                // TERTIARY: Fallback to single score endpoint
                const scoreResponse = await fetch(
                  `/api/tournaments/scores/${match._id}`,
                  { headers: { ...authHeaders } }
                );
                if (scoreResponse.ok) {
                  const scoreData = await scoreResponse.json();
                  if (scoreData.score) {
                    if (!scoreData.score.winner) {
                      hasInProgress = true;
                    }
                    return {
                      ...match,
                      hasScores: true,
                      currentScore: scoreData.score,
                      winner: scoreData.score.winner?.name || scoreData.score.winner?.userId?.name || scoreData.score.winner,
                      status: scoreData.score.winner ? 'completed' : 'in_progress'
                    };
                  }
                }

                return { ...match, hasScores: false, status: 'pending' };
              } catch (error) {
                return { ...match, hasScores: false, status: 'pending' };
              }
            })
          );

          matchesDataTemp[group._id] = matchesWithScores;
        } else {
          matchesDataTemp[group._id] = [];
        }

        // Update the hasMatchesInProgress state if we found in-progress matches
        const anyInProgress = (matchesDataTemp[group._id] || []).some(m => m.status === 'IN_PROGRESS' || m.status === 'in_progress');
        if (anyInProgress) {
          setHasMatchesInProgress(true);
        }
      } catch (err) {
        console.error(`Error fetching matches for Round 2 group ${group._id}:`, err);
        matchesDataTemp[group._id] = [];
      }
    }

    setRound2MatchesData(matchesDataTemp);

    // Check if any group has matches and set matchesGenerated to true
    const hasMatches = Object.values(matchesDataTemp).some(matches => matches && matches.length > 0);
    if (hasMatches) {
      setMatchesGenerated(true);
    }
  };


  // Fetch matches whenever activeGroup changes
  useEffect(() => {
    if (activeGroup && tournamentId) {
      fetchMatches();
    }
  }, [activeGroup, tournamentId]);

  // Auto-refresh when user returns from scoreboard (page regains focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && tournamentId) {
        // Reset the hasMatchesInProgress state before refreshing
        setHasMatchesInProgress(false);
        // Refresh Round 1 matches
        if (activeGroup) {
          fetchMatches();
        }
        // Refresh Round 2 matches
        if (round2Groups.length > 0) {
          fetchRound2Groups();
        }
        // Refresh Knockout matches
        fetchKnockoutMatches();
      }
    };

    const handleFocusRefresh = () => {
      if (tournamentId) {
        // Reset the hasMatchesInProgress state before refreshing
        setHasMatchesInProgress(false);
        // Refresh Round 1 matches
        if (activeGroup) {
          fetchMatches();
        }
        // Refresh Round 2 matches
        if (round2Groups.length > 0) {
          fetchRound2Groups();
        }
        // Refresh Knockout matches
        fetchKnockoutMatches();
      }
    };

    // Listen for visibility changes and focus events
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusRefresh);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusRefresh);
    };
  }, [activeGroup, tournamentId, round2Groups.length]);


  const openModal = (match) => {
    setSelectedMatch(match);
    setIsPopupOpen(true);
  };

  const closeModal = () => {
    setIsPopupOpen(false);
    setSelectedMatch(null);
  };

  // Refresh current modal data when matches are updated
  useEffect(() => {
    if (selectedMatch && isPopupOpen) {

      // Find updated match data from Round 1 matches
      const updatedMatch = matchesData[activeGroup]?.find(match =>
        match._id === selectedMatch._id
      );

      // If not found in Round 1, check Round 2 matches
      const updatedRound2Match = !updatedMatch && activeRound2Group ?
        round2MatchesData[activeRound2Group]?.find(match =>
          match._id === selectedMatch._id
        ) : null;

      // If not found in Round 1 or Round 2, check Knockout matches
      const updatedKnockoutMatch = !updatedMatch && !updatedRound2Match ?
        knockoutMatches.find(match => match._id === selectedMatch._id) : null;

      // Update modal with fresh data
      const refreshedMatch = updatedMatch || updatedRound2Match || updatedKnockoutMatch;
      if (refreshedMatch) {
        setSelectedMatch(refreshedMatch);
      }
    }
  }, [matchesData, round2MatchesData, knockoutMatches, selectedMatch?._id, isPopupOpen, activeGroup, activeRound2Group]);


  // Effect to check matches when active group changes
  useEffect(() => {
    const checkMatchesForActiveGroup = async () => {
      if (!tournamentId || !activeGroup) return;

      try {
        const matchesResponse = await axios.get(
          `/api/tournaments/matches/${tournamentId}/${activeGroup}`
        );

        if (matchesResponse.data.success && matchesResponse.data.matches && matchesResponse.data.matches.length > 0) {
          // Add this group to the groupsWithMatches set
          setGroupsWithMatches(prev => new Set([...prev, activeGroup]));
        } else {
          // Remove this group from the groupsWithMatches set if no matches exist
          setGroupsWithMatches(prev => {
            const newSet = new Set(prev);
            newSet.delete(activeGroup);
            return newSet;
          });
        }
      } catch (err) {
        // Remove this group from the groupsWithMatches set if there was an error
        setGroupsWithMatches(prev => {
          const newSet = new Set(prev);
          newSet.delete(activeGroup);
          return newSet;
        });
      }
    };

    checkMatchesForActiveGroup();
  }, [activeGroup, tournamentId]);

  // Effect to fetch groups without matches on component load
  useEffect(() => {
    const fetchGroupsWithoutMatches = async () => {
      if (!tournamentId) return;

      try {
        const response = await axios.get(`/api/tournaments/groups-without-matches/${tournamentId}`);

        if (response.data.success) {

          // Store the groups without matches in state
          setGroupsWithoutMatches(response.data.data.groupsWithoutMatches || []);
        } else {
          console.error('Failed to fetch groups without matches:', response.data.message);
          setGroupsWithoutMatches([]);
        }
      } catch (error) {
        console.error('Error fetching groups without matches:', error);
        setGroupsWithoutMatches([]);
      }
    };

    fetchGroupsWithoutMatches();
  }, [tournamentId]);

  // Generate matches for Round 2 (Top Players)
  // Store which group the generate button was clicked for
  const [pendingRound2GroupId, setPendingRound2GroupId] = useState(null);

  const handleGenerateRound2Matches = async () => {
    if (!courtNumber || !startTime) {
      toast.warn("Please fill all match settings.");
      return;
    }
    if (!slotDurationMinutes || slotDurationMinutes < 1) {
      toast.warn("Slot duration must be at least 1 minute");
      return;
    }
    if (!matchDurationMinutes || matchDurationMinutes < 1) {
      toast.warn("Match duration must be at least 1 minute");
      return;
    }
    if (matchDurationMinutes > slotDurationMinutes) {
      toast.warn("Match duration cannot exceed slot duration");
      return;
    }

    const targetGroupId = pendingRound2GroupId || activeRound2Group;
    if (!targetGroupId) {
      toast.warn("No Round 2 group selected");
      return;
    }

    const activeGroupData = round2Groups.find((g) => g._id === targetGroupId);
    if (!activeGroupData || !activeGroupData.players?.length) {
      toast.warn("No top players found in this group");
      return;
    }
    const players = activeGroupData.players;

    const addMinutes = (time, minutes) => {
      const [h, m] = time.split(":").map(Number);
      let total = h * 60 + m + parseInt(minutes, 10);
      const hh = Math.floor(total / 60) % 24;
      const mm = total % 60;
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let currentTime = startTime;
    const newMatches = [];

    // Round-robin generation for top players. Slot model: stride = slotDuration,
    // play time = matchDuration. matchEndTime = matchStartTime + matchDuration.
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const slotStart = new Date(`${today}T${currentTime}:00`);
        const slotEnd = new Date(slotStart.getTime() + matchDurationMinutes * 60000);
        newMatches.push({
          matchNumber: newMatches.length + 1,
          player1: { playerId: players[i].playerId, userName: players[i].userName },
          player2: { playerId: players[j].playerId, userName: players[j].userName },
          referee: null,
          courtNumber: String(courtNumber),
          startTime: slotStart.toISOString(),
          matchEndTime: slotEnd.toISOString(),
        });
        currentTime = addMinutes(currentTime, slotDurationMinutes);
      }
    }

    try {
      const res = await axios.post(
        `/api/tournaments/matches/create`,
        { tournamentId, groupId: targetGroupId, matches: newMatches }
      );
      setRound2MatchesData(prev => ({ ...prev, [targetGroupId]: res.data.matches }));
      setMatchesGenerated(true);
      setIsModalOpen(false);
      toast.info("Round 2 matches generated successfully!");
      fetchRound2Groups();
    } catch (err) {
      console.error("Error generating Round 2 matches:", err);
      toast.error("Error generating Round 2 matches: " + (err.response?.data?.message || err.message));
    }
  };

  // Fetch standings for the active group
  const fetchStandings = async (groupId) => {
    try {
      const res = await axios.get(`/api/tournaments/standings/${tournamentId}/${groupId}`);
      if (res.data.success) {
        setStandingsData(prev => ({ ...prev, [groupId]: res.data.data }));
      }
    } catch (err) {
      console.error("Error fetching standings:", err);
    }
  };

  // Transition from group stage to knockout
  const handleTransitionToKnockout = async () => {
    if (!window.confirm("Are you sure? This will finalize group standings and select qualified players for knockout.")) return;
    setTransitionLoading(true);
    try {
      const res = await axios.post(`/api/tournaments/matches/transition-to-knockout`, { tournamentId });
      if (res.data.success) {
        toast.info(`${res.data.message}\n\nNext: Go to Knockout tab to generate the bracket.`);
        // Refresh tournament data
        const tournRes = await axios.get(`/api/tournaments/${tournamentId}`);
        setTournament(tournRes.data.data || tournRes.data);
      }
    } catch (err) {
      toast.info(err?.response?.data?.message || "Failed to transition to knockout.");
    } finally {
      setTransitionLoading(false);
    }
  };

  // frontend (React) - handleGenerateMatches for Round 1 (auto round-robin)
  const handleGenerateMatches = async () => {
    // Court input is only required in legacy mode (no catalog). When the
    // catalog has active courts, the server picks from tournament.courts.
    const usingCourtPool = tournamentCourts.length > 0;
    if ((!usingCourtPool && !courtNumber) || !startTime) {
      toast.warn("Please fill all match settings.");
      return;
    }
    if (!slotDurationMinutes || slotDurationMinutes < 1) {
      toast.warn("Slot duration must be at least 1 minute");
      return;
    }
    if (!matchDurationMinutes || matchDurationMinutes < 1) {
      toast.warn("Match duration must be at least 1 minute");
      return;
    }
    if (matchDurationMinutes > slotDurationMinutes) {
      toast.warn("Match duration cannot exceed slot duration");
      return;
    }

    const activeGroupData = groups.find((g) => g._id === activeGroup);
    if (!activeGroupData || !activeGroupData.players?.length) {
      toast.warn("No players found in this group");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    try {
      const body = {
        tournamentId,
        groupId: activeGroup,
        startTime: `${today}T${startTime}:00`,
        slotDurationMinutes,
        matchDurationMinutes,
      };
      // Only send courtNumber in legacy mode — server ignores it when the
      // catalog is in use, but cleaner to omit when not needed.
      if (!usingCourtPool) body.courtNumber = String(courtNumber);
      const res = await axios.post(`/api/tournaments/matches/generate-group`, body);

      setMatchesData(prev => ({ ...prev, [activeGroup]: res.data.matches }));
      setMatchesGenerated(true);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error generating matches:", err?.response?.data || err);
      toast.info(err?.response?.data?.message || "Failed to generate matches. See console for details.");
    }
  };

  // utils/dateTimeFormatter.js
  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const MatchformatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // 12-hour format with AM/PM
    });
  };

  // 🔄 INITIATE NEXT ROUND - Collect winners and setup scheduling
  const handleInitiateNextRound = (roundMatches) => {
    try {
      // 1. Collect winners from completed matches
      const winners = roundMatches
        .filter(m => m.status === 'completed' && m.result?.winner?.playerId)
        .map(m => ({
          playerId: m.result.winner.playerId,
          userName: m.result.winner.playerName
        }));

      if (winners.length < 2) {
        toast.info("At least 2 winners are required to generate the next round.");
        return;
      }

      // Check for power of 2 (if required by system)
      const count = winners.length;
      const isPowerOf2 = count > 0 && (count & (count - 1)) === 0;
      if (!isPowerOf2) {
        toast.info(`Next round requires a power of 2 number of winners (current: ${count}). Please ensure all matches are completed correctly.`);
        return;
      }

      // 2. Set selection for the next round
      setSelectedPlayersForKnockout(winners);
      setValidationStatus({
        isValid: true,
        message: `✅ Ready for next round with ${count} winners!`
      });

      // 3. Open schedule modal
      setIsDirectKnockoutScheduleModalOpen(true);

    } catch (error) {
      console.error("Error initiating next round:", error);
      toast.error("Failed to prepare next round. Check console for details.");
    }
  };

  // 🏆 DIRECT KNOCKOUT TOURNAMENT CREATION - The main event!
  const handleCreateDirectKnockoutTournament = async () => {
    try {
      setIsCreatingKnockout(true);

      // Validate inputs
      if (!directKnockoutSchedule.courtNumber || !directKnockoutSchedule.startDate || !directKnockoutSchedule.startTime) {
        toast.warn("Please fill in all required fields (Court Number, Start Date, Start Time)");
        return;
      }

      if (selectedPlayersForKnockout.length === 0 || !validationStatus.isValid) {
        toast.warn("Please select a valid number of players (power of 2)");
        return;
      }

      // Format-panel validation backstop.
      if (hasFormatPanelErrors({
        customizeRounds: directKnockoutSchedule.customizeRounds,
        roundOverrides: directKnockoutSchedule.roundOverrides,
        uniformSlot: directKnockoutSchedule.slotDurationMinutes,
        uniformMatch: directKnockoutSchedule.matchDurationMinutes,
      })) {
        toast.warn("Fix the per-round format errors before creating");
        return;
      }

      // Create the start datetime
      const startDateTime = new Date(`${directKnockoutSchedule.startDate}T${directKnockoutSchedule.startTime}`);

      // drawSize is implicitly selectedPlayersForKnockout.length (must be a power of 2).
      const _totalRounds = Math.ceil(Math.log2(selectedPlayersForKnockout.length || 2));
      const _rounds = buildRequestRounds({
        customizeRounds: directKnockoutSchedule.customizeRounds,
        totalRounds: _totalRounds,
        uniformBestOf: directKnockoutSchedule.uniformBestOf,
        uniformSlot: directKnockoutSchedule.slotDurationMinutes,
        uniformMatch: directKnockoutSchedule.matchDurationMinutes,
        roundOverrides: directKnockoutSchedule.roundOverrides,
      });

      // Prepare the API payload
      const payload = {
        tournamentId,
        // STEP 16d — sports[0] default; legacy MGrouptabs has no sport switcher.
        sportId: tournament?.sports?.[0]?.sportId || null,
        selectedPlayers: selectedPlayersForKnockout,
        schedule: {
          courtNumber: directKnockoutSchedule.courtNumber,
          startTime: startDateTime.toISOString(),
          rounds: _rounds,
          breakBetweenRoundsMinutes: directKnockoutSchedule.breakBetweenRoundsMinutes,
          slotDurationMinutes: directKnockoutSchedule.slotDurationMinutes,
          matchDurationMinutes: directKnockoutSchedule.matchDurationMinutes,
          estimatedDuration: directKnockoutSchedule.estimatedDuration
        }
      };


      // Call the backend API
      const response = await axios.post(
        `/api/tournaments/direct-knockout/create-matches`,
        payload
      );

      if (response.data.success) {
        toast.info(`🏆 Direct Knockout Tournament Created Successfully!\n\n` +
          `• ${response.data.bracket.playerCount} players\n` +
          `• ${response.data.bracket.totalRounds} rounds\n` +
          `• ${response.data.bracket.totalMatches} matches\n` +
          `• Starting at ${directKnockoutSchedule.startTime} on ${directKnockoutSchedule.startDate}`);

        // Update the tournament mode in state
        setTournamentMode("direct-knockout");

        // Store the created matches
        setDirectKnockoutMatches(response.data.matches);
        setMatchesGenerated(true);

        // Reset form and close modal
        setSelectedPlayersForKnockout([]);
        setDirectKnockoutSchedule({
          courtNumber: "",
          startDate: "",
          startTime: "",
          slotDurationMinutes: 30,
          matchDurationMinutes: 20,
          estimatedDuration: 45,
          customizeRounds: false,
          uniformBestOf: 3,
          roundOverrides: [],
          breakBetweenRoundsMinutes: 15,
        });
        setIsDirectKnockoutScheduleModalOpen(false);

        // Refresh knockout matches data to show in Knockout tab
        await fetchKnockoutMatches();

        // Switch to Knockout tab to show the results
        setactiveSubGroupTab("Knockout");
      } else {
        throw new Error(response.data.message || "Failed to create Direct Knockout Tournament");
      }

    } catch (error) {
      console.error("Error creating Direct Knockout Tournament:", error);
      toast.info(`Failed to create Direct Knockout Tournament:\n${error.response?.data?.message || error.message}`);
    } finally {
      setIsCreatingKnockout(false);
    }
  };

  // No dummy knockout data needed - using real knockoutMatches and knockoutMatchesByRound

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleStartMatch = () => {
    if (!selectedMatch) return;

    // Close modal first to prevent stale data issues
    closeModal();

    // Determine match type based on the match data
    let matchType = 'Group Stage';
    if (selectedMatch.round && ['pre-quarter', 'quarter-final', 'semi-final', 'final'].includes(selectedMatch.round)) {
      // SuperMatch knockout matches
      matchType = 'Knockout';
    } else if (selectedMatch.matchType && (selectedMatch.matchType === 'qualifier_knockout' || selectedMatch.matchType === 'main_knockout')) {
      // Knockout matches from KnockoutMatch model
      matchType = 'Knockout';
    } else if (selectedMatch.roundName || (selectedMatch.round && typeof selectedMatch.round === 'string')) {
      // Knockout matches have roundName or round property like 'quarter-final', 'semi-final', etc.
      matchType = 'Knockout';
    } else if (selectedMatch.groupId && round2Groups.some(g => g._id === selectedMatch.groupId)) {
      // Round 2 matches
      matchType = 'Round 2';
    }

    // Build player names with doubles partner if applicable
    const isDoubles = selectedMatch.matchType === "doubles";
    const pAName = (selectedMatch.player1?.userName || selectedMatch.player1?.playerName || 'Player A') +
      (isDoubles && selectedMatch.player1?.partner?.userName ? ` & ${selectedMatch.player1.partner.userName}` : '');
    const pBName = (selectedMatch.player2?.userName || selectedMatch.player2?.playerName || 'Player B') +
      (isDoubles && selectedMatch.player2?.partner?.userName ? ` & ${selectedMatch.player2.partner.userName}` : '');

    // Sport-aware routing. The /scoreboard page is SET-based (TT, Badminton,
    // Foosball — games of points). Non-set sports — Cricket (innings), Carrom
    // (board), Chess (single), Football (time) — render nothing useful there,
    // so route them to the DynamicScorer page which shows their real scorer.
    // UI-generated matches often lack a stamped `scoringType`, so fall back to
    // mapping the sportName (which matches always carry).
    const _SPORT_ST = {
      cricket: 'innings', baseball: 'innings', carrom: 'board', chess: 'single',
      football: 'time', basketball: 'time', hockey: 'time', kabaddi: 'time',
    };
    const _scoringType = (
      selectedMatch.scoringType ||
      selectedMatch.matchFormat?.scoringType ||
      _SPORT_ST[(selectedMatch.sportName || '').toLowerCase()] ||
      ''
    ).toLowerCase();
    if (_scoringType && _scoringType !== 'sets') {
      navigate(`/tournament-management/match/${tournamentId}/${selectedMatch._id}/score`, {
        state: {
          tournamentId: selectedMatch.tournamentId || tournamentId,
          groupId: selectedMatch.groupId || activeGroup || activeRound2Group,
          matchType,
          playerAName: pAName,
          playerBName: pBName,
        },
      });
      return;
    }

    navigate(`/tournament-management/group-stage/${tournamentId}/scoreboard`, {
      state: {
        matchId: selectedMatch._id,
        playerAName: pAName,
        playerBName: pBName,
        playerAId: selectedMatch.player1?.playerId || selectedMatch.player1?._id,
        playerBId: selectedMatch.player2?.playerId || selectedMatch.player2?._id,
        tournamentId: selectedMatch.tournamentId || tournamentId,
        groupId: selectedMatch.groupId || activeGroup || activeRound2Group,
        matchNumber: selectedMatch.matchNumber,
        courtNumber: selectedMatch.courtNumber,
        startTime: selectedMatch.startTime || selectedMatch.matchStartTime,
        matchType: matchType,
        round: selectedMatch.round || null, // Important for knockout matches
        setCount: selectedMatch.setCount || 3,
        // Additional data for scoring context - let scoreboard load live state
        currentSetNumber: selectedMatch.currentSet || 1,
        completedSets: selectedMatch.sets || [],
        liveScore: selectedMatch.liveScore || {
          player1Points: 0,
          player2Points: 0
        }
      },
    });
  };



  // Bulk Score Upload Helpers
  const getMatchFormat = () => {
    const groupData = groups.find(g => g._id === activeGroup);
    const maxSets = groupData?.matchFormat?.totalSets || getMatchFormatHelper(tournament)?.totalSets || 5;
    return { maxSets, setsToWin: Math.ceil(maxSets / 2) };
  };

  const openBulkScoreModal = (matchesArr, gId, titleStr) => {
    const pending = matchesArr.filter(m => m.status !== 'completed' && m.status !== 'COMPLETED');
    if (pending.length === 0) {
      toast.warn("No pending matches to score. All matches are already completed.");
      return;
    }
    setBulkScoreModal({ open: true, matches: pending, groupId: gId, title: titleStr || "Bulk Score Upload" });
  };

  if (!tournamentId) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error: No Tournament Selected</h2>
        <p>Please select a tournament to view its details.</p>
        <button
          onClick={() => navigate('/mtournament-management')}
          className="mt-4 bg-orange-500/100 text-white px-4 py-2 rounded"
        >
          Back to Tournament Management
        </button>
      </div>
    );
  }

  if (loading) return <div className="p-4 text-center">Loading groups...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  if (!Array.isArray(groups)) return <div className="p-4 text-center">Invalid groups data</div>;
  if (groups.length === 0) return <div className="p-4 text-center">No groups found</div>;

  // 🎯 Derive filtered groups based on category for rendering
  const filteredGroups = groups.filter(group => {
    if (!selectedCategory) return true;
    const gCat = (group.category || "").toLowerCase().trim().replace(/_/g, " ");
    const sCat = (selectedCategory || "").toLowerCase().trim().replace(/_/g, " ");
    return gCat === sCat || gCat.includes(sCat) || sCat.includes(gCat);
  });

  const currentGroup = filteredGroups.find(group => group._id === activeGroup) || filteredGroups[0];

  // Per-category cutoff. These call sites passed neither sport nor category, so
  // the standings highlight and the "Top N qualify" caption both showed the
  // track default — a different number from the one transitionToKnockout
  // applies, which resolves per group's category. Falls back to the track when
  // the category sets none, so nothing changes for single-format tournaments.
  const currentQualifyPerGroup = getQualifyPerGroup(
    tournament,
    propActiveSportId,
    currentGroup?.category
  );

  const filteredRound2Groups = (round2Groups || []).filter(group => {
    if (!selectedCategory) return true;
    const gCat = (group.category || "").toLowerCase().trim().replace(/_/g, " ");
    const sCat = (selectedCategory || "").toLowerCase().trim().replace(/_/g, " ");
    // "all" category matches everything
    if (gCat === "all") return true;
    return gCat === sCat || gCat.includes(sCat) || sCat.includes(gCat);
  });

  const currentRound2Group = filteredRound2Groups.find(g => g._id === activeRound2Group) || filteredRound2Groups[0];

  return (
    <div className="mt-6 bg-[#181A22] p-4 rounded-[16px] shadow">


      {/* Sub-Stage Tabs (segmented) */}
      <div className="inline-flex items-center gap-1 p-1 bg-white/[0.06] rounded-lg mb-5">
        {['League', 'Top Players', 'Knockout'].map((tab) => (
          <button
            key={tab}
            onClick={() => setactiveSubGroupTab(tab)}
            className={`px-5 py-1.5 rounded-md text-sm font-semibold transition-all w-auto ${
              activeSubGroupTab === tab
                ? 'bg-[#181A22] text-orange-400 shadow-sm'
                : 'bg-transparent text-gray-300 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Category Filter — per ACTIVE sport (not sports[0]) so e.g. Foosball
          shows Singles/Doubles, not Cricket's "Open". */}
      {(() => {
        const _cats = getCategories(tournament, propActiveSportId);
        return _cats.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
            Filter by category
          </div>
          <div className="flex flex-wrap gap-1.5">
            {_cats.map((cat) => {
              const newCat = cat.name;
              const isActive = selectedCategory && selectedCategory.toLowerCase().trim() === cat.name.toLowerCase().trim();
              return (
                <button
                  key={cat._id || cat.name}
                  onClick={() => {
                    setSelectedCategory(newCat);
                    const firstInCat = groups.find(g => {
                      const gCat = (g.category || "").toLowerCase().trim().replace(/_/g, " ");
                      const nCat = (newCat || "").toLowerCase().trim().replace(/_/g, " ");
                      return gCat === nCat || gCat.includes(nCat) || nCat.includes(gCat);
                    });
                    if (firstInCat) {
                      setActiveGroup(firstInCat._id);
                      fetchMatches(firstInCat._id);
                    } else {
                      setActiveGroup(null);
                    }
                    const firstRound2InCat = round2Groups.find(g => {
                      const gCat = (g.category || "").toLowerCase().trim().replace(/_/g, " ");
                      const nCat = (newCat || "").toLowerCase().trim().replace(/_/g, " ");
                      return gCat === nCat || gCat.includes(nCat) || nCat.includes(gCat);
                    });
                    if (firstRound2InCat) {
                      setActiveRound2Group(firstRound2InCat._id);
                    } else {
                      setActiveRound2Group(null);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all w-auto ${
                    isActive
                      ? "bg-orange-500/100 text-white shadow-sm"
                      : "bg-[#181A22] text-gray-300 border border-white/[0.06] hover:border-orange-500/40 hover:text-orange-400"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* League Stage */}
      {activeSubGroupTab === "League" && (
        <div>
          {/* Bulk-action toolbar — Sub-step Plan A.
              Sits above the group-tab strip. "Generate All" always visible
              when there's at least one group lacking matches; Select toggles
              checkbox mode. While selectionMode is on, the strip below shows
              checkbox-tabs and a sticky action bar appears for the selection. */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              {filteredGroups.length} group{filteredGroups.length === 1 ? "" : "s"} in this sport
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                // Visible when any filtered group hasn't had matches fetched yet
                // OR is known to have zero matches. Server-side bulk endpoint
                // also skips ones that already have matches, so this is just a
                // visibility hint, not a strict gate.
                const candidates = filteredGroups.filter((g) => !groupsWithMatches.has(g._id));
                if (candidates.length === 0 || selectionMode) return null;
                return (
                  <button
                    onClick={async () => {
                      if (bulkBusy) return;
                      const groupIds = candidates.map((g) => g._id);
                      setBulkBusy(true);
                      try {
                        const res = await axios.post("/api/tournaments/matches/generate-bulk", {
                          tournamentId, groupIds,
                        });
                        const { totalMatchesCreated = 0, generated = [], skipped = [], failed = [] } = res.data || {};
                        toast.success(
                          `Generated ${totalMatchesCreated} match${totalMatchesCreated === 1 ? "" : "es"} across ${generated.length} group${generated.length === 1 ? "" : "s"}` +
                          (skipped.length ? ` · ${skipped.length} skipped` : "") +
                          (failed.length ? ` · ${failed.length} failed` : "")
                        );
                        // Refresh matches for whichever group is currently active.
                        if (activeGroup) await fetchMatches(activeGroup);
                        // Mark all generated groups as having matches.
                        setGroupsWithMatches((prev) => {
                          const next = new Set(prev);
                          for (const g of generated) next.add(g.groupId);
                          return next;
                        });
                      } catch (err) {
                        toast.error("Bulk generate failed: " + (err.response?.data?.message || err.message));
                      } finally {
                        setBulkBusy(false);
                      }
                    }}
                    disabled={bulkBusy}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 w-auto ${
                      bulkBusy
                        ? "bg-orange-500/20 text-white cursor-not-allowed"
                        : "bg-orange-500/100 text-white hover:bg-orange-600"
                    }`}
                  >
                    <FiFlag size={13} />
                    {bulkBusy ? "Generating…" : `Generate All (${candidates.length})`}
                  </button>
                );
              })()}
              <button
                onClick={() => {
                  if (selectionMode) exitSelectionMode();
                  else setSelectionMode(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border w-auto ${
                  selectionMode
                    ? "bg-gray-800 text-white border-white/[0.15] hover:bg-gray-900"
                    : "bg-[#181A22] text-gray-300 border-white/[0.06] hover:border-white/[0.08] hover:bg-white/[0.04]"
                }`}
              >
                {selectionMode ? "Exit Select" : "Select"}
              </button>
            </div>
          </div>

          {/* Sticky bulk-action bar — only when selectionMode is on. */}
          {selectionMode && (
            <div className="sticky top-0 z-20 mb-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-300">
                  {selectedGroupIds.size} of {filteredGroups.length} selected
                </span>
                <button
                  onClick={() => {
                    if (selectedGroupIds.size === filteredGroups.length) {
                      setSelectedGroupIds(new Set());
                    } else {
                      setSelectedGroupIds(new Set(filteredGroups.map((g) => g._id)));
                    }
                  }}
                  className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-300 underline w-auto bg-transparent"
                >
                  {selectedGroupIds.size === filteredGroups.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={bulkBusy || selectedGroupIds.size === 0}
                  onClick={async () => {
                    if (bulkBusy || selectedGroupIds.size === 0) return;
                    const groupIds = Array.from(selectedGroupIds);
                    setBulkBusy(true);
                    try {
                      const res = await axios.post("/api/tournaments/matches/generate-bulk", {
                        tournamentId, groupIds,
                      });
                      const { totalMatchesCreated = 0, generated = [], skipped = [], failed = [] } = res.data || {};
                      toast.success(
                        `Generated ${totalMatchesCreated} match${totalMatchesCreated === 1 ? "" : "es"} across ${generated.length} group${generated.length === 1 ? "" : "s"}` +
                        (skipped.length ? ` · ${skipped.length} skipped` : "") +
                        (failed.length ? ` · ${failed.length} failed` : "")
                      );
                      if (activeGroup) await fetchMatches(activeGroup);
                      setGroupsWithMatches((prev) => {
                        const next = new Set(prev);
                        for (const g of generated) next.add(g.groupId);
                        return next;
                      });
                      exitSelectionMode();
                    } catch (err) {
                      toast.error("Bulk generate failed: " + (err.response?.data?.message || err.message));
                    } finally {
                      setBulkBusy(false);
                    }
                  }}
                  className="px-3 py-1 rounded-md text-[11px] font-bold text-white bg-orange-500/100 hover:bg-orange-600 disabled:bg-orange-500/20 disabled:cursor-not-allowed w-auto"
                >
                  Generate Matches
                </button>
                <button
                  disabled={bulkBusy || selectedGroupIds.size === 0}
                  onClick={async () => {
                    if (bulkBusy || selectedGroupIds.size === 0) return;
                    const groupIds = Array.from(selectedGroupIds);
                    if (!window.confirm(`Delete ${groupIds.length} group(s) and all their matches? This cannot be undone.`)) return;
                    setBulkBusy(true);
                    try {
                      const res = await axios.post("/api/tournaments/bookinggroups/bulk-delete", { groupIds });
                      const { totalMatchesRemoved = 0, deleted = [], blocked = [], failed = [] } = res.data || {};
                      const summary =
                        `Deleted ${deleted.length} group${deleted.length === 1 ? "" : "s"} (${totalMatchesRemoved} match${totalMatchesRemoved === 1 ? "" : "es"})` +
                        (blocked.length ? ` · blocked ${blocked.length}` : "") +
                        (failed.length ? ` · failed ${failed.length}` : "");
                      if (blocked.length > 0) {
                        toast.warn(summary + ". " + blocked[0].message);
                      } else {
                        toast.success(summary);
                      }
                      // Remove deleted groups from local state and refresh.
                      const deletedIds = new Set(deleted.map((d) => d.groupId));
                      setGroups((prev) => prev.filter((g) => !deletedIds.has(g._id)));
                      setGroupsWithMatches((prev) => {
                        const next = new Set(prev);
                        for (const id of deletedIds) next.delete(id);
                        return next;
                      });
                      if (activeGroup && deletedIds.has(activeGroup)) {
                        const remaining = filteredGroups.filter((g) => !deletedIds.has(g._id));
                        setActiveGroup(remaining[0]?._id || null);
                      }
                      exitSelectionMode();
                    } catch (err) {
                      toast.error("Bulk delete failed: " + (err.response?.data?.message || err.message));
                    } finally {
                      setBulkBusy(false);
                    }
                  }}
                  className="px-3 py-1 rounded-md text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-500/20 disabled:cursor-not-allowed w-auto"
                >
                  Delete
                </button>
                <button
                  onClick={exitSelectionMode}
                  className="px-3 py-1 rounded-md text-[11px] font-semibold text-gray-300 bg-[#181A22] border border-white/[0.06] hover:bg-white/[0.04] w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Group Selection */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {filteredGroups.map((group, index) => {
              const isActive = activeGroup === group._id;
              const isSelected = selectedGroupIds.has(group._id);
              return (
                <button
                  key={group._id}
                  onClick={async () => {
                    if (selectionMode) {
                      toggleGroupSelected(group._id);
                      return;
                    }
                    setActiveGroup(group._id);
                    await fetchMatches(group._id);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap w-auto inline-flex items-center gap-1.5 ${
                    selectionMode
                      ? isSelected
                        ? "bg-emerald-500/100 text-white"
                        : "bg-[#181A22] text-gray-300 border border-white/[0.06] hover:border-emerald-500/40"
                      : isActive
                        ? "bg-orange-500/100 text-white"
                        : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {selectionMode && (
                    <span className={`inline-block w-3.5 h-3.5 rounded border ${isSelected ? "bg-[#181A22] border-white text-emerald-400" : "border-white/[0.10]"} flex items-center justify-center`}>
                      {isSelected && <span className="text-[10px] font-black leading-none">✓</span>}
                    </span>
                  )}
                  {group.groupName || `Group ${index + 1}`}
                </button>
              );
            })}
          </div>

          {/* Group Content */}
          {currentGroup ? (
            <div className="bg-[#181A22] rounded-xl border border-white/[0.08] overflow-hidden">
              {/* Group header strip */}
              <div className="bg-gradient-to-r from-orange-500/10 to-transparent px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-white">
                    {currentGroup.groupName || `Group ${groups.indexOf(currentGroup) + 1}`}
                  </h2>
                  <span className="text-[10px] font-bold bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {currentGroup.players?.length || 0} players
                  </span>
                  {currentGroup.category && (
                    <span className="text-[10px] font-semibold bg-white/[0.06] text-gray-300 px-2 py-0.5 rounded-full">
                      {currentGroup.category}
                    </span>
                  )}
                </div>
                {groupsWithMatches.has(currentGroup._id) ? (
                  <div className="relative group">
                    <button
                      className="p-1.5 rounded text-gray-600 cursor-not-allowed bg-transparent w-auto"
                      disabled
                      title="Matches already generated — editing locked"
                    >
                      <FiEdit2 size={14} />
                    </button>
                    <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1.5 px-2.5 bottom-full right-0 mb-1 w-52 z-50 shadow-lg text-center leading-tight">
                      Matches already generated — editing is locked
                    </div>
                  </div>
                ) : (
                  <button
                    className="p-1.5 rounded text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 bg-transparent w-auto"
                    onClick={() => handleEditGroup(currentGroup)}
                    title="Edit group"
                  >
                    <FiEdit2 size={14} />
                  </button>
                )}
              </div>

              {/* Players — chip grid */}
              <div className="px-5 py-4">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Players</div>
                <div className="flex flex-wrap gap-1.5">
                  {currentGroup.players?.map((player, index) => {
                    const name = player.userId?.name || player.userName || `Player ${index + 1}`;
                    return (
                      <div key={player._id || index}
                        className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full pl-1 pr-3 py-1">
                        <span className="w-5 h-5 rounded-full bg-orange-400 text-white text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-medium text-gray-300">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action toolbar */}
              <div className="px-5 pb-4 space-y-2">
                {/* Primary row */}
                <div className="flex gap-2 flex-wrap">
                  {(!matchesData[activeGroup] || matchesData[activeGroup]?.length === 0) && (
                    <button
                      className="flex-1 min-w-[140px] bg-orange-500/100 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                      onClick={() => setIsModalOpen(true)}
                    >
                      <FiFlag size={14} />
                      Generate Matches
                    </button>
                  )}
                  <button
                    className="flex-1 min-w-[140px] py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 text-white bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      if (showStandings && standingsData[activeGroup]) {
                        setShowStandings(false);
                      } else {
                        fetchStandings(activeGroup);
                        setShowStandings(true);
                      }
                    }}
                  >
                    <FiTable size={14} />
                    {showStandings && standingsData[activeGroup] ? "Hide Standings" : "Standings"}
                  </button>
                  <button
                    className="flex-1 min-w-[140px] py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-gray-300 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08]"
                    onClick={() =>
                      navigate(`/tournament-management/group-stage/${tournamentId}/${activeGroup}/points-table`, {
                        state: { tournamentId, groupId: activeGroup, round: 1 }
                      })
                    }
                  >
                    Points Table
                  </button>
                </div>

                {/* Secondary row — bulk upload (only shown when there are incomplete matches) */}
                {matchesData[activeGroup]?.length > 0 && matchesData[activeGroup].some(
                  m => m.status !== 'completed' && m.status !== 'COMPLETED'
                ) && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="flex-1 min-w-[140px] py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20"
                      onClick={() => openBulkScoreModal(
                        matchesData[activeGroup] || [],
                        activeGroup,
                        `Bulk Score Upload — ${currentGroup?.groupName || 'Group'}`
                      )}
                    >
                      <FiCheck size={14} />
                      Bulk Score Upload
                    </button>
                    <button
                      className="flex-1 min-w-[140px] py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15"
                      onClick={() => setShowCsvUpload(true)}
                    >
                      <FiUpload size={14} />
                      Upload CSV
                    </button>
                  </div>
                )}

                {/* Destructive — separated.
                    Sub-step Plan A: two side-by-side buttons. "Delete All
                    Matches" wipes matches but keeps the group; "Delete Group"
                    removes the group itself and cascades its matches. The
                    second is gated by the per-sport stage on the server (409
                    if past group_stage with completed matches). */}
                <div className="flex gap-2 flex-wrap">
                  {matchesData[activeGroup]?.length > 0 && (
                    <button
                      className="flex-1 min-w-[160px] py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-red-400 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20"
                      onClick={() => {
                        if (window.confirm(`Delete ALL ${matchesData[activeGroup]?.length || 0} matches from this group? This cannot be undone.`)) {
                          axios.delete(`/api/tournaments/matches/${tournamentId}/${activeGroup}/all`)
                            .then((res) => {
                              toast.info(res.data.message || "Matches deleted");
                              fetchMatches();
                            })
                            .catch((err) => toast.error("Failed to delete: " + (err.response?.data?.message || err.message)));
                        }
                      }}
                    >
                      <FiTrash2 size={14} />
                      Delete All Matches ({matchesData[activeGroup]?.length || 0})
                    </button>
                  )}
                  <button
                    className="flex-1 min-w-[160px] py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-red-400 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20"
                    onClick={async () => {
                      const matchCount = matchesData[activeGroup]?.length || 0;
                      const name = currentGroup?.groupName || "this group";
                      const tail = matchCount > 0 ? ` and its ${matchCount} match${matchCount === 1 ? "" : "es"}` : "";
                      if (!window.confirm(`Delete "${name}"${tail}? This cannot be undone.`)) return;
                      try {
                        const res = await axios.delete(`/api/tournaments/bookinggroups/${activeGroup}`);
                        toast.success(res.data?.message || "Group deleted");
                        const removedId = activeGroup;
                        setGroups((prev) => prev.filter((g) => g._id !== removedId));
                        setGroupsWithMatches((prev) => {
                          const next = new Set(prev);
                          next.delete(removedId);
                          return next;
                        });
                        const remaining = filteredGroups.filter((g) => g._id !== removedId);
                        setActiveGroup(remaining[0]?._id || null);
                      } catch (err) {
                        const status = err.response?.status;
                        const msg = err.response?.data?.message || err.message;
                        if (status === 409) {
                          toast.warn(msg); // Block message (past group_stage with completed matches)
                        } else {
                          toast.error("Failed to delete group: " + msg);
                        }
                      }
                    }}
                  >
                    <FiTrash2 size={14} />
                    Delete Group
                  </button>
                </div>
              </div>

              {/* Inline Standings Table */}
              {showStandings && standingsData[activeGroup] && (
                <div className="mt-4 bg-[#181A22] rounded-xl border border-white/[0.06] overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5">
                    <h6 className="text-white text-sm font-bold">
                      {standingsData[activeGroup].groupName} — Standings
                    </h6>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/[0.04] text-gray-300 text-xs uppercase">
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
                        {standingsData[activeGroup].standings.map((p, idx) => (
                          <tr key={p.playerId} className={`border-t border-white/[0.05] ${
                            p.qualified ? "bg-green-500/10" : ""
                          } ${idx < currentQualifyPerGroup ? "font-semibold" : ""}`}>
                            <td className="px-3 py-2 text-gray-400">{p.rank}</td>
                            <td className="px-3 py-2 text-white flex items-center gap-1.5">
                              {p.playerName}
                              {p.qualified && (
                                <span className="text-[9px] bg-green-500/100 text-white px-1.5 py-0.5 rounded-full">Q</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-300">{p.played}</td>
                            <td className="px-3 py-2 text-center text-green-400 font-medium">{p.won}</td>
                            <td className="px-3 py-2 text-center text-red-500">{p.lost}</td>
                            <td className="px-3 py-2 text-center text-gray-300">
                              {p.setsWon}-{p.setsLost}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-300">
                              {p.pointsScored}-{p.pointsConceded}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-orange-400">{p.totalPoints}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transition to Knockout Button — only for combined tournaments
                  STEP 17b.ii: per-sport reads (sports[0] default on legacy variant) */}
              {getTournamentType(tournament) === "knockout + group stage" &&
                getCurrentStage(tournament) !== "knockout" &&
                getCurrentStage(tournament) !== "completed" && (
                <div className="mt-4 mx-5">
                  <button
                    className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleTransitionToKnockout}
                    disabled={transitionLoading}
                  >
                    {transitionLoading ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <FiFlag />
                        Transition to Knockout
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-500 text-center mt-1">
                    All group matches must be completed. Top {currentQualifyPerGroup} per group will qualify.
                  </p>
                </div>
              )}

              {/* Matches Display */}
              <div>
                {matchesData[activeGroup]?.length > 0 && (
                  <div className="mt-6">
                    <h5 className="mb-3 text-lg font-semibold text-orange-500">
                      Matches -{" "}
                      {currentGroup.groupName ||
                        `Group ${groups.indexOf(currentGroup) + 1}`}
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {matchesData[activeGroup].map((match, index) => {
                        const isCompleted = match.status === 'completed' || match.status === 'COMPLETED';
                        const isLive = match.status === 'in_progress' || match.status === 'IN_PROGRESS';
                        const p1Name = match.player1?.userName || match.player1?.playerName || 'Player 1';
                        const p2Name = match.player2?.userName || match.player2?.playerName || 'Player 2';
                        const p1Won = isCompleted && (
                          match.winner?.playerId?.toString() === match.player1?.playerId?.toString() ||
                          match.winner?.playerName === p1Name
                        );
                        const p2Won = isCompleted && (
                          match.winner?.playerId?.toString() === match.player2?.playerId?.toString() ||
                          match.winner?.playerName === p2Name
                        );
                        const p1Sets = match.result?.finalScore?.player1Sets;
                        const p2Sets = match.result?.finalScore?.player2Sets;
                        // Prefer the freshly re-fetched live-state; the list's own
                        // match.liveScore is the schema default {0,0} and would mask it.
                        const liveP1 = match.liveMatchData?.liveScore?.player1Points ?? match.liveScore?.player1Points ?? 0;
                        const liveP2 = match.liveMatchData?.liveScore?.player2Points ?? match.liveScore?.player2Points ?? 0;
                        const umpireName = getUmpireName(match.referee);

                        const statusChip = isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/100" />
                            COMPLETED
                          </span>
                        ) : isLive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/100 animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-gray-300">
                            SCHEDULED
                          </span>
                        );

                        const renderPlayerRow = (name, won, avatar, align = "left") => (
                          <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
                            {avatar ? (
                              <img loading="lazy" src={assetUrl(avatar)} alt={name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${won ? "bg-emerald-500/100" : "bg-orange-400"}`}>
                                {name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className={`font-semibold text-sm truncate ${won ? "text-emerald-300" : "text-gray-100"}`}>
                              {name}
                            </span>
                            {won && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold flex-shrink-0">WON</span>}
                          </div>
                        );

                        return (
                          <div
                            key={index}
                            className={`relative bg-[#181A22] rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                              isCompleted ? "border-emerald-500/30" : isLive ? "border-amber-500/30" : "border-white/[0.06]"
                            }`}
                            onClick={(e) => { e.stopPropagation(); openModal(match); }}
                          >
                            {/* Status accent strip */}
                            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${
                              isCompleted ? "bg-emerald-500/100" : isLive ? "bg-amber-500/100" : "bg-white/[0.08]"
                            }`} />

                            <div className="p-4 pt-4">
                              {/* Header — match id / court / status + actions */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                                    R1 · M{match.matchNumber}
                                  </span>
                                  {[3, 5, 7].includes(match.matchFormat?.totalSets) && (
                                    <span className="text-[10px] font-bold text-[#5E6AD2] bg-[#5E6AD2]/10 px-2 py-0.5 rounded">
                                      Bo{match.matchFormat.totalSets}
                                    </span>
                                  )}
                                  <CourtPicker
                                    matchId={match._id}
                                    current={match.courtNumber}
                                    courts={tournamentCourts}
                                    disabled={(match.status || '').toUpperCase() === 'COMPLETED'}
                                    onChange={(newName) => {
                                      // Update local matchesByRound state in place
                                      // so the bracket card reflects the change
                                      // without a full refetch.
                                      setKnockoutMatchesByRound((prev) => {
                                        const next = { ...prev };
                                        Object.keys(next).forEach((roundKey) => {
                                          next[roundKey] = next[roundKey].map((m) =>
                                            m._id === match._id ? { ...m, courtNumber: newName } : m
                                          );
                                        });
                                        return next;
                                      });
                                    }}
                                  />
                                  {statusChip}
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openModal(match); }}
                                    className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] w-auto bg-transparent"
                                    title="View details"
                                  >
                                    <FiEdit2 size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Delete match M${match.matchNumber}?`)) {
                                        axios.delete(`/api/tournaments/matches/${match._id}`)
                                          .then(() => fetchMatches())
                                          .catch((err) => toast.info("Delete failed: " + (err.response?.data?.message || err.message)));
                                      }
                                    }}
                                    className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 w-auto bg-transparent"
                                    title="Delete match"
                                  >
                                    <FiTrash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Time */}
                              <p className="text-[11px] text-gray-400 mb-3">
                                {formatDate(match.startTime)} · {MatchformatTime(match.startTime)}
                                {match.matchEndTime && MatchformatTime(match.matchEndTime) && ` → ${MatchformatTime(match.matchEndTime)}`}
                              </p>

                              {/* Players with score in the middle */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  {renderPlayerRow(p1Name, p1Won, match.player1?.playerId?.profileImage, "left")}
                                </div>
                                <div className="flex-shrink-0 text-center">
                                  {isCricketMatch(match) && (isLive || isCompleted) ? (() => {
                                    const innings = getCricketInnings(match);
                                    const c1 = cricketSideScore(innings, "player1");
                                    const c2 = cricketSideScore(innings, "player2");
                                    if (!c1 && !c2) return <span className="text-xs font-bold text-gray-500">VS</span>;
                                    return (
                                      <div className="flex flex-col items-center leading-tight">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`text-sm font-bold ${p1Won ? "text-emerald-400" : "text-gray-100"}`}>{c1?.text ?? "—"}</span>
                                          <span className="text-gray-600 text-xs">v</span>
                                          <span className={`text-sm font-bold ${p2Won ? "text-emerald-400" : "text-gray-100"}`}>{c2?.text ?? "—"}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-500 mt-0.5">
                                          {c1 ? `${c1.overs}` : "—"} ov{c2 ? ` · ${c2.overs}` : ""}
                                        </span>
                                      </div>
                                    );
                                  })() : isCompleted && p1Sets != null ? (
                                    <div className="flex items-center gap-1">
                                      <span className={`text-lg font-bold ${p1Won ? "text-emerald-400" : "text-gray-500"}`}>{p1Sets}</span>
                                      <span className="text-gray-600">-</span>
                                      <span className={`text-lg font-bold ${p2Won ? "text-emerald-400" : "text-gray-500"}`}>{p2Sets}</span>
                                    </div>
                                  ) : isLive ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-lg font-bold text-amber-400">{liveP1}</span>
                                      <span className="text-gray-600">-</span>
                                      <span className="text-lg font-bold text-amber-400">{liveP2}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-gray-500">VS</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {renderPlayerRow(p2Name, p2Won, match.player2?.playerId?.profileImage, "right")}
                                </div>
                              </div>

                              {/* Footer — umpire + assign */}
                              <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between">
                                {umpireName ? (
                                  <span className="flex items-center gap-1.5 text-[11px] text-gray-300 min-w-0">
                                    <FiShield className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">{umpireName}</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                    <FiShield className="w-3 h-3" />
                                    <span>No umpire</span>
                                  </span>
                                )}
                                {!umpireName && !isCompleted && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setAssignModalMatch(match); }}
                                    className="flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-white hover:bg-orange-500/100 px-2 py-1 rounded w-auto bg-orange-500/10 transition-colors"
                                  >
                                    <FiUserPlus size={11} />
                                    Assign
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-white/[0.04] rounded-3xl border-2 border-dashed border-white/[0.06] mt-4">
              <div className="w-16 h-16 bg-white/[0.06] rounded-full flex items-center justify-center mb-4">
                <FiInfo className="text-gray-500 text-3xl" />
              </div>
              <p className="text-gray-300 font-semibold text-lg text-center">
                No groups found for {selectedCategory || "this category"}
              </p>
              <p className="text-gray-500 text-sm mt-1 text-center max-w-sm">
                To get started, go to the <strong>Registered Players</strong> tab and create groups for this category.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🔹 Top Players Content (Round 2 Groups) */}
      {activeSubGroupTab === "Top Players" && (
        <div>
          {filteredRound2Groups.length > 0 ? (
            <>
              {/* Group Selection Tabs - Exact same as League */}
              <div className="flex space-x-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                {filteredRound2Groups.map((group, index) => (
                  <button
                    key={group._id}
                    onClick={async () => {
                      setActiveRound2Group(group._id);
                    }}
                    className={`px-4 py-2 text-sm w-auto font-semibold rounded-lg transition-all whitespace-nowrap ${activeRound2Group === group._id
                      ? "bg-[#F97316] text-white shadow-sm"
                      : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.08]"
                      }`}
                  >
                    {group.groupName || `Round 2 Group ${index + 1}`}
                  </button>
                ))}
              </div>

              {/* Group Content - Exact same structure as League */}
              {currentRound2Group && (
                <div className="w-full p-4 bg-[#181A22] rounded-2xl">
                  <div className="flex justify-between items-center mb-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-[18px] md:text-[18px] font-[500] text-orange-500">
                        {currentRound2Group.groupName || `Round 2 Group ${round2Groups.indexOf(currentRound2Group) + 1}`}
                      </h2>
                    </div>
                    <FiEdit2 />
                  </div>

                  {/* Player List */}
                  <div className="space-y-1.5 mb-5">
                    {currentRound2Group.players?.map((player, index) => (
                      <div key={player._id || index} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-orange-500/10/50 transition">
                        <span className="w-6 h-6 rounded-full bg-orange-500/15 text-orange-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
                        <span className="text-sm font-medium text-gray-100">{player.userName || player.playerName || `Player ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons - Compact grid */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {(!round2MatchesData[activeRound2Group] || round2MatchesData[activeRound2Group]?.length === 0) && (
                      <button
                        className="bg-orange-500/100 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-[0.97]"
                        onClick={() => {
                          setPendingRound2GroupId(activeRound2Group);
                          setIsModalOpen(true);
                        }}
                      >
                        <FiFlag className="w-4 h-4" />
                        Generate Matches
                      </button>
                    )}

                    <button
                      className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-orange-500 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/15 transition"
                      onClick={() =>
                        navigate(`/tournament-management/group-stage/${tournamentId}/${activeRound2Group}/points-table`, {
                          state: { tournamentId, groupId: activeRound2Group, round: 2 }
                        })
                      }
                    >
                      <FiTable className="w-4 h-4" />
                      Points Table
                    </button>

                    {round2MatchesData[activeRound2Group]?.length > 0 && round2MatchesData[activeRound2Group].some(
                      m => m.status !== 'completed' && m.status !== 'COMPLETED'
                    ) && (
                      <button
                        className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white bg-emerald-500/100 hover:bg-emerald-600 transition"
                        onClick={() => openBulkScoreModal(
                          round2MatchesData[activeRound2Group] || [],
                          activeRound2Group,
                          `Bulk Score Upload — ${currentRound2Group?.groupName || 'Round 2 Group'}`
                        )}
                      >
                        <FiCheck className="w-4 h-4" />
                        Bulk Upload
                      </button>
                    )}

                    {round2MatchesData[activeRound2Group]?.length > 0 && (
                      <button
                        className="py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-red-500 bg-red-500/10 border border-red-500/30 hover:bg-red-500/15 transition"
                        onClick={() => {
                          if (window.confirm(`Delete ALL ${round2MatchesData[activeRound2Group]?.length || 0} matches? This cannot be undone.`)) {
                            axios.delete(`/api/tournaments/matches/${tournamentId}/${activeRound2Group}/all`)
                              .then((res) => { toast.info(res.data.message || "Matches deleted"); fetchRound2Groups(); })
                              .catch((err) => toast.error("Failed to delete: " + (err.response?.data?.message || err.message)));
                          }
                        }}
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Delete ({round2MatchesData[activeRound2Group]?.length || 0})
                      </button>
                    )}
                  </div>

                  {/* Matches Grid */}
                  <div>
                    {round2MatchesData[activeRound2Group]?.length > 0 && (
                      <div>
                        <h5 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-orange-500/100 rounded-full"></span>
                          Matches — {currentRound2Group.groupName || `Group ${round2Groups.indexOf(currentRound2Group) + 1}`}
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {round2MatchesData[activeRound2Group].map((match, index) => (
                            <div
                              key={index}
                              className={`rounded-2xl p-4 cursor-pointer border transition-all hover:shadow-md ${
                                match.status === 'COMPLETED' ? 'bg-emerald-500/10/50 border-emerald-500/30' :
                                match.status === 'IN_PROGRESS' ? 'bg-amber-500/10/50 border-amber-500/30' :
                                'bg-[#181A22] border-white/[0.05] hover:border-orange-500/30'
                              }`}
                              onClick={(e) => { e.stopPropagation(); openModal(match); }}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="bg-orange-500/15 text-orange-300 rounded-lg text-[10px] font-bold px-2 py-0.5">
                                    R2-M{match.matchNumber}
                                  </span>
                                  <CourtPicker
                                    matchId={match._id}
                                    current={match.courtNumber}
                                    courts={tournamentCourts}
                                    disabled={(match.status || '').toUpperCase() === 'COMPLETED'}
                                    onChange={(newName) => {
                                      // Round 2 list — patch locally so the
                                      // re-render shows the new court without
                                      // a full refetch.
                                      setRound2MatchesData((prev) => {
                                        const next = {};
                                        Object.keys(prev).forEach((gid) => {
                                          next[gid] = prev[gid].map((m) =>
                                            m._id === match._id ? { ...m, courtNumber: newName } : m
                                          );
                                        });
                                        return next;
                                      });
                                    }}
                                  />
                                  {match.status === 'COMPLETED' && (
                                    <span className="bg-emerald-500/100 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">Done</span>
                                  )}
                                  {match.status === 'IN_PROGRESS' && (
                                    <span className="bg-amber-500/100 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                      <span className="w-1 h-1 bg-[#181A22] rounded-full animate-pulse"></span> Live
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openModal(match);
                                    }}
                                    className="text-gray-400 hover:bg-transparent focus:outline-none w-auto bg-transparent"
                                  >
                                    <FiEdit2 />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Delete match M${match.matchNumber}?`)) {
                                        axios.delete(`/api/tournaments/matches/${match._id}`)
                                          .then(() => fetchRound2Groups())
                                          .catch((err) => toast.info("Delete failed: " + (err.response?.data?.message || err.message)));
                                      }
                                    }}
                                    className="text-red-400 hover:text-red-400 hover:bg-transparent focus:outline-none w-auto bg-transparent"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <p className="text-center text-xs text-gray-500 mb-3">
                                {formatDate(match.startTime)} • {MatchformatTime(match.startTime)}
                                {match.matchEndTime && MatchformatTime(match.matchEndTime) && ` → ${MatchformatTime(match.matchEndTime)}`}
                              </p>

                              <div className="space-y-2">
                                {/* Player 1 */}
                                <div className="flex items-center gap-2.5">
                                  {match.player1?.playerId?.profileImage ? (
                                    <img loading="lazy" src={assetUrl(match.player1.playerId.profileImage)} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-orange-500/100 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
                                      {(match.player1?.userName || match.player1?.name || '?').charAt(0)}
                                    </div>
                                  )}
                                  <span className={`text-sm font-semibold ${match.winner?.playerId?.toString() === match.player1?.playerId?.toString() || match.winner?.playerName === (match.player1?.userName || match.player1?.name) ? 'text-emerald-400' : 'text-gray-100'}`}>
                                    {match.player1?.userName || match.player1?.name || 'Player 1'}
                                  </span>
                                  {(match.winner?.playerId?.toString() === match.player1?.playerId?.toString() || match.winner?.playerName === (match.player1?.userName || match.player1?.name)) && match.status === 'COMPLETED' && (
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-auto">W</span>
                                  )}
                                </div>

                                {/* VS + Score */}
                                <div className="flex items-center gap-2 pl-10">
                                  <span className="text-[10px] font-bold text-gray-600 uppercase">vs</span>
                                  {match.status === 'COMPLETED' && match.result?.finalScore && (
                                    <span className="text-[10px] font-bold text-gray-400 bg-white/[0.06] px-2 py-0.5 rounded-md">
                                      {match.result.finalScore.player1Sets} - {match.result.finalScore.player2Sets}
                                    </span>
                                  )}
                                </div>

                                {/* Player 2 */}
                                <div className="flex items-center gap-2.5">
                                  {match.player2?.playerId?.profileImage ? (
                                    <img loading="lazy" src={assetUrl(match.player2.playerId.profileImage)} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/100 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
                                      {(match.player2?.userName || match.player2?.name || '?').charAt(0)}
                                    </div>
                                  )}
                                  <span className={`text-sm font-semibold ${match.winner?.playerId?.toString() === match.player2?.playerId?.toString() || match.winner?.playerName === (match.player2?.userName || match.player2?.name) ? 'text-emerald-400' : 'text-gray-100'}`}>
                                    {match.player2?.userName || match.player2?.name || 'Player 2'}
                                  </span>
                                  {(match.winner?.playerId?.toString() === match.player2?.playerId?.toString() || match.winner?.playerName === (match.player2?.userName || match.player2?.name)) && match.status === 'COMPLETED' && (
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-auto">W</span>
                                  )}
                                </div>
                              </div>

                              {/* Enhanced Live Score Display for Top Players (Round 2) */}
                              {(match.status === 'IN_PROGRESS' || match.status === 'in_progress') && (match.liveMatchData?.liveScore || match.liveScore) && (
                                <div className="mt-3 p-2 bg-amber-500/100/10 rounded-lg border border-yellow-500/30">
                                  <div className="text-center">
                                    <div className="text-sm text-amber-300 font-medium mb-1 flex items-center justify-center gap-2">
                                      <div className="w-2 h-2 bg-amber-500/100/100 rounded-full animate-pulse"></div>
                                      Live Score - Round 2
                                    </div>
                                    <div className="text-lg font-bold text-gray-100">
                                      {(match.liveMatchData?.liveScore?.player1Points ?? match.liveScore?.player1Points ?? 0)} - {(match.liveMatchData?.liveScore?.player2Points ?? match.liveScore?.player2Points ?? 0)}
                                    </div>
                                    <div className="text-xs text-amber-400 mt-1">
                                      Set {match.liveMatchData?.currentSet ?? match.currentSet ?? 1}, Game {match.liveMatchData?.currentGame ?? match.currentGame ?? 1}
                                    </div>
                                    <div className="text-xs text-emerald-400 mt-1 bg-emerald-500/10 px-2 py-1 rounded">
                                      Top Players championship impact
                                    </div>
                                  </div>
                                </div>
                              )}


                              {/* Legacy Score Format with Round 2 Context */}
                              {match.status === 'COMPLETED' && match.currentScore && !match.result && (
                                <div className="mt-3 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                                  <div className="text-center">
                                    <div className="text-sm text-green-300 font-medium mb-1">Round 2 Complete</div>
                                    <div className="text-xs space-y-1">
                                      {match.currentScore.setOne && (
                                        <div>Set 1: {Array.isArray(match.currentScore.setOne) ? `${match.currentScore.setOne[0]}-${match.currentScore.setOne[1]}` : match.currentScore.setOne}</div>
                                      )}
                                      {match.currentScore.setTwo && (
                                        <div>Set 2: {Array.isArray(match.currentScore.setTwo) ? `${match.currentScore.setTwo[0]}-${match.currentScore.setTwo[1]}` : match.currentScore.setTwo}</div>
                                      )}
                                      {match.currentScore.setThree && (
                                        <div>Set 3: {Array.isArray(match.currentScore.setThree) ? `${match.currentScore.setThree[0]}-${match.currentScore.setThree[1]}` : match.currentScore.setThree}</div>
                                      )}
                                    </div>
                                    {match.winner && (
                                      <div className="text-xs text-green-400 mt-1 font-semibold">
                                        Winner: {typeof match.winner === 'object' ? (match.winner.playerName || match.winner.name || match.winner.userName || 'Unknown') : match.winner}
                                      </div>
                                    )}
                                    <div className="text-xs text-emerald-400 mt-1 bg-emerald-500/10 px-2 py-1 rounded">
                                      Top Players standings updated
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Umpire status + Assign (Phase 2) */}
                              {(() => {
                                const umpireName = getUmpireName(match.referee);
                                const isComp = match.status === 'completed' || match.status === 'COMPLETED';
                                return (
                                  <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between">
                                    {umpireName ? (
                                      <span className="flex items-center gap-1.5 text-xs text-gray-300">
                                        <FiShield className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="font-semibold">Umpire:</span>
                                        <span className="text-gray-100 truncate max-w-[120px]">{umpireName}</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <FiShield className="w-3.5 h-3.5 text-gray-600" />
                                        <span>No umpire</span>
                                      </span>
                                    )}
                                    {!umpireName && !isComp && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setAssignModalMatch(match); }}
                                        className="flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 px-2 py-0.5 rounded hover:bg-orange-500/10 w-auto"
                                      >
                                        <FiUserPlus className="w-3.5 h-3.5" />
                                        Assign
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            // No Round 2 groups yet - keeping the helpful message
            <div className="flex flex-col items-center justify-center p-12 bg-white/[0.04] rounded-3xl border-2 border-dashed border-white/[0.06] mt-4">
              <div className="w-16 h-16 bg-white/[0.06] rounded-full flex items-center justify-center mb-4">
                <FiInfo className="text-gray-500 text-3xl" />
              </div>
              <p className="text-gray-300 font-semibold text-lg text-center">
                No Round 2 groups found for {selectedCategory || "this category"}
              </p>
              <p className="text-gray-500 text-sm mt-1 text-center max-w-sm">
                Round 2 groups appear here after Top Players are selected.
                Go to <strong>Registered Players → Top Players</strong> to proceed.
              </p>
            </div>
          )}

          {/* 🔥 DIRECT KNOCKOUT MODE - When no Round 2 groups but tournament supports Direct Knockout */}
          {round2Groups.length === 0 && tournamentMode === "direct-knockout" && availablePlayersForKnockout.length > 0 && (
            <div className="mt-8 bg-gradient-to-r from-orange-500/10 to-orange-500/10 border border-emerald-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-500/100 rounded-full flex items-center justify-center">
                  <FaMedal className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-300">🔥 Direct Knockout Mode</h3>
                  <p className="text-sm text-emerald-300">Skip Round 2 groups - Go straight to knockout bracket!</p>
                </div>
              </div>

              {/* Player Selection */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-emerald-300 mb-3">
                  Select Players for Direct Knockout ({selectedPlayersForKnockout.length} selected)
                </h4>

                {/* Enhanced Validation Status */}
                <div className={`p-4 rounded-lg mb-4 border-2 transition-all duration-300 ${validationStatus.isValid
                  ? "bg-green-500/10 border-green-500/40 text-green-300 shadow-sm"
                  : selectedPlayersForKnockout.length === 0
                    ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                    : "bg-red-500/10 border-red-500/40 text-red-300 shadow-sm"
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validationStatus.isValid ? (
                      <div className="w-5 h-5 bg-green-500/100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : selectedPlayersForKnockout.length === 0 ? (
                      <div className="w-5 h-5 bg-orange-500/100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-red-500/100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="text-sm font-semibold">
                      {validationStatus.isValid
                        ? "✅ Valid Tournament Setup"
                        : selectedPlayersForKnockout.length === 0
                          ? "💡 Getting Started"
                          : "⚠️ Invalid Player Count"}
                    </div>
                  </div>
                  <div className="text-sm">{validationStatus.message || "Select players to create your Direct Knockout tournament"}</div>
                  {selectedPlayersForKnockout.length > 0 && (
                    <div className="text-xs mt-2 space-y-1">
                      <div>Valid tournament sizes: 4, 8, 16, 32 players (power of 2)</div>
                      {validationStatus.isValid && (
                        <div className="bg-[#181A22] bg-opacity-60 p-2 rounded text-xs">
                          <strong>Tournament Preview:</strong> {Math.log2(selectedPlayersForKnockout.length)} rounds • {selectedPlayersForKnockout.length - 1} total matches • Winner determined in {Math.log2(selectedPlayersForKnockout.length)} stages
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Available Players Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                  {availablePlayersForKnockout
                    .filter(player => {
                      // Filter players by source category if available
                      const sourceGroup = groups.find(g => g._id === player.sourceGroupId);
                      if (!selectedCategory || !sourceGroup) return !selectedCategory || !!sourceGroup;

                      const gCat = (sourceGroup.category || "").toLowerCase().trim().replace(/_/g, " ");
                      const sCat = (selectedCategory || "").toLowerCase().trim().replace(/_/g, " ");
                      return gCat === sCat || gCat.includes(sCat) || sCat.includes(gCat);
                    })
                    .map((player, index) => {
                      const isSelected = selectedPlayersForKnockout.some(p =>
                        (p.playerId || p._id) === (player.playerId || player._id)
                      );

                      return (
                        <div
                          key={player._id || index}
                          onClick={() => {
                            let newSelection;
                            if (isSelected) {
                              // Remove player
                              newSelection = selectedPlayersForKnockout.filter(p =>
                                (p.playerId || p._id) !== (player.playerId || player._id)
                              );
                            } else {
                              // Add player
                              newSelection = [...selectedPlayersForKnockout, player];
                            }
                            setSelectedPlayersForKnockout(newSelection);
                            validateSelectedPlayers(newSelection);
                          }}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${isSelected
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                            : "border-white/[0.06] bg-[#181A22] hover:border-emerald-500/40"
                            }`}
                        >
                          <div className="text-sm font-medium">{player.userName}</div>
                          <div className="text-xs text-gray-400">{player.sourceGroup}</div>
                          {isSelected && (
                            <div className="text-xs text-emerald-400 font-medium mt-1">✓ Selected</div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Quick Selection Buttons */}
              <div className="flex gap-2 mb-6">
                {[4, 8, 16, 32].map(count => (
                  <button
                    key={count}
                    onClick={() => {
                      if (availablePlayersForKnockout.length >= count) {
                        const newSelection = availablePlayersForKnockout.slice(0, count);
                        setSelectedPlayersForKnockout(newSelection);
                        validateSelectedPlayers(newSelection);
                      }
                    }}
                    disabled={availablePlayersForKnockout.length < count}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${availablePlayersForKnockout.length >= count
                      ? "bg-emerald-500/100 text-white hover:bg-emerald-600"
                      : "bg-white/[0.08] text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    Select {count}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSelectedPlayersForKnockout([]);
                    setValidationStatus({ isValid: false, message: "Select players for Direct Knockout" });
                  }}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-500 text-white hover:bg-gray-600"
                >
                  Clear All
                </button>
              </div>

              {/* Create Direct Knockout Button */}
              <button
                onClick={() => setIsDirectKnockoutScheduleModalOpen(true)}
                disabled={!validationStatus.isValid}
                className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-3 ${validationStatus.isValid
                  ? "bg-emerald-500/100 text-white hover:bg-emerald-600"
                  : "bg-white/[0.10] text-gray-400 cursor-not-allowed"
                  }`}
              >
                <FaMedal className="w-5 h-5" />
                Create Direct Knockout Tournament
                {validationStatus.isValid && selectedPlayersForKnockout.length > 0 && (
                  <span className="bg-[#181A22] bg-opacity-20 px-2 py-1 rounded text-sm">
                    {Math.log2(selectedPlayersForKnockout.length)} Rounds
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Knockout Stage */}
      {
        activeSubGroupTab === "Knockout" && (
          <div>
            {knockoutLoading ? (
              <div className="text-center py-12 bg-white/[0.04] rounded-xl border border-dashed border-white/[0.06]">
                <div className="inline-block w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
                <h3 className="text-base font-bold text-gray-300 mb-1">Loading bracket…</h3>
                <p className="text-sm text-gray-400">Fetching the latest knockout matches.</p>
              </div>
            ) : Object.keys(knockoutMatchesByRound).length === 0 ? (
              <div className="text-center py-12 bg-white/[0.04] rounded-xl border border-dashed border-white/[0.06]">
                <FiFlag size={40} className="mx-auto text-gray-600 mb-3" />
                <h3 className="text-base font-bold text-gray-300 mb-1">No knockout matches yet</h3>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Generate knockout matches from the <strong>Super Players</strong> section to see brackets here.
                </p>
              </div>
            ) : (() => {
              const allMatches = Object.values(knockoutMatchesByRound).flat();
              const completedCount = allMatches.filter(x => x.status === 'completed' || x.status === 'COMPLETED').length;
              const totalCount = allMatches.length;
              const roundCount = Object.keys(knockoutMatchesByRound).length;
              return (
              <>
                {/* Summary header */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Knockout Bracket</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span>{totalCount} matches</span>
                      <span className="text-gray-600">·</span>
                      <span>{roundCount} rounds</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-emerald-400 font-semibold">{completedCount}/{totalCount} completed</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      // Pending = not completed and not a bye walkover.
                      const pending = allMatches.filter((m) => {
                        const s = (m.status || "").toUpperCase();
                        return s !== "COMPLETED" && !m.isBye;
                      });
                      if (pending.length === 0) return null;
                      return (
                        <button
                          onClick={() =>
                            openBulkScoreModal(pending, null, `Bulk Score Upload — Knockout (${pending.length} match${pending.length === 1 ? "" : "es"})`)
                          }
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-500/100 hover:bg-emerald-600 flex items-center gap-1.5 w-auto"
                        >
                          <FiUpload size={13} />
                          Bulk Upload
                        </button>
                      );
                    })()}
                    {tournamentCourts.length >= 2 && (
                      <button
                        onClick={() => {
                          if (!window.confirm(`Redistribute ${totalCount} knockout matches across ${tournamentCourts.length} courts? Live and completed matches stay put; pending ones get reshuffled and rescheduled to run in parallel.`)) return;
                          const body = {
                            slotDurationMinutes,
                            matchDurationMinutes,
                          };
                          if (propActiveSportId) body.sportId = propActiveSportId;
                          else if (tournament?.sports?.[0]?.sportId) body.sportId = tournament.sports[0].sportId;
                          axios.post(`/api/tournaments/knockout/redistribute-courts/${tournamentId}`, body)
                            .then((res) => {
                              toast.success(res.data.message || "Courts redistributed");
                              fetchKnockoutMatches();
                            })
                            .catch((err) => toast.error(err.response?.data?.message || "Failed to redistribute courts"));
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-[#5E6AD2] bg-[#5E6AD2]/10 border border-[#5E6AD2]/30 hover:bg-[#5E6AD2]/20 flex items-center gap-1.5 w-auto"
                        title={`Spread matches across ${tournamentCourts.length} courts`}
                      >
                        <FiFlag size={13} />
                        Redistribute
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!window.confirm(`Delete ALL ${totalCount} knockout matches? This cannot be undone.`)) return;
                        axios.delete(`/api/tournaments/knockout/${tournamentId}/all`)
                          .then((res) => {
                            toast.success(res.data.message || "Knockout matches deleted");
                            fetchKnockoutMatches();
                          })
                          .catch((err) => toast.error(err.response?.data?.message || "Failed to delete knockout matches"));
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/15 flex items-center gap-1.5 w-auto"
                    >
                      <FiTrash2 size={13} />
                      Delete All
                    </button>
                  </div>
                </div>

                {/* Bracket Tree (horizontal scroll) */}
                {(() => {
                  const entries = Object.entries(knockoutMatchesByRound);
                  // Sort each round's matches by matchNumber so pairs align correctly
                  entries.forEach(([, arr]) => arr.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0)));

                  // Compute the champion (if final is done)
                  const finalRound = entries[entries.length - 1];
                  const finalMatch = finalRound && finalRound[1].length === 1 ? finalRound[1][0] : null;
                  const finalDone = finalMatch && (finalMatch.status === 'completed' || finalMatch.status === 'COMPLETED');
                  const champion = finalDone
                    ? (typeof finalMatch.winner === 'object'
                        ? (finalMatch.winner?.playerName || finalMatch.winner?.name)
                        : (finalMatch.winner || finalMatch.result?.winner?.playerName))
                    : null;

                  // Bracket layout constants
                  const CARD_W = 220;
                  const CARD_H = 76;
                  const BASE_GAP = 16; // vertical gap between round-1 cards
                  const COL_GAP = 40;  // horizontal gap between rounds

                  return (
                    <div className="bg-[#181A22] rounded-xl border border-white/[0.06] overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">Bracket</h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">Scroll horizontally to see all rounds</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto p-6 bg-white/[0.04] overflow-y-scroll max-h-screen">
                        <div className="flex" style={{ gap: COL_GAP }}>
                          {entries.map(([roundName, matches], roundIdx) => {
                            const pow = Math.pow(2, roundIdx);
                            // Vertical pitch (distance between successive cards' top edges)
                            const pitch = (CARD_H + BASE_GAP) * pow;
                            // Margin on the first card of this column so pairs align with feeders
                            const firstTop = (pitch - CARD_H - BASE_GAP) / 2;
                            const roundTitle = roundName.charAt(0).toUpperCase() + roundName.slice(1).replace('-', ' ');
                            const rDone = matches.filter(x => x.status === 'completed' || x.status === 'COMPLETED').length;
                            const rTotal = matches.length;

                            return (
                              <div key={roundName} className="flex-shrink-0" style={{ width: CARD_W }}>
                                {/* Column header */}
                                <div className="text-center mb-4">
                                  <div className="text-[11px] font-extrabold text-orange-400 uppercase tracking-wider">
                                    {roundTitle}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 font-semibold">
                                    {rDone}/{rTotal} done
                                  </div>
                                </div>

                                {/* Match cards */}
                                <div style={{ paddingTop: roundIdx === 0 ? 0 : firstTop }}>
                                  {matches.map((match, mIdx) => {
                                    const isCompleted = match.status === 'completed' || match.status === 'COMPLETED';
                                    const isInProgress = match.status === 'in-progress' || match.status === 'IN_PROGRESS';
                                    const p1Name = match.player1?.playerName || match.player1?.userName || 'TBD';
                                    const p2Name = match.player2?.playerName || match.player2?.userName || 'TBD';
                                    const p1Won = isCompleted && (
                                      match.winner?.playerId?.toString() === match.player1?.playerId?.toString() ||
                                      match.winner?.playerName === p1Name
                                    );
                                    const p2Won = isCompleted && (
                                      match.winner?.playerId?.toString() === match.player2?.playerId?.toString() ||
                                      match.winner?.playerName === p2Name
                                    );
                                    const p1Sets = match.result?.finalScore?.player1Sets ?? match.score?.player1Sets;
                                    const p2Sets = match.result?.finalScore?.player2Sets ?? match.score?.player2Sets;
                                    const liveP1 = match.liveMatchData?.liveScore?.player1Points ?? match.liveScore?.player1Points ?? 0;
                                    const liveP2 = match.liveMatchData?.liveScore?.player2Points ?? match.liveScore?.player2Points ?? 0;
                                    const marginTop = mIdx === 0 ? 0 : (pitch - CARD_H);

                                    return (
                                      <div
                                        key={match._id}
                                        onClick={() => openModal(match)}
                                        className={`relative bg-[#181A22] rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                                          isCompleted ? "border-emerald-500/30" : isInProgress ? "border-amber-500/30" : "border-white/[0.06]"
                                        }`}
                                        style={{ height: CARD_H, marginTop }}
                                      >
                                        {/* Round badge on top */}
                                        <div className="absolute -top-2 left-2 flex items-center gap-1">
                                          <span className="text-[9px] font-bold text-white bg-orange-500/100 px-1.5 py-0.5 rounded">
                                            M{match.matchNumber}
                                          </span>
                                          {isInProgress && (
                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-amber-500/100 px-1.5 py-0.5 rounded">
                                              <span className="w-1 h-1 rounded-full bg-[#181A22] animate-pulse" />LIVE
                                            </span>
                                          )}
                                        </div>

                                        {/* Player 1 row */}
                                        <div className={`flex items-center justify-between px-3 h-[38px] border-b border-white/[0.05] ${
                                          p1Won ? "bg-emerald-500/10" : ""
                                        }`}>
                                          <span className={`text-xs font-semibold truncate pr-2 ${p1Won ? "text-emerald-300" : "text-gray-100"}`}>
                                            {p1Name}
                                          </span>
                                          <span className={`text-sm font-bold flex-shrink-0 ${p1Won ? "text-emerald-400" : "text-gray-500"}`}>
                                            {isCompleted && p1Sets != null ? p1Sets : (isInProgress ? liveP1 : '—')}
                                          </span>
                                        </div>
                                        {/* Player 2 row */}
                                        <div className={`flex items-center justify-between px-3 h-[38px] ${
                                          p2Won ? "bg-emerald-500/10" : ""
                                        }`}>
                                          <span className={`text-xs font-semibold truncate pr-2 ${p2Won ? "text-emerald-300" : "text-gray-100"}`}>
                                            {p2Name}
                                          </span>
                                          <span className={`text-sm font-bold flex-shrink-0 ${p2Won ? "text-emerald-400" : "text-gray-500"}`}>
                                            {isCompleted && p2Sets != null ? p2Sets : (isInProgress ? liveP2 : '—')}
                                          </span>
                                        </div>

                                        {/* Bracket connector lines */}
                                        {roundIdx < entries.length - 1 && (
                                          <>
                                            {/* Horizontal stub: card right edge -> mid-gutter */}
                                            <div
                                              className="absolute bg-white/[0.10]"
                                              style={{ top: '50%', right: -COL_GAP / 2, width: COL_GAP / 2, height: 1 }}
                                            />
                                            {/* Vertical line from this card's midpoint toward the pair's midpoint */}
                                            <div
                                              className="absolute bg-white/[0.10]"
                                              style={{
                                                right: -COL_GAP / 2 - 1,
                                                width: 1,
                                                height: (CARD_H + BASE_GAP) * pow / 2 + 1,
                                                top: mIdx % 2 === 0 ? '50%' : 'auto',
                                                bottom: mIdx % 2 === 1 ? '50%' : 'auto',
                                              }}
                                            />
                                            {/* Horizontal stub from gutter midpoint into next column (draw once per pair) */}
                                            {mIdx % 2 === 1 && (
                                              <div
                                                className="absolute bg-white/[0.10]"
                                                style={{
                                                  top: `-${(CARD_H + BASE_GAP) * pow / 2 - CARD_H / 2}px`,
                                                  right: -COL_GAP,
                                                  width: COL_GAP / 2,
                                                  height: 1,
                                                }}
                                              />
                                            )}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {/* Champion column */}
                          {champion && (
                            <div className="flex-shrink-0 flex flex-col items-center" style={{ width: CARD_W }}>
                              <div className="text-center mb-4">
                                <div className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
                                  Champion
                                </div>
                              </div>
                              <div
                                style={{ paddingTop: ((CARD_H + BASE_GAP) * Math.pow(2, entries.length - 1) - CARD_H - BASE_GAP) / 2 }}
                                className="flex flex-col items-center"
                              >
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-md mb-2">
                                  <FaMedal size={24} />
                                </div>
                                <div className="bg-[#181A22] rounded-lg border-2 border-yellow-500/40 px-4 py-2 text-center shadow-sm">
                                  <div className="text-sm font-extrabold text-white">{champion}</div>
                                </div>
                                <button
                                  onClick={() => navigate(`/tournament-management/group-stage/${tournamentId}/leaderboard`)}
                                  className="mt-3 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-orange-500/100 hover:bg-orange-600 w-auto"
                                >
                                  Final Rankings
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Next round action */}
                        {(() => {
                          const currentMaxRound = Math.max(...knockoutMatches.map(x => x.roundNumber || 0), 0);
                          const lastRound = entries[entries.length - 1];
                          if (!lastRound) return null;
                          const [, lastMatches] = lastRound;
                          const isLatestRound = lastMatches[0]?.roundNumber === currentMaxRound;
                          const allCompleted = lastMatches.every(x => x.status === 'completed' || x.status === 'COMPLETED');
                          if (!isLatestRound || !allCompleted) return null;
                          if (lastMatches.length >= 2) {
                            return (
                              <div className="mt-4 flex items-center justify-between p-4 bg-[#181A22] border border-orange-500/30 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center">
                                    <FiFlag size={16} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">Round complete</p>
                                    <p className="text-xs text-gray-400">{lastMatches.length} winners ready for the next stage</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleInitiateNextRound(lastMatches)}
                                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-orange-500/100 hover:bg-orange-600 flex items-center gap-1.5 w-auto"
                                >
                                  <FiPlus size={14} />
                                  Generate Next Round
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </>
              );
            })()}
          </div>
        )
      }

      {/* 🔹 Modal for Match Generation */}
      {
        isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-[#181A22] w-96 p-6 rounded-xl shadow-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Match Settings</h3>
                <FiX
                  className="cursor-pointer"
                  onClick={() => setIsModalOpen(false)}
                />
              </div>

              <div className="mt-4">
                {tournamentCourts.length > 0 ? (
                  // Catalog has active courts → show preview, hide manual input.
                  // Server uses tournament.courts to round-robin assign matches.
                  <CourtPoolPreview
                    courts={tournamentCourts}
                    startTime={startTime}
                    intervalMinutes={slotDurationMinutes}
                  />
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-300" htmlFor="court-number">
                      Court Number
                    </label>
                    <input id="court-number"
                      type="text"
                      className="w-full border p-2 mt-1"
                      value={courtNumber}
                      onChange={(e) => setCourtNumber(e.target.value)}
                    />
                  </>
                )}

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300" htmlFor="slot-duration-mins">
                      Slot Duration (mins)
                    </label>
                    <input id="slot-duration-mins"
                      type="number"
                      min="1"
                      className="w-full border p-2 mt-1"
                      value={slotDurationMinutes}
                      onChange={(e) => setSlotDurationMinutes(parseInt(e.target.value) || 0)}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300" htmlFor="match-duration-mins">
                      Match Duration (mins)
                    </label>
                    <input id="match-duration-mins"
                      type="number"
                      min="1"
                      className="w-full border p-2 mt-1"
                      value={matchDurationMinutes}
                      onChange={(e) => setMatchDurationMinutes(parseInt(e.target.value) || 0)}
                      placeholder="20"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Gap between matches:{" "}
                  <span className="font-semibold text-gray-300">
                    {Math.max(0, slotDurationMinutes - matchDurationMinutes)} mins
                  </span>
                </p>

                <label className="block text-sm font-medium text-gray-300 mt-3" htmlFor="match-start-time">
                  Match Start Time
                </label>
                <input id="match-start-time"
                  type="time"
                  className="w-full border p-2 mt-1"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <button
                className="mt-4 w-full bg-orange-500/100 text-white py-2 rounded-full text-sm font-medium"
                onClick={() => {
                  // Check which tab is active to determine which generation function to use
                  if (activeSubGroupTab === "Top Players") {
                    handleGenerateRound2Matches();
                  } else {
                    handleGenerateMatches();
                  }
                }}
              >
                {activeSubGroupTab === "Top Players" ? "Generate Round 2 Matches" : "Generate Matches"}
              </button>
            </div>
          </div>
        )
      }

      {/* 🏆 DIRECT KNOCKOUT SCHEDULE MODAL - Enhanced scheduling interface */}
      {
        isDirectKnockoutScheduleModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
            <div className="bg-[#181A22] w-full max-w-2xl p-6 rounded-xl shadow-lg mx-4">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-100">Create Direct Knockout Tournament</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Schedule matches for {selectedPlayersForKnockout.length} players • {Math.log2(selectedPlayersForKnockout.length)} rounds
                  </p>
                </div>
                <FiX
                  className="cursor-pointer text-gray-400 hover:text-gray-300 text-xl"
                  onClick={() => setIsDirectKnockoutScheduleModalOpen(false)}
                />
              </div>

              <div className="space-y-6">
                {/* Tournament Overview */}
                <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/30">
                  <h4 className="font-semibold text-emerald-300 mb-2">Tournament Overview</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-300">Players:</span>
                      <span className="font-medium ml-2">{selectedPlayersForKnockout.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">Rounds:</span>
                      <span className="font-medium ml-2">{Math.log2(selectedPlayersForKnockout.length)}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">Total Matches:</span>
                      <span className="font-medium ml-2">{selectedPlayersForKnockout.length - 1}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">Estimated Duration:</span>
                      <span className="font-medium ml-2">
                        {((selectedPlayersForKnockout.length - 1) * (directKnockoutSchedule.slotDurationMinutes || 30) / 60).toFixed(1)} hours
                      </span>
                    </div>
                  </div>
                </div>

                {/* Schedule Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Court & Date */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Court Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full border border-white/[0.08] rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="e.g., Court 1, Main Court"
                        value={directKnockoutSchedule.courtNumber}
                        onChange={(e) => setDirectKnockoutSchedule(prev => ({
                          ...prev,
                          courtNumber: e.target.value
                        }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        className="w-full border border-white/[0.08] rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        value={directKnockoutSchedule.startDate}
                        onChange={(e) => setDirectKnockoutSchedule(prev => ({
                          ...prev,
                          startDate: e.target.value
                        }))}
                      />
                    </div>
                  </div>

                  {/* Time & Intervals */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        className="w-full border border-white/[0.08] rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        value={directKnockoutSchedule.startTime}
                        onChange={(e) => setDirectKnockoutSchedule(prev => ({
                          ...prev,
                          startTime: e.target.value
                        }))}
                      />
                    </div>

                    {/* Per-round bestOf + slot + match + inter-round break */}
                    <div className="mt-3">
                      <KnockoutFormatPanel
                        drawSize={selectedPlayersForKnockout.length}
                        isSetBased={isSetBasedSport(tournament, tournament?.sports?.[0]?.sportId)}
                        customizeRounds={directKnockoutSchedule.customizeRounds}
                        setCustomizeRounds={(v) => setDirectKnockoutSchedule(p => ({ ...p, customizeRounds: v }))}
                        uniformBestOf={directKnockoutSchedule.uniformBestOf}
                        setUniformBestOf={(v) => setDirectKnockoutSchedule(p => ({ ...p, uniformBestOf: v }))}
                        uniformSlot={directKnockoutSchedule.slotDurationMinutes}
                        setUniformSlot={(v) => setDirectKnockoutSchedule(p => ({ ...p, slotDurationMinutes: v }))}
                        uniformMatch={directKnockoutSchedule.matchDurationMinutes}
                        setUniformMatch={(v) => setDirectKnockoutSchedule(p => ({ ...p, matchDurationMinutes: v }))}
                        roundOverrides={directKnockoutSchedule.roundOverrides}
                        setRoundOverrides={(v) => setDirectKnockoutSchedule(p => ({
                          ...p,
                          roundOverrides: typeof v === "function" ? v(p.roundOverrides) : v,
                        }))}
                        breakBetweenRoundsMinutes={directKnockoutSchedule.breakBetweenRoundsMinutes}
                        setBreakBetweenRoundsMinutes={(v) => setDirectKnockoutSchedule(p => ({ ...p, breakBetweenRoundsMinutes: v }))}
                        accent="#10B981"
                      />
                    </div>
                  </div>
                </div>

                {/* Match Duration Setting */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="estimated-match-duration-min">
                    Estimated Match Duration (minutes)
                  </label>
                  <select id="estimated-match-duration-min"
                    className="w-full border border-white/[0.08] rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={directKnockoutSchedule.estimatedDuration}
                    onChange={(e) => setDirectKnockoutSchedule(prev => ({
                      ...prev,
                      estimatedDuration: parseInt(e.target.value)
                    }))}
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={75}>75 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Expected duration for each match</p>
                </div>

                {/* Selected Players Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Selected Players ({selectedPlayersForKnockout.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto bg-white/[0.04] rounded-lg p-3 border">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedPlayersForKnockout.map((player, index) => (
                        <div key={player.playerId} className="text-sm text-gray-300 truncate">
                          {index + 1}. {player.userName}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <button
                  className="px-6 py-2 border border-white/[0.08] rounded-lg text-gray-300 font-medium hover:bg-white/[0.04] transition"
                  onClick={() => setIsDirectKnockoutScheduleModalOpen(false)}
                  disabled={isCreatingKnockout}
                >
                  Cancel
                </button>
                <button
                  className={`px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 ${isCreatingKnockout || !directKnockoutSchedule.courtNumber || !directKnockoutSchedule.startDate || !directKnockoutSchedule.startTime
                    ? "bg-white/[0.10] text-gray-400 cursor-not-allowed"
                    : "bg-emerald-500/100 text-white hover:bg-emerald-600"
                    }`}
                  onClick={handleCreateDirectKnockoutTournament}
                  disabled={isCreatingKnockout || !directKnockoutSchedule.courtNumber || !directKnockoutSchedule.startDate || !directKnockoutSchedule.startTime}
                >
                  {isCreatingKnockout ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FaMedal className="w-4 h-4" />
                      Create Tournament
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Popup Modal */}
      {
        isPopupOpen && selectedMatch && (() => {
          const m = selectedMatch;
          const isComp = m.status === 'completed' || m.status === 'COMPLETED';
          const isLive = m.status === 'in_progress' || m.status === 'IN_PROGRESS' || m.status === 'in-progress' || m.status === 'IN-PROGRESS';
          const p1Name = m.player1?.userName || m.player1?.playerName || 'Player 1';
          const p2Name = m.player2?.userName || m.player2?.playerName || 'Player 2';
          const p1Img = m.player1?.playerId?.profileImage;
          const p2Img = m.player2?.playerId?.profileImage;
          const p1Sets = m.result?.finalScore?.player1Sets ?? m.score?.player1Sets ?? 0;
          const p2Sets = m.result?.finalScore?.player2Sets ?? m.score?.player2Sets ?? 0;
          const winnerName = typeof m.winner === 'object' ? (m.winner?.playerName || m.winner?.userName || m.winner?.name) : m.winner;
          const p1Won = isComp && (
            m.winner?.playerId?.toString() === m.player1?.playerId?.toString() ||
            winnerName === p1Name
          );
          const p2Won = isComp && (
            m.winner?.playerId?.toString() === m.player2?.playerId?.toString() ||
            winnerName === p2Name
          );
          const statusChip = isComp ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/100" />
              COMPLETED
            </span>
          ) : isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/100 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/[0.06] text-gray-300">
              SCHEDULED
            </span>
          );
          const roundLabel = m.round
            ? m.round.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
            : m.roundName || m.tournamentId?.type || m.tournament?.type || 'Group Stage';

          const renderPlayerCard = (name, img, won, accent) => (
            <div className={`flex-1 rounded-xl p-4 border ${won ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/[0.04] border-white/[0.06]"}`}>
              <div className="flex items-center gap-3">
                {img ? (
                  <img loading="lazy" src={assetUrl(img)} alt={name}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${won ? "bg-emerald-500/100" : accent === "p1" ? "bg-orange-400" : "bg-blue-400"}`}>
                    {name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className={`font-bold text-base truncate ${won ? "text-emerald-300" : "text-gray-100"}`}>
                    {name}
                  </h3>
                  {won && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-500/100 text-white text-[10px] font-bold">
                      <FaMedal className="text-yellow-300" size={10} /> WINNER
                    </span>
                  )}
                </div>
              </div>
            </div>
          );

          return (
          <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-40 p-4"
        onClick={closeModal}
      >
        <DialogA11y onClose={closeModal} />
            <div
              className="bg-[#181A22] rounded-2xl shadow-2xl w-full max-w-[880px] max-h-[90vh] overflow-hidden flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded">
                    Match {m.matchNumber}
                  </span>
                  {[3, 5, 7].includes(m.matchFormat?.totalSets) && (
                    <span className="text-xs font-bold text-[#5E6AD2] bg-[#5E6AD2]/10 px-2 py-1 rounded">
                      Bo{m.matchFormat.totalSets}
                    </span>
                  )}
                  <CourtPicker
                    matchId={m._id}
                    current={m.courtNumber}
                    courts={tournamentCourts}
                    disabled={isComp}
                    onChange={(newName) => {
                      setSelectedMatch((prev) => prev ? { ...prev, courtNumber: newName } : prev);
                      setKnockoutMatchesByRound((prev) => {
                        const next = { ...prev };
                        Object.keys(next).forEach((roundKey) => {
                          next[roundKey] = (next[roundKey] || []).map((mm) =>
                            mm._id === m._id ? { ...mm, courtNumber: newName } : mm
                          );
                        });
                        return next;
                      });
                    }}
                  />
                  <span className="text-xs text-gray-400">
                    {formatDate(m.startTime || m.matchStartTime)} · {MatchformatTime(m.startTime || m.matchStartTime)}
                    {m.matchEndTime && MatchformatTime(m.matchEndTime) && ` → ${MatchformatTime(m.matchEndTime)}`}
                  </span>
                  {statusChip}
                </div>
                <button
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] bg-transparent w-auto"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Players vs + big set score */}
                <div className="flex items-stretch gap-3">
                  {renderPlayerCard(p1Name, p1Img, p1Won, "p1")}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center px-2">
                    {isCricketMatch(m) && (isComp || isLive) ? (() => {
                      const innings = getCricketInnings(m);
                      const c1 = cricketSideScore(innings, "player1");
                      const c2 = cricketSideScore(innings, "player2");
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-extrabold ${p1Won ? "text-emerald-400" : "text-gray-100"}`}>{c1?.text ?? "—"}</span>
                            <span className="text-xl text-gray-600">–</span>
                            <span className={`text-2xl font-extrabold ${p2Won ? "text-emerald-400" : "text-gray-100"}`}>{c2?.text ?? "—"}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-0.5">
                            {c1 ? `${c1.overs} ov` : ""}{c2 ? ` · ${c2.overs} ov` : ""}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold mt-0.5 uppercase tracking-wider">Runs</span>
                        </>
                      );
                    })() : (isComp || isLive) ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={`text-4xl font-extrabold ${p1Won ? "text-emerald-400" : "text-gray-500"}`}>{p1Sets}</span>
                          <span className="text-2xl text-gray-600">–</span>
                          <span className={`text-4xl font-extrabold ${p2Won ? "text-emerald-400" : "text-gray-500"}`}>{p2Sets}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-wider">Sets</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl font-bold text-gray-500">VS</span>
                        <span className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-wider">Sets</span>
                      </>
                    )}
                  </div>
                  {renderPlayerCard(p2Name, p2Img, p2Won, "p2")}
                </div>

                {/* Meta strip */}
                <div className="bg-white/[0.04] rounded-xl px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Tournament</p>
                    <p className="font-semibold text-gray-100 truncate">{m.tournamentId?.title || m.tournament?.title || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Round</p>
                    <p className="font-semibold text-gray-100 truncate">{roundLabel}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Type</p>
                    <p className="font-semibold text-gray-100 truncate">
                      {m.nextMatchId ? 'Knockout' : (activeSubGroupTab || 'League')}
                    </p>
                  </div>
                </div>

                {/* Live cricket summary (in-progress innings) */}
                {isLive && isCricketMatch(m) && (() => {
                  const ls = m.liveMatchData?.liveScore || {};
                  const innings = getCricketInnings(m);
                  const c1 = cricketSideScore(innings, "player1");
                  const c2 = cricketSideScore(innings, "player2");
                  if (!c1 && !c2) return null;
                  return (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500/100 animate-pulse" />
                          <span className="font-bold text-amber-300 text-sm">LIVE SCORE</span>
                        </div>
                        <span className="text-xs text-amber-400">
                          Innings {ls.currentInnings ?? innings.length} · CRR {ls.currentRunRate ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-around">
                        <div className="text-center">
                          <p className="text-xs text-gray-300 mb-1 truncate max-w-[140px]">{p1Name}</p>
                          <p className="text-3xl font-extrabold text-white">{c1?.text ?? "—"}</p>
                          <p className="text-[11px] text-gray-400">{c1 ? `${c1.overs} ov` : "yet to bat"}</p>
                        </div>
                        <span className="text-xl text-gray-500">–</span>
                        <div className="text-center">
                          <p className="text-xs text-gray-300 mb-1 truncate max-w-[140px]">{p2Name}</p>
                          <p className="text-3xl font-extrabold text-white">{c2?.text ?? "—"}</p>
                          <p className="text-[11px] text-gray-400">{c2 ? `${c2.overs} ov` : "yet to bat"}</p>
                        </div>
                      </div>
                      {ls.target != null && (
                        <div className="text-center text-xs text-yellow-300 font-semibold mt-3 border-t border-amber-500/20 pt-2">
                          Need {ls.required} off {ls.ballsRemaining} balls · RRR {ls.requiredRate ?? "—"}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Live points (in-progress, set sports only) */}
                {isLive && !isCricketMatch(m) && (m.liveScore || m.liveMatchData?.liveScore) && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500/100 animate-pulse" />
                        <span className="font-bold text-amber-300 text-sm">LIVE POINTS</span>
                      </div>
                      <span className="text-xs text-amber-400">
                        Set {m.liveMatchData?.currentSet ?? m.currentSet ?? 1} · Game {m.liveMatchData?.currentGame ?? m.currentGame ?? 1}
                      </span>
                    </div>
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <p className="text-xs text-gray-300 mb-1">{p1Name}</p>
                        <p className="text-3xl font-extrabold text-white">
                          {m.liveMatchData?.liveScore?.player1Points ?? m.liveScore?.player1Points ?? 0}
                        </p>
                      </div>
                      <span className="text-xl text-gray-500">–</span>
                      <div className="text-center">
                        <p className="text-xs text-gray-300 mb-1">{p2Name}</p>
                        <p className="text-3xl font-extrabold text-white">
                          {m.liveMatchData?.liveScore?.player2Points ?? m.liveScore?.player2Points ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cricket — innings breakdown */}
                {isCricketMatch(m) && (() => {
                  const innings = getCricketInnings(m);
                  if (!innings.length) return null;
                  const resText = cricketResultText(m);
                  const row = (side, label) => {
                    const inn = innings.find((i) => i.battingSide === side);
                    const ex = inn?.extras || {};
                    const exTot = (ex.wides || 0) + (ex.noBalls || 0) + (ex.byes || 0) + (ex.legByes || 0);
                    return (
                      <div className="px-4 py-3 border-b border-white/[0.05] last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-100 truncate">{label}</span>
                          {inn ? (
                            <span className="text-lg font-black text-white">{inn.runs ?? 0}/{inn.wickets ?? 0}
                              <span className="text-xs font-semibold text-gray-400 ml-1.5">({inn.oversBowled ?? 0}.{inn.ballsBowled ?? 0} ov)</span>
                            </span>
                          ) : <span className="text-xs text-gray-500 italic">Yet to bat</span>}
                        </div>
                        {inn && (exTot > 0 || (inn.fallOfWickets || []).length > 0) && (
                          <div className="text-[11px] text-gray-500 mt-1">
                            Extras {exTot} (b {ex.byes || 0}, lb {ex.legByes || 0}, w {ex.wides || 0}, nb {ex.noBalls || 0})
                            {(inn.fallOfWickets || []).length ? ` · FoW: ${inn.fallOfWickets.map((f) => `${f.wicket}-${f.runs}`).join(", ")}` : ""}
                          </div>
                        )}
                      </div>
                    );
                  };
                  return (
                    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="bg-white/[0.04] px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-300">Innings Breakdown</h4>
                        {resText && <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">{resText}</span>}
                      </div>
                      {row("player1", p1Name)}
                      {row("player2", p2Name)}
                    </div>
                  );
                })()}

                {/* Football — full-time result */}
                {isFootballMatch(m) && (isComp || isLive) && (() => {
                  const { g1, g2, tiebreak } = getFootballResult(m);
                  if (g1 == null && g2 == null) return null;
                  const draw = g1 === g2 && !tiebreak;
                  const winName = tiebreak ? (tiebreak.winner === "player1" ? p1Name : p2Name) : g1 > g2 ? p1Name : p2Name;
                  return (
                    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="bg-white/[0.04] px-4 py-2.5 border-b border-white/[0.06]">
                        <h4 className="text-sm font-bold text-gray-300">{isComp ? "Full Time" : "Live Score"}</h4>
                      </div>
                      <div className="px-4 py-4">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <span className="text-sm font-bold text-gray-100 text-right truncate">{p1Name}</span>
                          <span className="text-2xl font-black text-white">{g1 ?? 0} – {g2 ?? 0}</span>
                          <span className="text-sm font-bold text-gray-100 truncate">{p2Name}</span>
                        </div>
                        <div className="text-center text-xs font-semibold mt-2 text-emerald-300">
                          {draw ? "Match drawn" : `${winName} won${tiebreak ? " on penalties" : ""}`}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Set-by-set breakdown — set sports only */}
                {!isCricketMatch(m) && !isFootballMatch(m) && (m.sets || m.liveMatchData?.sets) && (m.sets?.length > 0 || m.liveMatchData?.sets?.length > 0) && (
                  <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                    <div className="bg-white/[0.04] px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-300">Set-by-Set Breakdown</h4>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                        {(m.sets || m.liveMatchData?.sets || []).length} set{(m.sets || m.liveMatchData?.sets || []).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {(m.sets || m.liveMatchData?.sets || []).map((set, idx) => {
                        const setDone = set.status === 'COMPLETED';
                        const setWinnerName = set.winner?.playerName || set.winner?.userName;
                        const setWonByP1 = setWinnerName === p1Name;
                        const setWonByP2 = setWinnerName === p2Name;
                        const games = Array.isArray(set.games) ? set.games : [];
                        return (
                          <div key={idx} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-gray-300">Set {set.setNumber || idx + 1}</span>
                              {setDone ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">COMPLETED</span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">IN PROGRESS</span>
                              )}
                            </div>

                            {games.length > 0 ? (
                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                <div className={`text-sm font-semibold truncate ${setWonByP1 ? "text-emerald-300" : "text-gray-300"}`}>{p1Name}</div>
                                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                                  {games.map((game, gi) => {
                                    const p1s = game.finalScore?.player1 ?? 0;
                                    const p2s = game.finalScore?.player2 ?? 0;
                                    const gameDone = game.status === 'COMPLETED';
                                    return (
                                      <span key={gi}
                                        className={`text-xs font-bold px-2 py-1 rounded font-mono ${gameDone ? "bg-white/[0.06] text-gray-100" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"}`}
                                        title={`Game ${game.gameNumber || gi + 1}`}>
                                        {p1s}–{p2s}
                                      </span>
                                    );
                                  })}
                                </div>
                                <div className={`text-sm font-semibold truncate text-right ${setWonByP2 ? "text-emerald-300" : "text-gray-300"}`}>{p2Name}</div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 italic">Set not started yet</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Legacy fallback for older records */}
                {!m.sets && !m.liveMatchData?.sets && m.hasScores && m.currentScore && (
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
                    <h4 className="text-sm font-bold text-gray-300 mb-2">Score</h4>
                    <div className="space-y-1 text-sm text-gray-300 font-mono">
                      {['setOne', 'setTwo', 'setThree'].map((k, i) => {
                        const val = m.currentScore[k];
                        if (!val) return null;
                        const label = `Set ${i + 1}`;
                        const text = Array.isArray(val) ? `${val[0]}–${val[1]}` : val;
                        return <div key={k}><span className="text-gray-400 mr-2">{label}:</span>{text}</div>;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-white/[0.05] flex items-center justify-end gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300 bg-white/[0.06] hover:bg-white/[0.08] w-auto"
                >
                  Close
                </button>
                {!isComp && (
                  <button
                    onClick={handleStartMatch}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-orange-500/100 hover:bg-orange-600 w-auto"
                  >
                    {isLive ||
                      (m.liveScore && (m.liveScore.player1Points > 0 || m.liveScore.player2Points > 0)) ||
                      (m.currentScore && (m.currentScore.setOne || m.currentScore.setTwo || m.currentScore.setThree)) ||
                      (m.liveMatchData?.liveScore && (m.liveMatchData.liveScore.player1Points > 0 || m.liveMatchData.liveScore.player2Points > 0))
                        ? 'Resume Match' : 'Start Match'}
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })()
      }

      {/* \ud83d\ude80 ENHANCED EDIT GROUP MODAL - With Match Format Configuration */}
      {
        isEditGroupModalOpen && currentEditGroup && (
          <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-[#181A22] rounded-3xl shadow-2xl w-[80%] mt-[90px] transform transition-all duration-300 animate-slideUp">
              {/* 🎯 PREMIUM HEADER with Gradient */}
              <div className="relative bg-gradient-to-r from-orange-500 via-emerald-600 to-rose-600 rounded-t-3xl p-6 overflow-hidden">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
                </div>

                <div className="relative flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <FiEdit2 className="text-white text-xl" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Edit Group</h2>
                        <p className="text-orange-100 text-sm mt-1">Manage group details and match format settings</p>
                      </div>
                    </div>

                    {/* Group Name Badge */}
                    <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <FiFlag className="text-white" />
                      <span className="text-white font-semibold">{currentEditGroup.groupName || 'Unnamed Group'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsEditGroupModalOpen(false);
                      setCurrentEditGroup(null);
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/20 p-2.5 rounded-xl transition-all duration-200 backdrop-blur-sm"
                  >
                    <FiX size={24} />
                  </button>
                </div>
              </div>

              {/* 📊 MAIN CONTENT AREA */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* 👥 LEFT COLUMN - Group Details */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 pb-3 border-b-2 border-gradient-to-r from-orange-500 to-emerald-500">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <FiEdit2 className="text-white text-lg" />
                      </div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-emerald-600 bg-clip-text text-transparent">
                        Group Details
                      </h3>
                    </div>

                    {/* Group Name Input */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-orange-500/100 rounded-full"></span>
                        Group Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={currentEditGroup.groupName || ''}
                          onChange={(e) => {
                            setCurrentEditGroup(prev => ({
                              ...prev,
                              groupName: e.target.value
                            }));
                          }}
                          className="w-full p-4 pr-12 border-2 border-white/[0.06] rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 text-gray-100 font-medium placeholder-gray-400 hover:border-white/[0.08]"
                          placeholder="Enter group name (e.g., Group A)"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <FiEdit2 size={18} />
                        </div>
                      </div>
                    </div>

                    {/* Category Input */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500/100 rounded-full"></span>
                        Category
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={currentEditGroup.category || ''}
                          onChange={(e) => {
                            setCurrentEditGroup(prev => ({
                              ...prev,
                              category: e.target.value
                            }));
                          }}
                          className="w-full p-4 pr-12 border-2 border-white/[0.06] rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-gray-100 font-medium placeholder-gray-400 hover:border-white/[0.08]"
                          placeholder="Enter category (e.g., Open, Men's Singles)"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <FiFlag size={18} />
                        </div>
                      </div>
                    </div>

                    {/* Players List */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-500/100 rounded-full"></span>
                          Players
                        </span>
                        <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-emerald-500 text-white text-xs font-bold rounded-full shadow-md">
                          {currentEditGroup.players?.length || 0} Players
                        </span>
                      </label>

                      <div className="max-h-96 overflow-y-auto border-2 border-white/[0.06] rounded-xl p-4 bg-gradient-to-br from-gray-50 to-orange-500/10/30 custom-scrollbar">
                        {currentEditGroup.players && currentEditGroup.players.length > 0 ? (
                          <ul className="space-y-3">
                            {currentEditGroup.players.map((player, index) => (
                              <li
                                key={player._id || index}
                                className="group bg-[#181A22] p-4 rounded-xl border-2 border-white/[0.05] hover:border-orange-500/40 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3 flex-1">
                                    {/* Player Avatar */}
                                    <div className="relative">
                                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-emerald-600 flex items-center justify-center font-bold text-white text-base shadow-lg ring-2 ring-white">
                                        {(player.userId?.name || player.userName || `P${index + 1}`).charAt(0).toUpperCase()}
                                      </div>
                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500/100 rounded-full border-2 border-white"></div>
                                    </div>

                                    {/* Player Info */}
                                    <div className="flex-1">
                                      <span className="font-semibold text-gray-100 block">
                                        {player.userId?.name || player.userName || `Player ${index + 1}`}
                                      </span>
                                      <span className="text-xs text-gray-400">Player #{index + 1}</span>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {/* Move Player Button */}
                                    <button
                                      onClick={() => {
                                        setSelectedPlayerForMovement(player);
                                        const availableGroups = groupsWithoutMatches.filter(
                                          g => g._id !== currentEditGroup._id
                                        );
                                        if (availableGroups.length > 0) {
                                          setDestinationGroupId(availableGroups[0]._id);
                                        }
                                      }}
                                      className="p-2.5 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all duration-200 transform hover:scale-110"
                                      title="Move player to another group"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </button>

                                    {/* Remove Player Button */}
                                    <button
                                      onClick={() => {
                                        setCurrentEditGroup(prev => ({
                                          ...prev,
                                          players: prev.players.filter((_, i) => i !== index)
                                        }));
                                      }}
                                      className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 transform hover:scale-110"
                                      title="Remove player from group"
                                    >
                                      <FiX size={18} />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-20 h-20 bg-white/[0.06] rounded-full flex items-center justify-center mx-auto mb-4">
                              <FiEdit2 className="text-gray-500 text-2xl" />
                            </div>
                            <p className="text-gray-400 font-medium">No players in this group</p>
                            <p className="text-gray-500 text-sm mt-1">Add players to get started</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ⚙️ RIGHT COLUMN - Match Format Configuration */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 pb-3 border-b-2 border-gradient-to-r from-green-500 to-emerald-500">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                        <FiTable className="text-white text-lg" />
                      </div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        Match Format Settings
                      </h3>
                    </div>

                    {/* Tournament Default & Current Config Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tournament Default Info */}
                      {tournament && tournament.setFormat && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-orange-500/10 border-2 border-orange-500/30 rounded-xl p-4 shadow-sm">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/20/30 rounded-full -mr-12 -mt-12"></div>
                          <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 bg-orange-500/100 rounded-lg flex items-center justify-center">
                                <FiFlag className="text-white text-xs" />
                              </div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tournament Default</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1.5 bg-[#181A22] rounded-lg shadow-sm font-bold text-orange-400 text-base">
                                {tournament.setFormat === 'bestOf3' && 'Best of 3 Sets'}
                                {tournament.setFormat === 'bestOf5' && 'Best of 5 Sets'}
                                {tournament.setFormat === 'bestOf7' && 'Best of 7 Sets'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Configuration Display */}
                      <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-amber-500/10 border-2 border-emerald-500/30 rounded-xl p-4 shadow-sm">
                        <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500/100 rounded-full animate-pulse"></span>
                          Current Configuration
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#181A22] rounded-lg p-2 text-center shadow-sm border border-emerald-500/20">
                            <div className="text-orange-500 font-bold text-[10px] uppercase">Sets</div>
                            <div className="text-white text-xl font-black leading-tight">{groupMatchFormat.totalSets || 5}</div>
                            <div className="text-[9px] font-medium text-orange-500">First to {Math.ceil((groupMatchFormat.totalSets || 5) / 2)}</div>
                          </div>
                          <div className="bg-[#181A22] rounded-lg p-2 text-center shadow-sm border border-green-500/20">
                            <div className="text-green-400 font-bold text-[10px] uppercase">Games</div>
                            <div className="text-green-300 text-xl font-black leading-tight">{groupMatchFormat.totalGames || 5}</div>
                            <div className="text-[9px] font-medium text-green-500">First to {Math.ceil((groupMatchFormat.totalGames || 5) / 2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sets & Games side-by-side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sets Configuration */}
                      <div className="bg-gradient-to-br from-orange-500/10 to-cyan-50 rounded-xl p-4 border-2 border-orange-500/20">
                        <label className="block text-xs font-bold text-gray-100 mb-3 flex items-center gap-2 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-orange-500/100 rounded-full"></span>
                          Sets per Match
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[3, 5, 7].map(sets => (
                            <button
                              key={sets}
                              onClick={() => setGroupMatchFormat(prev => ({
                                ...prev,
                                totalSets: sets,
                                setsToWin: Math.ceil(sets / 2)
                              }))}
                              className={`group relative p-2.5 rounded-lg border-2 transition-all duration-200 transform hover:scale-105 ${groupMatchFormat.totalSets === sets
                                ? 'border-orange-500 bg-gradient-to-br from-orange-500 to-orange-500 text-white shadow-md'
                                : 'border-white/[0.06] bg-[#181A22] text-gray-300 hover:border-orange-500/40'
                                }`}
                            >
                              <div className="text-center">
                                <div className={`text-xl font-black leading-tight ${groupMatchFormat.totalSets === sets ? 'text-white' : 'text-orange-500'}`}>
                                  {sets}
                                </div>
                                <div className="text-[10px] font-bold opacity-80">{sets} Sets</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Games Configuration */}
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border-2 border-green-500/20">
                        <label className="block text-xs font-bold text-gray-100 mb-3 flex items-center gap-2 uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-green-500/100 rounded-full"></span>
                          Games per Set
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[3, 5, 7].map(games => (
                            <button
                              key={games}
                              onClick={() => setGroupMatchFormat(prev => ({
                                ...prev,
                                totalGames: games,
                                gamesToWin: Math.ceil(games / 2)
                              }))}
                              className={`group relative p-2.5 rounded-lg border-2 transition-all duration-200 transform hover:scale-105 ${groupMatchFormat.totalGames === games
                                ? 'border-green-500 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md'
                                : 'border-white/[0.06] bg-[#181A22] text-gray-300 hover:border-green-500/40'
                                }`}
                            >
                              <div className="text-center">
                                <div className={`text-xl font-black leading-tight ${groupMatchFormat.totalGames === games ? 'text-white' : 'text-green-400'}`}>
                                  {games}
                                </div>
                                <div className="text-[10px] font-bold opacity-80">{games} Games</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Preview - More Compact */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-rose-500/15 to-orange-500/15 border-2 border-emerald-500/40 rounded-xl p-4 shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300/30 rounded-full -mr-16 -mt-16"></div>
                      <div className="relative flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-gray-100 flex items-center gap-2 uppercase tracking-wider">
                            <span className="text-base">📊</span>
                            <span>Live Preview</span>
                          </h4>
                        </div>
                        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm border border-emerald-500/30">
                          <div className="flex items-center justify-center gap-6">
                            <div className="text-xl font-black text-white">
                              <span className="text-orange-500">{groupMatchFormat.totalSets || 5}</span>
                              <span className="text-gray-500 mx-1">sets</span>
                              <span className="text-gray-500">×</span>
                              <span className="text-green-400 ml-1">{groupMatchFormat.totalGames || 5}</span>
                              <span className="text-gray-500 ml-1">games</span>
                            </div>
                            <div className="h-8 w-px bg-white/[0.08]"></div>
                            <div className="flex gap-2">
                              <div className="flex flex-col">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">To Win Match</span>
                                <span className="text-xs font-black text-orange-400">{Math.ceil((groupMatchFormat.totalSets || 5) / 2)} Sets</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] text-gray-400 font-bold uppercase">To Win Set</span>
                                <span className="text-xs font-black text-green-300">{Math.ceil((groupMatchFormat.totalGames || 5) / 2)} Games</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🚀 ACTION BUTTONS - Premium Footer */}
              <div className="bg-gradient-to-r from-gray-50 to-orange-500/10/30 border-t-2 border-white/[0.06] rounded-b-3xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-2 h-2 bg-orange-500/100 rounded-full animate-pulse"></div>
                    <span className="font-medium">Note:</span>
                    <span>Match format changes apply to future matches</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsEditGroupModalOpen(false);
                        setCurrentEditGroup(null);
                      }}
                      className="px-8 py-3 border-2 border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.10] font-semibold text-gray-300 transition-all duration-200 transform hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        // Update group details
                        await handleUpdateGroup(currentEditGroup);

                        // Update match format
                        const formatResult = await updateGroupMatchFormat(currentEditGroup._id, groupMatchFormat);
                        if (formatResult.success) {
                          toast.info(`✅ Group updated successfully!\n\nMatch Format:\n• ${groupMatchFormat.totalSets} Sets (first to ${Math.ceil(groupMatchFormat.totalSets / 2)} wins match)\n• ${groupMatchFormat.totalGames} Games per set (first to ${Math.ceil(groupMatchFormat.totalGames / 2)} wins set)\n• ${groupMatchFormat.pointsToWinGame} points per game`);
                        }
                      }}
                      disabled={isUpdatingFormat}
                      className={`px-8 py-3 rounded-xl text-white font-bold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${isUpdatingFormat
                        ? 'bg-white/[0.12] cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-500 via-emerald-600 to-rose-600 hover:from-gray-700 hover:via-emerald-700 hover:to-pink-700 shadow-xl hover:shadow-2xl'
                        }`}
                    >
                      {isUpdatingFormat ? (
                        <>
                          <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          <span>Update Group & Format</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Player Movement Modal */}
      {
        selectedPlayerForMovement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-2xl bg-[#181A22] shadow-2xl animate-[scaleIn_0.2s_ease-out]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-white">
                  Move Player
                </h2>
                <button
                  onClick={() => {
                    setSelectedPlayerForMovement(null);
                    setDestinationGroupId('');
                  }}
                  className="p-2 rounded-full hover:bg-white/[0.06] text-gray-400"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className="rounded-lg bg-white/[0.04] p-3 text-sm text-gray-300">
                  Moving player:
                  <span className="ml-1 font-semibold text-white">
                    {selectedPlayerForMovement.userId?.name ||
                      selectedPlayerForMovement.userName}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="destination-group">
                    Destination Group
                  </label>
                  <select id="destination-group"
                    value={destinationGroupId}
                    onChange={(e) => setDestinationGroupId(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.08] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Select a group</option>
                    {groupsWithoutMatches
                      .filter(group => group._id !== currentEditGroup?._id)
                      .map(group => (
                        <option key={group._id} value={group._id}>
                          {group.groupName ||
                            `Group ${groupsWithoutMatches.indexOf(group) + 1}`}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <button
                  onClick={() => {
                    setSelectedPlayerForMovement(null);
                    setDestinationGroupId('');
                  }}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    if (!destinationGroupId) {
                      toast.info('Please select a destination group');
                      return;
                    }

                    try {
                      const destinationGroup = groupsWithoutMatches.find(
                        g => g._id === destinationGroupId
                      );
                      if (!destinationGroup) throw new Error('Destination group not found');

                      const updatedDestinationPlayers = [
                        ...destinationGroup.players,
                        selectedPlayerForMovement,
                      ];

                      const updateDestinationResponse = await axios.put(
                        `/api/tournaments/bookinggroups/${destinationGroup._id}`,
                        {
                          groupName: destinationGroup.groupName,
                          players: updatedDestinationPlayers
                            .map(p => p.playerId || p._id || p.id || p.bookingId)
                            .filter(Boolean),
                          category: destinationGroup.category || 'Open Category',
                        }
                      );

                      if (!updateDestinationResponse.data.success) {
                        throw new Error(updateDestinationResponse.data.message);
                      }

                      const updatedCurrentPlayers = currentEditGroup.players.filter(
                        p =>
                          !(
                            p._id && selectedPlayerForMovement._id
                              ? p._id.toString() ===
                              selectedPlayerForMovement._id.toString()
                              : p.playerId.toString() ===
                              selectedPlayerForMovement.playerId.toString()
                          )
                      );

                      const updatedCurrentGroup = {
                        ...currentEditGroup,
                        players: updatedCurrentPlayers,
                      };

                      const updateCurrentResponse = await axios.put(
                        `/api/tournaments/bookinggroups/${currentEditGroup._id}`,
                        {
                          groupName: updatedCurrentGroup.groupName,
                          players: updatedCurrentGroup.players
                            .map(p => p.playerId || p._id || p.id || p.bookingId)
                            .filter(Boolean),
                          category: updatedCurrentGroup.category || 'Open Category',
                        }
                      );

                      if (!updateCurrentResponse.data.success) {
                        throw new Error(updateCurrentResponse.data.message);
                      }

                      setCurrentEditGroup(updatedCurrentGroup);

                      setGroups(prev =>
                        prev.map(g =>
                          g._id === currentEditGroup._id
                            ? updatedCurrentGroup
                            : g._id === destinationGroup._id
                              ? updateDestinationResponse.data.data
                              : g
                        )
                      );

                      setGroupsWithoutMatches(prev =>
                        prev.map(g =>
                          g._id === currentEditGroup._id
                            ? updatedCurrentGroup
                            : g._id === destinationGroup._id
                              ? updateDestinationResponse.data.data
                              : g
                        )
                      );

                      setSelectedPlayerForMovement(null);
                      setDestinationGroupId('');
                      toast.info('Player moved successfully!');
                    } catch (error) {
                      console.error('Error moving player:', error);
                      toast.info('Error moving player: ' + error.message);
                    }
                  }}
                  disabled={!destinationGroupId}
                  className="rounded-lg bg-orange-500/100 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Move Player
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Bulk Score Upload Modal (Reusable) */}
      <BulkScoreUploadModal
        isOpen={bulkScoreModal.open}
        onClose={() => setBulkScoreModal({ open: false, matches: [], groupId: null, title: "" })}
        onSuccess={() => {
          fetchMatches();
          if (round2Groups.length > 0) fetchRound2Groups();
          fetchKnockoutMatches();
        }}
        matches={bulkScoreModal.matches}
        tournamentId={tournamentId}
        groupId={bulkScoreModal.groupId}
        matchType="player"
        maxSets={getMatchFormat().maxSets}
        // Resolved, not raw: a stored setsToWin of 3 on a best-of-3 would
        // reject a valid 2-0 before it ever reached the server.
        setsToWin={resolveSetsToWin(getMatchFormat())}
        title={bulkScoreModal.title}
      />

      {/* Bulk Result Upload Modal (CSV/Excel) */}
      <BulkResultUploadModal
        isOpen={showCsvUpload}
        onClose={() => setShowCsvUpload(false)}
        onSuccess={() => {
          fetchMatches();
          if (round2Groups.length > 0) fetchRound2Groups();
          fetchKnockoutMatches();
        }}
        tournamentId={tournamentId}
        matchType="player"
        title="Bulk Result Upload (CSV/Excel)"
      />

      {/* Assign Umpire Modal (Phase 2 — shared across League / Top Players / Knockout sub-tabs) */}
      <AssignUmpireModal
        isOpen={!!assignModalMatch}
        onClose={() => setAssignModalMatch(null)}
        matchId={assignModalMatch?._id}
        tournamentId={tournamentId}
        matchLabel={assignModalMatch ? `M${assignModalMatch.matchNumber || ""} • ${assignModalMatch.player1?.userName || assignModalMatch.player1?.playerName || "P1"} vs ${assignModalMatch.player2?.userName || assignModalMatch.player2?.playerName || "P2"}` : ""}
        onAssigned={() => {
          // Refetch all three sub-tabs so the umpire chip updates regardless of
          // where Assign was clicked. Matches the BulkResultUploadModal pattern above.
          fetchMatches();
          if (round2Groups.length > 0) fetchRound2Groups();
          fetchKnockoutMatches();
          toast.success("Umpire assigned. Awaiting their response.");
        }}
      />
    </div >
  );
}