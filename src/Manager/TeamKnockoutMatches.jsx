import React, { useState, useEffect } from "react";
import { FaTrophy, FaMedal, FaTableTennis } from "react-icons/fa";
import {
  RefreshCcw,
  X,
  Clock,
  Play,
  Pause,
  Users,
  Award,
  Target,
  Calendar,
  CheckCircle,
  SkipForward,
  XCircle,
  AlertCircle,
  Shield,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { getKnockoutFormat } from "../utils/sportTrack";
import { TextField } from "@mui/material";
import BulkScoreUploadModal from "./BulkScoreUploadModal";
import BulkResultUploadModal from "./BulkResultUploadModal";
import AssignUmpireModal from "./Tournament/AssignUmpireModal";

// Resolves a referee's display name from match.referee (handles nested
// object and bare ObjectId shapes — same helper as MDirectKnockout).
const getUmpireName = (referee) => {
  if (!referee) return null;
  if (typeof referee === "string") return "Assigned";
  return referee.name || referee.userName || "Assigned";
};

const TeamKnockoutMatches = () => {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [hasGeneratedMatches, setHasGeneratedMatches] = useState(false);
  const [totalRounds, setTotalRounds] = useState(0);
  const [matches, setMatches] = useState([]);
  const [currentMatchDetails, setCurrentMatchDetails] = useState(null);
  const tournamentId = new URLSearchParams(location.search).get("tournamentId");
  const [winnersForNextRound, setWinnersForNextRound] = useState([]);
  const [currentSchedulingRound, setCurrentSchedulingRound] = useState(null);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [canProceedToNextRound, setCanProceedToNextRound] = useState(false);
  const [isFinalRound, setIsFinalRound] = useState(false);
  const [setCount, setSetCount] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);
  const [byeTeams, setByeTeams] = useState([]);
  const [activeSection, setActiveSection] = useState("teams");
  const [tournamentType, setTournamentType] = useState("");
  const [roundSchedules, setRoundSchedules] = useState({
    1: {
      matchDateTime: dayjs(),
      matchInterval: "",
      courtNumber: "",
    },
  });

  // NEW: Live scoring state
  const [liveMatches, setLiveMatches] = useState(new Map());
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Bulk Score Upload state
  const [bulkScoreModal, setBulkScoreModal] = useState({ open: false, matches: [], title: "" });
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [assignModalMatch, setAssignModalMatch] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (matches.length > 0) {
      // Calculate total teams from round 1 matches
      const round1Matches = matches.filter((match) => match.round === 1);
      const uniqueTeams = new Set();

      round1Matches.forEach((match) => {
        if (match.team1Id) uniqueTeams.add(match.team1Id._id || match.team1Id);
        if (match.team2Id) uniqueTeams.add(match.team2Id._id || match.team2Id);
      });

      setTotalTeams(uniqueTeams.size);

      // Auto-select first match if none is selected
      if (!selectedMatch && matches.length > 0) {
        handleToggleMatch(matches[0]._id);
      }
    }
  }, [matches]);

  useEffect(() => {
    if (matches.length > 0) {
      // Group matches by round
      const matchesByRound = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
      }, {});

      // Find the highest round that has been generated
      const generatedRounds = Object.keys(matchesByRound).map(Number);
      const highestGeneratedRound = Math.max(...generatedRounds);

      // Update current round to the highest generated round
      setCurrentRound(highestGeneratedRound);

      // Check if all matches in the current round are completed
      const currentRoundMatches = matchesByRound[highestGeneratedRound] || [];
      const allMatchesCompleted = currentRoundMatches.every(
        (match) => match.status === "COMPLETED" || match.status === "BYE"
      );

      // Can proceed to next round if all current round matches are complete
      // AND the next round hasn't been generated yet
      const nextRoundExists =
        matchesByRound[highestGeneratedRound + 1]?.length > 0;
      setCanProceedToNextRound(allMatchesCompleted && !nextRoundExists);

      // Also set if this is the final round
      setIsFinalRound(highestGeneratedRound === totalRounds);
    }
  }, [matches, totalRounds]);

  // Update your useEffect to fetch both data sources
  useEffect(() => {
    if (tournamentId) {
      const initializeTournamentData = async () => {
        // First fetch tournament statistics to get total rounds
        const totalRounds = await fetchTournamentStatistics();

        // Then fetch matches
        await fetchExistingMatches();

        // Start live updates
        startLiveUpdates();

      };

      initializeTournamentData();
    } else {
    }

    return () => {
      stopLiveUpdates();
    };
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentDetails();
    }
  }, [tournamentId]);

  // NEW: Start live updates for in-progress matches
  const startLiveUpdates = () => {
    if (refreshInterval) clearInterval(refreshInterval);

    const interval = setInterval(() => {
      updateLiveScores();
    }, 5000); // Update every 5 seconds

    setRefreshInterval(interval);
  };

  const stopLiveUpdates = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // Enhanced component for displaying tournament round
  const TournamentRoundBadge = ({ match, totalRounds, totalTeams }) => {
    const roundName = getTournamentRoundName(
      match.round,
      totalRounds,
      totalTeams
    );
    const badgeStyle = getRoundBadgeStyle(roundName);

    return (
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium px-3 py-2 rounded-full border-2 ${badgeStyle}`}
        >
          {roundName}
        </span>
        {roundName === "Finals" && (
          <div className="flex items-center gap-1">
            <FaTrophy className="text-yellow-500 w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold text-yellow-600">
              CHAMPIONSHIP
            </span>
          </div>
        )}
      </div>
    );
  };

  const getTournamentRoundName = (
    currentRound,
    totalRounds,
    totalTeams = null
  ) => {
    // If we have total teams, we can be more accurate
    if (totalTeams) {
      const teamsInThisRound = Math.pow(2, totalRounds - currentRound + 1);

      // Special cases for common tournament sizes
      if (teamsInThisRound === 2) return "Finals";
      if (teamsInThisRound === 4) return "Semi Finals";
      if (teamsInThisRound === 8) return "Quarter Finals";
      if (teamsInThisRound === 16) return "Round of 16";
      if (teamsInThisRound === 32) return "Round of 32";

      // For larger tournaments
      if (teamsInThisRound > 32) {
        return `Round of ${teamsInThisRound}`;
      }
    }

    // Fallback logic based on round position
    const roundsFromEnd = totalRounds - currentRound;

    switch (roundsFromEnd) {
      case 0:
        return "Finals";
      case 1:
        return "Semi Finals";
      case 2:
        return "Quarter Finals";
      case 3:
        return "Round of 16";
      case 4:
        return "Round of 32";
      default:
        if (currentRound === 1) {
          return "First Round";
        }
        return `Round ${currentRound}`;
    }
  };

  const fetchTournamentStatistics = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tournaments/team-knockout/tournaments/${tournamentId}/stats`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        const totalTeams = data.statistics.teams.total;
        const calculatedTotalRounds = Math.ceil(Math.log2(totalTeams));

        setTotalRounds(calculatedTotalRounds);

        return calculatedTotalRounds;
      }
    } catch (error) {
      console.error("Error fetching tournament statistics:", error);
      // Fallback to calculation from matches if API fails
      return null;
    }
  };

  // NEW: Update live scores for in-progress matches
  const updateLiveScores = async () => {
    const inProgressMatches = matches.filter(
      (match) => match.status === "IN_PROGRESS"
    );

    if (inProgressMatches.length === 0) return;

    try {
      const liveUpdates = new Map();
      const token = localStorage.getItem("token");

      for (const match of inProgressMatches) {
        try {
          const response = await fetch(
            `/api/tournaments/team-knockout/matches/${match._id}/live-state`,
            {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              liveUpdates.set(match._id, {
                liveState: data.match.liveState,
                sets: data.match.sets,
                setsWon: data.match.setsWon,
                status: data.match.status,
                lastUpdated: new Date(),
              });
            }
          }
        } catch (error) {
          console.error(
            `Error fetching live state for match ${match._id}:`,
            error
          );
        }
      }

      setLiveMatches(liveUpdates);
    } catch (error) {
      console.error("Error updating live scores:", error);
    }
  };

  const fetchTournamentDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tournaments/${tournamentId}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      const data = await response.json();

      if (data.success) {
        // STEP 17b.ii — read knockoutFormat per-sport (sports[0] default;
        // this screen has no sport-switcher). Gate logic preserved:
        // "Single" if knockoutFormat or legacy playerNoValue contains
        // "Single", else "Double".
        const _kf = getKnockoutFormat(data.tournament);
        const type = _kf?.includes("Single") || data.tournament.playerNoValue?.includes("Single")
          ? "Single"
          : "Double";
        const setsNum = parseInt(data.tournament.setNo) || 3;

        setTournamentType(type);
        setSetCount(setsNum);
      }
    } catch (error) {
      console.error("Error fetching tournament details:", error);
    }
  };

  // Fetch all matches for the tournament
  const fetchExistingMatches = async () => {
    try {
      setFetchingMatches(true);
      const url = `/api/tournaments/team-knockout/matches/${tournamentId}`;
      const token = localStorage.getItem("token");
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();

      if (data.success) {
        const matches = data.matches || [];
        setMatches(matches);
        setHasGeneratedMatches(matches.length > 0);

        // Don't calculate totalRounds here anymore - let statistics handle it
      }
    } catch (error) {
      console.error("Error in fetchExistingMatches:", error);
    } finally {
      setFetchingMatches(false);
    }
  };

  const handleToggleMatch = (matchId) => {
    if (selectedMatch === matchId) {
      setSelectedMatch(null);
      setCurrentMatchDetails(null);
    } else {
      setSelectedMatch(matchId);
      const matchDetails = matches.find((match) => match._id === matchId);

      if (matchDetails) {
        // FIXED: Process team data using correct server structure
        const processedMatch = {
          ...matchDetails,
          team1: {
            _id: matchDetails.team1Id?._id,
            name: getTeamName(matchDetails.team1Id),
            captain: getTeamCaptain(matchDetails.team1Id),
            players: getTeamPlayers(matchDetails.team1Id),
            substitutes: getTeamSubstitutes(matchDetails.team1Id),
          },
          // FIXED: Use team2Id, and only create team2 if not a bye
          team2:
            !isByeMatch(matchDetails) && matchDetails.team2Id
              ? {
                _id: matchDetails.team2Id._id,
                name: getTeamName(matchDetails.team2Id),
                captain: getTeamCaptain(matchDetails.team2Id),
                players: getTeamPlayers(matchDetails.team2Id),
                substitutes: getTeamSubstitutes(matchDetails.team2Id),
              }
              : null,
        };

        setCurrentMatchDetails(processedMatch);
      }
    }
  };

  const handleNextRoundGeneration = async (round) => {
    try {
      if (!round || typeof round !== "number") {
        console.error("Invalid round parameter:", {
          round,
          type: typeof round,
        });
        toast.error("Error", "Invalid round parameter");
        return;
      }

      if (!tournamentId) {
        console.error("Tournament ID is missing:", { tournamentId });
        toast.error("Error", "Tournament ID is missing");
        return;
      }

      // CORRECTED: Use the actual route from your router
      const previousRoundUrl = `/api/tournaments/team-knockout/matches-by-round?tournamentId=${tournamentId}&round=${round - 1}`;

      const token = localStorage.getItem("token");
      const response = await fetch(previousRoundUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch previous round matches: ${response.status}`
        );
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.matches)) {
        throw new Error("Invalid response format from server");
      }

      const previousRoundMatches = data.matches;
      const incompletedMatch = previousRoundMatches.find(
        (match) => match.status !== "COMPLETED" && match.status !== "BYE"
      );

      if (incompletedMatch) {
        toast.error(
          "Previous Round Incomplete",
          "All matches from the previous round must be completed first."
        );
        return;
      }

      // Extract winners using server data structure
      const winners = previousRoundMatches
        .map((match) => {
          if (match.status === "COMPLETED" && match.winnerId) {
            return match.team1Id._id === match.winnerId
              ? match.team1Id
              : match.team2Id;
          } else if (match.status === "BYE" && match.team1Id) {
            return match.team1Id;
          }
          return null;
        })
        .filter((winner) => winner !== null);

      if (!winners.length) {
        toast.error("Error", "No winners found for next round");
        return;
      }

      setCurrentRound(round);
      setWinnersForNextRound(winners);
      setCurrentSchedulingRound(round);

      setRoundSchedules((prev) => ({
        ...prev,
        [round]: prev[round] || {
          matchDateTime: dayjs(),
          matchInterval: "",
          courtNumber: "",
        },
      }));

      setShowSchedulingModal(true);
    } catch (error) {
      console.error("Error in Next Round Generation:", error);
      toast.error(
        "Error",
        `Failed to prepare next round matches: ${error.message}`
      );
    }
  };

  const handleGenerateMatches = async () => {
    try {
      const currentRound = currentSchedulingRound;

      if (!roundSchedules[currentRound]?.matchDateTime) {
        toast.error("Scheduling Incomplete", "Please set match start time");
        return;
      }

      if (currentRound > 1) {
        const finalType = tournamentType || "Single";
        const finalSetCount = parseInt(setCount) || 3;

        const format =
          (finalType === "Single" ? "Singles" : "Doubles") +
          ` - ${finalSetCount} Sets`;

        const payload = {
          tournamentId,
          currentRound,
          scheduleDetails: {
            matchStartTime:
              roundSchedules[currentRound].matchDateTime.toISOString(),
            matchInterval: roundSchedules[currentRound].matchInterval || "0",
            courtNumber: roundSchedules[currentRound].courtNumber || "TBD",
          },
          playFormat: finalType,
          setCount: finalSetCount,
          format, // ✅ now sending correct format string
        };

        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/tournaments/team-knockout/next-round`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          setMatches((prevMatches) => {
            const filteredMatches = prevMatches.filter(
              (match) => match.round !== currentRound
            );
            return [...filteredMatches, ...data.matches];
          });

          setCurrentRound(currentRound);
          setShowSchedulingModal(false);
          setCanProceedToNextRound(false);

          setTimeout(() => fetchExistingMatches(), 500);

          toast.success(
            "Success",
            `Generated ${data.matches.length} matches for round ${currentRound}`
          );
        } else {
          throw new Error(
            data.message || "Failed to generate next round matches"
          );
        }
      }
    } catch (error) {
      console.error("Error generating matches:", error);
      toast.error("Error", `Failed to generate matches: ${error.message}`);
    }
  };


  const handleSwapPlayers = async (teamId) => {
    if (!tournamentId || !teamId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tournaments/team-knockout/teams/${teamId}/swap-players`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Players swapped and matches updated!");
        // Refresh all data
        await fetchExistingMatches();
        // If we have a selected match, refresh its details too
        if (selectedMatch) {
          handleToggleMatch(selectedMatch);
        }
      } else {
        toast.error(data.message || "Failed to swap players");
      }
    } catch (error) {
      console.error("Error swapping players:", error);
      toast.error("An error occurred while swapping players");
    }
  };

  const SchedulingModal = () => {
    const handleMatchGeneration = () => {
      if (!roundSchedules[currentSchedulingRound]?.matchDateTime) {
        toast.warning("Please select a match date and time");
        return;
      }

      // Set matchStartTime from matchDateTime
      const matchDateTime =
        roundSchedules[currentSchedulingRound].matchDateTime;

      // Validate other required fields
      if (!roundSchedules[currentSchedulingRound]?.matchInterval) {
        toast.warning("Please enter a match interval");
        return;
      }

      if (!roundSchedules[currentSchedulingRound]?.courtNumber) {
        toast.warning("Please enter a court number");
        return;
      }

      setRoundSchedules((prev) => ({
        ...prev,
        [currentSchedulingRound]: {
          ...prev[currentSchedulingRound],
          matchStartTime: matchDateTime.toISOString(),
        },
      }));

      // Check for winners data
      if (currentSchedulingRound > 1) {
        const winnersForRound = winnersForNextRound || [];

        if (!winnersForRound.length) {
          toast.error("No winners data available for next round");
          return;
        }
      }

      handleGenerateMatches();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-xl overflow-y-auto w-[450px] flex p-[52px] flex-col items-start gap-[20px] rounded-[24px] bg-[#F5F7FA]">
          {/* Header */}
          <div className="flex w-full justify-end">
            <button
              onClick={() => setShowSchedulingModal(false)}
              className="text-black-500 hover:bg-transparent bg-transparent text-black w-auto text-[25px] p-0"
            >
              X
            </button>
          </div>

          {/* Schedule Form */}
          <div className="space-y-6 w-full">
            <div className="items-center text-center gap-2 mb-4">
              <h2 className="text-black text-center mb-0 font-roboto text-[18px] font-semibold leading-normal">
                Round {currentSchedulingRound} Schedule Details
              </h2>
              {currentSchedulingRound > 1 && winnersForNextRound && (
                <p className="text-gray-600 text-center text-sm mt-1">
                  Scheduling {winnersForNextRound.length} teams for round{" "}
                  {currentSchedulingRound}
                </p>
              )}
            </div>

            {/* Match Date and Time */}
            <div className="space-y-2 first-popup">
              <label className="block text-sm font-medium text-gray-900">
                Match Start Date and Time
              </label>
              <LocalizationProvider
                className="rounded-lg border-none hover:border-none datafield"
                dateAdapter={AdapterDayjs}
              >
                <DateTimePicker
                  value={
                    roundSchedules?.[currentSchedulingRound]?.matchDateTime ||
                    null
                  }
                  className="w-full bg-white rounded-2xl hover:border-none datafield"
                  onChange={(newValue) => {
                    setRoundSchedules((prev) => ({
                      ...prev,
                      [currentSchedulingRound]: {
                        ...prev[currentSchedulingRound],
                        matchDateTime: newValue,
                      },
                    }));
                  }}
                  renderInput={(props) => (
                    <div className="relative">
                      <TextField
                        {...props}
                        fullWidth
                        className="border-none hover:border-none bg-white rounded-lg datafield"
                      />
                    </div>
                  )}
                />
              </LocalizationProvider>
            </div>

            {/* Match Interval */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                Match Interval (minutes)
              </label>
              <input
                type="number"
                value={
                  roundSchedules?.[currentSchedulingRound]?.matchInterval || ""
                }
                onChange={(e) => {
                  setRoundSchedules((prev) => ({
                    ...prev,
                    [currentSchedulingRound]: {
                      ...prev[currentSchedulingRound],
                      matchInterval: e.target.value,
                    },
                  }));
                }}
                min="0"
                placeholder="Enter interval in minutes"
                className="h-[50px] text-gray-500 px-4 py-2 self-stretch rounded-lg bg-white border-none"
                required
              />
            </div>

            {/* Court Number */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                Starting Court Number
              </label>
              <input
                type="number"
                value={
                  roundSchedules?.[currentSchedulingRound]?.courtNumber || ""
                }
                onChange={(e) => {
                  setRoundSchedules((prev) => ({
                    ...prev,
                    [currentSchedulingRound]: {
                      ...prev[currentSchedulingRound],
                      courtNumber: e.target.value,
                    },
                  }));
                }}
                min="1"
                placeholder="Enter starting court number"
                className="w-full text-gray-500 h-[50px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 border-none"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                className="flex h-[50px] px-6 py-2 justify-center items-center gap-[10px] rounded-[25px] bg-[#FF5500] text-white"
                onClick={handleMatchGeneration}
              >
                Generate Matches
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActualWinner = (match) => {
    // Handle winnerId as object
    if (
      typeof match.winnerId === "object" &&
      match.winnerId &&
      match.winnerId.teamName
    ) {
      return {
        teamName: match.winnerId.teamName,
        isTeam1: match.winnerId._id === match.team1Id?._id,
        isTeam2: match.winnerId._id === match.team2Id?._id,
      };
    }

    // Use matchWinner field
    if (match.matchWinner === "home") {
      return {
        teamName: getTeamName(match.team1Id),
        isTeam1: true,
        isTeam2: false,
      };
    } else if (match.matchWinner === "away") {
      return {
        teamName: getTeamName(match.team2Id),
        isTeam1: false,
        isTeam2: true,
      };
    }

    // Fallback: use sets won
    const homeWins = match.setsWon?.home || 0;
    const awayWins = match.setsWon?.away || 0;

    if (homeWins > awayWins) {
      return {
        teamName: getTeamName(match.team1Id),
        isTeam1: true,
        isTeam2: false,
      };
    } else if (awayWins > homeWins) {
      return {
        teamName: getTeamName(match.team2Id),
        isTeam1: false,
        isTeam2: true,
      };
    }

    return null;
  };

  const getTeamName = (team) => {
    if (!team) return "Unknown Team";

    // Handle populated team object
    if (team.teamName) return team.teamName;
    if (team.name) return team.name;

    return "Unknown Team";
  };

  const getTeamPlayers = (team) => {
    if (!team) return [];

    // For server data structure (populated team)
    if (team.playerPositions) {
      return [
        team.playerPositions.A, // Captain
        team.playerPositions.B, // Player 1
        team.playerPositions.C, // Player 2
      ].filter(Boolean);
    }

    return team.players || [];
  };

  const getTeamCaptain = (team) => {
    if (!team) return "Unknown Captain";

    // For server data structure (populated team)
    if (team.playerPositions?.A) {
      return team.playerPositions.A;
    }

    return team.captain || "Unknown Captain";
  };

  const getTeamSubstitutes = (team) => {
    if (!team) return [];
    return team.substitutes || [];
  };

  const getTeamWins = (match, teamSide) => {
    if (!match || !match.sets) return 0;
    return match.sets.filter((set) => set.setWinner === teamSide).length;
  };

  // Check if a match is a bye match
  const isByeMatch = (match) => {
    // Check the server's isBye flag first (most reliable)
    if (match?.isBye === true) return true;

    // Check if team2Id is null or undefined (no second team)
    if (!match?.team2Id) return true;

    // Additional safety check: if team2Id exists but is somehow invalid
    if (
      match?.team2Id &&
      typeof match.team2Id === "object" &&
      !match.team2Id._id
    ) {
      return true;
    }

    return false;
  };

  // NEW: Get match status with live updates
  const getMatchStatus = (match) => {
    const liveData = liveMatches.get(match._id);

    if (liveData) {
      return {
        status: liveData.status,
        liveState: liveData.liveState,
        setsWon: liveData.setsWon,
        isLive: true,
      };
    }

    return {
      status: match.status,
      setsWon: match.setsWon || { home: 0, away: 0 },
      isLive: false,
    };
  };

  // NEW: Get live score display
  const getLiveScoreDisplay = (match) => {
    const liveData = liveMatches.get(match._id);

    if (!liveData || !liveData.liveState) {
      return null;
    }

    const { liveState, setsWon } = liveData;

    return {
      currentPoints: liveState.currentPoints,
      currentSet: liveState.currentSetNumber,
      currentGame: liveState.currentGameNumber,
      setsWon: setsWon,
      lastUpdated: liveData.lastUpdated,
    };
  };

  // Status badge component
  const StatusBadge = ({ status, isLive }) => {
    const getStatusConfig = (status, isLive) => {
      switch (status) {
        case "SCHEDULED":
          return {
            color:
              "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-yellow-600",
            text: "Scheduled",
            icon: Calendar,
          };
        case "IN_PROGRESS":
          return {
            color: isLive
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700 animate-pulse"
              : "bg-gradient-to-r from-orange-500 to-orange-500 text-white border-gray-700",
            text: isLive ? "LIVE" : "In Progress",
            icon: Clock,
          };
        case "COMPLETED":
          return {
            color:
              "bg-gradient-to-r from-green-500 to-green-600 text-white border-green-700",
            text: "Completed",
            icon: CheckCircle,
          };
        case "BYE":
          return {
            color:
              "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-600",
            text: "Bye",
            icon: SkipForward,
          };
        case "CANCELLED":
          return {
            color:
              "bg-gradient-to-r from-red-600 to-red-700 text-white border-red-800",
            text: "Cancelled",
            icon: XCircle,
          };
        default:
          return {
            color:
              "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-600",
            text: status || "Unknown",
            icon: AlertCircle,
          };
      }
    };

    const config = getStatusConfig(status, isLive);
    const IconComponent = config.icon;

    return (
      <div
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border-2 shadow-md ${config.color}`}
      >
        <IconComponent className="w-3 h-3" />
        {config.text}
      </div>
    );
  };

  // Add this function to get the round badge styling
  const getRoundBadgeStyle = (roundName) => {
    const styles = {
      Finals:
        "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-yellow-600 font-bold shadow-lg",
      "Semi Finals":
        "bg-gradient-to-r from-orange-400 to-orange-500 text-orange-900 border-orange-600 font-bold shadow-md",
      "Quarter Finals":
        "bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-900 border-emerald-600 font-semibold shadow-md",
      "Round of 16":
        "bg-gradient-to-r from-orange-400 to-orange-500 text-gray-900 border-orange-500 font-semibold",
      "Round of 32":
        "bg-gradient-to-r from-green-400 to-green-500 text-green-900 border-green-600 font-semibold",
      "First Round":
        "bg-gradient-to-r from-gray-400 to-gray-500 text-gray-900 border-gray-600",
    };

    // Default style for any other rounds
    return (
      styles[roundName] ||
      "bg-gradient-to-r from-gray-400 to-gray-500 text-gray-900 border-gray-600"
    );
  };

  // Live scorecard component to show live scores of match
  const LiveScoreCard = ({ match }) => {
    const liveScore = getLiveScoreDisplay(match);
    const matchStatus = getMatchStatus(match);

    if (!liveScore && matchStatus.status !== "COMPLETED") {
      return null;
    }

    const team1Name = getTeamName(match.team1Id);
    const team2Name = getTeamName(match.team2Id);
    const isLive = matchStatus.status === "IN_PROGRESS";
    const isCompleted = matchStatus.status === "COMPLETED";

    return (
      <div className="mt-3 relative overflow-hidden">
        {/* Tournament Style Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white p-3 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FaTableTennis className="w-4 h-4 text-orange-300" />
              <h4 className="text-sm font-bold tracking-wide">
                {isCompleted ? "FINAL SCORE" : "LIVE MATCH"}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {isLive && (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-red-300">LIVE</span>
                </>
              )}
              {isCompleted && <Award className="w-4 h-4 text-yellow-400" />}
            </div>
          </div>
        </div>

        {/* Main Scorecard Body */}
        <div className="bg-gradient-to-b from-gray-50 to-white border-2 border-orange-200 rounded-b-lg p-4 shadow-lg">
          {/* Team Names Header */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-2">
                <p className="text-xs font-medium text-orange-500 mb-1">HOME</p>
                <p
                  className="font-bold text-orange-700 text-sm truncate"
                  title={team1Name}
                >
                  {team1Name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="bg-orange-100 border-2 border-orange-300 rounded-full w-8 h-8 flex items-center justify-center">
                <span className="text-orange-600 font-bold text-lg">VS</span>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-red-100 border-2 border-red-300 rounded-lg p-2">
                <p className="text-xs font-medium text-red-600 mb-1">AWAY</p>
                <p
                  className="font-bold text-red-800 text-sm truncate"
                  title={team2Name}
                >
                  {team2Name}
                </p>
              </div>
            </div>
          </div>

          {/* Main Score Display */}
          <div className="bg-gradient-to-r from-slate-100 via-white to-slate-100 border-2 border-gray-300 rounded-xl p-4 mb-4 shadow-inner">
            <div className="text-center mb-2">
              <p className="text-xs font-semibold text-gray-600 tracking-wider">
                SETS WON
              </p>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-4 ${(matchStatus.setsWon.home || 0) >
                    (matchStatus.setsWon.away || 0)
                    ? "bg-orange-500 border-gray-700 text-white shadow-lg"
                    : "bg-orange-100 border-orange-300 text-orange-600"
                    }`}
                >
                  <span className="text-2xl font-bold">
                    {matchStatus.setsWon.home || 0}
                  </span>
                </div>
                {isCompleted && match.winnerId === match.team1Id?._id && (
                  <div className="mt-2 flex justify-center">
                    <FaTrophy className="text-yellow-500 w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="text-center px-4">
                <div className="bg-gray-200 border-2 border-gray-400 rounded-lg px-3 py-1">
                  <span className="text-2xl font-bold text-gray-700">-</span>
                </div>
              </div>

              <div className="text-center flex-1">
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-4 ${(matchStatus.setsWon.away || 0) >
                    (matchStatus.setsWon.home || 0)
                    ? "bg-red-500 border-red-700 text-white shadow-lg"
                    : "bg-red-100 border-red-300 text-red-700"
                    }`}
                >
                  <span className="text-2xl font-bold">
                    {matchStatus.setsWon.away || 0}
                  </span>
                </div>
                {isCompleted && match.winnerId === match.team2Id?._id && (
                  <div className="mt-2 flex justify-center">
                    <FaTrophy className="text-yellow-500 w-5 h-5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Game Score */}
          {liveScore && isLive && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-3 mb-4 animate-pulse">
              <div className="text-center mb-2">
                <div className="inline-flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  <span className="text-xs font-bold">LIVE GAME</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white border-2 border-orange-200 rounded-lg p-2">
                  <p className="text-xs text-gray-600">
                    SET {liveScore.currentSet}
                  </p>
                  <p className="text-lg font-bold text-orange-500">
                    {liveScore.currentPoints.home}
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                    <span className="text-xs font-bold">
                      G{liveScore.currentGame}
                    </span>
                  </div>
                </div>
                <div className="bg-white border-2 border-red-200 rounded-lg p-2">
                  <p className="text-xs text-gray-600">
                    SET {liveScore.currentSet}
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {liveScore.currentPoints.away}
                  </p>
                </div>
              </div>

              <div className="text-center mt-2">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated {liveScore.lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          {/* Match Format Info */}
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-300 rounded-lg p-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3 text-orange-500" />
                <span className="font-medium text-gray-700">Format:</span>
                <span className="text-gray-600">
                  {match.format || "Singles - 3 Sets"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-orange-500" />
                <span className="font-medium text-gray-700">Court:</span>
                <span className="text-gray-600">
                  {match.courtNumber || "TBD"}
                </span>
              </div>
            </div>
          </div>

          {/* Winner Banner for Completed Matches */}
          {isCompleted && match.winnerId && (
            <div className="mt-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 border-2 border-yellow-600 rounded-lg p-3 text-center shadow-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FaTrophy className="text-yellow-800 w-5 h-5" />
                <span className="text-yellow-900 font-bold text-sm tracking-wide">
                  MATCH WINNER
                </span>
                <FaTrophy className="text-yellow-800 w-5 h-5" />
              </div>
              <p className="text-yellow-900 font-bold text-lg">
                {(() => {
                  const winner = getActualWinner(match);
                  return winner ? winner.teamName : "Unknown";
                })()}{" "}
                Won
              </p>
              <div className="flex justify-center gap-1 mt-1">
                {[...Array(3)].map((_, i) => (
                  <FaMedal key={i} className="text-yellow-700 w-3 h-3" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Display loading state while fetching data
  if (fetchingMatches) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading tournament matches...</p>
      </div>
    );
  }

  // Display message if no matches exist
  if (!hasGeneratedMatches) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">
          No matches have been generated for this tournament yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Match List (Left Side) */}
      {/* Match List (Left Side) */}
      <div className="w-[400px] flex-shrink-0 overflow-y-auto pr-2 custom-scrollbar">
        <div className="w-full flex flex-col gap-4">
          {(() => {
            // Group matches by round
            const matchesByRound = matches.reduce((acc, match) => {
              if (!acc[match.round]) acc[match.round] = [];
              acc[match.round].push(match);
              return acc;
            }, {});

            // Sort rounds in ascending order
            const sortedRounds = Object.keys(matchesByRound)
              .map(Number)
              .sort((a, b) => a - b);

            return sortedRounds.map((roundNumber) => {
              const roundMatches = matchesByRound[roundNumber];
              const roundName = getTournamentRoundName(
                roundNumber,
                totalRounds,
                totalTeams
              );

              return (
                <div
                  key={roundNumber}
                  className="mb-4"
                >
                  {/* Round Header */}
                  <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-3 px-1 mb-2 border-b border-gray-200 flex justify-between items-end">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                      {roundName}
                    </h3>
                    <div className="flex items-center gap-2">
                      {roundMatches.some(m => {
                        const s = (m.status || '').toUpperCase();
                        return s !== 'COMPLETED' && !m.isBye;
                      }) && (
                        <button
                          className="px-3 py-1 rounded-full text-[10px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            const pending = roundMatches.filter(m => {
                              const s = (m.status || '').toUpperCase();
                              return s !== 'COMPLETED' && !m.isBye;
                            });
                            setBulkScoreModal({
                              open: true,
                              matches: pending,
                              title: `Bulk Score Upload — ${roundName}`
                            });
                          }}
                        >
                          Bulk Upload
                        </button>
                      )}
                      {roundMatches.some(m => {
                        const s = (m.status || '').toUpperCase();
                        return s !== 'COMPLETED' && !m.isBye;
                      }) && (
                        <button
                          className="px-3 py-1 rounded-full text-[10px] font-semibold text-orange-600 border border-orange-300 bg-orange-50 hover:bg-orange-100 w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCsvUpload(true);
                          }}
                        >
                          CSV Upload
                        </button>
                      )}
                      <span className="text-xs font-medium text-gray-400">
                        {roundMatches.length} Matches
                      </span>
                    </div>
                  </div>

                  {/* MATCHES IN THIS ROUND */}
                  <div className="flex flex-col gap-3">
                    {roundMatches.map((match) => {
                      const matchStatus = getMatchStatus(match);
                      const isSelected = selectedMatch === match._id;
                      const isLive = matchStatus.status === "IN_PROGRESS";
                      const isCompleted = matchStatus.status === "COMPLETED";
                      const isBye = isByeMatch(match);

                      return (
                        <div
                          key={match._id}
                          className={`
                            relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 border
                            ${isSelected
                              ? "border-orange-500 shadow-orange-200 shadow-md bg-white ring-1 ring-orange-500"
                              : "border-gray-200 bg-white hover:border-orange-300 hover:shadow-md"
                            } 
                            ${isBye ? "opacity-70 grayscale-[0.5]" : ""}
                          `}
                          onClick={() => handleToggleMatch(match._id)}
                        >
                          {/* Live Indicator Strip */}
                          {isLive && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse" />
                          )}

                          {/* Selection Indicator Strip */}
                          {isSelected && !isLive && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                          )}

                          <div className="p-4 pl-5">
                            {/* Header: Status & Court */}
                            <div className="flex items-center justify-between mb-3">
                              <StatusBadge
                                status={matchStatus.status}
                                isLive={matchStatus.isLive}
                              />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">
                                {match.courtNumber ? `Court ${match.courtNumber}` : "TBD"}
                              </span>
                            </div>

                            {/* Teams */}
                            <div className="space-y-2">
                              {/* Team 1 */}
                              <div className="flex justify-between items-center group">
                                <span className={`font-semibold text-sm truncate max-w-[180px] transition-colors ${isSelected ? 'text-orange-600' : 'text-gray-700 group-hover:text-orange-500'}`}>
                                  {getTeamName(match.team1Id)}
                                </span>
                                {isCompleted && (
                                  <span className={`text-lg font-bold ${match.setsWon?.home > match.setsWon?.away ? 'text-green-600' : 'text-gray-400'}`}>
                                    {match.setsWon?.home || 0}
                                  </span>
                                )}
                              </div>

                              {/* VS Divider (Subtle) */}
                              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent w-full opacity-50 my-1"></div>

                              {/* Team 2 */}
                              <div className="flex justify-between items-center group">
                                <span className={`font-semibold text-sm truncate max-w-[180px] transition-colors ${isSelected ? 'text-orange-600' : 'text-gray-700 group-hover:text-orange-500'}`}>
                                  {getTeamName(match.team2Id)}
                                </span>
                                {isCompleted && (
                                  <span className={`text-lg font-bold ${match.setsWon?.away > match.setsWon?.home ? 'text-green-600' : 'text-gray-400'}`}>
                                    {match.setsWon?.away || 0}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Footer: Live Score Snippet */}
                            {isLive && (
                              <div className="mt-3 pt-2 border-t border-red-50 flex justify-between items-center text-xs text-red-600 font-medium">
                                <span className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                  Live
                                </span>
                                <span>Set {match.liveState?.currentSetNumber || 1} • G{match.liveState?.currentGameNumber || 1}</span>
                              </div>
                            )}

                            {/* Umpire status */}
                            {!isBye && (() => {
                              const umpireName = getUmpireName(match.referee);
                              const t1 = getTeamName(match.team1Id);
                              const t2 = getTeamName(match.team2Id);
                              const teamsReady = t1 && t1 !== "TBD" && t2 && t2 !== "TBD";
                              return (
                                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                                  {umpireName ? (
                                    <span className="flex items-center gap-1 text-[10px] text-gray-600">
                                      <Shield className="w-3 h-3 text-blue-500" />
                                      <span className="font-semibold">Umpire:</span>
                                      <span className="truncate max-w-[80px]">{umpireName}</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                      <Shield className="w-3 h-3 text-gray-300" />
                                      <span>No umpire</span>
                                    </span>
                                  )}
                                  {!umpireName && !isCompleted && teamsReady && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setAssignModalMatch(match); }}
                                      className="flex items-center gap-0.5 text-[10px] font-bold text-orange-600 hover:text-orange-700 px-1.5 py-0.5 rounded hover:bg-orange-50 w-auto"
                                    >
                                      <UserPlus className="w-3 h-3" />
                                      Assign
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Match Details (Right Side) */}
      <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full custom-scrollbar overflow-y-auto">
        {currentMatchDetails ? (
          <>
            {/* Hero Header */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <FaTableTennis className="w-64 h-64" />
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-medium tracking-wider mb-2 border border-white/20">
                      {currentMatchDetails.format || "Standard Match"}
                    </span>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                      {getTournamentRoundName(currentMatchDetails.round, totalRounds, totalTeams)}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {(() => {
                      const matchStatus = getMatchStatus(currentMatchDetails);
                      return (
                        <StatusBadge
                          status={matchStatus.status}
                          isLive={matchStatus.isLive}
                        />
                      );
                    })()}
                    <span className="text-sm text-gray-400 flex items-center gap-2 bg-black/30 px-3 py-1 rounded-lg">
                      <Calendar className="w-4 h-4" />
                      {formatDate(currentMatchDetails.matchDate)}
                    </span>
                  </div>
                </div>

                {/* Match Information Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Time</p>
                    <div className="flex items-center gap-2 font-semibold">
                      <Clock className="w-4 h-4 text-orange-400" />
                      {formatTime(currentMatchDetails.matchDate)}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Court</p>
                    <div className="flex items-center gap-2 font-semibold">
                      <Target className="w-4 h-4 text-orange-400" />
                      {currentMatchDetails.courtNumber || "TBD"}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Format</p>
                    <div className="flex items-center gap-2 font-semibold">
                      <Users className="w-4 h-4 text-green-400" />
                      {currentMatchDetails.format?.split(" - ")[0] || "Singles"}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Sets</p>
                    <div className="flex items-center gap-2 font-semibold">
                      <Award className="w-4 h-4 text-emerald-400" />
                      {currentMatchDetails.format?.split(" - ")[1] || "3 Sets"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Live Status Banner */}
              {(() => {
                const matchStatus = getMatchStatus(currentMatchDetails);
                const liveScore = getLiveScoreDisplay(currentMatchDetails);

                if (matchStatus.status === "IN_PROGRESS" && liveScore) {
                  return (
                    <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg animate-pulse">
                      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                      <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                            <div className="relative w-4 h-4 bg-white rounded-full"></div>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg leading-tight">LIVE MATCH IN PROGRESS</h3>
                            <p className="text-red-100 text-sm">
                              Set {liveScore.currentSet} • Game {liveScore.currentGame}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 bg-black/20 px-6 py-3 rounded-xl border border-white/10">
                          <div className="text-center">
                            <p className="text-xs text-red-200 uppercase font-bold">Home</p>
                            <p className="text-3xl font-bold">{liveScore.currentPoints.home}</p>
                          </div>
                          <div className="text-2xl font-bold opacity-50">-</div>
                          <div className="text-center">
                            <p className="text-xs text-red-200 uppercase font-bold">Away</p>
                            <p className="text-3xl font-bold">{liveScore.currentPoints.away}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            navigate(
                              `/tournament-management/team-knockouts/${currentMatchDetails._id}/scoreboard`,
                              {
                                state: {
                                  matchId: currentMatchDetails._id,
                                  teamAName: currentMatchDetails.team1?.name,
                                  teamBName: currentMatchDetails.team2?.name,
                                  matchData: currentMatchDetails,
                                  matchType:
                                    currentMatchDetails.format?.split(" - ")[0] ||
                                    "Singles",
                                  setCount:
                                    currentMatchDetails.format
                                      ?.split(" - ")[1]
                                      ?.split(" ")[0] || "3",
                                  team1Captain:
                                    currentMatchDetails.team1?.captain,
                                  team1Players:
                                    currentMatchDetails.team1?.players,
                                  team2Captain:
                                    currentMatchDetails.team2?.captain,
                                  team2Players:
                                    currentMatchDetails.team2?.players,
                                  resuming: true,
                                },
                              }
                            );
                          }}
                          className="px-6 py-2 bg-white text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors shadow-sm"
                        >
                          Join Live Score
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Team Rosters Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Team 1 Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="bg-orange-50/50 p-4 border-b border-orange-100 flex justify-between items-center group-hover:bg-orange-50 transition-colors">
                    <div className="flex flex-col">
                      <h3 className="font-bold text-gray-800 text-lg group-hover:text-orange-600 transition-colors">
                        {currentMatchDetails.team1?.name || "Team 1"}
                      </h3>
                      <button
                        onClick={() => handleSwapPlayers(currentMatchDetails.team1?._id)}
                        disabled={getMatchStatus(currentMatchDetails).status !== "SCHEDULED"}
                        className="text-[10px] font-bold text-orange-500 hover:text-orange-700 flex items-center gap-1 mt-1 uppercase tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCcw className="w-3 h-3" />
                        Swap Player Order
                      </button>
                    </div>
                    <span className="text-xs font-bold text-orange-500 bg-orange-100 px-2 py-1 rounded uppercase tracking-wider">
                      Home
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Player 1 (Pos A) */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-xs">
                        A
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">
                          Player 1
                        </p>
                        <p className="font-medium text-gray-700">
                          {currentMatchDetails.team1?.captain || "Unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Player 2 (Pos B) */}
                    <div className="space-y-3">
                      {currentMatchDetails.team1?.players?.slice(1, 2).map((player, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                            B
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">
                              Player 2
                            </p>
                            <p className="font-medium text-gray-700">{player}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Substitutes */}
                    {currentMatchDetails.team1?.substitutes && currentMatchDetails.team1.substitutes.length > 0 && (
                      <div className="pt-3 border-t border-dashed border-gray-200">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-2">Substitutes</p>
                        <div className="flex flex-wrap gap-2">
                          {currentMatchDetails.team1.substitutes.map((sub, idx) => (
                            <span key={idx} className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team 2 Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="bg-red-50/50 p-4 border-b border-red-100 flex justify-between items-center group-hover:bg-red-50 transition-colors">
                    <div className="flex flex-col">
                      <h3 className="font-bold text-gray-800 text-lg group-hover:text-red-700 transition-colors">
                        {currentMatchDetails.team2?.name || "Team 2"}
                      </h3>
                      <button
                        onClick={() => handleSwapPlayers(currentMatchDetails.team2?._id)}
                        disabled={getMatchStatus(currentMatchDetails).status !== "SCHEDULED"}
                        className="text-[10px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 mt-1 uppercase tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCcw className="w-3 h-3" />
                        Swap Player Order
                      </button>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded uppercase tracking-wider">
                      Away
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {isByeMatch(currentMatchDetails) ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <Pause className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">BYE Match</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Automatic advancement
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Player 1 (Pos X) */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                            X
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">
                              Player 1
                            </p>
                            <p className="font-medium text-gray-700">
                              {currentMatchDetails.team2?.captain || "Unknown"}
                            </p>
                          </div>
                        </div>

                        {/* Player 2 (Pos Y) */}
                        <div className="space-y-3">
                          {currentMatchDetails.team2?.players?.slice(1, 2).map((player, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                                Y
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 font-bold uppercase">
                                  Player 2
                                </p>
                                <p className="font-medium text-gray-700">{player}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Substitutes */}
                        {currentMatchDetails.team2?.substitutes && currentMatchDetails.team2.substitutes.length > 0 && (
                          <div className="pt-3 border-t border-dashed border-gray-200">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-2">Substitutes</p>
                            <div className="flex flex-wrap gap-2">
                              {currentMatchDetails.team2.substitutes.map((sub, idx) => (
                                <span key={idx} className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Match Score Summary */}
              <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 border-2 border-slate-200 rounded-[24px] p-6 mb-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-500 rounded-full p-2">
                      <FaTableTennis className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-gray-800 bg-clip-text text-transparent">
                      Tournament Scorecard
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const matchStatus = getMatchStatus(currentMatchDetails);
                      return (
                        <StatusBadge
                          status={matchStatus.status}
                          isLive={matchStatus.isLive}
                        />
                      );
                    })()}
                  </div>
                </div>

                {!isByeMatch(currentMatchDetails) && (
                  <>
                    {/* Tournament Style Main Scoreboard */}
                    <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 mb-6 shadow-2xl">
                      {/* Header */}
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full">
                          <Award className="w-4 h-4" />
                          <span className="font-bold text-sm tracking-wider">
                            MATCH SCORE
                          </span>
                        </div>
                      </div>

                      {/* Team Names */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                          <div className="bg-orange-500 text-white rounded-lg p-3 border-2 border-orange-400">
                            <p className="text-xs font-medium opacity-90 mb-1">
                              HOME TEAM
                            </p>
                            <p className="font-bold text-lg truncate">
                              {currentMatchDetails.team1?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center border-4 border-orange-400 shadow-lg">
                            <span className="text-orange-600 font-bold text-xl">
                              VS
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="bg-red-600 text-white rounded-lg p-3 border-2 border-red-400">
                            <p className="text-xs font-medium opacity-90 mb-1">
                              AWAY TEAM
                            </p>
                            <p className="font-bold text-lg truncate">
                              {currentMatchDetails.team2?.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Main Score Display */}
                      <div className="bg-white rounded-xl p-6 shadow-inner border-4 border-gray-200">
                        <div className="text-center mb-4">
                          <p className="text-sm font-bold text-gray-600 tracking-widest">
                            SETS WON
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-center">
                            <div
                              className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-lg ${(getMatchStatus(currentMatchDetails).setsWon
                                .home || 0) >
                                (getMatchStatus(currentMatchDetails).setsWon
                                  .away || 0)
                                ? "bg-gradient-to-br from-orange-400 to-orange-500 border-orange-300 text-white"
                                : "bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300 text-orange-600"
                                }`}
                            >
                              <span className="text-3xl font-bold">
                                {getMatchStatus(currentMatchDetails).setsWon
                                  .home || 0}
                              </span>
                            </div>
                            {getMatchStatus(currentMatchDetails).status ===
                              "COMPLETED" &&
                              currentMatchDetails.winnerId ===
                              currentMatchDetails.team1Id?._id && (
                                <div className="mt-3 flex justify-center">
                                  <div className="bg-yellow-400 rounded-full p-2 border-2 border-yellow-600">
                                    <FaTrophy className="text-yellow-800 w-6 h-6" />
                                  </div>
                                </div>
                              )}
                          </div>

                          <div className="text-center px-6">
                            <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg px-4 py-2 border-2 border-orange-600 shadow-lg">
                              <span className="text-3xl font-bold text-white">
                                -
                              </span>
                            </div>
                          </div>

                          <div className="text-center">
                            <div
                              className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-lg ${(getMatchStatus(currentMatchDetails).setsWon
                                .away || 0) >
                                (getMatchStatus(currentMatchDetails).setsWon
                                  .home || 0)
                                ? "bg-gradient-to-br from-red-400 to-red-600 border-red-300 text-white"
                                : "bg-gradient-to-br from-red-100 to-red-200 border-red-300 text-red-700"
                                }`}
                            >
                              <span className="text-3xl font-bold">
                                {getMatchStatus(currentMatchDetails).setsWon
                                  .away || 0}
                              </span>
                            </div>
                            {getMatchStatus(currentMatchDetails).status ===
                              "COMPLETED" &&
                              currentMatchDetails.winnerId ===
                              currentMatchDetails.team2Id?._id && (
                                <div className="mt-3 flex justify-center">
                                  <div className="bg-yellow-400 rounded-full p-2 border-2 border-yellow-600">
                                    <FaTrophy className="text-yellow-800 w-6 h-6" />
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Game Score Enhancement */}
                    {(() => {
                      const liveScore = getLiveScoreDisplay(currentMatchDetails);
                      const matchStatus = getMatchStatus(currentMatchDetails);

                      if (liveScore && matchStatus.status === "IN_PROGRESS") {
                        return (
                          <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white rounded-xl p-4 mb-4 border-2 border-red-700 shadow-xl animate-pulse">
                            <div className="text-center mb-3">
                              <div className="inline-flex items-center gap-2 bg-white text-red-600 px-3 py-1 rounded-full">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                <span className="font-bold text-sm">
                                  LIVE GAME IN PROGRESS
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="bg-white bg-opacity-20 rounded-lg p-3 border border-white border-opacity-30">
                                <p className="text-xs opacity-90 mb-1">
                                  SET {liveScore.currentSet}
                                </p>
                                <p className="text-2xl font-bold">
                                  {liveScore.currentPoints.home}
                                </p>
                                <p className="text-xs opacity-75">
                                  {currentMatchDetails.team1?.name}
                                </p>
                              </div>
                              <div className="flex flex-col items-center justify-center">
                                <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center border-2 border-orange-300 mb-1">
                                  <span className="text-xs font-bold">
                                    G{liveScore.currentGame}
                                  </span>
                                </div>
                                <span className="text-xs opacity-90">GAME</span>
                              </div>
                              <div className="bg-white bg-opacity-20 rounded-lg p-3 border border-white border-opacity-30">
                                <p className="text-xs opacity-90 mb-1">
                                  SET {liveScore.currentSet}
                                </p>
                                <p className="text-2xl font-bold">
                                  {liveScore.currentPoints.away}
                                </p>
                                <p className="text-xs opacity-75">
                                  {currentMatchDetails.team2?.name}
                                </p>
                              </div>
                            </div>

                            <div className="text-center mt-3">
                              <p className="text-xs opacity-90 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />
                                Last Updated:{" "}
                                {liveScore.lastUpdated.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Enhanced Set Details */}
                    {currentMatchDetails.sets &&
                      currentMatchDetails.sets.length > 0 && (
                        <div className="space-y-6">
                          {/* Set History Header */}
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full p-2 shadow-lg">
                                <Target className="w-5 h-5 text-white" />
                              </div>
                              <h4 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
                                Set History & Performance
                              </h4>
                            </div>
                            <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-full px-4 py-2 border-2 border-emerald-300">
                              <span className="text-emerald-700 font-bold text-sm">
                                {
                                  currentMatchDetails.sets.filter(
                                    (s) => s.status === "COMPLETED"
                                  ).length
                                }{" "}
                                / {currentMatchDetails.sets.length} Sets Completed
                              </span>
                            </div>
                          </div>

                          {/* Sets Container */}
                          <div className="space-y-6">
                            {currentMatchDetails.sets.map((set, index) => {
                              const isCompleted = set.status === "COMPLETED";
                              const isInProgress = set.status === "IN_PROGRESS";
                              const isPending = set.status === "PENDING";
                              const homeWins = set.gamesWon?.home || 0;
                              const awayWins = set.gamesWon?.away || 0;
                              const setWinner = set.setWinner;

                              return (
                                <div
                                  key={index}
                                  className={`relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl ${isCompleted
                                    ? "ring-2 ring-green-300"
                                    : isInProgress
                                      ? "ring-2 ring-orange-300 animate-pulse"
                                      : "ring-2 ring-gray-200"
                                    }`}
                                >
                                  {/* Background Pattern */}
                                  <div className="absolute inset-0 opacity-5">
                                    <div className="w-full h-full bg-gradient-to-br from-orange-500 via-amber-500 to-amber-500"></div>
                                  </div>

                                  {/* Set Header */}
                                  <div
                                    className={`relative p-6 ${isCompleted
                                      ? "bg-gradient-to-r from-green-400 via-green-500 to-emerald-500"
                                      : isInProgress
                                        ? "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 animate-gradient-x"
                                        : "bg-gradient-to-r from-gray-400 via-gray-500 to-slate-500"
                                      }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-4">
                                        {/* Set Number Badge */}
                                        <div
                                          className={`relative w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl ${isCompleted
                                            ? "bg-white text-green-600"
                                            : isInProgress
                                              ? "bg-white text-orange-500 animate-pulse"
                                              : "bg-white text-gray-600"
                                            }`}
                                        >
                                          <span className="text-2xl font-bold">
                                            {set.setNumber}
                                          </span>
                                          {isCompleted && (
                                            <div className="absolute -top-1 -right-1">
                                              <CheckCircle className="w-6 h-6 text-green-500 bg-white rounded-full" />
                                            </div>
                                          )}
                                          {isInProgress && (
                                            <div className="absolute -top-1 -right-1">
                                              <Clock className="w-6 h-6 text-orange-500 bg-white rounded-full p-1" />
                                            </div>
                                          )}
                                        </div>

                                        {/* Set Info */}
                                        <div className="text-white">
                                          <h5 className="text-xl font-bold mb-1">
                                            {set.type}
                                          </h5>
                                          <div className="flex items-center gap-2 text-sm opacity-90">
                                            <Users className="w-4 h-4" />
                                            <span>{set.homePlayer}</span>
                                            <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs font-medium">
                                              VS
                                            </span>
                                            <span>{set.awayPlayer}</span>
                                          </div>
                                          {(set.homePlayerB ||
                                            set.awayPlayerZ) && (
                                              <div className="flex items-center gap-2 text-sm opacity-90 mt-1">
                                                <Users className="w-4 h-4" />
                                                <span>{set.homePlayerB}</span>
                                                <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs font-medium">
                                                  VS
                                                </span>
                                                <span>{set.awayPlayerZ}</span>
                                              </div>
                                            )}
                                        </div>
                                      </div>

                                      {/* Set Status & Score */}
                                      <div className="text-right text-white">
                                        <div
                                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-white text-sm font-bold mb-3 ${isCompleted
                                            ? "bg-white bg-opacity-20"
                                            : isInProgress
                                              ? "bg-white bg-opacity-20 animate-pulse"
                                              : "bg-white bg-opacity-10"
                                            }`}
                                        >
                                          {isCompleted && (
                                            <CheckCircle className="w-4 h-4" />
                                          )}
                                          {isInProgress && (
                                            <Clock className="w-4 h-4" />
                                          )}
                                          <span>{set.status}</span>
                                        </div>

                                        {/* Games Score Display */}
                                        <div className="flex items-center gap-3">
                                          <div className="text-center">
                                            <div
                                              className={`w-12 h-12 rounded-full flex items-center justify-center border-3 border-white shadow-lg ${setWinner === "home"
                                                ? "bg-white text-green-600"
                                                : "bg-white bg-opacity-20"
                                                }`}
                                            >
                                              <span className="text-lg font-bold">
                                                {homeWins}
                                              </span>
                                            </div>
                                            {setWinner === "home" && (
                                              <FaTrophy className="w-4 h-4 text-yellow-300 mx-auto mt-1" />
                                            )}
                                          </div>

                                          <div className="text-2xl font-bold">
                                            -
                                          </div>

                                          <div className="text-center">
                                            <div
                                              className={`w-12 h-12 rounded-full flex items-center justify-center border-3 border-white shadow-lg ${setWinner === "away"
                                                ? "bg-white text-green-600"
                                                : "bg-white bg-opacity-20"
                                                }`}
                                            >
                                              <span className="text-lg font-bold">
                                                {awayWins}
                                              </span>
                                            </div>
                                            {setWinner === "away" && (
                                              <FaTrophy className="w-4 h-4 text-yellow-300 mx-auto mt-1" />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Set Winner Banner */}
                                    {setWinner && (
                                      <div className="mt-4 text-center">
                                        <div className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full border-2 border-yellow-600 shadow-lg">
                                          <FaTrophy className="w-4 h-4" />
                                          <span className="font-bold text-sm">
                                            SET WINNER:{" "}
                                            {setWinner === "home"
                                              ? set.homePlayer
                                              : set.awayPlayer}
                                          </span>
                                          <FaTrophy className="w-4 h-4" />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Games Breakdown */}
                                  {set.games && set.games.length > 0 && (
                                    <div className="bg-white p-6">
                                      <div className="mb-4">
                                        <h6 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
                                          <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-full p-1">
                                            <Target className="w-4 h-4 text-white" />
                                          </div>
                                          Game by Game Breakdown
                                          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                                            {
                                              set.games.filter(
                                                (g) => g.status === "COMPLETED"
                                              ).length
                                            }{" "}
                                            / {set.games.length} Games
                                          </span>
                                        </h6>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {set.games.map((game, gameIndex) => {
                                          const gameCompleted =
                                            game.status === "COMPLETED";
                                          const gameInProgress =
                                            game.status === "IN_PROGRESS";
                                          const gameWinner = game.winner;

                                          return (
                                            <div
                                              key={gameIndex}
                                              className={`relative p-4 rounded-xl border-3 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 ${gameCompleted
                                                ? gameWinner === "home"
                                                  ? "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300"
                                                  : "bg-gradient-to-br from-red-50 to-red-100 border-red-300"
                                                : gameInProgress
                                                  ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300 animate-pulse"
                                                  : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300"
                                                }`}
                                            >
                                              {/* Game Header */}
                                              <div className="text-center mb-3">
                                                <div
                                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${gameCompleted
                                                    ? gameWinner === "home"
                                                      ? "bg-orange-500 text-white"
                                                      : "bg-red-500 text-white"
                                                    : gameInProgress
                                                      ? "bg-yellow-500 text-white"
                                                      : "bg-gray-400 text-white"
                                                    }`}
                                                >
                                                  {gameInProgress && (
                                                    <Clock className="w-3 h-3" />
                                                  )}
                                                  {gameCompleted && (
                                                    <CheckCircle className="w-3 h-3" />
                                                  )}
                                                  <span>
                                                    Game {game.gameNumber}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Game Score */}
                                              <div className="text-center mb-3">
                                                <div className="flex items-center justify-center gap-2">
                                                  <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${gameWinner === "home"
                                                      ? "bg-orange-500 text-white ring-2 ring-orange-300"
                                                      : "bg-orange-100 text-orange-600"
                                                      }`}
                                                  >
                                                    {game.homePoints || 0}
                                                  </div>
                                                  <span className="text-gray-500 font-bold">
                                                    -
                                                  </span>
                                                  <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${gameWinner === "away"
                                                      ? "bg-red-500 text-white ring-2 ring-red-300"
                                                      : "bg-red-100 text-red-700"
                                                      }`}
                                                  >
                                                    {game.awayPoints || 0}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Game Winner */}
                                              {gameWinner && (
                                                <div className="text-center">
                                                  <div
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${gameWinner === "home"
                                                      ? "bg-orange-200 text-orange-700"
                                                      : "bg-red-200 text-red-800"
                                                      }`}
                                                  >
                                                    <FaMedal className="w-3 h-3" />
                                                    <span>Winner</span>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Game Status Indicator */}
                                              <div
                                                className={`absolute top-2 right-2 w-3 h-3 rounded-full ${gameCompleted
                                                  ? "bg-green-400"
                                                  : gameInProgress
                                                    ? "bg-yellow-400 animate-ping"
                                                    : "bg-gray-300"
                                                  }`}
                                              ></div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>

              {/* Player Order Section */}
              {!isByeMatch(currentMatchDetails) && (
                <div className="bg-gray-100 p-4 rounded-[24px] mb-6">
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">
                    Player Match Order
                  </h3>
                  <div className="space-y-3">
                    {/* Generate match order based on format */}
                    {(() => {
                      // Determine match format
                      const formatParts =
                        currentMatchDetails.format?.split(" - ") || [];
                      const type = formatParts[0]?.includes("Single")
                        ? "Single"
                        : "Double";
                      const sets = parseInt(formatParts[1]?.split(" ")[0] || "3");

                      // Define player descriptions
                      const players = {
                        teamA: {
                          player1:
                            currentMatchDetails.team1?.captain || "Player 1",
                          player2:
                            currentMatchDetails.team1?.players?.[1] || "Player 2",
                        },
                        teamB: {
                          player1:
                            currentMatchDetails.team2?.captain || "Player 1",
                          player2:
                            currentMatchDetails.team2?.players?.[1] || "Player 2",
                        },
                      };

                      // Set up match order for 2-player Singles 3 (Standard for this project now)
                      if (type === "Single" && sets === 3) {
                        return (
                          <>
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-50">
                              <p className="font-bold text-gray-800 text-xs uppercase mb-1 flex justify-between">
                                <span>Set 1: Singles A-X</span>
                                <span className="text-orange-500">First Match</span>
                              </p>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-orange-600 font-medium">
                                  {players.teamA.player1} (A)
                                </span>
                                <span className="text-gray-400 font-bold px-2">
                                  VS
                                </span>
                                <span className="text-red-700 font-medium text-right">
                                  {players.teamB.player1} (X)
                                </span>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-50">
                              <p className="font-bold text-gray-800 text-xs uppercase mb-1 flex justify-between">
                                <span>Set 2: Singles B-Y</span>
                                <span className="text-orange-500">Second Match</span>
                              </p>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-orange-600 font-medium">
                                  {players.teamA.player2} (B)
                                </span>
                                <span className="text-gray-400 font-bold px-2">
                                  VS
                                </span>
                                <span className="text-red-700 font-medium text-right">
                                  {players.teamB.player2} (Y)
                                </span>
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-50">
                              <p className="font-bold text-gray-800 text-xs uppercase mb-1 flex justify-between">
                                <span>Set 3: Singles A-Y</span>
                                <span className="text-orange-500 font-bold">Decider</span>
                              </p>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-orange-600 font-medium">
                                  {players.teamA.player1} (A)
                                </span>
                                <span className="text-gray-400 font-bold px-2">
                                  VS
                                </span>
                                <span className="text-red-700 font-medium text-right">
                                  {players.teamB.player2} (Y)
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      }

                      // For other formats, show basic info
                      return (
                        <div className="text-center py-3 text-gray-500">
                          Match order will be displayed based on tournament format
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Start Match Button - Hidden for Completed Matches */}
              {!isByeMatch(currentMatchDetails) &&
                (() => {
                  const matchStatus = getMatchStatus(currentMatchDetails);
                  return matchStatus.status !== "COMPLETED";
                })() && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => {
                        const matchStatus = getMatchStatus(currentMatchDetails);
                        const isResuming = matchStatus.status === "IN_PROGRESS";

                        navigate(
                          `/tournament-management/team-knockouts/${currentMatchDetails._id}/scoreboard`,
                          {
                            state: {
                              matchId: currentMatchDetails._id,
                              teamAName: currentMatchDetails.team1?.name,
                              teamBName: currentMatchDetails.team2?.name,
                              matchData: currentMatchDetails,
                              matchType:
                                currentMatchDetails.format?.split(" - ")[0] ||
                                "Singles",
                              setCount:
                                currentMatchDetails.format
                                  ?.split(" - ")[1]
                                  ?.split(" ")[0] || "3",
                              team1Captain: currentMatchDetails.team1?.captain,
                              team1Players: currentMatchDetails.team1?.players,
                              team2Captain: currentMatchDetails.team2?.captain,
                              team2Players: currentMatchDetails.team2?.players,
                              resuming: isResuming,
                              viewOnly: false,
                            },
                          }
                        );
                      }}
                      className={`
      py-3 px-6 rounded-lg text-white font-medium w-auto
      flex items-center gap-2 transition-colors duration-200
      ${(() => {
                          const matchStatus = getMatchStatus(currentMatchDetails);
                          return matchStatus.status === "IN_PROGRESS"
                            ? "bg-orange-600 hover:bg-orange-700"
                            : "bg-orange-500 hover:bg-orange-600";
                        })()}
    `}
                    >
                      {(() => {
                        const matchStatus = getMatchStatus(currentMatchDetails);
                        return matchStatus.status === "IN_PROGRESS" ? (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Resume Live Match</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Start Match</span>
                          </>
                        );
                      })()}
                    </button>
                  </div>
                )}

              {/* BYE Match Info */}
              {isByeMatch(currentMatchDetails) && (
                <div className="mt-4 flex justify-center">
                  <div className="bg-gray-500 text-white py-3 px-6 rounded-lg font-medium w-auto flex items-center gap-2">
                    <Pause className="w-4 h-4" />
                    <span>BYE Match - No Action Required</span>
                  </div>
                </div>
              )}

              {/* Completed Match Info */}
              {!isByeMatch(currentMatchDetails) &&
                (() => {
                  const matchStatus = getMatchStatus(currentMatchDetails);
                  return matchStatus.status === "COMPLETED";
                })() && (
                  <div className="mt-4 flex justify-center">
                    <div className="bg-green-100 text-green-700 py-3 px-6 rounded-lg font-medium w-auto flex items-center gap-2 border border-green-300">
                      <FaTrophy className="w-4 h-4" />
                      <span>Match Complete - All details shown above</span>
                    </div>
                  </div>
                )}
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">Select a match to view details</p>
          </div>
        )}
      </div>
      {/* Bulk Score Upload Modal */}
      <BulkScoreUploadModal
        isOpen={bulkScoreModal.open}
        onClose={() => setBulkScoreModal({ open: false, matches: [], title: "" })}
        onSuccess={() => {
          if (typeof window !== 'undefined') window.location.reload();
        }}
        matches={bulkScoreModal.matches}
        tournamentId={tournamentId}
        matchType="team"
        maxSets={matches[0]?.format?.includes("5") ? 5 : 3}
        setsToWin={matches[0]?.format?.includes("5") ? 3 : 2}
        getPlayerName={(match, side) => {
          if (side === 1) return getTeamName(match.team1Id);
          return getTeamName(match.team2Id);
        }}
        title={bulkScoreModal.title}
      />

      {/* Bulk Result Upload Modal (CSV/Excel) */}
      <BulkResultUploadModal
        isOpen={showCsvUpload}
        onClose={() => setShowCsvUpload(false)}
        onSuccess={() => {
          if (typeof window !== 'undefined') window.location.reload();
        }}
        tournamentId={tournamentId}
        matchType="team"
        title="Bulk Result Upload — Team Knockout (CSV/Excel)"
      />

      {/* Assign Umpire Modal */}
      <AssignUmpireModal
        isOpen={!!assignModalMatch}
        onClose={() => setAssignModalMatch(null)}
        matchId={assignModalMatch?._id}
        tournamentId={tournamentId}
        matchLabel={assignModalMatch ? `R${assignModalMatch.round} • ${getTeamName(assignModalMatch.team1Id)} vs ${getTeamName(assignModalMatch.team2Id)}` : ""}
        onAssigned={() => {
          toast.success("Umpire assigned. Awaiting their response.");
          if (typeof window !== 'undefined') window.location.reload();
        }}
      />
    </div>
  );
};

export default TeamKnockoutMatches;
