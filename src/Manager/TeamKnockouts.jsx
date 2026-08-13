//Manager/TeamKnockouts.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TabBar, Skeleton } from "../shared/ui";
import { TournamentShell, TournamentFlowHeader } from "../shared/layout";

// Keep label-keyed legacy state but expose canonical keys to the URL.
const TK_URL_TO_LABEL = {
  teams:   "Registered Teams",
  league:  "Round Robin",
  matches: "Matches",
};
const TK_LABEL_TO_URL = {
  "Registered Teams": "teams",
  "Round Robin":      "league",
  "Matches":          "matches",
};
import { FaUsers, FaCrown, FaUser, FaSyncAlt } from "react-icons/fa";
import { Star, StarIcon, Loader2, Trophy, RefreshCcw, Play, CheckCircle2, Clock } from "lucide-react";
import TeamKnockoutMatches from "./TeamKnockoutMatches";
import RapidRalliesRegisterModal from "./RapidRalliesRegisterModal";
import RapidRalliesLineupModal from "./RapidRalliesLineupModal";
import AssignUmpireModal from "./Tournament/AssignUmpireModal";
import CourtUmpireModal from "./Tournament/CourtUmpireModal";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TextField } from "@mui/material";
import dayjs from "dayjs";

import { getAuthToken } from "../shared/api/authToken";
const TeamKnockouts = () => {
  const navigate = useNavigate();
  // Declared up top: effects below (tournament-info fetch) reference it in their
  // dependency arrays, which are evaluated during render — a later `const`
  // declaration would put it in the temporal dead zone and crash the component.
  const tournamentId = new URLSearchParams(location.search).get("tournamentId");
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [hasGeneratedMatches, setHasGeneratedMatches] = useState(false);
  const [showStructureAlert, setShowStructureAlert] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [activeSection, setActiveSection] = useState("teams");
  const [tournamentType, setTournamentType] = useState("");
  const [matches, setMatches] = useState([]);
  const [setCount, setSetCount] = useState(null);
  const [roundSchedules, setRoundSchedules] = useState({
    1: {
      matchDateTime: dayjs(),
      matchInterval: "",
      courtNumber: "",
    },
  });
  const [byeTeams, setByeTeams] = useState([]);
  const [totalRounds, setTotalRounds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [currentSchedulingRound, setCurrentSchedulingRound] = useState(1);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState("Registered Teams");
  const [searchParams] = useSearchParams();
  // Minimal tournament-info fetch — only the title + sportName for the shell
  // header/breadcrumbs. Lightweight read, no business logic changes.
  const [tournamentInfo, setTournamentInfo] = useState(null);

  // URL → legacy tab state. ?tab=teams|league|matches.
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TK_URL_TO_LABEL[t]) setSelectedTab(TK_URL_TO_LABEL[t]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    axios.get(`/api/tournaments/${tournamentId}`).then((r) => {
      if (cancelled) return;
      const t = r.data?.tournament || r.data;
      if (t) {
        // Multi-sport: pick the sport-track running a Davis-Cup-style team
        // knockout, else fall back to the first track. Time/innings sports
        // (Football, Cricket) are EXCLUDED — they use the Direct engine, not
        // this sets/games/points Davis-Cup engine.
        const tracks = Array.isArray(t.sports) ? t.sports : [];
        const teamTrack = tracks.find((s) =>
          ["Davis Cup", "Teams Knockout"].includes(s?.knockoutFormat) &&
          !["time", "innings"].includes((s?.matchFormat?.scoringType || "").toLowerCase())
        ) || tracks[0] || null;
        setTournamentInfo({
          title: t.title || "Tournament",
          sportName: teamTrack?.sportName || "",
          sportId: teamTrack?.sportId || teamTrack?._id || null,
          davisCupFormatId: teamTrack?.davisCupFormatId || t.davisCupFormatId || null,
          currentStage: t.currentStage || "knockout",
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [tournamentId]);
  const [teams, setTeams] = useState([]);
  // Rapid Rallies: 5-slot team registration (self-contained, roster-based)
  const isRapidRallies = tournamentInfo?.davisCupFormatId === "rapid_rallies_s1";
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [lineupMatchId, setLineupMatchId] = useState(null);
  const [assignModalMatch, setAssignModalMatch] = useState(null);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [currentMatchForSub, setCurrentMatchForSub] = useState(null);
  // NEW: State for post-generation doubles configuration
  const [showDoublesNominationModal, setShowDoublesNominationModal] = useState(false);
  const [matchesToConfigure, setMatchesToConfigure] = useState([]);
  const [configuringIndex, setConfiguringIndex] = useState(0);
  // NEW: Knockout vs Round Robin generation choice modal
  const [showGenerationChoiceModal, setShowGenerationChoiceModal] = useState(false);

  // Round Robin state
  const [rrMatches, setRrMatches] = useState([]);
  const [rrStandings, setRrStandings] = useState([]);
  const [rrLoading, setRrLoading] = useState(false);
  const [rrGenerated, setRrGenerated] = useState(false);
  const [rrSchedule, setRrSchedule] = useState({
    matchStartTime: dayjs().format("YYYY-MM-DDTHH:mm"),
    matchInterval: "30",
    courtNumber: "1",
  });
  // Courts hosting the league — ties are distributed across these; the manager
  // can deselect courts to reserve them for the knockout.
  const [rrCourts, setRrCourts] = useState([]);
  const [rrCourtSel, setRrCourtSel] = useState([]);
  // Inline court ⇆ umpire assignment (replaces navigating to the Courts page).
  const [courtUmpireOpen, setCourtUmpireOpen] = useState(false);
  useEffect(() => {
    if (!tournamentId) return;
    axios.get(`/api/tournaments/${tournamentId}/courts`).then((r) => {
      const names = (r.data?.courts || r.data || [])
        .filter((c) => c && c.isActive !== false && c.name)
        .map((c) => c.name);
      setRrCourts(names);
      setRrCourtSel(names); // default: all courts host the league
    }).catch(() => {});
  }, [tournamentId]);

  // Re-pull courts after an inline change in the Courts & Umpires modal. Keeps
  // the league court chips in sync: preserves the current league selection,
  // drops removed courts, and auto-selects any newly-added table.
  const refreshCourts = async () => {
    if (!tournamentId) return;
    try {
      const r = await axios.get(`/api/tournaments/${tournamentId}/courts`);
      const names = (r.data?.courts || r.data || [])
        .filter((c) => c && c.isActive !== false && c.name)
        .map((c) => c.name);
      const known = new Set(rrCourts);
      const added = names.filter((n) => !known.has(n));
      setRrCourts(names);
      setRrCourtSel((sel) => [...sel.filter((n) => names.includes(n)), ...added]);
    } catch { /* non-fatal — chips just won't refresh */ }
  };

  const fetchRoundRobin = async () => {
    if (!tournamentId) return;
    try {
      // Fetch round robin matches (round = 0)
      const matchRes = await axios.get(`/api/tournaments/team-knockout/matches/${tournamentId}`);
      if (matchRes.data?.success) {
        const allMatches = matchRes.data.matches || [];
        const roundRobinMatches = allMatches.filter((m) => m.round === 0);
        setRrMatches(roundRobinMatches);
        setRrGenerated(roundRobinMatches.length > 0);
      }
      // Fetch standings
      const standingsRes = await axios.get(`/api/tournaments/team-knockout/round-robin/standings/${tournamentId}`);
      if (standingsRes.data?.success) {
        setRrStandings(standingsRes.data.data?.standings || []);
      }
    } catch (err) {
      console.error("Error fetching round robin:", err);
    }
  };

  const handleGenerateRoundRobin = async () => {
    if (!tournamentId) return;
    setRrLoading(true);
    try {
      const res = await axios.post("/api/tournaments/team-knockout/round-robin/generate", {
        tournamentId,
        sportId: tournamentInfo?.sportId || null,
        scheduleDetails: {
          matchStartTime: rrSchedule.matchStartTime,
          matchInterval: rrSchedule.matchInterval,
          courtNumber: rrSchedule.courtNumber,
          ...(rrCourtSel.length ? { courtNames: rrCourtSel } : {}),
        },
        tournamentType: tournamentType || "Singles",
        setCount: setCount || 3,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        await fetchRoundRobin();
        setSelectedTab("Round Robin");
      } else {
        toast.error(res.data?.message || "Failed to generate");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate round robin matches");
    } finally {
      setRrLoading(false);
    }
  };

  // Open the scoreboard for any team-knockout match (works for round 0 = round robin
   // and round >= 1 = knockout). Mirrors the navigation pattern used in TeamKnockoutMatches.
  const openMatchScoreboard = (match) => {
    if (!match?._id) return;
    const team1 = match.team1Id || {};
    const team2 = match.team2Id || {};
    navigate(
      `/tournament-management/team-knockouts/${match._id}/scoreboard`,
      {
        state: {
          matchId: match._id,
          teamAName: team1.teamName || team1.name || "Team 1",
          teamBName: team2.teamName || team2.name || "Team 2",
          matchData: match,
          matchType: match.format?.split(" - ")[0] || "Singles",
          setCount: match.format?.split(" - ")[1]?.split(" ")[0] || "3",
          team1Captain: team1.playerPositions?.A,
          team1Players: [team1.playerPositions?.A, team1.playerPositions?.B].filter(Boolean),
          team2Captain: team2.playerPositions?.A,
          team2Players: [team2.playerPositions?.A, team2.playerPositions?.B].filter(Boolean),
          resuming: match.status !== "PENDING" && match.status !== "SCHEDULED",
        },
      }
    );
  };

  const handleDeleteRoundRobin = async () => {
    if (!window.confirm("Are you sure? This will delete all round robin matches.")) return;
    try {
      const res = await axios.post("/api/tournaments/team-knockout/round-robin/delete", { tournamentId });
      if (res.data?.success) {
        toast.success(res.data.message);
        setRrMatches([]);
        setRrStandings([]);
        setRrGenerated(false);
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  useEffect(() => {
    if (selectedTab === "Round Robin" && tournamentId) {
      fetchRoundRobin();
    }
  }, [selectedTab, tournamentId]);

  const handleSelectFavorite = (booking) => {
    // Check if the booking is in an enabled state
    if (!booking.team) {
      return;
    }

    // Check if the booking is in the selected teams
    const isTeamSelected = selectedTeams.some(
      (selectedTeam) => selectedTeam._id === booking._id
    );
    if (!isTeamSelected) {
      return;
    }

    // Toggle bye booking with multiple selection
    setByeTeams((prevByeTeams) => {
      const isCurrentlyBye = prevByeTeams.some((b) => b._id === booking._id);


      if (isCurrentlyBye) {
        // Remove from bye teams
        const updatedByeTeams = prevByeTeams.filter(
          (b) => b._id !== booking._id
        );
        return updatedByeTeams;
      } else {
        // Add to bye teams
        const byeBooking = {
          _id: booking._id,
          name: booking.team.name,
          team: booking.team,
          createdAt: booking.createdAt,
        };
        return [...prevByeTeams, byeBooking];
      }
    });
  };

  useEffect(() => {
    if (tournamentId) {
      fetchRegisteredTeams();
      fetchTournamentDetails();
    }
  }, [tournamentId]);

  // Rapid Rallies teams live in a different collection (TeamKnockoutTeams), so
  // refetch once the format is known — tournamentInfo loads after the first fetch.
  useEffect(() => {
    if (tournamentId && tournamentInfo?.davisCupFormatId === "rapid_rallies_s1") {
      fetchRegisteredTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentInfo?.davisCupFormatId]);

  const cleanTeamData = (teams) => {
    return teams.map((team) => ({
      ...team,
      team: {
        ...team.team,
        // Clean captain name
        captain:
          typeof team.team.captain === "string"
            ? team.team.captain
            : extractPlayerName(team.team.captain),

        // Clean player names
        players:
          team.team.players?.map((player) =>
            typeof player === "string" ? player : extractPlayerName(player)
          ) || [],

        // Clean substitute names - THIS IS THE KEY FIX
        substitutes:
          team.team.substitutes?.map((substitute) =>
            typeof substitute === "string"
              ? substitute
              : extractPlayerName(substitute)
          ) || [],
      },
    }));
  };

  const fetchTournamentDetails = async () => {
    try {
      const token = getAuthToken();
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
        // Convert "Single player" to "Single" and extract number from "3 sets" to 3
        // const type = data.tournament.playerNoValue.includes("Single")
        //   ? "Single"
        //   : "Double";
        // setTournamentType(type);
        const setsNum = parseInt(data.tournament.setFormat);
        setSetCount(setsNum);
      }
    } catch (error) {
      console.error("Error fetching tournament details:", error);
    }
  };

  const handleTeamSelection = (e, team) => {
    e.stopPropagation();
    setSelectedTeams((prev) => {
      if (e.target.checked) {
        // Add team if not already in array
        return [...prev, team];
      } else {
        // Remove the unchecked team by comparing _id
        return prev.filter((t) => t._id !== team._id);
      }
    });
  };

  const fetchRegisteredTeams = async () => {
    try {
      setLoading(true);

      // Rapid Rallies teams are stored as TeamKnockoutTeams (roster P1..P5 +
      // gender), not bookings. Fetch and map them into the booking-ish shape the
      // team list renders.
      if (tournamentInfo?.davisCupFormatId === "rapid_rallies_s1") {
        const rrRes = await axios.get(`/api/tournaments/team-knockout/teams/${tournamentId}`);
        const list = rrRes.data?.teams || [];
        setTeams(
          list.map((t) => ({
            _id: t._id,
            team: {
              name: t.teamName,
              players: (t.roster || []).map((r) => r.name),
              captain: t.roster?.[0]?.name || t.teamName,
            },
            roster: t.roster || [],
            teamName: t.teamName,
            isRapidRallies: true,
          }))
        );
        return;
      }

      const url = `/api/players/bookings/tournament-teams/${tournamentId}`;

      const token = getAuthToken();
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });


      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setTeams(data.bookings);
      } else {
        console.error("API returned success: false", data.message);
        toast.error("Error", data.message || "Failed to load teams");
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      toast.error(
        "Error",
        "Failed to load teams. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const extractPlayerName = (player) => {
    // If it's already a string
    if (typeof player === "string") return player;

    // If it's an object with a name property
    if (player && player.name) return player.name;

    // If it's a character-by-character object (like in your data)
    if (typeof player === "object") {
      const chars = [];
      let i = 0;
      while (player[i] !== undefined) {
        chars.push(player[i]);
        i++;
      }
      return chars.join("");
    }

    // Fallback
    return "Unknown Player";
  };

  const calculateTotalRounds = (teamCount) => {
    return Math.ceil(Math.log2(teamCount));
  };

  const byesNeeded = selectedTeams.length > 0
    ? Math.pow(2, Math.ceil(Math.log2(selectedTeams.length))) -
    selectedTeams.length
    : 0;

  const handleGenerateButtonClick = () => {
    if (selectedTeams.length < 2) {
      toast.error("Please select at least 2 teams", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
    // Show the choice modal so the user can pick Knockout or Round Robin
    setShowGenerationChoiceModal(true);
  };

  const proceedWithKnockout = () => {
    setShowGenerationChoiceModal(false);

    // Calculate the next power of 2
    const nextPowerOf2 = Math.pow(
      2,
      Math.ceil(Math.log2(selectedTeams.length))
    );
    const byesNeeded = nextPowerOf2 - selectedTeams.length;

    if (byeTeams.length !== byesNeeded) {
      setShowStructureAlert(true); // Show modal instead of toast
      return;
    }

    const rounds = calculateTotalRounds(selectedTeams.length);
    setTotalRounds(rounds);
    setCurrentSchedulingRound(1);
    setShowSchedulingModal(true);
  };

  const proceedWithRoundRobin = () => {
    setShowGenerationChoiceModal(false);
    setSelectedTab("Round Robin");
  };

  const handleGenerateMatches = async () => {
    try {
      const currentRound = currentSchedulingRound;

      if (!roundSchedules[currentRound]?.matchDateTime) {
        toast.warning("Please set match date and time");
        return;
      }

      if (currentRound === 1) {
        // NEW: Use our simplified API for tournament creation
        const cleanedSelectedTeams = cleanTeamData(selectedTeams);
        const cleanedByeTeams = cleanTeamData(byeTeams);

        const requestBody = {
          tournamentId,
          sportId: tournamentInfo?.sportId || null, // multi-sport: this sport-track
          selectedBookingIds: cleanedSelectedTeams.map((team) => team._id),
          byeBookingIds: cleanedByeTeams.map((team) => team._id),
          // ADD CLEANED DATA TO THE REQUEST
          cleanedTeamData: cleanedSelectedTeams,
          scheduleDetails: {
            matchStartTime:
              roundSchedules[
                currentSchedulingRound
              ].matchDateTime.toISOString(),
            matchInterval:
              roundSchedules[currentSchedulingRound].matchInterval || "0",
            courtNumber:
              roundSchedules[currentSchedulingRound].courtNumber || "TBD",
          },
          tournamentType: tournamentType === "Single" ? "Singles" : "Doubles",
          setCount,
        };

        const token = getAuthToken();
        const response = await fetch(
          `/api/tournaments/team-knockout/create`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(requestBody),
          }
        );

        const data = await response.json();

        if (data.success) {
          setMatches(data.matches);
          setTotalRounds(data.totalRounds);
          setHasGeneratedMatches(true);
          setActiveSection("matches");
          setShowSchedulingModal(false);

          // NEW: Check for doubles matches to configure
          const doublesMatches = data.matches.filter(m =>
            m.status !== "BYE" &&
            m.sets &&
            m.sets.some(s => s.setNumber === 3) // Assuming set 3 is doubles
          );

          if (doublesMatches.length > 0) {
            setMatchesToConfigure(doublesMatches);
            setConfiguringIndex(0); // Start from first match
            setShowDoublesNominationModal(true);
          } else {
            toast.success("Match created successfully!");
            setSelectedTab("Matches"); // Auto-switch to matches tab
          }
        } else {
          throw new Error(data.message || "Failed to create tournament");
        }
        return;
      }

      // Handle subsequent rounds
      const token = getAuthToken();
      const previousRoundResponse = await fetch(
        `/api/tournaments/team-knockout/matches-by-round?tournamentId=${tournamentId}&round=${currentRound - 1}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!previousRoundResponse.ok) {
        throw new Error(
          `Failed to fetch previous round matches: ${previousRoundResponse.statusText}`
        );
      }

      const previousRoundData = await previousRoundResponse.json();
      const previousRoundMatches = previousRoundData.matches;

      const incompletedMatch = previousRoundMatches.find(
        (match) => match.status !== "COMPLETED" && match.status !== "BYE"
      );

      if (incompletedMatch) {
        toast.warning(
          "Previous Round Incomplete",
          "All matches from the previous round must be completed first."
        );
        return;
      }

      const winners = previousRoundMatches
        .map((match) => match.winnerId || match.winner)
        .filter((winner) => winner !== null && winner !== undefined);

      const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      const nextRoundResponse = await fetch(
        `/api/tournaments/team-knockout/next-round`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            tournamentId,
            sportId: tournamentInfo?.sportId || null,
            currentRound,
            scheduleDetails: {
              matchStartTime:
                roundSchedules[currentRound].matchDateTime.toISOString(),
              matchInterval: roundSchedules[currentRound].matchInterval || "0",
              courtNumber: roundSchedules[currentRound].courtNumber || "TBD",
            },
            tournamentType: tournamentType === "Single" ? "Singles" : "Doubles",
            setCount,
          }),
        }
      );

      const nextRoundData = await nextRoundResponse.json();

      if (nextRoundData.success) {
        setMatches((prevMatches) => {
          const filteredMatches = prevMatches.filter(
            (match) => match.round !== currentRound
          );
          return [...filteredMatches, ...nextRoundData.matches];
        });

        if (
          nextRoundData.totalRounds &&
          nextRoundData.totalRounds !== totalRounds
        ) {
          setTotalRounds(nextRoundData.totalRounds);
        }

        setHasGeneratedMatches(true);
        setActiveSection("matches");
        setShowSchedulingModal(false);

        // NEW: Check for doubles matches to configure
        const doublesMatches = nextRoundData.matches.filter(m =>
          m.status !== "BYE" &&
          m.sets &&
          m.sets.some(s => s.setNumber === 3) // Assuming set 3 is doubles
        );

        if (doublesMatches.length > 0) {
          setMatchesToConfigure(doublesMatches);
          setConfiguringIndex(0); // Start from first match
          setShowDoublesNominationModal(true);
        } else {
          toast.success("Matches generated successfully!");
          setSelectedTab("Matches"); // Auto-switch to matches tab
        }

      } else {
        throw new Error(
          nextRoundData.message || "Failed to generate next round matches"
        );
      }
    } catch (error) {
      console.error("Error generating matches:", error);
      toast.error(`Failed to generate matches: ${error.message}`);
    }
  };

  const SchedulingModal = () => {
    const handleMatchGeneration = () => {
      if (!roundSchedules[currentSchedulingRound]?.matchDateTime) {
        toast.warning("Please select a match date and time");
        return;
      }

      const matchDateTime =
        roundSchedules[currentSchedulingRound].matchDateTime;

      setRoundSchedules((prev) => ({
        ...prev,
        [currentSchedulingRound]: {
          ...prev[currentSchedulingRound],
          matchStartTime: matchDateTime.toISOString(),
        },
      }));

      // SIMPLIFIED: Always use the same function regardless of bye teams
      handleGenerateMatches();
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#181A22] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">Schedule Round {currentSchedulingRound}</h2>
              <p className="text-xs text-white/80 mt-0.5">Set the date, time and court details</p>
            </div>
            <button
              onClick={() => setShowSchedulingModal(false)}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition w-auto text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Schedule Form */}
          <div className="p-6 space-y-5">
            {/* Match Date and Time */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Match Start Date & Time
              </label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  value={
                    roundSchedules?.[currentSchedulingRound]?.matchDateTime ||
                    null
                  }
                  className="w-full bg-white/[0.03] rounded-xl"
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
                    <TextField
                      {...props}
                      fullWidth
                      className="bg-white/[0.03] rounded-xl"
                    />
                  )}
                />
              </LocalizationProvider>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Match Interval */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2" htmlFor="interval-min">
                  Interval (min)
                </label>
                <input id="interval-min"
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
                  placeholder="30"
                  className="w-full h-12 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 focus:bg-[#181A22] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                  required
                />
              </div>

              {/* Court Number */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2" htmlFor="starting-court">
                  Starting Court
                </label>
                <input id="starting-court"
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
                  placeholder="1"
                  className="w-full h-12 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 focus:bg-[#181A22] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setShowSchedulingModal(false)}
                className="px-5 py-2.5 text-gray-300 font-semibold text-sm hover:bg-white/[0.06] rounded-xl transition w-auto"
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-sm shadow-orange-200 transition active:scale-[0.98] w-auto"
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

  const SubstituteModal = () => {
    const [subData, setSubData] = useState({
      homePlayerB: "",
      awayPlayerZ: ""
    });

    useEffect(() => {
      if (currentMatchForSub) {
        // Find the doubles set (Set 3)
        const doublesSet = currentMatchForSub.sets.find(s => s.setNumber === 3);
        if (doublesSet) {
          setSubData({
            homePlayerB: doublesSet.homePlayerB || "",
            awayPlayerZ: doublesSet.awayPlayerZ || ""
          });
        }
      }
    }, [currentMatchForSub]);

    const handleSave = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(
          `/api/tournaments/team-knockout/matches/${currentMatchForSub._id}/substitute`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              setNumber: 3, // Doubles set
              homePlayerB: subData.homePlayerB,
              awayPlayerZ: subData.awayPlayerZ
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          toast.success("lineup updated successfully");
          setShowSubstituteModal(false);
          // Refresh matches
          handleGenerateMatches();
        } else {
          toast.error(data.message || "Failed to update lineup");
        }
      } catch (error) {
        toast.error("Error updating lineup");
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#181A22] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Edit Doubles Lineup</h3>
            <button
              onClick={() => setShowSubstituteModal(false)}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition w-auto text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {currentMatchForSub?.team1Id?.teamName} – Doubles Partner
              </label>
              <input
                type="text"
                value={subData.homePlayerB}
                onChange={(e) => setSubData(prev => ({ ...prev, homePlayerB: e.target.value }))}
                className="w-full h-11 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 focus:bg-[#181A22] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                placeholder="Enter player name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {currentMatchForSub?.team2Id?.teamName} – Doubles Partner
              </label>
              <input
                type="text"
                value={subData.awayPlayerZ}
                onChange={(e) => setSubData(prev => ({ ...prev, awayPlayerZ: e.target.value }))}
                className="w-full h-11 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 focus:bg-[#181A22] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                placeholder="Enter player name"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                onClick={() => setShowSubstituteModal(false)}
                className="px-5 py-2.5 text-gray-300 font-semibold text-sm hover:bg-white/[0.06] rounded-xl transition w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-sm shadow-orange-200 transition active:scale-[0.98] w-auto"
              >
                Save Lineup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Modal for configuring doubles lineup immediately after generation
  const DoublesNominationModal = () => {
    const currentMatch = matchesToConfigure[configuringIndex];
    const [nominationData, setNominationData] = useState({
      homePlayerB: "",
      awayPlayerZ: ""
    });
    const [saving, setSaving] = useState(false);

    // Get team names safely
    const team1Name = currentMatch?.team1Id?.teamName ||
      currentMatch?.team1Id?.name || "Team 1";
    const team2Name = currentMatch?.team2Id?.teamName ||
      currentMatch?.team2Id?.name || "Team 2";

    const handleNext = async () => {
      if (!nominationData.homePlayerB || !nominationData.awayPlayerZ) {
        toast.warning("Please enter names for both doubles partners");
        return;
      }

      setSaving(true);
      try {
        // Save current match doubles lineup
        const token = getAuthToken();
        const response = await fetch(
          `/api/tournaments/team-knockout/matches/${currentMatch._id}/substitute`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              setNumber: 3, // Doubles set
              homePlayerB: nominationData.homePlayerB,
              awayPlayerZ: nominationData.awayPlayerZ
            }),
          }
        );

        const data = await response.json();
        if (data.success) {
          // Move to next match or finish
          if (configuringIndex < matchesToConfigure.length - 1) {
            setConfiguringIndex(prev => prev + 1);
            setNominationData({ homePlayerB: "", awayPlayerZ: "" }); // Reset for next
          } else {
            toast.success("All lineups configured successfully!");
            setShowDoublesNominationModal(false);
            setSelectedTab("Matches");
          }
        } else {
          toast.error(data.message || "Failed to save lineup");
        }

      } catch (error) {
        toast.error("Error saving lineup");
        console.error(error);
      } finally {
        setSaving(false);
      }
    };

    const handleSkip = () => {
      if (configuringIndex < matchesToConfigure.length - 1) {
        setConfiguringIndex(prev => prev + 1);
        setNominationData({ homePlayerB: "", awayPlayerZ: "" });
      } else {
        toast.info("Configuration completed");
        setShowDoublesNominationModal(false);
        setSelectedTab("Matches");
      }
    };

    if (!currentMatch) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#181A22] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5">
            <h3 className="text-base font-bold text-white">Doubles Lineup Configuration</h3>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-white/80">Match {configuringIndex + 1} of {matchesToConfigure.length}</p>
              <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#181A22] rounded-full transition-all"
                  style={{ width: `${((configuringIndex + 1) / matchesToConfigure.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] flex items-center justify-center gap-3">
              <span className="font-bold text-gray-100 text-sm truncate">{team1Name}</span>
              <span className="text-[10px] font-bold text-gray-400 bg-[#181A22] px-2 py-1 rounded-full border border-white/[0.08]">VS</span>
              <span className="font-bold text-gray-100 text-sm truncate">{team2Name}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {team1Name} – Doubles Partner
              </label>
              <div className="relative">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={nominationData.homePlayerB}
                  onChange={(e) => setNominationData(prev => ({ ...prev, homePlayerB: e.target.value }))}
                  className="w-full h-11 pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 focus:bg-[#181A22] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                  placeholder="Enter partner name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {team2Name} – Doubles Partner
              </label>
              <div className="relative">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={nominationData.awayPlayerZ}
                  onChange={(e) => setNominationData(prev => ({ ...prev, awayPlayerZ: e.target.value }))}
                  className="w-full h-11 pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-gray-200 focus:bg-[#181A22] focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition"
                  placeholder="Enter partner name"
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-white/[0.06]">
              <button
                onClick={handleSkip}
                className="px-5 py-2.5 text-gray-500 font-semibold text-sm hover:bg-white/[0.06] rounded-xl transition w-auto"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-sm shadow-orange-200 disabled:opacity-50 transition active:scale-[0.98] flex items-center gap-2 w-auto"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {configuringIndex === matchesToConfigure.length - 1 ? 'Finish & Save' : 'Next Match'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Shell props — pipeline derived from tournament stage + team count.
  const _steps = [
    { key: "registrations", label: "Registrations", sublabel: `${teams.length} teams` },
    { key: "players",       label: "Players",       sublabel: "—" },
    { key: "groups",        label: "Round Robin",   sublabel: rrGenerated ? `${rrMatches.length} matches` : "Not generated" },
    { key: "qualifiers",    label: "Qualifiers",    sublabel: "—" },
    { key: "knockout",      label: "Knockout",      sublabel: tournamentInfo?.currentStage === "knockout" ? "Live" : "Pending" },
  ];
  const _activeStep = rrGenerated ? "groups" : "registrations";
  const _currentTabLabel = TK_LABEL_TO_URL[selectedTab] === "teams"
    ? "Teams"
    : TK_LABEL_TO_URL[selectedTab] === "league"
    ? "Round Robin"
    : "Matches";
  const _breadcrumbs = [
    { label: "Tournaments", to: "/mtournament-management" },
    { label: tournamentInfo?.title || "Team Knockout", to: `/tournament-management/team-knockouts?tournamentId=${tournamentId}` },
    { label: _currentTabLabel },
  ];
  const _tabBar = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <TabBar
        urlKey="tab"
        defaultKey="teams"
        tabs={[
          { key: "teams",   label: "Teams",   count: teams.length || undefined },
          { key: "league",  label: "League",  count: rrMatches.length || undefined },
          { key: "matches", label: "Matches" },
        ]}
      />
      <button
        onClick={() => setCourtUmpireOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-orange-400 border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 transition w-auto"
        title="Assign umpires to courts / tables"
      >
        <FaUsers className="w-3.5 h-3.5" /> Courts &amp; Umpires
      </button>
    </div>
  );

  if (loading) {
    return (
      <TournamentShell
        tournament={tournamentInfo}
        steps={_steps}
        activeStep={_activeStep}
        breadcrumbs={_breadcrumbs}
        tabBar={_tabBar}
      >
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-3 w-32 mb-5" />
        <Skeleton className="h-[420px] rounded-lg" />
      </TournamentShell>
    );
  }

  return (
    <TournamentShell
      tournament={tournamentInfo}
      steps={_steps}
      activeStep={_activeStep}
      breadcrumbs={_breadcrumbs}
      activeTabKey={selectedTab}
      tabBar={_tabBar}
      banner={
        <TournamentFlowHeader
          tournament={tournamentInfo}
          sportId={tournamentInfo?.sportId || null}
          overrideStatus={
            teams.length === 0
              ? "No teams registered yet"
              : rrGenerated
              ? `${rrMatches.length} round-robin matches`
              : `${teams.length} teams registered`
          }
          overrideNext={
            teams.length === 0
              ? "Register teams to begin"
              : rrGenerated
              ? "Score the matches to complete the league"
              : "Generate the round-robin fixtures"
          }
          primaryLabel={
            teams.length === 0
              ? "Add teams"
              : rrGenerated
              ? "View matches"
              : rrLoading
              ? "Generating…"
              : "Generate round robin"
          }
          onPrimaryAction={() => {
            if (teams.length === 0) {
              setSelectedTab("Registered Teams");
            } else if (rrGenerated) {
              setSelectedTab("Round Robin");
            } else if (!rrLoading) {
              // Drive the generate directly — round-robin fixtures need no
              // extra input (schedule defaults to now / 30-min / court 1 and
              // can be fine-tuned on the Round Robin tab afterwards).
              const ok = window.confirm(
                `Generate round-robin fixtures for all ${teams.length} teams?\n\n` +
                `Every team plays every other once (${(teams.length * (teams.length - 1)) / 2} matches), ` +
                `starting now on court 1. You can reschedule on the Round Robin tab.`
              );
              if (ok) handleGenerateRoundRobin();
            }
          }}
        />
      }
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Tab bar is rendered by TournamentShell via the `tabBar` slot. */}

        {/* Content based on selected tab */}
        {selectedTab === "Registered Teams" ? (
          // Teams View
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Section: Team List */}
            <div className="w-full lg:w-[380px] flex-shrink-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h2 className="text-base font-bold text-white">Registered Teams</h2>
                  <p className="text-xs text-gray-400">{teams?.length || 0} teams available</p>
                </div>
                <div className="flex items-center gap-2">
                  {isRapidRallies && (
                    <button
                      onClick={() => { setEditingTeam(null); setShowRegisterModal(true); }}
                      className="text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition px-3 py-1.5 rounded-lg w-auto"
                    >
                      + Register team
                    </button>
                  )}
                  {teams?.length >= 2 && (
                    <button
                      onClick={() => {
                        if (selectedTeams.length === teams.length) {
                          setSelectedTeams([]);
                        } else {
                          setSelectedTeams([...teams]);
                        }
                      }}
                      className="text-xs font-semibold text-orange-500 hover:text-orange-400 transition w-auto bg-transparent"
                    >
                      {selectedTeams.length === teams.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>
              </div>

              {/* Selection counter */}
              {selectedTeams.length > 0 && (
                <div className="mb-3 px-3 py-2 bg-orange-500/10 border border-orange-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-orange-700">
                    {selectedTeams.length} of {teams.length} selected
                  </span>
                  {byeTeams.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">
                      {byeTeams.length} BYE
                    </span>
                  )}
                </div>
              )}

              {/* Team list */}
              <div className="bg-[#181A22] rounded-2xl border border-white/[0.06] shadow-sm overflow-hidden">
                <div className="flex flex-col divide-y divide-white/[0.05] overflow-y-auto max-h-[480px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {teams?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-3">
                        <FaUsers className="w-6 h-6 text-orange-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-200">No teams yet</p>
                      <p className="text-xs text-gray-400 mt-1">Teams will appear here once registered</p>
                    </div>
                  ) : (
                    teams?.map((booking) => {
                      const isSelected = selectedTeams.some((t) => t._id === booking._id);
                      const isFocused = selectedTournament?._id === booking._id;
                      const isBye = byeTeams.some((b) => b._id === booking._id);
                      return (
                        <div
                          key={booking._id}
                          className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition
                            ${isFocused ? "bg-orange-500/10/60" : "hover:bg-white/[0.03]"}
                          `}
                          onClick={() => setSelectedTournament(booking)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
                              ${isSelected ? "bg-orange-500 text-white" : "bg-white/[0.06] text-gray-500"}`}>
                              {booking.team.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-gray-100 truncate">
                              {booking.team.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectFavorite(booking);
                              }}
                              title={isSelected ? "Mark as bye" : "Select team first"}
                              className="focus:outline-none bg-transparent hover:bg-amber-500/10 p-1.5 rounded-lg transition w-auto mt-0"
                            >
                              {isBye ? (
                                <StarIcon className="text-amber-500 w-4 h-4 fill-amber-500" />
                              ) : (
                                <Star className="text-gray-300 w-4 h-4" />
                              )}
                            </button>

                            <label className="flex items-center cursor-pointer p-1.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleTeamSelection(e, booking)}
                                className="w-4 h-4 rounded border-white/[0.12] text-orange-500 focus:ring-orange-500/20 cursor-pointer accent-orange-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedTeams.length >= 2 && (
                <button
                  onClick={handleGenerateButtonClick}
                  className="w-full mt-4 h-12 px-6 py-2 flex justify-center items-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm shadow-orange-200 transition active:scale-[0.98]"
                >
                  <Trophy className="w-4 h-4" />
                  Generate Matches
                </button>
              )}
            </div>

            {/* Team Details */}
            {selectedTournament ? (
              <div className="flex-1">
                <div className="bg-[#181A22] rounded-2xl p-6 shadow-sm border border-white/[0.06] text-black">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-lg font-bold shadow-sm shadow-orange-200">
                        {selectedTournament.team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">{selectedTournament.team.name}</h2>
                        <p className="text-xs text-gray-400">Team details</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registered</p>
                      <p className="text-xs text-gray-300 font-semibold mt-0.5">
                        {new Date(
                          selectedTournament.createdAt
                        ).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Cards Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Captain & Players */}
                    <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
                          <FaCrown className="w-3 h-3 text-orange-500" />
                        </div>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Captain</h3>
                      </div>
                      <p className="text-sm font-semibold text-gray-100 mb-4 pl-1">
                        {selectedTournament.team.captain}
                      </p>

                      <div className="flex items-center gap-2 mb-3 pt-3 border-t border-white/[0.06]">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                          <FaUser className="w-3 h-3 text-emerald-400" />
                        </div>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Players ({selectedTournament.team.players?.length || 0})
                        </h3>
                      </div>
                      <ul className="space-y-1.5">
                        {selectedTournament.team.players.map((player, index) => (
                          <li key={index} className="text-sm text-gray-200 flex items-center gap-2 pl-1">
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            {player.name}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Substitutes */}
                    <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                          <FaSyncAlt className="w-3 h-3 text-amber-600" />
                        </div>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Substitutes ({selectedTournament.team.substitutes?.length || 0})
                        </h3>
                      </div>
                      {selectedTournament.team.substitutes?.length > 0 ? (
                        <ul className="space-y-1.5">
                          {selectedTournament.team.substitutes.map((substitute, index) => (
                            <li key={index} className="text-sm text-gray-200 flex items-center gap-2 pl-1">
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              {substitute.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400 italic pl-1">No substitutes</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 hidden lg:flex items-center justify-center bg-[#181A22] rounded-2xl border border-dashed border-white/[0.08] min-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                    <FaUsers className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">Select a team</p>
                  <p className="text-xs text-gray-400 mt-1">Click on a team to see its details</p>
                </div>
              </div>
            )}
          </div>
        ) : selectedTab === "Round Robin" ? (
          // Round Robin View
          <div className="max-w-[1400px] mx-auto">
            {rrLoading && rrMatches.length === 0 ? (
              // Tab-switch skeleton — replaces the ~500ms blank flash while
              // /round-robin/list is in flight.
              <div className="space-y-4">
                <div className="bg-[#181A22] rounded-2xl border border-white/[0.06] p-5">
                  <Skeleton className="h-5 w-40 mb-3" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                  ))}
                </div>
              </div>
            ) : !rrGenerated ? (
              // Generate Round Robin Form
              <div className="bg-[#181A22] rounded-2xl p-8 shadow-sm border border-white/[0.06] max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Generate Round Robin Matches</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Every team plays every other team. Total matches: <strong>{teams.length > 0 ? (teams.length * (teams.length - 1)) / 2 : 0}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block" htmlFor="start-date-time">Start Date & Time</label>
                    <input id="start-date-time"
                      type="datetime-local"
                      value={rrSchedule.matchStartTime}
                      onChange={(e) => setRrSchedule({ ...rrSchedule, matchStartTime: e.target.value })}
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-gray-500 [color-scheme:dark] focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block" htmlFor="match-interval-min">Match Interval (min)</label>
                    <input id="match-interval-min"
                      type="number"
                      value={rrSchedule.matchInterval}
                      onChange={(e) => setRrSchedule({ ...rrSchedule, matchInterval: e.target.value })}
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-gray-500 [color-scheme:dark] focus:outline-none focus:border-orange-500"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block" htmlFor="court-number">Court Number</label>
                    <input id="court-number"
                      type="text"
                      value={rrSchedule.courtNumber}
                      onChange={(e) => setRrSchedule({ ...rrSchedule, courtNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-gray-500 [color-scheme:dark] focus:outline-none focus:border-orange-500"
                      placeholder="1"
                    />
                  </div>
                </div>

                {rrCourts.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                      Courts for the league{" "}
                      <span className="text-gray-600 normal-case font-normal">(deselect to reserve for knockout)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {rrCourts.map((name) => {
                        const on = rrCourtSel.includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setRrCourtSel((sel) => (on ? sel.filter((n) => n !== name) : [...sel, name]))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                              on
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06]"
                            }`}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                    {rrCourtSel.length === 0 && (
                      <p className="text-[11px] text-amber-400 mt-1.5">Select at least one court for the league.</p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleGenerateRoundRobin}
                  disabled={rrLoading || teams.length < 2 || (rrCourts.length > 0 && rrCourtSel.length === 0)}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-sm shadow-orange-200 transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {rrLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
                  {rrLoading ? "Generating..." : "Generate Round Robin Matches"}
                </button>

                {teams.length < 2 && (
                  <p className="text-center text-red-500 text-sm mt-3">
                    Create teams first from the "Registered Teams" tab.
                  </p>
                )}
              </div>
            ) : (
              // Round Robin Results — split into 2 columns to reduce vertical scroll
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Round Robin League</h3>
                    <p className="text-xs text-gray-500">
                      {rrMatches.length} matches • {rrMatches.filter((m) => m.status === "COMPLETED").length} completed • {rrMatches.filter((m) => m.status !== "COMPLETED").length} pending
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={fetchRoundRobin}
                      className="px-3 py-2 bg-[#181A22] hover:bg-white/[0.03] text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition w-auto border border-white/[0.08]"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                    </button>
                    <button
                      onClick={handleDeleteRoundRobin}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/15 text-red-600 rounded-xl text-xs font-semibold transition w-auto border border-red-100"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* 2-column split: Standings (left, sticky) + Matches grid (right) */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* LEFT — Points Table (sticky on desktop) */}
                  <div className="lg:col-span-2">
                    <div className="bg-[#181A22] rounded-2xl shadow-sm border border-white/[0.06] overflow-hidden lg:sticky lg:top-4">
                      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">Points Table</h4>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{rrStandings.length} teams</span>
                      </div>
                      <div className="overflow-x-auto max-h-[70vh]">
                        <table className="w-full text-xs">
                          <thead className="bg-white/[0.03] sticky top-0 z-10">
                            <tr>
                              <th className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                              <th className="text-left px-2 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Team</th>
                              <th className="text-center px-1.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider" title="Played">P</th>
                              <th className="text-center px-1.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider" title="Won">W</th>
                              <th className="text-center px-1.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider" title="Lost">L</th>
                              <th className="text-center px-1.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider" title="Sets Won">SW</th>
                              <th className="text-center px-1.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider" title="Sets Lost">SL</th>
                              <th className="text-center px-2 py-2.5 text-[10px] font-bold text-orange-500 uppercase tracking-wider">Pts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.05]">
                            {rrStandings.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-400">
                                  Standings will appear once matches are played
                                </td>
                              </tr>
                            ) : (
                              rrStandings.map((team, i) => (
                                <tr key={team.teamId} className={`hover:bg-orange-500/10/30 transition ${i < 2 ? "bg-emerald-500/10/40" : ""}`}>
                                  <td className="px-3 py-2.5">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                                      i === 0 ? "bg-amber-500/15 text-amber-300" :
                                      i === 1 ? "bg-gray-200 text-gray-200" :
                                      i === 2 ? "bg-orange-500/15 text-orange-700" :
                                      "text-gray-400"
                                    }`}>
                                      {i + 1}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2.5">
                                    <div className="font-semibold text-white text-xs truncate max-w-[120px]" title={team.teamName}>{team.teamName}</div>
                                  </td>
                                  <td className="text-center px-1.5 py-2.5 text-gray-300">{team.played}</td>
                                  <td className="text-center px-1.5 py-2.5 font-semibold text-emerald-400">{team.won}</td>
                                  <td className="text-center px-1.5 py-2.5 font-semibold text-red-400">{team.lost}</td>
                                  <td className="text-center px-1.5 py-2.5 text-gray-500">{team.setsWon}</td>
                                  <td className="text-center px-1.5 py-2.5 text-gray-500">{team.setsLost}</td>
                                  <td className="text-center px-2 py-2.5 font-black text-orange-500 text-sm">{team.points}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2 bg-white/[0.03] border-t border-white/[0.06] text-[10px] text-gray-400">
                        <span className="font-semibold">P</span> Played · <span className="font-semibold">W</span> Won · <span className="font-semibold">L</span> Lost · <span className="font-semibold">SW/SL</span> Sets · <span className="font-semibold">Pts</span> Points
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — Matches grid */}
                  <div className="lg:col-span-3 space-y-4">
                    {/* Pending matches */}
                    {rrMatches.filter((m) => m.status !== "COMPLETED").length > 0 && (
                      <div className="bg-[#181A22] rounded-2xl shadow-sm border border-white/[0.06] overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <h4 className="text-sm font-bold text-white">Pending Matches</h4>
                          </div>
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            {rrMatches.filter((m) => m.status !== "COMPLETED").length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.03] max-h-[35vh] overflow-y-auto">
                          {rrMatches.filter((m) => m.status !== "COMPLETED").map((match) => {
                            const t1 = match.team1Id?.teamName || "Team 1";
                            const t2 = match.team2Id?.teamName || "Team 2";
                            return (
                              <div key={match._id} className="bg-[#181A22] p-3 hover:bg-orange-500/[0.06] transition group">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Pending
                                  </span>
                                  {match.courtNumber && match.courtNumber !== "TBD" && (
                                    <span className="text-[10px] text-gray-400 font-medium">Court {match.courtNumber}</span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="font-semibold text-xs text-white truncate flex-1" title={t1}>{t1}</span>
                                  <span className="text-[10px] text-gray-300 font-bold">VS</span>
                                  <span className="font-semibold text-xs text-white truncate flex-1 text-right" title={t2}>{t2}</span>
                                </div>
                                {(() => {
                                  const ump = match.referee && (match.referee.name || (typeof match.referee === "string" ? "Assigned" : null));
                                  return (
                                    <button
                                      onClick={() => setAssignModalMatch(match)}
                                      className={`w-full mt-1 py-1.5 border text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition ${ump ? "bg-white/[0.03] border-white/[0.08] text-gray-300 hover:bg-white/[0.06]" : "bg-[#181A22] border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"}`}
                                    >
                                      {ump ? `Umpire: ${ump}` : "+ Assign umpire"}
                                    </button>
                                  );
                                })()}
                                {isRapidRallies && (
                                  <button
                                    onClick={() => setLineupMatchId(match._id)}
                                    className="w-full mt-1 py-1.5 bg-[#181A22] border border-orange-300 text-orange-400 hover:bg-orange-500/10 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition active:scale-[0.97]"
                                  >
                                    Set lineup
                                  </button>
                                )}
                                <button
                                  onClick={() => openMatchScoreboard(match)}
                                  className="w-full mt-1 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition active:scale-[0.97]"
                                >
                                  <Play className="w-3 h-3 fill-white" /> Play Match
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Completed matches */}
                    {rrMatches.filter((m) => m.status === "COMPLETED").length > 0 && (
                      <div className="bg-[#181A22] rounded-2xl shadow-sm border border-white/[0.06] overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-sm font-bold text-white">Completed</h4>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {rrMatches.filter((m) => m.status === "COMPLETED").length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.03] max-h-[35vh] overflow-y-auto">
                          {rrMatches.filter((m) => m.status === "COMPLETED").map((match) => {
                            const t1 = match.team1Id?.teamName || "Team 1";
                            const t2 = match.team2Id?.teamName || "Team 2";
                            const homeWon = match.matchWinner === "home";
                            const awayWon = match.matchWinner === "away";
                            return (
                              <div
                                key={match._id}
                                onClick={() => openMatchScoreboard(match)}
                                className="bg-[#181A22] p-3 hover:bg-emerald-500/10/30 transition cursor-pointer"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Completed
                                  </span>
                                  {match.courtNumber && match.courtNumber !== "TBD" && (
                                    <span className="text-[10px] text-gray-400 font-medium">Court {match.courtNumber}</span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`font-semibold text-xs truncate flex-1 ${homeWon ? "text-emerald-400" : "text-gray-200"}`} title={t1}>
                                      {t1}
                                    </span>
                                    <span className={`text-xs font-black ${homeWon ? "text-emerald-400" : "text-gray-400"}`}>
                                      {match.setsWon?.home || 0}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`font-semibold text-xs truncate flex-1 ${awayWon ? "text-emerald-400" : "text-gray-200"}`} title={t2}>
                                      {t2}
                                    </span>
                                    <span className={`text-xs font-black ${awayWon ? "text-emerald-400" : "text-gray-400"}`}>
                                      {match.setsWon?.away || 0}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {rrMatches.length === 0 && (
                      <div className="bg-[#181A22] rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                          <Trophy className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">No matches yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Matches View (Knockout)
          <TeamKnockoutMatches tournament={selectedTournament} />
        )}
      </div>
      <ToastContainer position="top-center" />

      {showSchedulingModal && (
        <SchedulingModal
          teams={selectedTeams}
          onClose={() => setShowSchedulingModal(false)}
        />
      )}

      {showDoublesNominationModal && <DoublesNominationModal />}

      {showRegisterModal && (
        <RapidRalliesRegisterModal
          open={showRegisterModal}
          onClose={() => { setShowRegisterModal(false); setEditingTeam(null); }}
          tournamentId={tournamentId}
          sportId={tournamentInfo?.sportId || null}
          editingTeam={editingTeam}
          onSaved={fetchRegisteredTeams}
        />
      )}

      {lineupMatchId && (
        <RapidRalliesLineupModal
          open={!!lineupMatchId}
          onClose={() => setLineupMatchId(null)}
          matchId={lineupMatchId}
          onSaved={fetchRoundRobin}
        />
      )}

      {assignModalMatch && (
        <AssignUmpireModal
          isOpen={!!assignModalMatch}
          onClose={() => setAssignModalMatch(null)}
          matchId={assignModalMatch._id}
          tournamentId={tournamentId}
          matchLabel={`${assignModalMatch.team1Id?.teamName || "Team 1"} vs ${assignModalMatch.team2Id?.teamName || "Team 2"}`}
          onAssigned={() => { setAssignModalMatch(null); fetchRoundRobin(); }}
        />
      )}

      {courtUmpireOpen && (
        <CourtUmpireModal
          isOpen={courtUmpireOpen}
          onClose={() => setCourtUmpireOpen(false)}
          tournamentId={tournamentId}
          onChanged={refreshCourts}
        />
      )}

      {showGenerationChoiceModal && (() => {
        const allSelected = teams.length > 0 && selectedTeams.length === teams.length;
        const totalRR = (selectedTeams.length * (selectedTeams.length - 1)) / 2;
        const isPowerOf2 = selectedTeams.length >= 2 &&
          Math.log2(selectedTeams.length) === Math.floor(Math.log2(selectedTeams.length));
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#181A22] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">Choose Match Format</h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    {selectedTeams.length} teams selected
                    {allSelected && " (all teams)"}
                  </p>
                </div>
                <button
                  onClick={() => setShowGenerationChoiceModal(false)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition w-auto text-white text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Knockout Card */}
                <button
                  onClick={proceedWithKnockout}
                  className="text-left bg-[#181A22] border-2 border-white/[0.06] hover:border-orange-500 hover:shadow-lg rounded-2xl p-5 transition-all group w-auto"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 group-hover:bg-orange-500/15 flex items-center justify-center mb-3 transition">
                    <Trophy className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Knockout Tournament</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    Single elimination bracket. Loser is out, winner advances to next round.
                  </p>
                  <div className="space-y-1 pt-3 border-t border-white/[0.06]">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400">Rounds</span>
                      <span className="font-semibold text-gray-200">{calculateTotalRounds(selectedTeams.length)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400">Byes needed</span>
                      <span className="font-semibold text-gray-200">{byesNeeded}</span>
                    </div>
                    {!isPowerOf2 && (
                      <p className="text-[10px] text-amber-600 mt-2 font-medium">
                        ⚠ Assign {byesNeeded} bye{byesNeeded > 1 ? "s" : ""} first
                      </p>
                    )}
                  </div>
                </button>

                {/* Round Robin Card */}
                <button
                  onClick={proceedWithRoundRobin}
                  className={`text-left bg-[#181A22] border-2 rounded-2xl p-5 transition-all group w-auto ${
                    allSelected
                      ? "border-emerald-500 shadow-md hover:shadow-lg ring-2 ring-emerald-100"
                      : "border-white/[0.06] hover:border-emerald-500 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 group-hover:bg-emerald-500/15 flex items-center justify-center transition">
                      <FaUsers className="w-5 h-5 text-emerald-400" />
                    </div>
                    {allSelected && (
                      <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-1 rounded-full uppercase tracking-wider">
                        Recommended
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Round Robin League</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    Every team plays every other team. Points table decides the winner.
                  </p>
                  <div className="space-y-1 pt-3 border-t border-white/[0.06]">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400">Total matches</span>
                      <span className="font-semibold text-gray-200">{totalRR}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400">No byes needed</span>
                      <span className="font-semibold text-emerald-400">✓</span>
                    </div>
                    {!allSelected && (
                      <p className="text-[10px] text-amber-600 mt-2 font-medium">
                        ⚠ Works best with all teams selected
                      </p>
                    )}
                  </div>
                </button>
              </div>

              <div className="px-6 pb-5">
                <button
                  onClick={() => setShowGenerationChoiceModal(false)}
                  className="w-full py-2.5 text-gray-500 hover:text-gray-200 text-sm font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showSubstituteModal && <SubstituteModal />}
      {showStructureAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181A22] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5">
              <h2 className="text-base font-bold text-white">Bye Assignment Required</h2>
              <p className="text-xs text-white/80 mt-0.5">Balance the bracket before generating</p>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-300 text-center mb-5">
                You have selected <strong className="text-white">{selectedTeams.length}</strong> teams.
                A knockout bracket needs exactly{" "}
                <strong className="text-orange-400">
                  {byesNeeded} bye{byesNeeded > 1 ? "s" : ""}
                </strong>{" "}
                to be balanced.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white/[0.03] rounded-2xl p-4 text-center border border-white/[0.06]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Required</p>
                  <p className="text-2xl font-black text-orange-500 mt-1">{byesNeeded}</p>
                </div>
                <div className="bg-white/[0.03] rounded-2xl p-4 text-center border border-white/[0.06]">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned</p>
                  <p className={`text-2xl font-black mt-1 ${byeTeams.length === byesNeeded ? "text-emerald-500" : "text-gray-200"}`}>
                    {String(byeTeams.length).padStart(2, "0")}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 text-center mb-5">
                Tap the <Star className="w-3 h-3 inline -mt-0.5 text-amber-500" /> star next to a selected team to mark it as a bye.
              </p>

              <button
                onClick={() => setShowStructureAlert(false)}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-sm shadow-orange-200 transition active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </TournamentShell>
  );
};

export default TeamKnockouts;
