import { toast } from "react-toastify";
import { useState, useEffect, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TabBar, Skeleton } from "../shared/ui";
import { TournamentShell } from "../shared/layout";
import {
  Trophy, Users, Swords, Clock, ChevronRight, Plus, X, Search,
  RotateCcw, Upload, Check, AlertCircle, Zap, Target, Crown, Trash2,
  UserPlus, Shield,
} from "lucide-react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import BulkScoreUploadModal from "./BulkScoreUploadModal";
import AssignUmpireModal from "./Tournament/AssignUmpireModal";
import { getSeedOrder } from "../utils/seedingUtils";
import SeedPositionsPreview from "./components/SeedPositionsPreview";
import CourtPoolPreview from "./components/CourtPoolPreview";
import CourtPicker from "./components/CourtPicker";
import { getMatchFormat as getMatchFormatHelper } from "../utils/sportTrack";

const DRAW_SIZES = [4, 8, 16, 32, 64, 128];

// Shared helper: resolves an umpire's display name from match.referee.
// Handles nested object (group-style) and bare ObjectId (direct-knockout) shapes.
const getUmpireName = (referee) => {
  if (!referee) return null;
  if (typeof referee === "string") return "Assigned";
  return referee.name || referee.userName || "Assigned";
};

// getSeedOrder imported from ../utils/seedingUtils (Mirror & Flip).
// Preview UI lives in ./components/SeedPositionsPreview.jsx.

export default function MDirectKnockout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const tournamentId = searchParams.get("tournamentId");

  // State
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchesByRound, setMatchesByRound] = useState({});
  const [assignModalMatch, setAssignModalMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("setup"); // bracket | setup | scoring

  // URL → tab state (?tab=setup|bracket|scoring). Keeps refresh + deep-links honest.
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "setup" || t === "bracket" || t === "scoring") setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Setup state
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [drawSize, setDrawSize] = useState(16);
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [drawMethod, setDrawMethod] = useState("standard"); // standard | random | hybrid | custom
  const [numberOfSeeds, setNumberOfSeeds] = useState(16); // how many top players get fixed seeding positions (defaults to drawSize for standard)
  const [customSlots, setCustomSlots] = useState([]); // array of drawSize, each slot = player object or null
  const [activeSlot, setActiveSlot] = useState(null); // which slot index is selected for placement

  // Scoring state
  const [activeMatch, setActiveMatch] = useState(null);
  const [p1Score, setP1Score] = useState("");
  const [p2Score, setP2Score] = useState("");
  const [scoringLoading, setScoringLoading] = useState(false);

  // Bulk upload
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Match Detail Modal
  const [detailMatch, setDetailMatch] = useState(null);

  // Court catalog (Sub-step 4) — drives the optional CourtPoolPreview shown
  // before bracket creation. Standalone direct-knockout is single-sport per
  // tournament, so we use sports[0].sportId once the tournament loads.
  const [tournamentCourts, setTournamentCourts] = useState([]);

  // Fetch data
  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
      fetchMatches();
      fetchRegisteredPlayers();
    }
  }, [tournamentId]);

  // Refresh court pool whenever the tournament loads (we need its sportId).
  useEffect(() => {
    const sid = tournament?.sports?.[0]?.sportId;
    if (!tournamentId || !sid) return;
    (async () => {
      try {
        const res = await axios.get(`/api/tournaments/${tournamentId}/courts?sportId=${sid}`);
        setTournamentCourts(res.data?.courts || []);
      } catch {
        setTournamentCourts([]);
      }
    })();
  }, [tournamentId, tournament?.sports?.[0]?.sportId]);

  const fetchTournament = async () => {
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}`);
      if (res.data) setTournament(res.data.tournament || res.data);
    } catch { }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/tournaments/direct-knockout/${tournamentId}/matches`);
      if (res.data.success) {
        setMatches(res.data.matches || []);
        setMatchesByRound(res.data.matchesByRound || {});
      }
    } catch { } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredPlayers = async () => {
    try {
      const res = await axios.get(`/api/tournaments/bookings/tournament/${tournamentId}`);
      if (res.data?.success || res.data?.bookings) {
        const bookings = res.data.bookings || res.data.data || [];
        // Extract player info from confirmed bookings
        const players = bookings
          .filter((b) => b.status === "confirmed")
          .map((b) => ({
            playerId: b.userId?._id || b.userId,
            userName: b.userName || b.userId?.name || "Unknown",
            _id: b.userId?._id || b.userId,
            category: b.category,
          }));
        setRegisteredPlayers(players);
      }
    } catch { }
  };

  // Player selection
  const togglePlayer = (player) => {
    const id = player.playerId || player._id;
    if (selectedPlayers.find((p) => (p.playerId || p._id) === id)) {
      setSelectedPlayers((prev) => prev.filter((p) => (p.playerId || p._id) !== id));
    } else {
      if (selectedPlayers.length >= drawSize) {
        toast.info(`Maximum ${drawSize} players for a ${drawSize}-draw. Remove a player first or change draw size.`);
        return;
      }
      setSelectedPlayers((prev) => [...prev, player]);
    }
  };

  const selectAll = () => {
    const filtered = getFilteredPlayers();
    if (selectedPlayers.length === filtered.length) {
      setSelectedPlayers([]);
    } else {
      const toSelect = filtered.slice(0, drawSize);
      setSelectedPlayers(toSelect);
    }
  };

  const movePlayer = (fromIndex, toIndex) => {
    setSelectedPlayers((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  // Custom placement helpers
  const initCustomSlots = (size) => {
    setCustomSlots(Array.from({ length: size }, () => null));
    setActiveSlot(null);
  };

  const placePlayerInSlot = (player) => {
    if (activeSlot === null) {
      // Auto-fill by SEED number (S1, S2, S3, ...) — not by array index.
      // The array is laid out in bracket order [S1, S16, S8, S9, ...],
      // so findIndex(null) would place the 2nd player at Seed 16.
      const size = customSlots.length;
      const seedOrder = getSeedOrder(size);
      let target = -1;
      for (let seed = 1; seed <= size; seed++) {
        const arrIdx = seedOrder.indexOf(seed);
        if (arrIdx >= 0 && customSlots[arrIdx] == null) {
          target = arrIdx;
          break;
        }
      }
      if (target === -1) { toast.info("All slots are filled"); return; }
      setCustomSlots((prev) => { const u = [...prev]; u[target] = player; return u; });
    } else {
      setCustomSlots((prev) => { const u = [...prev]; u[activeSlot] = player; return u; });
      setActiveSlot(null);
    }
  };

  const removeFromSlot = (slotIndex) => {
    setCustomSlots((prev) => { const u = [...prev]; u[slotIndex] = null; return u; });
  };

  // Robust player-key helper: some entries have playerId as string, others as
  // a populated `{ _id, name, ... }` object, others only have `_id`. Falls back
  // to userName so distinct users never collapse to the same key.
  const keyOfPlayer = (p) => {
    if (!p) return "";
    const raw = p.playerId ?? p._id;
    if (raw && typeof raw === "object") return String(raw._id || raw.$oid || raw.toString?.() || "");
    if (raw) return String(raw);
    return p.userName || p.playerName || p.name || "";
  };

  const getCustomPlayerIds = () => {
    return new Set(customSlots.filter(Boolean).map(keyOfPlayer));
  };

  // Get IDs of players already in the bracket
  const getPlayersInBracket = () => {
    if (matches.length === 0) return new Set();
    const ids = new Set();
    matches.forEach((m) => {
      const p1Id = m.player1?.playerId?._id || m.player1?.playerId;
      const p2Id = m.player2?.playerId?._id || m.player2?.playerId;
      if (p1Id) ids.add(p1Id.toString());
      if (p2Id) ids.add(p2Id.toString());
    });
    return ids;
  };

  const getFilteredPlayers = () => {
    const inBracket = getPlayersInBracket();
    let available = registeredPlayers;

    // Exclude players already in the bracket
    if (inBracket.size > 0) {
      available = available.filter((p) => {
        const id = (p.playerId || p._id || "").toString();
        return !inBracket.has(id);
      });
    }

    if (!searchQuery.trim()) return available;
    const q = searchQuery.toLowerCase();
    return available.filter(
      (p) =>
        (p.userName || p.playerName || p.name || "").toLowerCase().includes(q)
    );
  };

  // Generate bracket
  const handleGenerate = async () => {
    let players;

    if (drawMethod === "custom") {
      const placed = customSlots.filter(Boolean);
      if (placed.length < 2) { toast.warn("Place at least 2 players"); return; }
      const minNeeded = Math.ceil(drawSize / 2) + 1;
      if (placed.length < minNeeded) { toast.info(`Need at least ${minNeeded} players for a ${drawSize}-draw`); return; }

      // Convert from bracket-line order to seed-rank order
      // customSlots[i] is at bracket line i, which has seed number seedOrder[i]
      // Backend expects: index 0 = Seed 1 (rank 1), index 1 = Seed 2 (rank 2), etc.
      const seedOrder = getSeedOrder(drawSize);
      const bySeedRank = new Array(drawSize).fill(null);
      for (let i = 0; i < drawSize; i++) {
        if (customSlots[i]) {
          bySeedRank[seedOrder[i] - 1] = customSlots[i]; // seedOrder[i] is 1-based
        }
      }
      players = bySeedRank.filter(Boolean).map((p) => ({
        playerId: p.playerId || p._id,
        userName: p.userName || p.playerName || p.name,
      }));
    } else {
      if (selectedPlayers.length < 2) { toast.warn("Select at least 2 players"); return; }
      if (selectedPlayers.length > drawSize) { toast.info(`Too many players for a ${drawSize}-draw`); return; }
      const minNeeded = Math.ceil(drawSize / 2) + 1;
      if (selectedPlayers.length < minNeeded) { toast.info(`Need at least ${minNeeded} players for a ${drawSize}-draw`); return; }

      players = selectedPlayers.map((p) => ({
        playerId: p.playerId || p._id,
        userName: p.userName || p.playerName || p.name,
      }));
    }

    setGenerating(true);
    try {
      // STEP 16d — backend now requires sportId. This screen is a
      // tournament-level standalone view with no sport-switcher UI, so
      // we send sports[0].sportId. Multi-sport standalone is a
      // separate feature (a sport tab strip on this screen).
      const _firstSportId = tournament?.sports?.[0]?.sportId || null;

      // For custom mode: send players in seed-slot order, backend treats as standard (input order = seed order)
      const res = await axios.post("/api/tournaments/direct-knockout/standalone/create", {
        tournamentId,
        sportId: _firstSportId,
        players,
        drawSize,
        drawMethod: drawMethod === "custom" ? "standard" : drawMethod,
        numberOfSeeds: drawMethod === "random" ? 0 : drawMethod === "standard" || drawMethod === "custom" ? players.length : numberOfSeeds,
        schedule: (() => {
          // Build per-round payload with cascading defaults (Bo3 30/20 early,
          // Bo5 50/40 SF, Bo7 80/60 Final). Keeps standalone bracket scheduling
          // sensible across rounds without requiring a per-round UI on this page.
          const { buildRequestRounds, buildDefaultRoundsArray } = require("./utils/knockoutDefaults");
          const totalRounds = Math.ceil(Math.log2(drawSize || 2));
          const rounds = buildRequestRounds({
            customizeRounds: true,
            totalRounds,
            roundOverrides: buildDefaultRoundsArray(totalRounds),
          });
          return {
            startDate: new Date().toISOString().split("T")[0],
            startTime: "10:00",
            rounds,
            breakBetweenRoundsMinutes: 15,
            courtNumber: "1",
          };
        })(),
      });

      if (res.data.success) {
        const byeCount = res.data.bracket?.byeCount || 0;
        const byeMsg = byeCount > 0 ? ` (${byeCount} auto-BYEs given)` : "";
        toast.info(`Bracket created! ${res.data.bracket.totalMatches} matches across ${res.data.bracket.totalRounds} rounds${byeMsg}`);
        setSelectedPlayers([]);
        setCustomSlots([]);
        setActiveTab("bracket");
        fetchMatches();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Reset bracket
  const handleReset = async () => {
    if (!confirm("Reset entire bracket? All match data will be lost.")) return;
    try {
      await axios.delete(`/api/tournaments/direct-knockout/${tournamentId}/reset`);
      setMatches([]);
      setMatchesByRound({});
      toast.success("Bracket reset");
    } catch (err) {
      toast.error("Failed to reset");
    }
  };

  // Score a game
  const handleCompleteGame = async () => {
    if (!activeMatch || !p1Score || !p2Score) return;
    if (Number(p1Score) === Number(p2Score)) {
      toast.warn("Scores cannot be tied");
      return;
    }

    setScoringLoading(true);
    try {
      const res = await axios.post(
        `/api/tournaments/direct-knockout/matches/${activeMatch.matchId}/complete-game`,
        { player1Score: Number(p1Score), player2Score: Number(p2Score) }
      );

      if (res.data.success) {
        setP1Score("");
        setP2Score("");

        // Update activeMatch with fresh data from response
        const updatedMatch = res.data.match;
        setActiveMatch((prev) => ({
          ...prev,
          currentSet: updatedMatch.currentSet,
          currentGame: updatedMatch.currentGame,
          sets: updatedMatch.sets,
          status: updatedMatch.status,
          result: updatedMatch.result,
        }));

        if (updatedMatch.status === "COMPLETED") {
          toast.info(`Match complete! Winner: ${updatedMatch.result?.winner?.playerName}`);
        }
        fetchMatches();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setScoringLoading(false);
    }
  };

  // Round display helpers
  const getRoundDisplayName = (roundName) => {
    const names = {
      "round-of-128": "Round of 128",
      "round-of-64": "Round of 64",
      "round-of-32": "Round of 32",
      "round-of-16": "Round of 16",
      "round-of-8": "Round of 8",
      "round-of-4": "Round of 4",
      "quarter-final": "Quarter-Finals",
      "semi-final": "Semi-Finals",
      final: "Final",
    };
    return names[roundName] || roundName;
  };

  const getStatusBadge = (status) => {
    const styles = {
      SCHEDULED: "bg-orange-100 text-orange-600",
      IN_PROGRESS: "bg-yellow-100 text-yellow-700",
      COMPLETED: "bg-green-100 text-green-700",
      CANCELLED: "bg-gray-100 text-gray-500",
    };
    return styles[status] || "bg-gray-100 text-gray-500";
  };

  // BYE handler
  const [byeLoading, setByeLoading] = useState(null);

  const handleGiveBye = async (match, byePlayerId, byePlayerName, winnerName) => {
    if (!confirm(`Give BYE to "${byePlayerName}"?\n\n"${winnerName}" will advance automatically.`)) return;

    setByeLoading(match.matchId);
    try {
      const res = await axios.post(
        `/api/tournaments/direct-knockout/matches/${match.matchId}/bye`,
        { byePlayerId }
      );
      if (res.data.success) {
        toast.info(res.data.message);
        fetchMatches();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setByeLoading(null);
    }
  };

  const hasBracket = matches.length > 0;
  const pendingMatches = matches.filter((m) => m.status !== "COMPLETED" && m.player1?.playerName && m.player1.playerName !== "TBD" && m.player2?.playerName && m.player2.playerName !== "TBD");
  const completedCount = matches.filter((m) => m.status === "COMPLETED").length;
  const champion = matches.find((m) => m.round === "final" && m.status === "COMPLETED")?.result?.winner;

  // Shell props — pipeline derived from bracket presence + completion.
  const _shellTournament = tournament ? {
    title: tournament.title || "Singles Knockout",
    sportName: Array.isArray(tournament.sports) ? (tournament.sports[0]?.sportName || "") : "",
    currentStage: tournament.currentStage || "knockout",
  } : null;
  const _steps = [
    { key: "registrations", label: "Registrations", sublabel: "—" },
    { key: "players",       label: "Players",       sublabel: "—" },
    { key: "groups",        label: "Groups",        sublabel: "Skipped" },
    { key: "qualifiers",    label: "Qualifiers",    sublabel: "Skipped" },
    { key: "knockout",      label: "Knockout",      sublabel: champion ? "Complete" : hasBracket ? `${completedCount}/${matches.length}` : "Setup" },
  ];
  const _activeStep = "knockout";
  const _tabLabel = activeTab === "setup" ? "Setup" : activeTab === "bracket" ? "Bracket" : "Live scoring";
  const _breadcrumbs = [
    { label: "Tournaments", to: "/mtournament-management" },
    { label: tournament?.title || "Singles Knockout", to: `/tournament-management/direct-knockout?tournamentId=${tournamentId}` },
    { label: _tabLabel },
  ];
  const _tabBar = (
    <TabBar
      urlKey="tab"
      defaultKey="setup"
      tabs={[
        { key: "setup",   label: "Setup" },
        { key: "bracket", label: "Bracket", count: matches.length || undefined },
        { key: "scoring", label: "Live scoring" },
      ]}
    />
  );

  return (
    <TournamentShell
      tournament={_shellTournament}
      steps={_steps}
      activeStep={_activeStep}
      breadcrumbs={_breadcrumbs}
      activeTabKey={activeTab}
      tabBar={_tabBar}
    >
      {/* Page header actions (Bulk Score / Reset) — kept inline since they're
          specific to the bracket state, not tournament chrome. */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {hasBracket && (
          <>
            <button
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 w-auto"
            >
              <Upload size={16} />
              Bulk Score
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 w-auto"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </>
        )}
      </div>

      {/* Champion Banner */}
      {champion && (
        <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl p-6 mb-6 text-white flex items-center gap-4">
          <Crown size={40} />
          <div>
            <p className="text-sm font-medium opacity-80">Tournament Champion</p>
            <h2 className="text-2xl font-bold">{champion.playerName}</h2>
          </div>
        </div>
      )}

      {/* Stats Row */}
      {hasBracket && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Total Matches</p>
            <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-orange-500">{matches.length - completedCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">Rounds</p>
            <p className="text-2xl font-bold text-emerald-600">{Object.keys(matchesByRound).length}</p>
          </div>
        </div>
      )}

      {/* Tab bar is rendered by TournamentShell via the `tabBar` slot. */}

      {/* TAB: Bracket View */}
      {activeTab === "bracket" && (
        <div>
          {!hasBracket ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
              <Swords size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Bracket Generated</h3>
              <p className="text-gray-400 mb-4">Go to "Setup Draw" to create the knockout bracket</p>
              <button
                onClick={() => setActiveTab("setup")}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-[#003d75] w-auto"
              >
                Setup Draw
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(matchesByRound).map(([roundName, roundMatches]) => (
                <div key={roundName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Round Header */}
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">{getRoundDisplayName(roundName)}</h3>
                    <span className="text-xs text-gray-500">
                      {roundMatches.filter((m) => m.status === "COMPLETED").length}/{roundMatches.length} completed
                    </span>
                  </div>

                  {/* Matches Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
                    {roundMatches.map((match) => (
                      <div
                        key={match._id}
                        className={`rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${match.status === "COMPLETED"
                            ? "border-green-200 bg-green-50/30"
                            : match.player1?.playerName && match.player1.playerName !== "TBD" && match.player2?.playerName && match.player2.playerName !== "TBD"
                              ? "border-orange-200 bg-orange-50/30"
                              : "border-gray-200 bg-gray-50/30 opacity-60"
                          }`}
                        onClick={() => setDetailMatch(match)}
                      >
                        {/* Match Number + Status */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            M{match.matchNumber}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(match.status)}`}>
                            {match.status}
                          </span>
                        </div>

                        {/* Player 1 */}
                        <div className={`flex justify-between items-center py-1.5 ${match.result?.winner?.playerName === match.player1?.playerName ? "font-bold" : ""
                          }`}>
                          <span className="text-sm text-gray-800 truncate flex-1">
                            {match.result?.winner?.playerName === match.player1?.playerName && "🏆 "}
                            {match.player1?.playerName || "TBD"}
                          </span>
                          <div className="flex items-center gap-1 ml-1">
                            {match.status === "COMPLETED" && (
                              <span className="text-sm font-bold text-gray-600">
                                {match.result?.finalScore?.player1Sets || 0}
                              </span>
                            )}
                            {match.status !== "COMPLETED" && match.player1?.playerName && match.player1.playerName !== "TBD" && match.player2?.playerName && match.player2.playerName !== "TBD" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGiveBye(match, match.player1.playerId?._id || match.player1.playerId, match.player1.playerName, match.player2.playerName);
                                }}
                                disabled={byeLoading === match.matchId}
                                className="text-[9px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded border border-red-200 w-auto"
                                title={`Give BYE to ${match.player1?.playerName}`}
                              >
                                {byeLoading === match.matchId ? "..." : "BYE"}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="h-px bg-gray-200 my-1" />

                        {/* Player 2 */}
                        <div className={`flex justify-between items-center py-1.5 ${match.result?.winner?.playerName === match.player2?.playerName ? "font-bold" : ""
                          }`}>
                          <span className="text-sm text-gray-800 truncate flex-1">
                            {match.result?.winner?.playerName === match.player2?.playerName && "🏆 "}
                            {match.player2?.playerName || "TBD"}
                          </span>
                          <div className="flex items-center gap-1 ml-1">
                            {match.status === "COMPLETED" && (
                              <span className="text-sm font-bold text-gray-600">
                                {match.result?.finalScore?.player2Sets || 0}
                              </span>
                            )}
                            {match.status !== "COMPLETED" && match.player1?.playerName && match.player1.playerName !== "TBD" && match.player2?.playerName && match.player2.playerName !== "TBD" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGiveBye(match, match.player2.playerId?._id || match.player2.playerId, match.player2.playerName, match.player1.playerName);
                                }}
                                disabled={byeLoading === match.matchId}
                                className="text-[9px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded border border-red-200 w-auto"
                                title={`Give BYE to ${match.player2?.playerName}`}
                              >
                                {byeLoading === match.matchId ? "..." : "BYE"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* BYE Note */}
                        {match.notes?.includes("BYE") && (
                          <div className="mt-1 text-[9px] text-orange-600 bg-orange-50 rounded px-2 py-0.5 text-center font-medium">
                            {match.notes}
                          </div>
                        )}

                        {/* Court + Time. Sub-step 5 — court is reassignable
                            via CourtPicker when catalog has courts. Locked
                            once match is COMPLETED. */}
                        <div className="flex gap-2 mt-2 text-[10px] text-gray-400 items-center">
                          <CourtPicker
                            matchId={match._id}
                            current={match.courtNumber}
                            courts={tournamentCourts}
                            disabled={match.status === "COMPLETED" || match.status === "completed"}
                            onChange={(newName) => {
                              setMatches((prev) => prev.map((m) =>
                                m._id === match._id ? { ...m, courtNumber: newName } : m
                              ));
                            }}
                          />
                          <span>•</span>
                          <span>
                            {match.matchStartTime ? new Date(match.matchStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBD"}
                            {match.matchEndTime && ` → ${new Date(match.matchEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                          {[3, 5, 7].includes(match.matchFormat?.totalSets) && (
                            <span className="ml-auto text-[9px] font-bold text-[#5E6AD2] bg-[#5E6AD2]/10 px-1.5 py-0.5 rounded">
                              Bo{match.matchFormat.totalSets}
                            </span>
                          )}
                        </div>

                        {/* Umpire status */}
                        {(() => {
                          const umpireName = getUmpireName(match.referee);
                          const isComp = match.status === "COMPLETED";
                          const playersReady = match.player1?.playerName && match.player1.playerName !== "TBD" && match.player2?.playerName && match.player2.playerName !== "TBD";
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
                              {!umpireName && !isComp && playersReady && (
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Setup Draw */}
      {activeTab === "setup" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={20} /> Setup Knockout Draw
          </h3>

          {/* Draw Size Selector */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-600 mb-2 block">Draw Size</label>
            <div className="flex gap-2 flex-wrap">
              {DRAW_SIZES.map((size) => {
                const tooSmall = selectedPlayers.length > size;
                return (
                  <button
                    key={size}
                    onClick={() => { if (!tooSmall) { setDrawSize(size); if (drawMethod === "custom") initCustomSlots(size); } }}
                    disabled={tooSmall}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all w-auto ${tooSmall
                        ? "bg-red-50 text-red-300 border-2 border-red-200 cursor-not-allowed"
                        : drawSize === size
                          ? "bg-orange-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {size} Draw
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-1">
              {(() => {
                const count = drawMethod === "custom" ? customSlots.filter(Boolean).length : selectedPlayers.length;
                const minNeeded = Math.ceil(drawSize / 2) + 1;
                const byes = drawSize - count;
                if (count > drawSize) {
                  return <span className="text-red-500 font-semibold">{count}/{drawSize} players — too many, remove {count - drawSize}</span>;
                }
                if (count < minNeeded) {
                  return <span className="text-orange-500 font-semibold">{count}/{drawSize} players — need at least {minNeeded} (missing {minNeeded - count})</span>;
                }
                if (count === drawSize) {
                  return <span className="text-green-600 font-semibold">{count}/{drawSize} players placed ✓ Ready to generate</span>;
                }
                return <span className="text-green-600 font-semibold">{count}/{drawSize} players placed ✓ Ready ({byes} BYEs will be given automatically)</span>;
              })()}
            </p>
          </div>

          {/* Draw Method Selector */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-600 mb-2 block">Draw Method</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: "standard", label: "Standard Seeding", desc: "All players placed by seed rank. Top seeds separated.", icon: "🏆" },
                { value: "random", label: "Random Draw", desc: "All players placed randomly. No seeding advantage.", icon: "🎲" },
                { value: "hybrid", label: "Seeded + Random", desc: "Top N seeded, rest random.", icon: "⚡" },
                { value: "custom", label: "Custom Placement", desc: "Manually place each player into bracket positions.", icon: "🎯" },
              ].map((method) => (
                <button
                  key={method.value}
                  onClick={() => {
                    setDrawMethod(method.value);
                    if (method.value === "standard") setNumberOfSeeds(selectedPlayers.length || drawSize);
                    else if (method.value === "random") setNumberOfSeeds(0);
                    else if (method.value === "hybrid") setNumberOfSeeds(Math.min(Math.floor(drawSize / 2), selectedPlayers.length));
                    else if (method.value === "custom") { initCustomSlots(drawSize); setNumberOfSeeds(Math.floor(drawSize / 4)); }
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all w-auto ${drawMethod === method.value
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{method.icon}</span>
                    <span className={`text-sm font-bold ${drawMethod === method.value ? "text-orange-700" : "text-gray-800"}`}>{method.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">{method.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Number of Seeded Players — for Hybrid and Custom modes */}
          {(drawMethod === "hybrid" || drawMethod === "custom") && (
            <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Number of Seeded Players</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={drawMethod === "custom" ? drawSize : Math.min(selectedPlayers.length, drawSize)}
                    value={numberOfSeeds}
                    onChange={(e) => {
                      const maxVal = drawMethod === "custom" ? drawSize : Math.min(selectedPlayers.length, drawSize);
                      const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, maxVal));
                      setNumberOfSeeds(val);
                    }}
                    className="w-20 text-center text-lg font-bold border-2 border-orange-300 rounded-lg py-1.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                  <span className="text-sm text-gray-500">/ {drawMethod === "custom" ? drawSize : Math.min(selectedPlayers.length, drawSize)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[0, 2, 4, 8, 16, 32].filter(n => n <= (drawMethod === "custom" ? drawSize : Math.min(selectedPlayers.length, drawSize))).map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumberOfSeeds(n)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all w-auto ${numberOfSeeds === n
                        ? "bg-orange-500 text-white"
                        : "bg-white text-gray-600 border border-gray-300 hover:border-orange-300"
                      }`}
                  >
                    {n === 0 ? "None" : n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                {numberOfSeeds === 0
                  ? "No seeding — all players placed randomly."
                  : `Top ${numberOfSeeds} players (by order in list) get fixed bracket positions. ${selectedPlayers.length > numberOfSeeds ? `Remaining ${selectedPlayers.length - numberOfSeeds} placed randomly.` : ""}`
                }
              </p>
            </div>
          )}

          {/* Seed Positions Preview — live, driven by drawSize + numberOfSeeds */}
          <SeedPositionsPreview drawSize={drawSize} numberOfSeeds={numberOfSeeds} />

          {/* Custom Placement Mode */}
          {drawMethod === "custom" ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Available Players */}
              <div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search players..." value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-gray-700 mb-2">Available Players</h4>
                <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-xl">
                  {(() => {
                    // Custom Placement: show registeredPlayers minus those
                    // placed in customSlots. Ignore `matches` (existing bracket)
                    // since the user is actively redrawing.
                    const placedIds = getCustomPlayerIds();
                    const q = searchQuery.trim().toLowerCase();
                    const baseList = q
                      ? registeredPlayers.filter((p) =>
                          (p.userName || p.playerName || p.name || "").toLowerCase().includes(q)
                        )
                      : registeredPlayers;
                    const available = baseList.filter((p) => !placedIds.has(keyOfPlayer(p)));
                    if (available.length === 0) return (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        {registeredPlayers.length === 0 ? "No registered players found" : "All players have been placed"}
                      </div>
                    );
                    return (
                      <div className="divide-y divide-gray-100">
                        {available.map((player, idx) => {
                          const name = player.userName || player.playerName || player.name || `Player ${idx + 1}`;
                          return (
                            <div key={`${keyOfPlayer(player) || "p"}-${idx}`}
                              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-orange-50 transition-colors"
                              onClick={() => placePlayerInSlot(player)}>
                              <Plus size={16} className="text-orange-500 flex-shrink-0" />
                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-sm font-medium text-gray-800 flex-1">{name}</p>
                              {activeSlot !== null && (
                                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                                  → Seed {activeSlot + 1}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  {activeSlot !== null
                    ? `Click a player to place in Seed ${activeSlot + 1} position`
                    : "Click a slot on the right first, then click a player to place. Or click a player to fill the next empty slot."
                  }
                </p>
              </div>

              {/* Right: Bracket Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-gray-700">Bracket Positions</h4>
                  <span className="text-[10px] font-bold text-gray-400">{customSlots.filter(Boolean).length}/{drawSize} placed</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-xl">
                  {(() => {
                    const seedOrder = getSeedOrder(drawSize);
                    const matchPairs = [];
                    for (let i = 0; i < drawSize; i += 2) {
                      matchPairs.push({ m: Math.floor(i / 2) + 1, s1: { idx: i, seed: seedOrder[i] }, s2: { idx: i + 1, seed: seedOrder[i + 1] } });
                    }
                    return (
                      <div className="divide-y divide-gray-200">
                        {matchPairs.map((pair) => (
                          <div key={pair.m} className="px-3 py-2">
                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Match {pair.m}</p>
                            {[pair.s1, pair.s2].map((slot) => {
                              const player = customSlots[slot.idx];
                              const isActive = activeSlot === slot.idx;
                              const name = player ? (player.userName || player.playerName || player.name) : null;
                              const isSeededPos = slot.seed <= numberOfSeeds;
                              return (
                                <div key={slot.idx}
                                  className={`flex items-center gap-2 px-2 py-2 rounded-lg mb-1 cursor-pointer transition-all ${
                                    isActive ? "bg-orange-100 border-2 border-orange-500"
                                    : player ? (isSeededPos ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200")
                                    : isSeededPos ? "bg-yellow-50 border border-dashed border-yellow-300 hover:border-orange-400"
                                    : "bg-gray-50 border border-dashed border-gray-300 hover:border-gray-400"
                                  }`}
                                  onClick={() => setActiveSlot(isActive ? null : slot.idx)}>
                                  {isSeededPos ? (
                                    <span className={`px-1.5 h-6 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                                      player ? "bg-orange-500 text-white" : "bg-yellow-400 text-yellow-900"
                                    }`}>
                                      S{slot.seed}
                                    </span>
                                  ) : (
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                      player ? "bg-gray-500 text-white" : "bg-gray-200 text-gray-400"
                                    }`}>
                                      {slot.seed}
                                    </span>
                                  )}
                                  {player ? (
                                    <>
                                      <p className="text-sm font-medium text-gray-800 flex-1 truncate">{name}</p>
                                      {isSeededPos && <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">SEED {slot.seed}</span>}
                                      <button onClick={(e) => { e.stopPropagation(); removeFromSlot(slot.idx); }}
                                        className="text-red-300 hover:text-red-500 w-auto p-0">
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <p className={`text-sm flex-1 italic ${isActive ? "text-orange-600 font-medium" : "text-gray-400"}`}>
                                      {isActive ? "← Click a player to place here"
                                        : isSeededPos ? `Seed ${slot.seed} position — place seeded player here`
                                        : "Open slot — click to select"
                                      }
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  <span className="inline-block w-4 h-3 bg-yellow-400 rounded mr-1 align-middle"></span> Seeded positions (S1, S2...) — place your ranked players here.
                  Other slots are open positions. Empty slots become BYEs.
                </p>
              </div>
            </div>
          ) : (
            /* Standard / Random / Hybrid Mode */
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Player Selection */}
              <div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search players..." value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400" />
                  </div>
                  <button onClick={selectAll}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 w-auto">
                    {selectedPlayers.length === getFilteredPlayers().length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-xl">
                  {getFilteredPlayers().length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Users size={32} className="mx-auto mb-2" />
                      <p>No registered players found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {getFilteredPlayers().map((player, idx) => {
                        const id = player.playerId || player._id;
                        const isSelected = selectedPlayers.some((p) => (p.playerId || p._id) === id);
                        const name = player.userName || player.playerName || player.name || `Player ${idx + 1}`;
                        return (
                          <div key={id || idx}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? "bg-orange-50" : "hover:bg-gray-50"}`}
                            onClick={() => togglePlayer(player)}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}>
                              {isSelected && <Check size={14} color="white" />}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm font-medium text-gray-800 flex-1">{name}</p>
                            {isSelected && (
                              <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                                #{selectedPlayers.findIndex((p) => (p.playerId || p._id) === id) + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Seed Order / Ranking */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700">
                    {drawMethod === "random" ? "Selected Players" : "Player Order (use arrows to reorder)"}
                  </h4>
                  {selectedPlayers.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {selectedPlayers.length} player{selectedPlayers.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-xl">
                  {selectedPlayers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Target size={32} className="mx-auto mb-2" />
                      <p className="text-sm">Select players from the left</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {selectedPlayers.map((player, idx) => {
                        const id = player.playerId || player._id;
                        const name = player.userName || player.playerName || player.name || `Player ${idx + 1}`;
                        const isSeeded = drawMethod === "standard" || (drawMethod === "hybrid" && idx < numberOfSeeds);
                        const showDivider = drawMethod === "hybrid" && numberOfSeeds > 0 && idx === numberOfSeeds;
                        return (
                          <div key={id || idx}>
                            {showDivider && (
                              <div className="bg-gray-100 px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <div className="h-px bg-gray-300 flex-1" />Unseeded — placed randomly<div className="h-px bg-gray-300 flex-1" />
                              </div>
                            )}
                            <div className={`flex items-center gap-2 px-3 py-2.5 ${isSeeded ? "bg-orange-50/50" : ""}`}>
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${isSeeded ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                                {idx + 1}
                              </span>
                              <p className="text-sm font-medium text-gray-800 flex-1 truncate">{name}</p>
                              {isSeeded && <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">SEED {idx + 1}</span>}
                              {isSeeded && (
                                <div className="flex flex-col gap-0.5">
                                  <button onClick={() => idx > 0 && movePlayer(idx, idx - 1)} disabled={idx === 0}
                                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 w-auto p-0">
                                    <ChevronRight size={14} className="rotate-[-90deg]" />
                                  </button>
                                  <button onClick={() => { const max = drawMethod === "standard" ? selectedPlayers.length - 1 : numberOfSeeds - 1; if (idx < max) movePlayer(idx, idx + 1); }}
                                    disabled={idx >= (drawMethod === "standard" ? selectedPlayers.length - 1 : numberOfSeeds - 1)}
                                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 w-auto p-0">
                                    <ChevronRight size={14} className="rotate-90" />
                                  </button>
                                </div>
                              )}
                              <button onClick={() => togglePlayer(player)} className="text-red-300 hover:text-red-500 w-auto p-0"><X size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedPlayers.length > 0 && drawMethod === "standard" && (
                  <p className="text-[11px] text-gray-400 mt-2">All players get fixed seeding positions. BYEs go to top seeds. Reorder with arrows.</p>
                )}
                {selectedPlayers.length > 0 && drawMethod === "hybrid" && numberOfSeeds > 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">Top {numberOfSeeds} seeded. {selectedPlayers.length > numberOfSeeds ? `${selectedPlayers.length - numberOfSeeds} placed randomly.` : ""}</p>
                )}
                {selectedPlayers.length > 0 && drawMethod === "random" && (
                  <p className="text-[11px] text-gray-400 mt-2">All players placed randomly. No seeding advantage.</p>
                )}
              </div>
            </div>
          )}

          {/* Court pool preview (Sub-step 4) — only when catalog has active
              courts for this sport. Standalone flow always submits a default
              schedule, but the server uses tournament.courts when populated.
              Showing the preview keeps the UX consistent with the other
              knockout-creation modals. */}
          {tournamentCourts.length > 0 && (
            <div className="mt-6">
              <CourtPoolPreview
                courts={tournamentCourts}
                startTime="10:00"
                intervalMinutes={30}
              />
            </div>
          )}

          {/* Generate Button */}
          {(() => {
            const count = drawMethod === "custom" ? customSlots.filter(Boolean).length : selectedPlayers.length;
            const minNeeded = Math.ceil(drawSize / 2) + 1;
            const canGenerate = count >= minNeeded && count <= drawSize;
            const byes = drawSize - count;
            return (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="mt-6 w-full py-3 bg-gradient-to-r from-orange-500 to-[#0071d2] text-white rounded-xl font-bold text-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : canGenerate ? (
                  <>
                    <Zap size={18} />
                    Generate {drawSize}-Draw ({count} players{byes > 0 ? `, ${byes} BYEs` : ""}) — {
                      drawMethod === "standard" ? "Full Seeding" : drawMethod === "random" ? "Random" : drawMethod === "custom" ? "Custom Placement" : `Top ${numberOfSeeds} Seeded`
                    }
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} />
                    {count < minNeeded ? `Need at least ${minNeeded} players (${minNeeded - count} more)` : `Too many players (remove ${count - drawSize})`}
                  </>
                )}
              </button>
            );
          })()}
        </div>
      )}

      {/* TAB: Live Scoring */}
      {activeTab === "scoring" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Match List */}
          <div className="col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h4 className="font-bold text-gray-800 text-sm">Ready to Score</h4>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
              {pendingMatches.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No matches ready to score
                </div>
              ) : (
                pendingMatches.map((match) => (
                  <div
                    key={match._id}
                    className={`px-4 py-3 cursor-pointer transition-colors ${activeMatch?.matchId === match.matchId ? "bg-orange-50 border-l-4 border-l-orange-500" : "hover:bg-gray-50"
                      }`}
                    onClick={async () => {
                      // Fetch fresh match data
                      try {
                        const res = await axios.get(`/api/tournaments/direct-knockout/${tournamentId}/matches`);
                        if (res.data.success) {
                          const fresh = res.data.matches.find((m) => m.matchId === match.matchId);
                          setActiveMatch(fresh || match);
                        } else {
                          setActiveMatch(match);
                        }
                      } catch {
                        setActiveMatch(match);
                      }
                      setP1Score("");
                      setP2Score("");
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {getRoundDisplayName(match.round)} • M{match.matchNumber}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-700">
                      {match.player1?.playerName} vs {match.player2?.playerName}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scoring Panel */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            {!activeMatch ? (
              <div className="text-center py-12 text-gray-400">
                <Swords size={48} className="mx-auto mb-3" />
                <p>Select a match to start scoring</p>
              </div>
            ) : (() => {
              const mf = activeMatch.matchFormat || {};
              const maxSets = mf.maxSets || getMatchFormatHelper(tournament)?.totalSets || 5;
              const setsToWin = mf.setsToWin || Math.ceil(maxSets / 2);
              const pointsToWin = mf.pointsToWinGame || null;
              const sets = activeMatch.sets || [];
              const p1Name = activeMatch.player1?.playerName || "Player 1";
              const p2Name = activeMatch.player2?.playerName || "Player 2";
              const gamesPerSet = mf.gamesToWin || 3;

              // Count set wins
              const p1SetsWon = sets.filter(s => s.winner?.playerName === p1Name).length;
              const p2SetsWon = sets.filter(s => s.winner?.playerName === p2Name).length;

              return (
                <div>
                  {/* Match Header */}
                  <div className="bg-gradient-to-r from-orange-500 to-[#0059aa] px-6 py-4 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-orange-200 font-medium uppercase tracking-wider">
                          {getRoundDisplayName(activeMatch.round)} • Match {activeMatch.matchNumber}
                        </p>
                        <p className="text-sm text-orange-100 mt-0.5">
                          Best of {maxSets} sets • {gamesPerSet} games per set • {pointsToWin} points per game
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${activeMatch.status === "IN_PROGRESS" ? "bg-yellow-500 text-yellow-900" : "bg-orange-400/30 text-orange-100"
                          }`}>
                          {activeMatch.status === "IN_PROGRESS" ? "LIVE" : activeMatch.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scoreboard Table */}
                  <div className="px-6 pt-4">
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Header Row */}
                      <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: `1fr repeat(${maxSets}, 56px) 60px` }}>
                        <div className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase">Player</div>
                        {Array.from({ length: maxSets }, (_, i) => (
                          <div key={i} className={`text-center py-2.5 text-xs font-bold border-l border-gray-200 ${(activeMatch.currentSet || 1) === i + 1 ? "bg-orange-50 text-orange-600" : "text-gray-400"
                            }`}>
                            S{i + 1}
                          </div>
                        ))}
                        <div className="text-center py-2.5 text-xs font-bold text-gray-700 border-l-2 border-gray-300 bg-gray-100">
                          SETS
                        </div>
                      </div>

                      {/* Player 1 Row */}
                      <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: `1fr repeat(${maxSets}, 56px) 60px` }}>
                        <div className="px-4 py-3 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 flex-shrink-0">
                            {p1Name[0]}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 truncate">{p1Name}</span>
                        </div>
                        {Array.from({ length: maxSets }, (_, i) => {
                          const set = sets[i];
                          const isCurrentSet = (activeMatch.currentSet || 1) === i + 1 && activeMatch.status !== "COMPLETED";
                          const p1GamesWon = set ? (set.games || []).filter(g => g.winner?.playerName === p1Name).length : 0;
                          const isWinner = set?.winner?.playerName === p1Name;
                          const isLoser = set?.status === "COMPLETED" && !isWinner;

                          return (
                            <div key={i} className={`text-center py-3 text-sm font-bold border-l border-gray-200 ${isCurrentSet ? "bg-orange-50 text-orange-600 animate-pulse" :
                                isWinner ? "bg-green-50 text-green-700" :
                                  isLoser ? "text-red-400" :
                                    !set ? "text-gray-300" : "text-gray-600"
                              }`}>
                              {set ? p1GamesWon : "-"}
                            </div>
                          );
                        })}
                        <div className={`text-center py-3 text-lg font-black border-l-2 border-gray-300 ${p1SetsWon >= setsToWin ? "bg-green-100 text-green-700" : "text-gray-800"
                          }`}>
                          {p1SetsWon}
                        </div>
                      </div>

                      {/* Player 2 Row */}
                      <div className="grid" style={{ gridTemplateColumns: `1fr repeat(${maxSets}, 56px) 60px` }}>
                        <div className="px-4 py-3 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-700 flex-shrink-0">
                            {p2Name[0]}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 truncate">{p2Name}</span>
                        </div>
                        {Array.from({ length: maxSets }, (_, i) => {
                          const set = sets[i];
                          const isCurrentSet = (activeMatch.currentSet || 1) === i + 1 && activeMatch.status !== "COMPLETED";
                          const p2GamesWon = set ? (set.games || []).filter(g => g.winner?.playerName === p2Name).length : 0;
                          const isWinner = set?.winner?.playerName === p2Name;
                          const isLoser = set?.status === "COMPLETED" && !isWinner;

                          return (
                            <div key={i} className={`text-center py-3 text-sm font-bold border-l border-gray-200 ${isCurrentSet ? "bg-orange-50 text-orange-700 animate-pulse" :
                                isWinner ? "bg-green-50 text-green-700" :
                                  isLoser ? "text-red-400" :
                                    !set ? "text-gray-300" : "text-gray-600"
                              }`}>
                              {set ? p2GamesWon : "-"}
                            </div>
                          );
                        })}
                        <div className={`text-center py-3 text-lg font-black border-l-2 border-gray-300 ${p2SetsWon >= setsToWin ? "bg-green-100 text-green-700" : "text-gray-800"
                          }`}>
                          {p2SetsWon}
                        </div>
                      </div>
                    </div>

                    {/* Current Set Detail — game scores */}
                    {sets.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Game Scores</h5>
                        <div className="flex flex-wrap gap-2">
                          {sets.map((set) => (
                            <div key={set.setNumber} className={`border rounded-lg px-3 py-2 text-center min-w-[80px] ${set.status === "COMPLETED"
                                ? set.winner?.playerName === p1Name ? "border-orange-200 bg-orange-50" : "border-orange-200 bg-orange-50"
                                : "border-gray-200 bg-gray-50"
                              }`}>
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Set {set.setNumber}</p>
                              {set.games?.map((game) => (
                                <p key={game.gameNumber} className="text-xs font-mono font-bold text-gray-700">
                                  {game.finalScore?.player1 || 0} - {game.finalScore?.player2 || 0}
                                </p>
                              ))}
                              {set.winner && (
                                <p className={`text-[9px] font-bold mt-1 ${set.winner.playerName === p1Name ? "text-orange-500" : "text-orange-600"
                                  }`}>
                                  {set.winner.playerName?.split(" ")[0]}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Score Input */}
                  {activeMatch.status !== "COMPLETED" && (
                    <div className="px-6 py-4 border-t border-gray-100 mt-4 bg-gray-50">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-3">
                        Enter Game Score — Set {activeMatch.currentSet || 1}, Game {activeMatch.currentGame || 1}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-orange-500 uppercase mb-1 block">{p1Name.split(" ")[0]}</label>
                          <input
                            type="number"
                            min="0"
                            value={p1Score}
                            onChange={(e) => setP1Score(e.target.value)}
                            placeholder="0"
                            className="w-full text-center text-2xl font-bold py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white"
                          />
                        </div>
                        <div className="text-gray-400 font-bold text-lg pt-5">vs</div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-orange-600 uppercase mb-1 block">{p2Name.split(" ")[0]}</label>
                          <input
                            type="number"
                            min="0"
                            value={p2Score}
                            onChange={(e) => setP2Score(e.target.value)}
                            placeholder="0"
                            className="w-full text-center text-2xl font-bold py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white"
                          />
                        </div>
                        <button
                          onClick={handleCompleteGame}
                          disabled={!p1Score || !p2Score || scoringLoading}
                          className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 mt-5 w-auto"
                        >
                          {scoringLoading ? "..." : <><Check size={16} /> Save</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Match Complete Banner */}
                  {activeMatch.status === "COMPLETED" && activeMatch.result?.winner && (
                    <div className="mx-6 my-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white text-center">
                      <Crown size={24} className="mx-auto mb-1" />
                      <p className="text-sm font-medium opacity-80">Match Winner</p>
                      <p className="text-xl font-bold">{activeMatch.result.winner.playerName}</p>
                      <p className="text-sm opacity-80 mt-1">
                        {activeMatch.result.finalScore?.player1Sets} - {activeMatch.result.finalScore?.player2Sets}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Bulk Score Upload Modal */}
      <BulkScoreUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => fetchMatches()}
        matches={matches.filter((m) => m.status !== "COMPLETED" && m.player1?.playerName && m.player1.playerName !== "TBD" && m.player2?.playerName && m.player2.playerName !== "TBD")}
        tournamentId={tournamentId}
        matchType="player"
        maxSets={getMatchFormatHelper(tournament)?.totalSets || 5}
        setsToWin={Math.ceil((getMatchFormatHelper(tournament)?.totalSets || 5) / 2)}
        title="Bulk Score Upload — Singles Knockout"
      />

      {/* Assign Umpire Modal */}
      <AssignUmpireModal
        isOpen={!!assignModalMatch}
        onClose={() => setAssignModalMatch(null)}
        matchId={assignModalMatch?._id}
        tournamentId={tournamentId}
        matchLabel={assignModalMatch ? `M${assignModalMatch.matchNumber} • ${assignModalMatch.player1?.playerName || "P1"} vs ${assignModalMatch.player2?.playerName || "P2"}` : ""}
        onAssigned={() => {
          fetchMatches();
          toast.success("Umpire assigned. Awaiting their response.");
        }}
      />

      {/* Match Detail Modal */}
      {detailMatch && (() => {
        const dm = detailMatch;
        const mf = dm.matchFormat || {};
        const maxSetsD = mf.maxSets || 5;
        const setsToWinD = mf.setsToWin || 3;
        const gamesToWinD = mf.gamesToWin || 3;
        const pointsD = mf.pointsToWinGame || null;
        const setsD = dm.sets || [];
        const p1 = dm.player1?.playerName || "TBD";
        const p2 = dm.player2?.playerName || "TBD";
        const p1SW = setsD.filter(s => s.winner?.playerName === p1).length;
        const p2SW = setsD.filter(s => s.winner?.playerName === p2).length;
        const isCompleted = dm.status === "COMPLETED";
        const isBye = dm.notes?.includes("BYE");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailMatch(null)}>
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className={`px-6 py-4 text-white ${isCompleted ? "bg-gradient-to-r from-green-600 to-emerald-600" : "bg-gradient-to-r from-orange-500 to-[#0059aa]"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium opacity-80 uppercase tracking-wider">
                      {getRoundDisplayName(dm.round)} • Match {dm.matchNumber}
                    </p>
                    <p className="text-lg font-bold mt-1">{p1} vs {p2}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      Best of {maxSetsD} sets • {gamesToWinD} games/set • {pointsD} pts/game
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isCompleted ? "bg-white/20" : dm.status === "IN_PROGRESS" ? "bg-yellow-500 text-yellow-900" : "bg-white/20"
                    }`}>
                      {isBye ? "BYE" : dm.status}
                    </span>
                    <button onClick={() => setDetailMatch(null)} className="text-white/80 hover:text-white w-auto">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* Match Info Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Court</p>
                    <p className="text-lg font-bold text-gray-800">{dm.courtNumber || "TBD"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Time</p>
                    <p className="text-sm font-bold text-gray-800">
                      {dm.matchStartTime ? new Date(dm.matchStartTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "TBD"}
                      {dm.matchEndTime && ` → ${new Date(dm.matchEndTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Bracket</p>
                    <p className="text-lg font-bold text-gray-800">{dm.bracketPosition || "-"}</p>
                  </div>
                </div>
                {[3, 5, 7].includes(dm.matchFormat?.totalSets) && (
                  <div className="flex items-center justify-center">
                    <span className="text-xs font-bold text-[#5E6AD2] bg-[#5E6AD2]/10 px-3 py-1 rounded-full">
                      Format: Best of {dm.matchFormat.totalSets}
                    </span>
                  </div>
                )}

                {/* BYE Notice */}
                {isBye && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                    <p className="text-orange-700 font-semibold">{dm.notes}</p>
                  </div>
                )}

                {/* Winner Banner */}
                {isCompleted && dm.result?.winner && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Crown size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-medium">Winner</p>
                        <p className="font-bold text-green-800">{dm.result.winner.playerName}</p>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-green-700">
                      {dm.result.finalScore?.player1Sets} - {dm.result.finalScore?.player2Sets}
                    </div>
                  </div>
                )}

                {/* Scoreboard Table */}
                {setsD.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Scoreboard</h4>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Header */}
                      <div className="grid bg-gray-50 border-b border-gray-200" style={{ gridTemplateColumns: `1fr repeat(${maxSetsD}, 50px) 55px` }}>
                        <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Player</div>
                        {Array.from({ length: maxSetsD }, (_, i) => (
                          <div key={i} className="text-center py-2 text-[10px] font-bold text-gray-400 border-l border-gray-200">S{i + 1}</div>
                        ))}
                        <div className="text-center py-2 text-[10px] font-bold text-gray-700 border-l-2 border-gray-300 bg-gray-100">SETS</div>
                      </div>
                      {/* Player 1 */}
                      <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: `1fr repeat(${maxSetsD}, 50px) 55px` }}>
                        <div className="px-3 py-2.5 text-sm font-semibold text-gray-900 truncate">{p1}</div>
                        {Array.from({ length: maxSetsD }, (_, i) => {
                          const set = setsD[i];
                          const gw = set ? (set.games || []).filter(g => g.winner?.playerName === p1).length : 0;
                          const won = set?.winner?.playerName === p1;
                          return (
                            <div key={i} className={`text-center py-2.5 text-sm font-bold border-l border-gray-200 ${won ? "bg-green-50 text-green-700" : set?.status === "COMPLETED" ? "text-red-400" : !set ? "text-gray-300" : "text-gray-600"}`}>
                              {set ? gw : "-"}
                            </div>
                          );
                        })}
                        <div className={`text-center py-2.5 text-lg font-black border-l-2 border-gray-300 ${p1SW >= setsToWinD ? "bg-green-100 text-green-700" : "text-gray-800"}`}>{p1SW}</div>
                      </div>
                      {/* Player 2 */}
                      <div className="grid" style={{ gridTemplateColumns: `1fr repeat(${maxSetsD}, 50px) 55px` }}>
                        <div className="px-3 py-2.5 text-sm font-semibold text-gray-900 truncate">{p2}</div>
                        {Array.from({ length: maxSetsD }, (_, i) => {
                          const set = setsD[i];
                          const gw = set ? (set.games || []).filter(g => g.winner?.playerName === p2).length : 0;
                          const won = set?.winner?.playerName === p2;
                          return (
                            <div key={i} className={`text-center py-2.5 text-sm font-bold border-l border-gray-200 ${won ? "bg-green-50 text-green-700" : set?.status === "COMPLETED" ? "text-red-400" : !set ? "text-gray-300" : "text-gray-600"}`}>
                              {set ? gw : "-"}
                            </div>
                          );
                        })}
                        <div className={`text-center py-2.5 text-lg font-black border-l-2 border-gray-300 ${p2SW >= setsToWinD ? "bg-green-100 text-green-700" : "text-gray-800"}`}>{p2SW}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Game-by-Game Scores */}
                {setsD.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Game Scores</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {setsD.map((set) => (
                        <div key={set.setNumber} className={`border rounded-xl p-3 ${
                          set.winner?.playerName === p1 ? "border-orange-200 bg-orange-50/50" : set.winner?.playerName === p2 ? "border-orange-200 bg-orange-50/50" : "border-gray-200 bg-gray-50"
                        }`}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase text-center mb-2">Set {set.setNumber}</p>
                          <div className="space-y-1">
                            {(set.games || []).map((game) => {
                              const p1Won = game.winner?.playerName === p1;
                              return (
                                <div key={game.gameNumber} className="flex justify-center items-center gap-1 text-xs font-mono">
                                  <span className={`font-bold ${p1Won ? "text-green-700" : "text-red-400"}`}>{game.finalScore?.player1 ?? 0}</span>
                                  <span className="text-gray-300">-</span>
                                  <span className={`font-bold ${!p1Won ? "text-green-700" : "text-red-400"}`}>{game.finalScore?.player2 ?? 0}</span>
                                </div>
                              );
                            })}
                          </div>
                          {set.winner && (
                            <p className={`text-[9px] font-bold mt-2 text-center ${
                              set.winner.playerName === p1 ? "text-orange-500" : "text-orange-600"
                            }`}>
                              {set.winner.playerName?.split(" ")[0]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No scores yet */}
                {setsD.length === 0 && !isBye && (
                  <div className="text-center py-8 text-gray-400">
                    <Clock size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No scores recorded yet</p>
                    <p className="text-xs mt-1">This match is {dm.status.toLowerCase()}</p>
                  </div>
                )}

                {/* Next Match Info */}
                {dm.nextMatchId && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Winner advances to</p>
                    <p className="text-sm font-bold text-gray-700 mt-0.5">{dm.nextMatchId.replace(`DK-${tournamentId}-`, "").replace("R", "Round ").replace("M", " Match ")}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 px-6 py-3 flex justify-between items-center bg-gray-50">
                {!isCompleted && !isBye && dm.player1?.playerName && dm.player1.playerName !== "TBD" && dm.player2?.playerName && dm.player2.playerName !== "TBD" && (
                  <button
                    onClick={() => {
                      setDetailMatch(null);
                      setActiveMatch(dm);
                      setActiveTab("scoring");
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-[#003d75] w-auto flex items-center gap-2"
                  >
                    <Target size={14} /> Score This Match
                  </button>
                )}
                <button
                  onClick={() => setDetailMatch(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 w-auto ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </TournamentShell>
  );
}

// SeedPositionsPreview moved to ./components/SeedPositionsPreview.jsx
