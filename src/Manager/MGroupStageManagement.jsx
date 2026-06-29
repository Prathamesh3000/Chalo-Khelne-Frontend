import { toast } from "react-toastify";
import { useState, useEffect, useMemo } from "react";
import { FaStar, FaRegStar, FaMedal, FaTrophy } from "react-icons/fa";
import { ChevronDown, Check } from 'lucide-react';
import { FiPlus, FiX, FiLock, FiCheck, FiTrash, FiAlertTriangle, FiInfo } from "react-icons/fi";
import { MdRocket, MdSportsKabaddi, MdFlashOn } from "react-icons/md";
import { GiTrophyCup, GiLaurelCrown } from "react-icons/gi";
import { BiTrophy } from "react-icons/bi";
import axios from "axios";
import GroupsTab from "./MGrouptabs";
import { useNavigate, useSearchParams } from "react-router-dom";
import SeedPositionsPreview from "./components/SeedPositionsPreview";
import CourtPoolPreview from "./components/CourtPoolPreview";
import KnockoutFormatPanel, { hasFormatPanelErrors } from "./components/KnockoutFormatPanel";
import { buildRequestRounds, isSetBasedSport } from "./utils/knockoutDefaults";
import { getSportName, getCategories, getCurrentStage } from "../utils/sportTrack";
import { TabBar, SubTabs, Skeleton } from "../shared/ui";
import { TournamentShell, Round2Banner, TournamentFlowHeader } from "../shared/layout";

// currentStage → pipeline-step index. Stages we don't know map to 0 (early).
const STAGE_TO_STEP_IDX = {
  registration: 0,
  group_stage: 1,
  qualifier_knockout: 3,
  knockout: 4,
  completed: 5, // all done
};

// URL-sync helpers — keep deep links + refresh working. Two query keys:
//   ?tab=players|groups       — top tab
//   ?sub=registered|top|super — sub-toggle inside Players
const TAB_TO_LEGACY = {
  players: { tab: "Registered Players", sub: "Registered Players" },
  groups:  { tab: "Groups",              sub: "" },
};
const SUB_TO_LEGACY = {
  registered: "Registered Players",
  top:        "Top Players",
  super:      "Super Players",
};
const LEGACY_TO_SUB = {
  "Registered Players": "registered",
  "Top Players":        "top",
  "Super Players":      "super",
};

// Valid knockout bracket sizes (powers of 2, cap at 128).
const VALID_KO_DRAW_SIZES = [4, 8, 16, 32, 64, 128];
// Smallest draw size that fits N players, or 128 if N > 128.
const defaultDrawFor = (n) => VALID_KO_DRAW_SIZES.find((s) => s >= n) || 128;

// Deterministic avatar palette — colour picked by name-hash so a player's
// initials chip stays the same across renders/page-reloads. Replaces the
// previous random `pravatar.cc?img=${Math.random()}` which changed on every
// render and visually thrashed the table.
const AVATAR_PALETTE = [
  "bg-orange-500/100", "bg-emerald-500/100", "bg-blue-500", "bg-purple-500",
  "bg-pink-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500",
];
const _hashName = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};
function PlayerAvatar({ player, locked = false }) {
  const name = player?.name || player?.playerName || player?.userName || "?";
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((w) => (w[0] || "").toUpperCase()).join("") || "?";
  const url = player?.image || player?.profileImage || null;
  // Treat known random/placeholder URLs as missing so we render initials.
  const isPlaceholder = !url || /pravatar|placeholder/i.test(url);
  const opacityClass = locked ? "opacity-60" : "";
  if (!isPlaceholder) {
    return (
      <img
        src={url}
        alt={name}
        className={`w-9 h-9 rounded-full object-cover ring-1 ring-white/[0.08] ${opacityClass}`}
      />
    );
  }
  const bg = AVATAR_PALETTE[_hashName(name) % AVATAR_PALETTE.length];
  return (
    <div
      className={`w-9 h-9 rounded-full ${bg} text-white text-[12px] font-bold flex items-center justify-center ring-1 ring-white shadow-sm ${opacityClass}`}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

const GroupStageManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');

  // Push the current tab/sub to the URL alongside a state setter. Internal
  // actions (Direct-Knockout creation, Round-2 init, post-Round-2 redirect)
  // flip tab state directly; without this helper the URL drifts out of sync
  // and a refresh would land the manager somewhere unexpected.
  const syncTabToUrl = (tab, sub) => {
    const next = new URLSearchParams(searchParams);
    if (tab) next.set("tab", tab);
    if (sub) next.set("sub", sub);
    setSearchParams(next, { replace: true });
  };

  // Tournament and tab states
  const [tournament, setTournament] = useState(null);
  // STEP 11b — Active sport for the per-sport switcher. Null on legacy
  // single-sport tournaments (no `?sportId=` query param sent → backend
  // returns unfiltered, matching pre-multi-sport behaviour).
  const [activeSportId, setActiveSportId] = useState(null);
  const [selectedTab, setSelectedTab] = useState("Registered Players"); // Default to Registered Players
  const [selectedSubTab, setSelectedSubTab] = useState("Registered Players");
  const [selectedRegisterPlayerCategory, setSelectedRegisterPlayerCategory] = useState('all');
  const [selectedTopPlayerCategory, setSelectedTopPlayerCategory] = useState('Open');
  const [selectedSuperPlayerCategory, setSelectedSuperPlayerCategory] = useState('Open');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("random");
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [superPlayers, setSuperPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]); // For group creation
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Pagination and search states
  const [currentPage, setCurrentPage] = useState(1);
  // Page-size toggle. Default 10 keeps the table within one viewport on most
  // screens (matches the legacy default before the redesign). 25/50 for larger
  // rosters, "all" bypasses pagination entirely.
  const [playersPerPage, setPlayersPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPlayers, setFilteredPlayers] = useState([]);

  // Player status tracking
  const [playerGroups, setPlayerGroups] = useState({}); // Maps playerId to { category: groupName }
  const [seededPlayers, setSeededPlayers] = useState([]); // Array of seeded player IDs

  // Knockout tournament states
  const [showKnockoutModal, setShowKnockoutModal] = useState(false);
  const [knockoutGenerated, setKnockoutGenerated] = useState(false);
  const [knockoutSettings, setKnockoutSettings] = useState({
    courtNumber: 1,
    matchStartTime: '',
    slotDurationMinutes: 30,
    matchDurationMinutes: 20,
    drawSize: 16,      // auto-set when Start Knockout opens based on qualifier count
    numberOfSeeds: 0,  // 0 keeps legacy sequential pairing; >0 enables Mirror & Flip
    // Per-round knockout format (Step 4 of flexible bestOf). When customizeRounds
    // is false, uniform values fan to every round on submit. When true,
    // roundOverrides drives a per-round table.
    customizeRounds: false,
    uniformBestOf: 3,
    roundOverrides: [],
    breakBetweenRoundsMinutes: 15,
  });

  // Ordered player list for the knockout preview — seeded first, then the rest.
  // Seeded = TopPlayers from any "seeded_*" group (order preserved).
  // Unseeded = SuperPlayers not already in the seeded set.
  const knockoutPlayerList = useMemo(() => {
    const seededRows = (topPlayers || []).filter((p) =>
      String(p.groupId || "").startsWith("seeded")
    );
    const seededIds = new Set(
      seededRows.map((p) => String(p.playerId || p._id || ""))
    );

    const seeded = seededRows.map((p) => ({
      name: p.playerName || p.userName || "Unknown",
      playerId: String(p.playerId || p._id || ""),
      isSeeded: true,
    }));

    const unseeded = (superPlayers || [])
      .filter((sp) => !seededIds.has(String(sp.playerId || sp._id || "")))
      .map((sp) => ({
        name: sp.playerName || sp.userName || "Unknown",
        playerId: String(sp.playerId || sp._id || ""),
        isSeeded: false,
      }));

    return [...seeded, ...unseeded];
  }, [topPlayers, superPlayers]);

  // Bucket Top Players by finishing position (1st/2nd/3rd/...) plus seeded.
  // Filters by the active category dropdown so section counts reflect what
  // the manager has selected. Numeric ranks are dynamic so this works for
  // qualifyPerGroup of 2, 3, or higher without hardcoding.
  const topPlayersByPosition = useMemo(() => {
    const cat = selectedTopPlayerCategory;
    const matchesCategory = (p) => {
      if (!cat || cat === 'All Categories' || cat === 'all') return true;
      return (p.category || 'Open').toLowerCase() === cat.toLowerCase();
    };
    const filtered = (topPlayers || []).filter(matchesCategory);

    const buckets = { seeded: [], unranked: [] };
    for (const p of filtered) {
      const isSeeded = p.isSeeded || String(p.groupId || '').startsWith('seeded');
      if (isSeeded) {
        buckets.seeded.push(p);
      } else if (p.position == null) {
        buckets.unranked.push(p);
      } else {
        if (!buckets[p.position]) buckets[p.position] = [];
        buckets[p.position].push(p);
      }
    }

    const positionKeys = Object.keys(buckets)
      .filter((k) => k !== 'seeded' && k !== 'unranked')
      .map(Number)
      .sort((a, b) => a - b);

    return { buckets, positionKeys, total: filtered.length };
  }, [topPlayers, selectedTopPlayerCategory]);

  // Buckets used by the Round 2 filter chip row. Counts drive chip labels;
  // the chips themselves render only when count > 0 so the row stays tight.
  // Counts are taken from the Round-2-eligible pool (skip-R2 players are
  // excluded from positions/seeded), with `skipR2` tracked separately so the
  // dedicated chip can surface them.
  const round2FilterCounts = useMemo(() => {
    const counts = { all: 0, seeded: 0, skipR2: 0 };
    const positions = {};
    for (const p of topPlayers || []) {
      if (p.skipRound2) {
        counts.skipR2++;
        continue; // not in the eligible pool
      }
      counts.all++;
      const isSeeded = p.isSeeded || String(p.groupId || '').startsWith('seeded');
      if (isSeeded) {
        counts.seeded++;
      } else if (typeof p.position === 'number' && p.position >= 1) {
        positions[p.position] = (positions[p.position] || 0) + 1;
      }
    }
    return { ...counts, positions };
  }, [topPlayers]);

  // Round 2 filter chip — narrows which Top Players are visible in the Round 2
  // selection list. Pure view filter; doesn't deselect previously checked
  // players when toggled. One of: 'all' | 'pos_1' | 'pos_2' | 'pos_3' | ... | 'seeded'.
  // Declared here (above round2FilteredPlayers) to satisfy TDZ — the memo
  // below reads it.
  const [round2Filter, setRound2Filter] = useState('all');

  // Apply the active filter chip + search term to topPlayers. Pure view
  // filter — doesn't affect selection state. Skip-R2 players are excluded
  // from every chip EXCEPT the dedicated "skip_r2" chip, since they're not
  // eligible for Round 2.
  const round2FilteredPlayers = useMemo(() => {
    let list = topPlayers || [];
    if (round2Filter === 'skip_r2') {
      list = list.filter((p) => p.skipRound2);
    } else {
      list = list.filter((p) => !p.skipRound2);
      if (round2Filter === 'seeded') {
        list = list.filter((p) => p.isSeeded || String(p.groupId || '').startsWith('seeded'));
      } else {
        const m = /^pos_(\d+)$/.exec(round2Filter || '');
        if (m) {
          const rank = Number(m[1]);
          list = list.filter((p) => p.position === rank);
        }
      }
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) =>
        (p.playerName || p.userName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [topPlayers, round2Filter, searchTerm]);

  // Group creation states
  const [modalStep, setModalStep] = useState(0);
  const [numGroups, setNumGroups] = useState(0);
  const [groupNames, setGroupNames] = useState([]);
  const [groupPlayers, setGroupPlayers] = useState({});
  const [playersInGroups, setPlayersInGroups] = useState([]);

  // Delete warning modal
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // Seeding confirmation modal
  const [showSeedingModal, setShowSeedingModal] = useState(false);
  const [playerToSeed, setPlayerToSeed] = useState(null);

  // Round-2-skip seeding (Round 2 Qualifiers tab → final knockout). When
  // skipRound2 is true on a TopPlayer entry, that player bypasses Round 2 and
  // is added directly to Round 3 (final knockout).
  const [showSkipR2Modal, setShowSkipR2Modal] = useState(false);
  const [playerToSkipR2, setPlayerToSkipR2] = useState(null); // { playerId, playerName, currentlySkipping }
  const skipR2Count = useMemo(
    () => (topPlayers || []).filter((p) => p.skipRound2).length,
    [topPlayers]
  );

  // Round 2 progression states
  const [showRound2Modal, setShowRound2Modal] = useState(false);
  const [round2Option, setRound2Option] = useState(null); // 'knockout' or 'group_stage'
  const [round2Groups, setRound2Groups] = useState([]);
  const [round2Progress, setRound2Progress] = useState(null); // Track Round 2 state
  const [isRound2Mode, setIsRound2Mode] = useState(false); // Track if we're creating Round 2 groups
  const [anyMatchesGenerated, setAnyMatchesGenerated] = useState(false);

  // Round 2 player selection
  const [selectedRound2Players, setSelectedRound2Players] = useState([]);

  // 🔥 DIRECT KNOCKOUT MODAL STATES - SEQUENTIAL FLOW
  const [showDirectKnockoutPlayerModal, setShowDirectKnockoutPlayerModal] = useState(false);
  const [showDirectKnockoutScheduleModal, setShowDirectKnockoutScheduleModal] = useState(false);
  // In-flight guard for the Round-2 → Direct Knockout submit. Without this,
  // a fast double-tap on the Confirm button fires `/superplayers/save` twice
  // concurrently — both saves race past the existence check and create
  // duplicate SuperPlayers docs (TOCTOU). Disable the button while busy.
  const [isSubmittingKnockout, setIsSubmittingKnockout] = useState(false);
  // Tells the inner <GroupsTab> which sub-tab to land on when it mounts.
  // Default "League"; flipped to "Knockout" by the success handler so the
  // user doesn't have to click the sub-tab to see their freshly-generated
  // bracket. Reset to "League" on tab leave.
  const [groupsDefaultSubTab, setGroupsDefaultSubTab] = useState("League");
  const [selectedDirectKnockoutPlayers, setSelectedDirectKnockoutPlayers] = useState([]);
  const [knockoutSchedule, setKnockoutSchedule] = useState({
    startDate: '',
    startTime: '',
    courtNumber: 1,
    slotDurationMinutes: 30,
    matchDurationMinutes: 20,
    drawSize: 16,         // auto-picked when schedule modal opens
    numberOfSeeds: 0,     // auto-picked from seeded Top Players count
    // Per-round knockout format (Step 4 of flexible bestOf).
    customizeRounds: false,
    uniformBestOf: 3,
    roundOverrides: [],
    breakBetweenRoundsMinutes: 15,
  });

  // Ordered player list for the Round 2 Direct-Knockout preview (Schedule modal).
  // Uses the manager's hand-picked subset (selectedDirectKnockoutPlayers) and
  // flags each as seeded by cross-referencing TopPlayers with "seeded_*" groupId.
  const round2KnockoutPlayerList = useMemo(() => {
    const seededUserIds = new Set(
      (topPlayers || [])
        .filter((p) => String(p.groupId || "").startsWith("seeded"))
        .map((p) => String(p.playerId || p._id || ""))
    );
    const normalize = (p) => ({
      name: p.playerName || p.userName || p.name || "Unknown",
      playerId: String(p.playerId || p._id || ""),
    });
    const seeded = (selectedDirectKnockoutPlayers || [])
      .filter((p) => seededUserIds.has(String(p.playerId || p._id || "")))
      .map((p) => ({ ...normalize(p), isSeeded: true }));
    const unseeded = (selectedDirectKnockoutPlayers || [])
      .filter((p) => !seededUserIds.has(String(p.playerId || p._id || "")))
      .map((p) => ({ ...normalize(p), isSeeded: false }));
    return [...seeded, ...unseeded];
  }, [selectedDirectKnockoutPlayers, topPlayers]);

  // Draw Method State (Global vs Local Rules)
  const [drawMethod, setDrawMethod] = useState("global"); // 'global' or 'local'

  // Transform tournament categories to dropdown format — STEP 17b.ii
  // reads per-sport via helper. Defaults to active sport's categories.
  const categories = [
    { value: 'all', label: 'All Categories' },
    ...(getCategories(tournament, activeSportId).map(cat => ({
      value: cat.name.toLowerCase().replace(/\s+/g, '_'),
      label: cat.name
    })) || [
        { value: 'open', label: 'Open' }
      ])
  ];

  // NOTE: the "no tournamentId" guard was moved BELOW all hooks (search for
  // "Early-return guard"). Returning here violated the Rules of Hooks because
  // many useState/useEffect/useMemo calls are declared further down.

  // URL → legacy tab state. Runs whenever the ?tab/?sub query params change
  // (which happens on TabBar/SubTabs clicks and on browser navigation). One
  // direction only — legacy `setSelectedTab(...)` call sites elsewhere don't
  // push to the URL; they just flip state and the next user click reconciles.
  useEffect(() => {
    const t = searchParams.get("tab");
    const s = searchParams.get("sub");
    if (t && TAB_TO_LEGACY[t]) {
      const mapped = TAB_TO_LEGACY[t];
      setSelectedTab(mapped.tab);
      // For Players, prefer the explicit ?sub= over the default registered.
      if (t === "players") {
        setSelectedSubTab(SUB_TO_LEGACY[s] || mapped.sub);
      } else {
        setSelectedSubTab(mapped.sub);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch tournament data
  useEffect(() => {
    if (tournamentId) {
      axios
        .get(`/api/tournaments/${tournamentId}`)
        .then((response) => {
          if (response.data.success && response.data.tournament) {
            const _tournament = response.data.tournament;
            setTournament(_tournament);
            // STEP 17b.ii — read currentStage + categories per-sport
            // (sports[0] default — activeSportId not yet resolved here).
            // Check if knockout was already generated
            const stage = getCurrentStage(_tournament);
            if (stage === "knockout" || stage === "completed") {
              setKnockoutGenerated(true);
            }
            // Set default category to first category if available
            const _cats = getCategories(_tournament);
            if (_cats.length > 0) {
              // Default to 'all' to show all players initially
              setSelectedRegisterPlayerCategory('all');
              setSelectedTopPlayerCategory(_cats[0].name);
              setSelectedSuperPlayerCategory(_cats[0].name);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching tournament:", error);
        });
    }
  }, [tournamentId]);

  // STEP 11b — Initialize / re-validate activeSportId when tournament data
  // arrives. Per the approval note: this fires when tournament is set, not
  // just on mount. Explicit `Array.isArray + length > 0` guard so we don't
  // optional-chain element access on a possibly-empty array.
  useEffect(() => {
    if (!tournament) return;
    if (Array.isArray(tournament.sports) && tournament.sports.length > 0) {
      const validIds = tournament.sports.map((s) => String(s.sportId));
      const current = activeSportId ? String(activeSportId) : null;
      if (!current || !validIds.includes(current)) {
        setActiveSportId(tournament.sports[0].sportId);
      }
    } else {
      // Legacy single-sport tournament — null means "send no ?sportId query".
      setActiveSportId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament]);

  // STEP 11b — Re-fetch sport-scoped data when activeSportId changes.
  // NOTE: fetch functions are currently regular (not useCallback). Deps
  // intentionally limited to [activeSportId, tournamentId] — the function
  // refs are stable enough for this use case. If any of these fetches get
  // wrapped in useCallback later, update this deps array to include them
  // (per STEP 11b approval note #1).
  useEffect(() => {
    if (!tournamentId) return;
    if (!tournament) return; // wait until tournament loads
    // Multi-sport tournaments must wait for activeSportId to be resolved by
    // the effect above before firing sport-scoped fetches. Otherwise the
    // first run fires with sportId=null (cross-sport) AND the second run
    // fires with the resolved sportId — a network race where the slower
    // response overwrites the faster one. Visible symptom: top-players
    // count reads as the cross-sport total on first land but flips to the
    // sport-scoped count after any state change forces a refetch.
    const isMultiSport = Array.isArray(tournament.sports) && tournament.sports.length > 0;
    if (isMultiSport && !activeSportId) return; // wait
    fetchTopPlayers();
    fetchSuperPlayers();
    checkRound2Progress();
    fetchTournamentCourts(); // Sub-step 4 — court catalog for the active sport
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSportId, tournamentId, tournament]);

  // ── Court catalog state + fetch (Sub-step 4) ──────────────────────────
  // Active courts pool for the current sport. Empty → modals fall back to
  // the legacy single-court input. Populated → modals show CourtPoolPreview
  // and the server uses tournament.courts to round-robin assign matches.
  const [tournamentCourts, setTournamentCourts] = useState([]);
  const fetchTournamentCourts = async () => {
    if (!tournamentId) return;
    try {
      const sportQuery = activeSportId ? `?sportId=${activeSportId}` : '';
      const res = await axios.get(`/api/tournaments/${tournamentId}/courts${sportQuery}`);
      setTournamentCourts(res.data?.courts || []);
    } catch (err) {
      console.error('Failed to fetch courts:', err.message);
      setTournamentCourts([]);
    }
  };

  // STEP 11b — Sport switch handler. Confirms when there's unsaved Round 2
  // state, then resets per-sport in-flight state so the new sport starts
  // fresh. The re-fetch effect above re-pulls data with the new sportId.
  const handleSportSwitch = (newSportId) => {
    if (resetting) return; // approval note #2 — can't switch mid-reset
    if (String(newSportId) === String(activeSportId)) return;

    const hasUnsaved =
      isRound2Mode ||
      (Array.isArray(selectedRound2Players) && selectedRound2Players.length > 0) ||
      (Array.isArray(selectedDirectKnockoutPlayers) && selectedDirectKnockoutPlayers.length > 0);
    if (hasUnsaved) {
      const ok = window.confirm("Discard your current Round 2 selection and switch sport?");
      if (!ok) return;
    }

    // Clear in-flight Round 2 / knockout state so the new sport starts fresh.
    setIsRound2Mode(false);
    setSelectedRound2Players([]);
    setRound2Filter('all');
    setRound2Option(null);
    setRound2Progress(null);
    setSelectedDirectKnockoutPlayers([]);
    setShowRound2Modal(false);
    setShowKnockoutModal(false);
    setShowDirectKnockoutPlayerModal(false);
    setShowDirectKnockoutScheduleModal(false);
    setSearchTerm('');
    setCurrentPage(1);

    setActiveSportId(newSportId); // re-fetch effect picks this up
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check if any matches have been generated for the entire tournament
  const checkAnyMatchesGenerated = async () => {
    try {
      if (!tournamentId) return;

      const sportQuery = activeSportId ? `?sportId=${activeSportId}` : '';
      const response = await axios.get(`/api/tournaments/direct-knockout/${tournamentId}/matches${sportQuery}`);
      if (response.data.success && response.data.matches.length > 0) {
        setAnyMatchesGenerated(true);
        return;
      }

      // Check traditional matches
      const response2 = await axios.get(`/api/tournaments/${tournamentId}/debug-matches`);
      if (response2.data.matches && response2.data.matches.length > 0) {
        setAnyMatchesGenerated(true);
      }
    } catch (error) {
      console.error("Error checking matches:", error);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      checkAnyMatchesGenerated();
    }
  }, [tournamentId]);

  // Fetch top players for the tournament (sport-scoped via activeSportId).
  const fetchTopPlayers = async () => {
    try {
      const sportQuery = activeSportId ? `?sportId=${activeSportId}` : '';
      const response = await axios.get(
        `/api/tournaments/topplayers/${tournamentId}${sportQuery}`
      );
      if (response.data.success && response.data.topPlayers) {
        setTopPlayers(response.data.topPlayers);
      }
    } catch (error) {
      setTopPlayers([]);
    }
  };

  // Fetch super players from database (sport-scoped via activeSportId).
  const fetchSuperPlayers = async () => {
    try {
      const sportQuery = activeSportId ? `?sportId=${activeSportId}` : '';
      const response = await axios.get(
        `/api/tournaments/superplayers/${tournamentId}${sportQuery}`
      );
      if (response.data.success && response.data.superPlayers) {
        setSuperPlayers(response.data.superPlayers);
      }
    } catch (error) {
      setSuperPlayers([]);
    }
  };

  // Generate knockout matches
  const generateKnockoutMatches = async () => {
    try {

      // Validate settings
      if (!knockoutSettings.matchStartTime) {
        toast.warn("Please select a match start time");
        return;
      }

      if (!knockoutSettings.courtNumber || knockoutSettings.courtNumber < 1) {
        toast.warn("Please enter a valid court number");
        return;
      }

      const _slot = knockoutSettings.slotDurationMinutes ?? 30;
      const _match = knockoutSettings.matchDurationMinutes ?? 20;
      // The KnockoutFormatPanel already validates each row inline; this is a
      // last-line backstop so a manual API call from a stale form state can't
      // squeak through.
      if (hasFormatPanelErrors({
        customizeRounds: knockoutSettings.customizeRounds,
        roundOverrides: knockoutSettings.roundOverrides,
        uniformSlot: _slot,
        uniformMatch: _match,
      })) {
        toast.warn("Fix the per-round format errors before generating");
        return;
      }
      // Build the rounds[] payload — uniform mode fans, customize mode sends the
      // table as-is. totalRounds is derived from drawSize on the client.
      const _totalRounds = Math.ceil(Math.log2(knockoutSettings.drawSize || 2));
      const _rounds = buildRequestRounds({
        customizeRounds: knockoutSettings.customizeRounds,
        totalRounds: _totalRounds,
        uniformBestOf: knockoutSettings.uniformBestOf,
        uniformSlot: _slot,
        uniformMatch: _match,
        roundOverrides: knockoutSettings.roundOverrides,
      });

      // Send explicit player order (seeded first, then Round 1 qualifiers) so
      // the backend places them exactly as the preview showed.
      const playerOrder = knockoutPlayerList.map((p) => p.playerId).filter(Boolean);

      const response = await axios.post(
        `/api/tournaments/knockout/generate`,
        {
          tournamentId,
          sportId: activeSportId,
          courtNumber: knockoutSettings.courtNumber,
          matchStartTime: knockoutSettings.matchStartTime,
          // Per-round config + inter-round break (Step 3 backend contract).
          // Legacy slotDurationMinutes/matchDurationMinutes still sent as a
          // safety net for the redistribute path which reads them too.
          rounds: _rounds,
          breakBetweenRoundsMinutes: knockoutSettings.breakBetweenRoundsMinutes,
          slotDurationMinutes: _slot,
          matchDurationMinutes: _match,
          drawSize: knockoutSettings.drawSize,
          numberOfSeeds: knockoutSettings.numberOfSeeds,
          playerOrder,
        }
      );

      if (response.data.success) {
        toast.info(
          `🏆 Knockout Tournament Generated!\n\n` +
          `${response.data.message}\n` +
          `Bracket: ${response.data.bracket.totalPlayers} players, ${response.data.bracket.totalRounds} rounds\n\n` +
          `Starting at: ${new Date(knockoutSettings.matchStartTime).toLocaleString()}\n` +
          `Slot: ${_slot} mins · Match: ${_match} mins · Gap: ${_slot - _match} mins`
        );

        setShowKnockoutModal(false);
        setKnockoutGenerated(true);

        // Navigate to knockout view
        // navigate(`/tournament-management/group-stage/${tournamentId}/knockout`, {
        //   state: {
        //     tournamentId,
        //     stage: 'knockout',
        //     superPlayers: true
        //   }
        // });
      } else {
        toast.error("Failed to generate knockout matches");
      }
    } catch (error) {
      console.error("Error generating knockout matches:", error);
      toast.info(`Failed to generate knockout matches: ${error.response?.data?.message || error.message}`);
    }
  };

  useEffect(() => {
    if (tournamentId) {

      axios
        .get(
          `/api/tournaments/bookings/tournament/${tournamentId}`
        )
        .then((response) => {

          if (response.data.success && response.data.bookings.length > 0) {

            const players = response.data.bookings.map((booking) => {
              // STEP 17b.ii — sportSelections is the only shape after
              // STEP 16. Legacy selectedCategories fallback removed.
              // Downstream consumers (cat.name in filter / display)
              // expect a `name` field, so we normalize here.
              const ss = Array.isArray(booking.sportSelections) ? booking.sportSelections : [];
              const categories = ss.map((s) => ({ name: s.categoryName, fee: s.fee, sportName: s.sportName }));
              return {
                id: booking._id,           // Booking ID
                userId: booking.userId?._id || booking.userId,    // Extract _id from userId object
                name: booking.userName || booking.name,
                bookingDate: booking.bookingDate,
                categories,
                image: `https://i.pravatar.cc/50?img=${Math.floor(
                  Math.random() * 70
                )}`,
              };
            });

            setRegisteredPlayers(players);
            setFilteredPlayers(players);
          } else {
            setRegisteredPlayers([]);
            setFilteredPlayers([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching registered players:", error);
        });

      // Fetch existing groups and player assignments. Sport-scoped so
      // multi-sport tournaments build a mapping for only the active sport's
      // groups (otherwise the same playerId in two sports would collide).
      const _sportQ = activeSportId ? `?sportId=${activeSportId}` : "";
      axios
        .get(`/api/tournaments/bookinggroups/tournament/${tournamentId}${_sportQ}`)
        .then((response) => {

          const groupsArray = response?.data?.data;
          if (Array.isArray(groupsArray) && groupsArray.length > 0) {

            const playerGroupMapping = {};
            groupsArray.forEach((group, groupIndex) => {


              if (group.players && Array.isArray(group.players)) {

                // Get normalized category for this group
                const categoryKey = group.category ? group.category.toLowerCase().replace(/\s+/g, '_') : 'open';

                group.players.forEach((player, playerIndex) => {

                  // The key field is playerId which contains the User ID
                  const playerId = player.playerId;
                  const playerName = player.userName;

                  // Map by User ID (playerId in group = userId from booking)
                  if (playerId) {
                    const pidStr = playerId.toString();
                    if (!playerGroupMapping[pidStr]) {
                      playerGroupMapping[pidStr] = {};
                    }
                    playerGroupMapping[pidStr][categoryKey] = group.groupName || group.name || `Group ${group._id}`;
                  }

                  // Also map by name as fallback
                  if (playerName) {
                    const normalizedName = playerName.toLowerCase().trim();
                    const nameKey = `name_${normalizedName}`;
                    if (!playerGroupMapping[nameKey]) {
                      playerGroupMapping[nameKey] = {};
                    }
                    playerGroupMapping[nameKey][categoryKey] = group.groupName || group.name || `Group ${group._id}`;
                  }
                });
              }
            });
            setPlayerGroups(playerGroupMapping);
          }
        })
        .catch((error) => {
        });

      // Fetch top players and super players
      fetchTopPlayers();
      fetchSuperPlayers();
    }
    // activeSportId is read inside this effect for sport-scoped fetches —
    // include it in deps so multi-sport switches refetch the right groups.
  }, [tournamentId, activeSportId]);

  // Filter players based on active sport, search term and category
  useEffect(() => {
    let filtered = registeredPlayers;

    // Sport scope — in a MULTI-sport tournament only show registrants for the
    // ACTIVE sport. Each booking carries the sport(s) it signed up for via
    // `categories[].sportName`. Single-sport tournaments skip this (all
    // registrants belong to the one sport, and legacy bookings may lack a tag).
    const isMultiSport = Array.isArray(tournament?.sports) && tournament.sports.length > 1;
    const activeSportName = isMultiSport
      ? (tournament.sports.find((s) => String(s.sportId) === String(activeSportId))?.sportName || null)
      : null;
    if (activeSportName) {
      filtered = filtered.filter((player) =>
        !player.categories || player.categories.length === 0
          ? false // a registrant with no sport tag isn't part of this sport
          : player.categories.some(
              (c) => (c.sportName || "").toLowerCase() === activeSportName.toLowerCase()
            )
      );
    }

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedRegisterPlayerCategory && selectedRegisterPlayerCategory !== 'all') {
      filtered = filtered.filter(player => {
        // If player has no categories assigned, show them for all category filters
        // This handles legacy bookings and bookings without category selection
        if (!player.categories || player.categories.length === 0) return true;

        // Otherwise, check if player has the selected category
        return player.categories.some(cat => {
          const categoryValue = cat.name.toLowerCase().replace(/\s+/g, '_');
          return categoryValue === selectedRegisterPlayerCategory ||
            cat.name.toLowerCase().includes(selectedRegisterPlayerCategory.toLowerCase().replace(/_/g, ' '));
        });
      });
    }

    setFilteredPlayers(filtered);
    setCurrentPage(1); // Reset to first page when searching or filtering
  }, [searchTerm, registeredPlayers, selectedRegisterPlayerCategory, activeSportId, tournament]);

  // Reset pagination when the Round 2 filter chip changes — otherwise a
  // manager on page 3 of "All" who switches to "Top 1" can land on an empty
  // page that doesn't exist in the smaller filtered list.
  useEffect(() => {
    if (isRound2Mode) setCurrentPage(1);
  }, [round2Filter, isRound2Mode]);

  // Calculate pagination - use different data source based on Round 2 mode.
  // In Round 2 mode the source is the chip-filtered top players list.
  // playersPerPage === "all" bypasses pagination entirely.
  const _showAll = playersPerPage === "all";
  const _sourceList = isRound2Mode ? round2FilteredPlayers : filteredPlayers;
  const indexOfLastPlayer = _showAll ? _sourceList.length : currentPage * playersPerPage;
  const indexOfFirstPlayer = _showAll ? 0 : indexOfLastPlayer - playersPerPage;
  const currentPlayers = _sourceList.slice(indexOfFirstPlayer, indexOfLastPlayer);
  const totalPages = _showAll ? 1 : Math.ceil(_sourceList.length / playersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Selection functions for group creation - handle both Round 1 and Round 2 modes
  const handleSelectAll = (checked) => {
    if (isRound2Mode) {
      // Round 2 mode: "select all visible" — adds every currently-filtered
      // player to the selection (preserving prior selections from other
      // filters). Unchecking only removes the currently-visible subset.
      if (checked) {
        setSelectedRound2Players((prev) => {
          const existingIds = new Set(prev.map(p => String(p.playerId || p._id || '')));
          const additions = round2FilteredPlayers.filter(
            (p) => !existingIds.has(String(p.playerId || p._id || ''))
          );
          return [...prev, ...additions];
        });
      } else {
        const visibleIds = new Set(round2FilteredPlayers.map(p => String(p.playerId || p._id || '')));
        setSelectedRound2Players((prev) =>
          prev.filter((p) => !visibleIds.has(String(p.playerId || p._id || '')))
        );
      }
    } else {
      // Round 1 mode: select regular players
      if (checked) {
        const availablePlayers = currentPlayers.filter(player => {
          const userGroups = playerGroups[player.userId];
          const nameGroups = playerGroups[`name_${player.name.toLowerCase().trim()}`];

          // Check if in group for CURRENT category
          const isLocked = selectedRegisterPlayerCategory !== 'all' && (
            (userGroups && userGroups[selectedRegisterPlayerCategory]) ||
            (nameGroups && nameGroups[selectedRegisterPlayerCategory])
          );

          return !isLocked;
        });
        const allPlayerIds = availablePlayers.map(player => player.id);
        const newSelected = [...new Set([...selectedPlayers, ...allPlayerIds])];
        setSelectedPlayers(newSelected);
      } else {
        const currentPlayerIds = currentPlayers.map(player => player.id);
        setSelectedPlayers(prev => prev.filter(id => !currentPlayerIds.includes(id)));
      }
    }
  };

  const togglePlayerSelection = (playerId) => {
    if (isRound2Mode) {
      // Round 2 mode: lookup against the full topPlayers (not the filtered
      // view) so toggling works regardless of which filter chip is active.
      const player = topPlayers.find(p => p.playerId === playerId);
      if (player) {
        setSelectedRound2Players(prev => {
          const isSelected = prev.find(p => p.playerId === playerId);
          if (isSelected) {
            return prev.filter(p => p.playerId !== playerId);
          } else {
            return [...prev, player];
          }
        });
      }
    } else {
      // Round 1 mode: toggle regular player selection
      setSelectedPlayers(prev => {
        if (prev.includes(playerId)) {
          return prev.filter(id => id !== playerId);
        } else {
          return [...prev, playerId];
        }
      });
    }
  };

  // Show seeding confirmation modal
  const showSeedingConfirmation = (player) => {
    // Only allow seeding if player is not already in a group
    const userGroups = playerGroups[player.userId];
    const nameGroups = playerGroups[`name_${player.name.toLowerCase().trim()}`];

    // Check if in group for CURRENT category
    const inUserGroup = userGroups && userGroups[selectedRegisterPlayerCategory];
    const inNameGroup = nameGroups && nameGroups[selectedRegisterPlayerCategory];

    if (inUserGroup || inNameGroup) {
      toast.warn("Cannot seed players who are already assigned to groups in this category.");
      return;
    }

    setPlayerToSeed(player);
    setShowSeedingModal(true);
  };

  // Confirm seeding a player
  const confirmSeedPlayer = async () => {
    if (!playerToSeed) return;

    const isCurrentlySeeded = seededPlayers.includes(playerToSeed.id);

    // Multi-sport seeded synthetic groupId format: seeded_<sportSlug>_<categorySlug>.
    // STEP 17b.ii — read sportSlug from the active sport-track via helper.
    // Detection helpers (groupId.startsWith('seeded')) match both old and
    // new formats, so reads of pre-migration data still work.
    const slugify = (s) => String(s || '').toLowerCase().replace(/\s+/g, '_');
    const _activeTrack = (tournament?.sports || []).find(
      (t) => activeSportId && String(t.sportId) === String(activeSportId)
    ) || tournament?.sports?.[0];
    const sportSlug = slugify(
      _activeTrack?.sportSlug || _activeTrack?.sportName || 'sport'
    );
    const categorySlug = slugify(selectedRegisterPlayerCategory || 'open');
    const newFormatGroupId = `seeded_${sportSlug}_${categorySlug}`;

    // For UNSEED — use the player's actual existing groupId so we hit the
    // right doc even if it's still in the legacy `seeded_<cat>` format
    // (i.e. pre-migration data). For ADD — always use the new format.
    const existingSeededEntry = (topPlayers || []).find((p) =>
      String(p.playerId || p._id || '') === String(playerToSeed.userId) &&
      String(p.groupId || '').startsWith('seeded')
    );
    const groupId = isCurrentlySeeded
      ? (existingSeededEntry?.groupId || newFormatGroupId)
      : newFormatGroupId;

    if (isCurrentlySeeded) {
      // REMOVE — call backend DELETE. If it fails, keep the star on and toast.
      try {
        await axios.delete(
          `/api/tournaments/topplayers/${tournamentId}/${groupId}/player/${playerToSeed.userId}`
        );
        const updated = seededPlayers.filter((id) => id !== playerToSeed.id);
        setSeededPlayers(updated);
        localStorage.setItem(`seeded_${tournamentId}`, JSON.stringify(updated));
        fetchTopPlayers(); // refresh Round 2 Qualifiers list
      } catch (err) {
        console.error("Error unseeding player:", err);
        toast.error(
          err?.response?.data?.message ||
            `Failed to unseed ${playerToSeed.name}. Please try again.`
        );
        // Keep local state as-is so the star reflects reality.
      }
    } else {
      // ADD — call backend POST. Optimistically flip the star, roll back on failure.
      const isFromSuperPlayers = superPlayers.some(
        (sp) =>
          sp.playerId === playerToSeed.userId ||
          sp.playerName === playerToSeed.name ||
          sp.userName === playerToSeed.name
      );

      const updated = [...seededPlayers, playerToSeed.id];
      setSeededPlayers(updated);
      localStorage.setItem(`seeded_${tournamentId}`, JSON.stringify(updated));

      if (!isFromSuperPlayers) {
        try {
          await axios.post(`/api/tournaments/topplayers/save`, {
            tournamentId,
            groupId,
            players: [
              {
                playerId: playerToSeed.userId,
                playerName: playerToSeed.name,
                category: selectedRegisterPlayerCategory,
              },
            ],
          });
          fetchTopPlayers();
        } catch (err) {
          console.error("Error saving to Top Players:", err);
          // Roll back local state so the star doesn't lie about success.
          setSeededPlayers((prev) => prev.filter((id) => id !== playerToSeed.id));
          localStorage.setItem(
            `seeded_${tournamentId}`,
            JSON.stringify(seededPlayers.filter((id) => id !== playerToSeed.id))
          );
          toast.error(
            err?.response?.data?.message ||
              `Failed to seed ${playerToSeed.name}. Please try again.`
          );
        }
      }
    }

    setShowSeedingModal(false);
    setPlayerToSeed(null);
  };

  // Open the Round-2-skip confirmation modal for a Top Player.
  const showSkipR2Confirmation = (player) => {
    setPlayerToSkipR2({
      playerId: String(player.playerId || player._id || ''),
      playerName: player.playerName || player.userName || 'this player',
      currentlySkipping: !!player.skipRound2,
    });
    setShowSkipR2Modal(true);
  };

  // Toggle skipRound2 on the selected Top Player. Optimistically updates the
  // local list and rolls back on failure.
  const confirmSkipR2 = async () => {
    if (!playerToSkipR2 || !tournamentId) return;
    const { playerId, currentlySkipping } = playerToSkipR2;
    const nextSkip = !currentlySkipping;

    // Optimistic local update — flip the flag in topPlayers immediately so
    // the UI reflects the change before the network round-trip resolves.
    setTopPlayers((prev) =>
      (prev || []).map((p) =>
        String(p.playerId || p._id || '') === playerId
          ? { ...p, skipRound2: nextSkip }
          : p
      )
    );
    // If the player was selected for Round 2 and is now skipping, prune them.
    if (nextSkip) {
      setSelectedRound2Players((prev) =>
        prev.filter((p) => String(p.playerId || p._id || '') !== playerId)
      );
    }

    try {
      await axios.post(
        `/api/tournaments/topplayers/${tournamentId}/skip-round2`,
        { playerId, skip: nextSkip }
      );
      toast.info(
        nextSkip
          ? `${playerToSkipR2.playerName} will skip Round 2 and go straight to the final knockout.`
          : `${playerToSkipR2.playerName} will play Round 2 again.`
      );
    } catch (err) {
      console.error('Error toggling skipRound2:', err);
      // Roll back local state on failure.
      setTopPlayers((prev) =>
        (prev || []).map((p) =>
          String(p.playerId || p._id || '') === playerId
            ? { ...p, skipRound2: currentlySkipping }
            : p
        )
      );
      toast.error(err?.response?.data?.message || 'Failed to update skip-Round-2 status.');
    }

    setShowSkipR2Modal(false);
    setPlayerToSkipR2(null);
  };

  // Show delete warning modal
  const showDeleteGroupsWarning = () => {
    setShowDeleteWarning(true);
  };

  // Actually delete all groups
  const confirmDeleteAllGroups = async () => {
    if (!tournamentId) return;

    setShowDeleteWarning(false);

    try {
      // Sport-scoped — only delete groups for the active sport, otherwise
      // a "Delete All" on Badminton would wipe Table Tennis groups too.
      const _sportQ = activeSportId ? `?sportId=${activeSportId}` : "";
      const response = await axios.get(
        `/api/tournaments/bookinggroups/tournament/${tournamentId}${_sportQ}`
      );

      if (response.data.success && response.data.data.length > 0) {
        // Delete each group
        const deletePromises = response.data.data.map(group =>
          axios.delete(`/api/tournaments/bookinggroups/${group._id}`)
        );

        await Promise.all(deletePromises);

        // Clear the mapping
        setPlayerGroups({});

        toast.info(`Successfully deleted ${response.data.data.length} groups. Players are now available for new group creation.`);

        // Refresh the page to update UI
        window.location.reload();
      } else {
        toast.warn("No groups found to delete");
      }
    } catch (error) {
      console.error("Error deleting groups:", error);
      toast.error("Failed to delete groups. Please try again.");
    }
  };

  // Load seeded players from localStorage on component mount
  useEffect(() => {
    const savedSeeded = localStorage.getItem(`seeded_${tournamentId}`);
    if (savedSeeded) {
      try {
        setSeededPlayers(JSON.parse(savedSeeded));
      } catch (error) {
        console.error("Error parsing saved seeded players:", error);
      }
    }

    // Check Round 2 progress status
    checkRound2Progress();
  }, [tournamentId]);

  // Sync seededPlayers state with DB truth once registered players + top players
  // are loaded. TopPlayers stores `playerId` (user ObjectId); seededPlayers
  // state stores `player.id` (booking ObjectId). We reverse-map via
  // registeredPlayers to restore stars for players who were seeded earlier
  // (survives localStorage clears / cross-device).
  useEffect(() => {
    if (!registeredPlayers.length || !topPlayers.length) return;

    const seededUserIds = new Set(
      topPlayers
        .filter((p) => String(p.groupId || "").startsWith("seeded"))
        .map((p) => String(p.playerId || ""))
        .filter(Boolean)
    );
    if (seededUserIds.size === 0) return;

    const dbSeededBookingIds = registeredPlayers
      .filter((p) => seededUserIds.has(String(p.userId || "")))
      .map((p) => p.id);

    setSeededPlayers((prev) => {
      const merged = Array.from(new Set([...prev, ...dbSeededBookingIds]));
      if (merged.length !== prev.length) {
        localStorage.setItem(`seeded_${tournamentId}`, JSON.stringify(merged));
      }
      return merged;
    });
  }, [registeredPlayers, topPlayers, tournamentId]);

  // Check if Round 2 has been initiated (sport-scoped via activeSportId).
  const checkRound2Progress = async () => {
    try {
      const sportQuery = activeSportId ? `?sportId=${activeSportId}` : '';
      const response = await axios.get(
        `/api/tournaments/round2/status/${tournamentId}${sportQuery}`
      );
      if (response.data.success) {
        setRound2Progress(response.data.status);
        if (response.data.status?.option === 'group_stage') {
          // Load Round 2 groups if they exist
          fetchRound2Groups();
        }
      }
    } catch (error) {
      // Non-critical: Round 2 status may not exist yet (not initialized).
      // Leave round2Progress as-is; the UI handles a null/empty status.
      console.warn("[Round2] status fetch failed:", error?.message || error);
    }
  };

  // Fetch Round 2 groups (sport-scoped via activeSportId).
  const fetchRound2Groups = async () => {
    try {
      const sportQuery = activeSportId ? `?sportId=${activeSportId}` : '';
      const response = await axios.get(
        `/api/tournaments/round2/groups/${tournamentId}${sportQuery}`
      );
      if (response.data.success) {
        setRound2Groups(response.data.groups);
      }
    } catch (error) {
      console.error("Error fetching Round 2 groups:", error);
    }
  };

  // Initiate Round 2 progression
  const initiateRound2 = () => {
    if (topPlayers.length < 2) {
      toast.warn("Need at least 2 Top Players to proceed to Round 2");
      return;
    }
    setShowRound2Modal(true);
  };

  // Reset Round 2 progress
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ── Early-return guard (moved here from above all the hooks) ──
  // Every hook above this line now runs unconditionally on every render, so the
  // Rules of Hooks are satisfied. Only after all hooks have been called do we
  // short-circuit the render when there is no tournament selected.
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

  const confirmResetRound2 = async () => {
    setResetting(true);
    try {
      const response = await axios.post(
        `/api/tournaments/round2/reset`,
        // STEP 11b — scope reset to active sport so a Tennis reset doesn't
        // wipe Badminton's Round 2 data. Backend falls back to legacy
        // all-tournament reset when sportId is omitted.
        { tournamentId, sportId: activeSportId || undefined }
      );

      if (response.data.success) {
        setRound2Progress(null);
        setIsRound2Mode(false);
        setSelectedRound2Players([]);
        setRound2Option(null);
        setRound2Filter('all');
        setShowResetModal(false);

        const d = response.data.deleted || {};
        toast.info(`Round 2 has been reset.\n\nDeleted:\n• ${d.groups || 0} groups\n• ${d.matches || 0} group matches\n• ${d.knockoutMatches || 0} knockout matches`);
      }
    } catch (error) {
      console.error("Error resetting Round 2:", error);
      toast.error("Failed to reset Round 2 progress.");
    } finally {
      setResetting(false);
    }
  };

  // Handle Round 2 option selection
  // 🔥 HANDLE DIRECT KNOCKOUT PLAYER SELECTION
  const handleDirectKnockoutPlayerSelection = () => {
    const count = selectedDirectKnockoutPlayers.length;
    const validSizes = [4, 8, 16, 32, 64, 128];

    if (count < 3) {
      toast.warn(`Minimum 3 players required for knockout. Currently selected: ${count}`);
      return;
    }

    if (count > 128) {
      toast.warn(`Maximum 128 players supported for knockout. Currently selected: ${count}`);
      return;
    }

    // Auto-pick draw size (smallest that fits) and number of seeds (rounded
    // down to a valid preset, capped at drawSize/2) based on how many of the
    // selected players are flagged seeded in TopPlayers.
    const chosenDraw = defaultDrawFor(count);
    const seededSet = new Set(
      (topPlayers || [])
        .filter((p) => String(p.groupId || "").startsWith("seeded"))
        .map((p) => String(p.playerId || p._id || ""))
    );
    const seededInSelection = selectedDirectKnockoutPlayers.filter((p) =>
      seededSet.has(String(p.playerId || p._id || ""))
    ).length;
    const VALID_SEED_COUNTS = [0, 2, 4, 8, 16, 32];
    const maxSeedsForDraw = Math.floor(chosenDraw / 2);
    const autoSeeds = [...VALID_SEED_COUNTS]
      .reverse()
      .find((n) => n <= seededInSelection && n <= maxSeedsForDraw) ?? 0;

    setKnockoutSchedule((prev) => ({
      ...prev,
      drawSize: chosenDraw,
      numberOfSeeds: autoSeeds,
    }));

    // Close player selection modal and open schedule modal
    setShowDirectKnockoutPlayerModal(false);
    setShowDirectKnockoutScheduleModal(true);
  };

  // 🔥 HANDLE DIRECT KNOCKOUT MATCH CREATION
  // Bug fix: previously POSTed to /direct-knockout/create-matches which
  // creates DirectKnockoutMatch records — wrong collection for a tournament
  // whose sport.type is "knockout + group stage". Bracket would then appear
  // in the wrong UI surface (Singles Knockout instead of Groups → Knockout).
  //
  // Fixed flow mirrors the production "Round 2 mini-group-stage → Super
  // Players → Start Knockout" path:
  //   1. /round2/initiate         — stage flag (unchanged)
  //   2. /superplayers/save       — promote selected TopPlayers into a
  //                                 sport-scoped SuperPlayers doc
  //   3. /knockout/generate       — same endpoint the "Start Knockout"
  //                                 button uses; creates SuperMatch records
  //
  // The redundant /direct-knockout/validate-players call is removed —
  // /knockout/generate does its own draw-size + seed validation.
  const handleDirectKnockoutCreation = async () => {
    // Re-entry guard — if a previous submit is still in flight, ignore the
    // duplicate click. Pairs with the disabled button state below; this is
    // the safety net for cases where the click registers before the disabled
    // attribute paints.
    if (isSubmittingKnockout) return;
    setIsSubmittingKnockout(true);
    try {
      if (!knockoutSchedule.startDate || !knockoutSchedule.startTime) {
        toast.warn("Please fill in start date and time");
        return;
      }

      // Reorder selection so seeded players come first (matches preview and
      // drives the backend's Mirror & Flip placement, which reads players in
      // array order).
      const idOf = (p) => String(p.playerId || p._id || "");
      const orderMap = new Map(
        round2KnockoutPlayerList.map((row, i) => [row.playerId, i])
      );
      const orderedSelection = [...selectedDirectKnockoutPlayers].sort((a, b) => {
        const ai = orderMap.has(idOf(a)) ? orderMap.get(idOf(a)) : Number.POSITIVE_INFINITY;
        const bi = orderMap.has(idOf(b)) ? orderMap.get(idOf(b)) : Number.POSITIVE_INFINITY;
        return ai - bi;
      });

      // Step 1: Round 2 stage flag — unchanged. Sets currentStage to
      // qualifier_knockout so downstream knows the tournament has advanced.
      await axios.post(
        `/api/tournaments/round2/initiate`,
        {
          tournamentId,
          sportId: activeSportId,
          option: 'knockout',
          topPlayers: topPlayers.map(player => ({
            playerId: player.playerId,
            playerName: player.playerName,
            category: player.category
          }))
        }
      );

      // Step 2: Promote the selected TopPlayers into a SuperPlayers doc
      // for this sport. The endpoint upserts (de-dupes by playerId) and is
      // sport-scoped server-side. Player shape matches the SuperPlayers
      // schema so /knockout/generate can read them in the next step.
      await axios.post(
        `/api/tournaments/superplayers/save`,
        {
          tournamentId,
          sportId: activeSportId,
          players: orderedSelection.map((p) => ({
            playerId: p.playerId || p._id,
            playerName: p.playerName || p.userName || p.name,
            category: p.category || 'Open',
            points: p.points || 0,
            setsWon: p.setsWon || 0,
            setsLost: p.setsLost || 0,
            won: p.won || 0,
            lost: p.lost || 0,
            played: p.played || 0,
            status: 'super_player',
            sourceRound: 1,
            sourceGroupId: p.groupId ? String(p.groupId) : null,
          })),
        }
      );

      // Step 3: Generate the SuperMatch bracket — same endpoint the
      // production "Start Knockout" button on the Super Players sub-tab uses.
      const matchStartTime = `${knockoutSchedule.startDate}T${knockoutSchedule.startTime}`;
      // Build per-round payload from the format panel state.
      const _totalRounds = Math.ceil(Math.log2(knockoutSchedule.drawSize || 2));
      const _rounds = buildRequestRounds({
        customizeRounds: knockoutSchedule.customizeRounds,
        totalRounds: _totalRounds,
        uniformBestOf: knockoutSchedule.uniformBestOf,
        uniformSlot: knockoutSchedule.slotDurationMinutes,
        uniformMatch: knockoutSchedule.matchDurationMinutes,
        roundOverrides: knockoutSchedule.roundOverrides,
      });
      const matchResponse = await axios.post(
        `/api/tournaments/knockout/generate`,
        {
          tournamentId,
          sportId: activeSportId,
          courtNumber: knockoutSchedule.courtNumber,
          matchStartTime,
          rounds: _rounds,
          breakBetweenRoundsMinutes: knockoutSchedule.breakBetweenRoundsMinutes,
          slotDurationMinutes: knockoutSchedule.slotDurationMinutes,
          matchDurationMinutes: knockoutSchedule.matchDurationMinutes,
          drawSize: knockoutSchedule.drawSize,
          numberOfSeeds: knockoutSchedule.numberOfSeeds,
          // Explicit player order so backend Mirror & Flip placement matches
          // the preview the user just confirmed.
          playerOrder: orderedSelection.map((p) => p.playerId || p._id),
        }
      );

      if (matchResponse.data.success) {
        setShowDirectKnockoutScheduleModal(false);
        setRound2Progress({ option: 'knockout', status: 'matches_created' });
        const created = matchResponse.data.matchesCreated || matchResponse.data.matches?.length || 0;
        toast.info(`Knockout matches created — ${created} matches scheduled.`);

        // Land the user directly on the Knockout sub-tab inside Groups so
        // they see the bracket they just generated. Without this they'd see
        // the League sub-tab (default) and have to click "Knockout" manually.
        setGroupsDefaultSubTab("Knockout");
        setSelectedTab("Groups");
        syncTabToUrl("groups");
      } else {
        toast.error("Failed to create knockout matches");
      }
    } catch (error) {
      console.error("Error creating Direct Knockout matches:", error);
      toast.info(`Failed to create matches: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmittingKnockout(false);
    }
  };

  const handleRound2Option = async (option) => {
    try {
      setRound2Option(option);
      setShowRound2Modal(false);
      setRound2Filter('all'); // reset filter chip when entering Round 2 mode

      if (option === 'knockout') {
        // Don't call initiate API yet — wait until user completes the full flow
        // Just open the player selection modal
        setShowDirectKnockoutPlayerModal(true);
      } else {
        // For group_stage, initiate immediately (it only updates stage config)
        const response = await axios.post(
          `/api/tournaments/round2/initiate`,
          {
            tournamentId,
            sportId: activeSportId,
            option,
            topPlayers: topPlayers.map(player => ({
              playerId: player.playerId,
              playerName: player.playerName,
              category: player.category
            }))
          }
        );

        if (response.data.success) {
          setRound2Progress({ option, status: 'initiated' });
          setIsRound2Mode(true);
          setSelectedTab("Registered Players");
          setSelectedSubTab("Registered Players");
          syncTabToUrl("players", "registered");
        }
      }
    } catch (error) {
      console.error("Error initiating Round 2:", error);
      toast.error("Failed to initiate Round 2. Please try again.");
    }
  };


  // Group creation handlers
  const handleCreateGroupClick = () => {
    if (!tournamentId) {
      toast.warn("No tournament selected");
      return;
    }

    // Check selection based on mode
    if (isRound2Mode) {
      if (selectedRound2Players.length === 0) {
        toast.warn("Please select Top Players first for Round 2");
        return;
      }
    } else {
      if (selectedRegisterPlayerCategory === 'all') {
        toast.warn("Please select a specific category (e.g., Open, Under 12) from the dropdown before creating groups. You cannot create groups under 'All Categories'.");
        return;
      }
      if (selectedPlayers.length === 0) {
        toast.warn("Please select players first");
        return;
      }
      // Warn if user tries to create group with players from mixed categories without explicit intent?
      // For now, we assume if they are in the list, they are valid.
    }

    setModalStep(1);
  };

  const handleNextStep = () => {
    if (modalStep === 1 && numGroups > 0) {
      // Step 1 → 2: Initialize group names
      const names = Array.from({ length: numGroups }, (_, i) => `Group ${String.fromCharCode(65 + i)}`);
      setGroupNames(names);
      setModalStep(2);
    } else if (modalStep === 2) {
      // Step 2 → 3: Move to player distribution
      setModalStep(3);
    } else if (modalStep === 3) {
      // Step 3 → 4: Validation before confirmation
      const allFilled = groupNames.every(
        (name) => groupPlayers[name] !== "" && !isNaN(groupPlayers[name])
      );
      const totalPlayers = groupNames.reduce(
        (sum, name) => sum + (parseInt(groupPlayers[name]) || 0),
        0
      );

      if (!allFilled) {
        toast.warn("Please fill in the number of players for each group.");
        return;
      }
      const expectedTotal = isRound2Mode ? selectedRound2Players.length : selectedPlayers.length;
      if (totalPlayers !== expectedTotal) {
        toast.info(
          `Total players in groups (${totalPlayers}) must equal selected players (${expectedTotal}).`
        );
        return;
      }
      setModalStep(4);
    } else if (modalStep === 4) {
      // Step 4: Create groups
      handleCreateGroups();
    }
  };

  const handleCreateGroups = async () => {
    // Use selectedRound2Players for Round 2, selectedPlayers for Round 1
    const sourcePlayersList = isRound2Mode ? [...selectedRound2Players] : [...selectedPlayers];

    let playersToDistribute;
    if (isRound2Mode) {
      // For Round 2: Create player objects with proper structure for booking group
      playersToDistribute = sourcePlayersList.map(player => ({
        playerId: player.playerId, // This should be the User ID from Top Players
        userName: player.playerName,
        bookingDate: new Date(),
        joinedAt: new Date()
      }));
    } else {
      // For Round 1: Use booking IDs directly (existing functionality)
      playersToDistribute = [...selectedPlayers]; // Copy array of booking IDs
    }

    const groupsData = groupNames.map((name) => {
      const count = parseInt(groupPlayers[name]) || 0;
      const playersForGroup = playersToDistribute.splice(0, count);

      return {
        tournamentId: tournamentId,
        sportId: activeSportId,
        groupName: isRound2Mode ? `Round 2 ${name}` : name,
        players: playersForGroup,
        category: selectedRegisterPlayerCategory,
        round: isRound2Mode ? 2 : 1,
        roundType: isRound2Mode ? 'qualifier' : 'group_stage'
      };
    });

    try {
      await Promise.all(
        groupsData.map((g) =>
          axios.post(`/api/tournaments/bookinggroups/create`, g)
        )
      );

      setModalStep(5); // Success step

      // Clear appropriate state based on mode
      if (isRound2Mode) {
        setIsRound2Mode(false);
        setRound2Progress({ option: 'group_stage', status: 'groups_created' });

        // Navigate to MGrouptabs after Round 2 groups are created.
        // `setActiveTab` was a typo for `setSelectedTab` — there is no
        // `activeTab` state in this file. The original call would have thrown
        // "setActiveTab is not a function" had the user reached this branch.
        setTimeout(() => {
          setSelectedTab("Groups");
          syncTabToUrl("groups");
        }, 2000);
      } else {
        setSelectedPlayers([]); // Clear selection for Round 1

        // Refresh the group data for Round 1
        setTimeout(() => {
          window.location.reload(); // Simple refresh to update UI
        }, 2000);
      }

    } catch (error) {
      console.error("Error creating groups:", error);
      toast.error("Failed to create groups. Please try again.");
    }
  };

  const resetModal = () => {
    setModalStep(0);
    setNumGroups(0);
    setGroupNames([]);
    setGroupPlayers({});
    setIsRound2Mode(false); // Clear Round 2 mode when modal closes
    setSelectedRound2Players([]); // Clear Round 2 player selection
  };

  // ---------- Top Players: position-grouped section helpers ----------
  const positionLabel = (n) =>
    n === 1 ? 'Group Winners' :
    n === 2 ? 'Runners Up' :
    n === 3 ? 'Third Place' :
    `${n}th Place`;

  const positionMedalColor = (n) =>
    n === 1 ? 'text-yellow-500' :
    n === 2 ? 'text-gray-500' :
    n === 3 ? 'text-orange-300' :
    'text-gray-500';

  // Stable, lightweight initials avatar — no more random pravatar URLs that
  // re-shuffle on every render. Tone is derived from a hash of the player ID
  // so each player keeps a consistent color across renders.
  const AVATAR_TONES = [
    'bg-blue-500/15 text-blue-300',
    'bg-rose-500/15 text-rose-300',
    'bg-emerald-500/15 text-emerald-300',
    'bg-amber-500/15 text-amber-300',
    'bg-purple-500/15 text-purple-300',
    'bg-cyan-100 text-cyan-700',
    'bg-orange-500/15 text-orange-300',
    'bg-teal-500/15 text-teal-300',
  ];
  const avatarTone = (id) => {
    const s = String(id || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
  };
  const initialOf = (name) => {
    const s = String(name || '?').trim();
    if (!s) return '?';
    const parts = s.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return s[0].toUpperCase();
  };

  // Pick a rank-badge style based on position / seeded state.
  const rankBadgeFor = (player) => {
    const isSeeded = player.isSeeded || String(player.groupId || '').startsWith('seeded');
    if (isSeeded) return { label: 'S', cls: 'bg-orange-500/15 text-orange-300 ring-orange-200' };
    const r = player.position;
    if (r === 1) return { label: '1', cls: 'bg-amber-500/15 text-amber-300 ring-yellow-300' };
    if (r === 2) return { label: '2', cls: 'bg-white/[0.08] text-gray-300 ring-white/[0.10]' };
    if (r === 3) return { label: '3', cls: 'bg-orange-500/20 text-orange-300 ring-orange-300' };
    if (r) return { label: String(r), cls: 'bg-white/[0.06] text-gray-300 ring-white/[0.08]' };
    return { label: '–', cls: 'bg-white/[0.06] text-gray-500 ring-white/[0.08]' };
  };

  const renderTopPlayerRow = (player, idx) => {
    const skipping = !!player.skipRound2;
    const isSeeded = player.isSeeded || String(player.groupId || '').startsWith('seeded');
    const badge = rankBadgeFor(player);
    const tone = avatarTone(player.playerId || player._id);
    const initial = initialOf(player.playerName || player.userName);
    return (
      <div
        key={player._id || `${player.playerId || ''}-${idx}`}
        className={`flex items-center gap-3 px-4 py-3 transition-colors ${skipping ? 'bg-amber-500/10/40 hover:bg-amber-500/10/70' : 'hover:bg-white/5'}`}
      >
        {/* Rank badge */}
        <div className={`w-8 h-8 rounded-full ring-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${badge.cls}`}>
          {badge.label}
        </div>
        {/* Avatar (deterministic initials) */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${tone}`}>
          {initial}
        </div>
        {/* Name + skip badge + meta line */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white truncate">
              {player.playerName || player.userName || 'Unknown Player'}
            </span>
            {skipping && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded">
                <FaStar className="w-2.5 h-2.5" /> Skip R2
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 truncate">
            <span className={isSeeded ? 'text-orange-400 font-medium' : ''}>
              {isSeeded ? 'Seeded' : (player.groupName || '—')}
            </span>
            <span className="text-gray-600 mx-1.5">·</span>
            <span>{player.category || 'Open'}</span>
          </div>
        </div>
        {/* Points */}
        <div className="text-sm font-bold text-gray-300 tabular-nums whitespace-nowrap">
          {player.points ?? 0}
          <span className="text-gray-500 font-normal text-xs ml-1">pts</span>
        </div>
        {/* Star action */}
        <button
          onClick={() => showSkipR2Confirmation(player)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${skipping
            ? 'text-yellow-500 bg-amber-500/10 hover:bg-amber-500/15'
            : 'text-gray-500 hover:text-yellow-500 hover:bg-amber-500/10'
            }`}
          title={skipping
            ? 'Un-seed — player will play Round 2'
            : 'Seed for final knockout — player skips Round 2'}
        >
          {skipping ? <FaStar className="w-4 h-4" /> : <FaRegStar className="w-4 h-4" />}
        </button>
      </div>
    );
  };

  const skipR2InSection = (players) => (players || []).filter((p) => p.skipRound2).length;

  // Section header — used by all three section renderers below. The first
  // section's `border-t` is suppressed via Tailwind's `first:` since each
  // section is rendered as a direct child of the unified container.
  const renderSectionHeader = (icon, title, subtitle, players, accent) => {
    const skips = skipR2InSection(players);
    return (
      <div className={`flex items-center justify-between px-4 py-2.5 border-t border-b border-white/[0.06] first:border-t-0 ${accent?.bg || 'bg-gray-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h4 className={`font-bold text-sm ${accent?.text || 'text-gray-100'} truncate`}>{title}</h4>
          {subtitle && <span className="text-[11px] text-gray-400 hidden sm:inline">· {subtitle}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {skips > 0 && (
            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <FaStar className="w-2.5 h-2.5" /> {skips} skip R2
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accent?.count || 'bg-[#181A22] text-gray-300 ring-1 ring-white/[0.08]'}`}>
            {players.length}
          </span>
        </div>
      </div>
    );
  };

  const renderPositionSection = (rank, players) => (
    <div key={`pos-${rank}`}>
      {renderSectionHeader(
        <FaMedal className={`${positionMedalColor(rank)} w-4 h-4`} />,
        positionLabel(rank),
        `Position ${rank}`,
        players
      )}
      <div className="divide-y divide-white/[0.05]">
        {players.map(renderTopPlayerRow)}
      </div>
    </div>
  );

  const renderSeededSection = (players) => (
    <div key="seeded">
      {renderSectionHeader(
        <FaStar className="text-orange-500 w-4 h-4" />,
        'Seeded Players',
        'Did not play group stage',
        players,
        { bg: 'bg-orange-500/10', text: 'text-orange-300', count: 'bg-orange-500/20 text-orange-300' }
      )}
      <div className="divide-y divide-white/[0.05]">
        {players.map(renderTopPlayerRow)}
      </div>
    </div>
  );

  const renderUnrankedSection = (players) => (
    <div key="unranked">
      {renderSectionHeader(
        <FiInfo className="text-amber-400 w-4 h-4" />,
        'Unranked',
        'Standings not yet computed',
        players,
        { bg: 'bg-amber-500/10', text: 'text-amber-300', count: 'bg-amber-500/20 text-amber-300' }
      )}
      <div className="divide-y divide-white/[0.05]">
        {players.map(renderTopPlayerRow)}
      </div>
    </div>
  );

  // Compute shell props — tournament header, pipeline steps, breadcrumbs.
  // Done above the early-return so the loading skeleton can render the same
  // shell chrome. currentStage is per-sport — read via getCurrentStage,
  // not a local variable.
  const _currentStage = getCurrentStage(tournament, activeSportId);

  // Pipeline active step follows the user's current TAB (what they're looking
  // at), not the tournament's overall stage. Falls back to currentStage when
  // we can't infer a step from the tab — e.g. on initial load.
  let _activeStepIdx;
  if (selectedTab === "Groups") {
    _activeStepIdx = 2; // "groups"
  } else if (isRound2Mode) {
    _activeStepIdx = 3; // "qualifiers"
  } else if (selectedSubTab === "Super Players") {
    _activeStepIdx = 4; // "knockout"
  } else if (selectedSubTab === "Top Players") {
    _activeStepIdx = 1; // "players"
  } else {
    // Registered Players sub — default to "players" if the tournament has
    // moved past registration, otherwise step 0.
    _activeStepIdx = (STAGE_TO_STEP_IDX[_currentStage] ?? 0) >= 1 ? 1 : 0;
  }
  const _steps = [
    { key: "registrations", label: "Registrations", sublabel: `${registeredPlayers.length} players` },
    { key: "players",       label: "Players",       sublabel: topPlayers.length ? `${topPlayers.length} promoted` : "Pending" },
    { key: "groups",        label: "Groups",        sublabel: "—" },
    { key: "qualifiers",    label: "Qualifiers",    sublabel: isRound2Mode ? "In progress" : "—" },
    { key: "knockout",      label: "Knockout",      sublabel: superPlayers.length ? `${superPlayers.length} ready` : "Not started" },
  ];
  const _shellTournament = tournament ? {
    title: tournament.title,
    sportName: getSportName(tournament, activeSportId),
    currentStage: _currentStage,
  } : null;
  const _currentTabLabel = selectedTab === "Groups" ? "Groups" : (isRound2Mode ? "Round 2 Selection" : "Players");
  const _breadcrumbs = [
    { label: "Tournaments", to: "/mtournament-management" },
    { label: tournament?.title || "Tournament", to: `/tournament-management/group-stage?tournamentId=${tournamentId}` },
    { label: _currentTabLabel },
  ];

  // Initial-load skeleton — render inside the same shell chrome so the topbar
  // and sidebar stay anchored while the tournament data resolves.
  if (!tournament && tournamentId) {
    return (
      <TournamentShell
        tournament={null}
        steps={[]}
        breadcrumbs={[{ label: "Tournaments", to: "/mtournament-management" }, { label: "Loading…" }]}
      >
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-3 w-32 mb-5" />
        <Skeleton className="h-20 rounded-lg mb-5" />
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[420px] rounded-lg" />
      </TournamentShell>
    );
  }

  return (
    <TournamentShell
      tournament={_shellTournament}
      steps={_steps}
      activeStep={_steps[_activeStepIdx]?.key}
      breadcrumbs={_breadcrumbs}
      activeTabKey={`${selectedTab}|${selectedSubTab}`}
      banner={isRound2Mode ? <Round2Banner onCancel={() => setIsRound2Mode(false)} /> : (
        <TournamentFlowHeader
          tournament={tournament}
          sportId={activeSportId}
          counts={{ players: registeredPlayers.length, groups: Object.keys(playerGroups || {}).length }}
          onPrimaryAction={() => {
            // Route to the stage's actual next step instead of always "Groups":
            // before groups exist, the manager registers/selects players and
            // creates groups from the Registered Players tab.
            const hasGroups = Object.keys(playerGroups || {}).length > 0;
            setSelectedTab(hasGroups ? "Groups" : "Registered Players");
          }}
        />
      )}
      tabBar={(
        <TabBar
          urlKey="tab"
          defaultKey="players"
          tabs={[
            {
              key: "players",
              label: isRound2Mode ? "Round 2 Selection" : "Players",
              count: registeredPlayers.length || undefined,
            },
            { key: "groups", label: "Groups" },
          ]}
        />
      )}
      subTabBar={selectedTab === "Registered Players" ? (
        <SubTabs
          urlKey="sub"
          defaultKey="registered"
          tabs={[
            { key: "registered", label: isRound2Mode ? "Round 2 Selection" : "Registered" },
            { key: "top",        label: "Top players" },
            { key: "super",      label: "Super players", hidden: isRound2Mode },
          ]}
        />
      ) : null}
    >
      {/* STEP 11b — Sport switcher (multi-sport tournaments only). Hidden
          for single-sport / legacy tournaments. Pills are disabled while a
          Round 2 reset is in flight to prevent mid-reset sport switching
          from targeting the wrong sport's data (approval note #2). */}
      {Array.isArray(tournament?.sports) && tournament.sports.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-gray-500 whitespace-nowrap flex-shrink-0">
            Sport
          </span>
          {/* Segmented control — the track only spans its content, never the
              full row. `w-auto` overrides the global `button { width:100% }`. */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] max-w-full overflow-x-auto">
            {tournament.sports.map((s) => {
              const isActive = String(s.sportId) === String(activeSportId);
              return (
                <button
                  key={String(s.sportId)}
                  onClick={() => handleSportSwitch(s.sportId)}
                  disabled={resetting}
                  className={`w-auto flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                  } ${resetting ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={resetting ? "Reset in progress — please wait" : undefined}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/90 flex-shrink-0" />
                  )}
                  {s.sportName}
                </button>
              );
            })}
          </div>
          {resetting && (
            <span className="text-[11px] text-gray-400 italic flex-shrink-0">
              Resetting…
            </span>
          )}
        </div>
      )}

      {/* Round-2 banner is now provided by TournamentShell via the `banner`
          slot — see <TournamentShell banner={…}> above. */}

      {/* Tab content area. Tab bar + sub-tab bar live in shell slots; this
          block only renders the active tab's body. Outer card preserved for
          visual consistency with the rest of the legacy content. */}
      <div className="bg-[#181A22] rounded-lg border border-white/[0.06] p-4">
        {/* Players Tab Content */}
        {selectedTab === "Registered Players" && (
          <>
            <div>

              {/* Sub-tab Content */}
              {selectedSubTab === "Registered Players" && (
                <div className="p-4">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {isRound2Mode ? 'Round 2 — Select Players' : 'Registered Players'}
                    </h3>

                    {/* Skip-R2 banner — surfaces players who are seeded for the
                        final knockout and aren't eligible for Round 2. */}
                    {isRound2Mode && round2FilterCounts.skipR2 > 0 && round2Filter !== 'skip_r2' && (
                      <div className="bg-amber-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                        <FaStar className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        <p className="text-sm text-amber-300 flex-1">
                          <strong>{round2FilterCounts.skipR2}</strong> player{round2FilterCounts.skipR2 === 1 ? ' is' : 's are'} seeded for the final knockout — they skip Round 2 and won't appear in the selection list.
                        </p>
                        <button
                          onClick={() => setRound2Filter('skip_r2')}
                          className="text-xs font-semibold text-amber-300 hover:underline whitespace-nowrap"
                        >
                          View →
                        </button>
                      </div>
                    )}

                    {/* Round 2 filter chips — view filter for the player list. */}
                    {isRound2Mode && (() => {
                      const chips = [
                        { key: 'all', label: 'All', count: round2FilterCounts.all },
                        ...Object.keys(round2FilterCounts.positions || {})
                          .map(Number)
                          .sort((a, b) => a - b)
                          .map((rank) => ({
                            key: `pos_${rank}`,
                            label: `Top ${rank}`,
                            count: round2FilterCounts.positions[rank],
                          })),
                        ...(round2FilterCounts.seeded > 0
                          ? [{ key: 'seeded', label: 'Seeded', count: round2FilterCounts.seeded }]
                          : []),
                        ...(round2FilterCounts.skipR2 > 0
                          ? [{ key: 'skip_r2', label: 'Skip R2', count: round2FilterCounts.skipR2 }]
                          : []),
                      ];
                      return (
                        <div className="flex items-center gap-2 flex-wrap mb-4">
                          {chips.map((c) => {
                            const active = round2Filter === c.key;
                            const isSkipR2 = c.key === 'skip_r2';
                            const activeColor = isSkipR2
                              ? 'bg-amber-500/100 text-white border-yellow-500 shadow-sm'
                              : 'bg-orange-500/100 text-white border-orange-500 shadow-sm';
                            const idleColor = isSkipR2
                              ? 'bg-amber-500/10 text-amber-300 border-yellow-500/30 hover:border-yellow-400'
                              : 'bg-[#181A22] text-gray-300 border-white/[0.08] hover:border-orange-500/40 hover:text-orange-400';
                            const countTone = active
                              ? (isSkipR2 ? 'text-yellow-100' : 'text-orange-100')
                              : 'text-gray-500';
                            return (
                              <button
                                key={c.key}
                                onClick={() => setRound2Filter(c.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${active ? activeColor : idleColor}`}
                              >
                                {isSkipR2 && <FaStar className="inline w-3 h-3 mr-1" />}
                                {c.label}
                                <span className={`ml-1.5 ${countTone}`}>({c.count})</span>
                              </button>
                            );
                          })}
                          <div className="flex-1" />
                          {round2Filter !== 'skip_r2' && (
                            <button
                              onClick={() => handleSelectAll(true)}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/15 transition-all"
                            >
                              <FiCheck className="inline w-3 h-3 mr-1" />
                              Select All Visible
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Toolbar — search + category + primary CTA. Clear Groups
                        demoted to a small text-link below (testing-only). */}
                    <div className="flex flex-col lg:flex-row gap-3 mb-3 items-stretch lg:items-center">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder={isRound2Mode ? "Search Top Players…" : "Search players by name…"}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-[#181A22] focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
                        />
                      </div>

                      <div className="relative w-full lg:w-56">
                        <button
                          onClick={() => setIsOpen(!isOpen)}
                          className="w-full bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-left focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 hover:border-white/[0.08] transition"
                        >
                          <span className="block truncate">
                            {categories.find(cat => cat.value === selectedRegisterPlayerCategory)?.label || 'Select Category'}
                          </span>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </span>
                        </button>
                        {isOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-[#181A22] border border-white/[0.06] rounded-xl shadow-lg overflow-hidden">
                            <ul className="py-1">
                              {categories.map((category) => (
                                <li key={category.value}>
                                  <button
                                    onClick={() => {
                                      setSelectedRegisterPlayerCategory(category.value);
                                      setIsOpen(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-500/10 flex items-center justify-between transition-colors"
                                  >
                                    <span>{category.label}</span>
                                    {selectedRegisterPlayerCategory === category.value && (
                                      <Check className="h-4 w-4 text-emerald-500" />
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleCreateGroupClick}
                        className="bg-emerald-500/100 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm w-auto"
                      >
                        <FiPlus className="w-4 h-4" /> Create Groups
                      </button>
                    </div>

                    {/* Status row + demoted Clear Groups link.
                        Hidden when bulk-selection bar is showing (below). */}
                    {((isRound2Mode ? selectedRound2Players.length : selectedPlayers.length) === 0) && (
                      <div className="flex justify-between items-center mb-3 text-xs text-gray-400">
                        <div>
                          {isRound2Mode ? (
                            <>Showing {round2FilteredPlayers.length} of {topPlayers.length} Top Players{(round2Filter !== 'all' || searchTerm) && ' · filtered'}</>
                          ) : (
                            <>Showing {currentPlayers.length} of {filteredPlayers.length} players{searchTerm && ` · filtered from ${registeredPlayers.length}`}</>
                          )}
                          {!isRound2Mode && (
                            <>
                              <span className="mx-2 text-gray-600">·</span>
                              {Object.values(playerGroups).filter(g => g && g[selectedRegisterPlayerCategory]).length} in groups
                              <span className="mx-2 text-gray-600">·</span>
                              {seededPlayers.length} seeded
                            </>
                          )}
                        </div>
                        <button
                          onClick={showDeleteGroupsWarning}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-300 hover:underline w-auto bg-transparent"
                          title="Delete all groups (testing utility)"
                        >
                          Clear all groups
                        </button>
                      </div>
                    )}

                    {/* Sticky bulk-action bar — appears only when ≥1 selected.
                        Replaces the status row above. */}
                    {(isRound2Mode ? selectedRound2Players.length : selectedPlayers.length) > 0 && (
                      <div className="sticky top-0 z-20 mb-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-emerald-300">
                          {isRound2Mode ? selectedRound2Players.length : selectedPlayers.length} selected
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCreateGroupClick}
                            className="px-3 py-1 rounded-md text-[11px] font-bold text-white bg-emerald-500/100 hover:bg-emerald-600 w-auto"
                          >
                            Create Groups with {isRound2Mode ? selectedRound2Players.length : selectedPlayers.length}
                          </button>
                          <button
                            onClick={() => {
                              if (isRound2Mode) setSelectedRound2Players([]);
                              else setSelectedPlayers([]);
                            }}
                            className="px-3 py-1 rounded-md text-[11px] font-semibold text-gray-300 bg-[#181A22] border border-white/[0.06] hover:bg-white/[0.04] w-auto"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Players Table — Sub-step Plan A redesign.
                      Card wrapper with subtle border, no thick interior lines.
                      Avatar embedded next to name, deterministic initials
                      fallback, auto-collapse Categories column when uniform. */}
                  <div className="overflow-hidden">
                    {(isRound2Mode ? round2FilteredPlayers.length : filteredPlayers.length) > 0 ? (
                      <>
                        {(() => {
                          // Registration is taken per (sport, category), so always
                          // surface that in a dedicated column — even when the whole
                          // list shares one category — so the manager can see what
                          // each player signed up for. Round 2 shows Points instead.
                          const showSecondaryColumn = true;
                          const secondaryHeader = isRound2Mode ? "Points" : "Category";
                          return (
                        <div className="bg-[#181A22] rounded-2xl border border-white/[0.06] overflow-hidden shadow-sm">
                          <table className="w-full">
                            <thead className="bg-gray-50/70 border-b border-white/[0.06]">
                              <tr>
                                <th className="px-4 py-2.5 text-left w-10">
                                  <input
                                    type="checkbox"
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    checked={
                                      isRound2Mode
                                        ? (currentPlayers.length > 0 && currentPlayers.every(player =>
                                          selectedRound2Players.find(p => p.playerId === player.playerId)))
                                        : (currentPlayers.filter(player => {
                                          const uGroups = playerGroups[player.userId];
                                          const nGroups = playerGroups[`name_${player.name.toLowerCase().trim()}`];
                                          return !(uGroups && uGroups[selectedRegisterPlayerCategory]) && !(nGroups && nGroups[selectedRegisterPlayerCategory]);
                                        }).length > 0 &&
                                          currentPlayers.filter(player => {
                                            const uGroups = playerGroups[player.userId];
                                            const nGroups = playerGroups[`name_${player.name.toLowerCase().trim()}`];
                                            return !(uGroups && uGroups[selectedRegisterPlayerCategory]) && !(nGroups && nGroups[selectedRegisterPlayerCategory]);
                                          }).every(player => selectedPlayers.includes(player.id)))
                                    }
                                    className="rounded text-emerald-500 focus:ring-emerald-400 border-white/[0.08]"
                                  />
                                </th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Player</th>
                                {showSecondaryColumn && (
                                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">{secondaryHeader}</th>
                                )}
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 w-24">
                                  {isRound2Mode ? "Type" : "Seed"}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.05]">
                              {currentPlayers.map((player, index) => {
                                if (isRound2Mode) {
                                  const isSelected = selectedRound2Players.find(p => p.playerId === player.playerId);
                                  const isSeeded = player.groupId?.includes('seeded');
                                  const isSkipR2 = !!player.skipRound2;
                                  return (
                                    <tr key={player._id || index} className={`hover:bg-white/5/60 transition-colors ${isSkipR2 ? 'bg-amber-500/10/30' : ''}`}>
                                      <td className="px-4 py-2.5">
                                        <input
                                          type="checkbox"
                                          checked={!!isSelected && !isSkipR2}
                                          disabled={isSkipR2}
                                          onChange={() => { if (!isSkipR2) togglePlayerSelection(player.playerId); }}
                                          className={`rounded text-emerald-500 focus:ring-emerald-400 border-white/[0.08] ${isSkipR2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                          title={isSkipR2 ? 'Seeded for final knockout — not eligible for Round 2' : undefined}
                                        />
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-3">
                                          <PlayerAvatar player={player} locked={isSkipR2} />
                                          <div className={`text-sm font-semibold ${isSkipR2 ? 'text-gray-400' : 'text-white'}`}>
                                            {player.playerName || 'Unknown Player'}
                                          </div>
                                        </div>
                                      </td>
                                      {showSecondaryColumn && (
                                        <td className="px-4 py-2.5 text-sm text-gray-300">
                                          {player.points || 0} pts
                                        </td>
                                      )}
                                      <td className="px-4 py-2.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/10 text-orange-300 border border-orange-500/20">
                                          <FaStar className="w-2.5 h-2.5 mr-1" /> Top Player
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="text-xs text-gray-300 flex items-center gap-1.5">
                                          {isSeeded ? 'Seeded' : 'Round 1'}
                                          {isSkipR2 && (
                                            <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded">
                                              Skip R2
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                } else {
                                  const userGroups = playerGroups[player.userId];
                                  const nameGroups = playerGroups[`name_${player.name.toLowerCase().trim()}`];
                                  const isInGroup = selectedRegisterPlayerCategory !== 'all' && (
                                    (userGroups && userGroups[selectedRegisterPlayerCategory]) ||
                                    (nameGroups && nameGroups[selectedRegisterPlayerCategory])
                                  );
                                  const isSeeded = seededPlayers.includes(player.id);
                                  const isLocked = !!isInGroup;
                                  return (
                                    <tr key={player.id || index} className={`transition-colors ${isLocked ? 'bg-gray-50/40 opacity-60' : 'hover:bg-emerald-500/10/40'}`}>
                                      <td className="px-4 py-2.5">
                                        <input
                                          type="checkbox"
                                          checked={selectedPlayers.includes(player.id)}
                                          onChange={() => togglePlayerSelection(player.id)}
                                          disabled={isLocked}
                                          className={`rounded text-emerald-500 focus:ring-emerald-400 border-white/[0.08] ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-3">
                                          <PlayerAvatar player={player} locked={isLocked} />
                                          <div className="min-w-0">
                                            <div className={`text-sm font-semibold truncate ${isLocked ? 'text-gray-400' : 'text-white'}`}>
                                              {player.name || 'Unknown Player'}
                                            </div>
                                            {/* Categories shown inline as a subtitle ONLY when the
                                                column is collapsed (uniform across rows) and there's
                                                actually a category to show. Otherwise they live in
                                                the dedicated column. */}
                                            {!showSecondaryColumn && player.categories?.length > 0 && (
                                              <div className="text-[11px] text-gray-500 truncate">
                                                {player.categories.map((c) => c.name).join(", ")}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      {showSecondaryColumn && (
                                        <td className="px-4 py-2.5 text-sm text-gray-300">
                                          {player.categories && player.categories.length > 0
                                            ? player.categories
                                                .map(cat => cat.sportName ? `${cat.sportName} · ${cat.name}` : cat.name)
                                                .join(", ")
                                            : '—'
                                          }
                                        </td>
                                      )}
                                      <td className="px-4 py-2.5">
                                        {isInGroup ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/[0.06] text-gray-300 border border-white/[0.06]">
                                            <FiLock className="w-2.5 h-2.5 mr-1" /> {isInGroup}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                            <FiCheck className="w-2.5 h-2.5 mr-1" /> Available
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <button
                                          onClick={() => showSeedingConfirmation(player)}
                                          disabled={isLocked}
                                          className={`p-1.5 rounded-lg transition-colors w-auto ${isLocked
                                            ? 'text-gray-600 cursor-not-allowed bg-transparent'
                                            : isSeeded
                                              ? 'text-yellow-500 hover:bg-amber-500/10 bg-transparent'
                                              : 'text-gray-600 hover:text-yellow-500 hover:bg-amber-500/10 bg-transparent'
                                          }`}
                                          title={
                                            isLocked
                                              ? 'Cannot seed player already in group'
                                              : isSeeded
                                                ? 'Remove seeded status'
                                                : 'Mark as seeded player'
                                          }
                                        >
                                          {isSeeded ? <FaStar className="w-4 h-4" /> : <FaRegStar className="w-4 h-4" />}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                }
                              })}
                            </tbody>
                          </table>
                        </div>
                          );
                        })()}

                        {/* Footer — page-size toggle + compact prev/next when paginating.
                            Plan A: dropped page-numbers in favour of "Show 25/50/All"
                            since most rosters are <100 players and one click to "All"
                            often beats clicking through 4 pages. */}
                        <div className="flex items-center justify-between mt-3 px-1 text-xs text-gray-400 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span>Show</span>
                            {[10, 25, 50, "all"].map((size) => {
                              const active = playersPerPage === size;
                              return (
                                <button
                                  key={String(size)}
                                  onClick={() => {
                                    setPlayersPerPage(size);
                                    setCurrentPage(1);
                                  }}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors w-auto ${
                                    active
                                      ? "bg-emerald-500/100 text-white"
                                      : "bg-[#181A22] text-gray-300 border border-white/[0.06] hover:border-emerald-500/40 hover:text-emerald-400"
                                  }`}
                                >
                                  {size === "all" ? "All" : size}
                                </button>
                              );
                            })}
                            <span className="ml-2 text-gray-500">
                              {_showAll
                                ? `${_sourceList.length} total`
                                : `${(currentPage - 1) * playersPerPage + 1}–${Math.min(currentPage * playersPerPage, _sourceList.length)} of ${_sourceList.length}`}
                            </span>
                          </div>
                          {!_showAll && totalPages > 1 && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-[11px] font-semibold border border-white/[0.06] rounded-md text-gray-300 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed w-auto"
                              >
                                Previous
                              </button>
                              <span className="text-[11px] text-gray-400 self-center">
                                Page {currentPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-[11px] font-semibold border border-white/[0.06] rounded-md text-gray-300 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed w-auto"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 bg-[#181A22] border border-white/[0.08] rounded-lg">
                        <div className="text-gray-400">
                          {isRound2Mode ? (
                            (searchTerm || round2Filter !== 'all') ? (
                              <>
                                <p className="text-lg font-medium">No Top Players match this filter</p>
                                <p className="text-sm mt-1">Try a different filter chip or clear the search.</p>
                              </>
                            ) : (
                              <>
                                <p className="text-lg font-medium">No Top Players yet</p>
                                <p className="text-sm mt-1">Complete Round 1 or seed players to see qualifiers here.</p>
                              </>
                            )
                          ) : searchTerm ? (
                            <>
                              <p className="text-lg font-medium">No players found</p>
                              <p className="text-sm mt-1">Try adjusting your search term</p>
                            </>
                          ) : (
                            <>
                              <p className="text-lg font-medium">No registered players</p>
                              <p className="text-sm mt-1">No players have registered for this tournament yet.</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top Players Sub-tab */}
              {selectedSubTab === "Top Players" && (
                <div className="p-4">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Top Players</h3>

                    <div className="flex flex-col lg:flex-row gap-4 mb-4">
                      {/* Category Dropdown */}
                      <div className="relative w-full lg:w-64">
                        <div className="relative">
                          <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full bg-[#181A22] border border-white/[0.08] rounded-lg px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:border-white/[0.10]"
                          >
                            <span className="block truncate">
                              {categories.find(cat => cat.value === selectedTopPlayerCategory.toLowerCase())?.label || 'Select Category'}
                            </span>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <ChevronDown className="h-4 w-4 text-gray-300" />
                            </span>
                          </button>

                          {isOpen && (
                            <div className="absolute z-10 mt-1 w-full bg-[#181A22] border border-white/[0.08] rounded-lg shadow-lg">
                              <ul className="py-1">
                                {categories.map((category) => (
                                  <li key={category.value}>
                                    <button
                                      onClick={() => {
                                        setSelectedTopPlayerCategory(category.label);
                                        setIsOpen(false);
                                      }}
                                      className="w-full px-4 py-2 text-left hover:bg-orange-500/10 flex items-center justify-between transition-colors duration-150"
                                    >
                                      <span>{category.label}</span>
                                      {selectedTopPlayerCategory === category.label && (
                                        <Check className="h-4 w-4 text-orange-500" />
                                      )}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Top Players Info and Round 2 Controls */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm text-gray-300">
                        Total Top Players: {topPlayers.length}
                        {selectedTopPlayerCategory && selectedTopPlayerCategory !== 'All Categories' && selectedTopPlayerCategory !== 'all' && (
                          <span className="text-gray-500"> · Showing {topPlayersByPosition.total} in {selectedTopPlayerCategory}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-orange-500">
                          <FiInfo className="inline mr-1" />
                          Includes seeded players and round 1 qualifiers
                        </div>
                        {!round2Progress && topPlayers.length >= 2 && (
                          <button
                            onClick={initiateRound2}
                            className="bg-green-500/100 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm font-semibold"
                          >
                            <MdRocket className="w-4 h-4" /> Proceed to Round 2
                          </button>
                        )}
                        {round2Progress && (
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                              Round 2 {round2Progress.option === 'knockout' ? 'Knockout' : 'Group Stage'} - {round2Progress.status}
                            </div>
                            <button
                              onClick={() => setShowResetModal(true)}
                              className="text-xs bg-red-500/15 text-red-300 px-2 py-1 rounded hover:bg-red-500/20"
                              title="Reset Round 2 Progress"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Players — unified card with section dividers */}
                  {topPlayers.length === 0 ? (
                    <div className="text-center py-12 bg-[#181A22] border border-white/[0.08] rounded-2xl">
                      <div className="text-gray-400">
                        <FaStar className="mx-auto text-4xl mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No Top Players Yet</p>
                        <p className="text-sm mt-1">
                          Seed players by clicking the star icon in Registered Players, or complete Round 1 to see qualifiers here.
                        </p>
                      </div>
                    </div>
                  ) : topPlayersByPosition.total === 0 ? (
                    <div className="text-center py-12 bg-[#181A22] border border-white/[0.08] rounded-2xl">
                      <div className="text-gray-400">
                        <FaStar className="mx-auto text-4xl mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No Top Players in {selectedTopPlayerCategory}</p>
                        <p className="text-sm mt-1">Switch the category dropdown to see players from another category.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl shadow-sm overflow-hidden">
                      {topPlayersByPosition.positionKeys.map((rank) =>
                        renderPositionSection(rank, topPlayersByPosition.buckets[rank])
                      )}
                      {topPlayersByPosition.buckets.seeded.length > 0 &&
                        renderSeededSection(topPlayersByPosition.buckets.seeded)}
                      {topPlayersByPosition.buckets.unranked.length > 0 &&
                        renderUnrankedSection(topPlayersByPosition.buckets.unranked)}
                    </div>
                  )}
                </div>
              )}

              {/* Super Players Sub-tab */}
              {selectedSubTab === "Super Players" && (
                <div className="p-4">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Super Players</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{superPlayers.length} players qualified for knockout</p>
                      </div>
                      {!knockoutGenerated && superPlayers.length > 0 && (
                        <button
                          onClick={() => {
                            const count = superPlayers.length;
                            if (count < 3) {
                              toast.warn(`Minimum 3 Super Players required for knockout. Currently: ${count}`);
                              return;
                            }
                            if (count > 128) {
                              toast.warn(`Maximum 128 players supported for knockout. Currently: ${count}`);
                              return;
                            }
                            // Auto-pick smallest valid draw size that fits all
                            // qualifiers. Auto-seed count = number of seeded
                            // Top Players (star-marked), rounded down to a
                            // valid preset (0/2/4/8/16/32) and capped at
                            // drawSize/2.
                            const chosenDraw = defaultDrawFor(count);
                            const seededCount = knockoutPlayerList.filter((p) => p.isSeeded).length;
                            const VALID_SEED_COUNTS = [0, 2, 4, 8, 16, 32];
                            const maxSeedsForDraw = Math.floor(chosenDraw / 2);
                            const autoSeeds = [...VALID_SEED_COUNTS]
                              .reverse()
                              .find((n) => n <= seededCount && n <= maxSeedsForDraw) ?? 0;
                            setKnockoutSettings((prev) => ({
                              ...prev,
                              drawSize: chosenDraw,
                              numberOfSeeds: autoSeeds,
                            }));
                            setShowKnockoutModal(true);
                          }}
                          className="bg-orange-500/100 text-white px-6 py-2.5 rounded-xl hover:bg-orange-600 transition-colors flex items-center gap-2 font-bold text-sm active:scale-[0.97] w-auto"
                        >
                          <MdFlashOn className="w-4 h-4" /> Start Knockout
                        </button>
                      )}
                    </div>

                    {knockoutGenerated ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                        <h4 className="text-emerald-300 font-bold mb-1 flex items-center gap-2">
                          <FaTrophy className="w-4 h-4" /> Knockout Generated
                        </h4>
                        <p className="text-sm text-emerald-400">
                          The knockout bracket has been created. Go to the tournament knockout view to manage matches.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
                        <h4 className="text-orange-300 font-bold mb-1 flex items-center gap-2">
                          <FaTrophy className="w-4 h-4" /> Final Phase
                        </h4>
                        <p className="text-sm text-orange-400 mb-2">
                          Super Players from Round 2 are ready for the final knockout. Requires exactly 16, 32, or 64 players.
                        </p>
                        <ul className="text-xs text-orange-500 list-disc list-inside">
                          <li>Single elimination format</li>
                          <li>Winner takes the championship</li>
                          <li>Bracket-style matches until final</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Super Players Table */}
                  <div className="overflow-hidden">
                    {superPlayers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full bg-[#181A22] border border-white/[0.08] rounded-lg">
                          <thead className="bg-gradient-to-r from-orange-500/10 to-red-500/10">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-emerald-300">Avatar</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-emerald-300">Player Name</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-emerald-300">Points</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-emerald-300">Record</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-emerald-300">Status</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-emerald-300">Selection</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {superPlayers.map((player, index) => (
                              <tr key={player._id || index} className="hover:bg-emerald-500/10">
                                <td className="px-4 py-3">
                                  <img
                                    src={player.profileImage || player.playerId?.profileImage || `https://i.pravatar.cc/50?img=${Math.floor(Math.random() * 70)}`}
                                    alt={player.userName || player.playerName || player.playerId?.name || 'Player Avatar'}
                                    className="w-10 h-10 rounded-full border-2 border-emerald-500/30"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-white">
                                    {player.userName || player.playerName || player.playerId?.name || 'Unknown Player'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-emerald-400">
                                  {player.points || 0} pts
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-300">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{player.won || 0}W - {player.lost || 0}L</span>
                                    <span className="text-xs text-gray-400">Sets: {player.setsWon || 0} - {player.setsLost || 0}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-500/15 to-red-500/15 text-emerald-300">
                                    <GiLaurelCrown className="mr-1 w-3 h-3" /> Super Player
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-300">
                                    Round {player.selectedFromRound || 2} Winner
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-[#181A22] border border-white/[0.08] rounded-lg">
                        <div className="text-gray-400">
                          <div className="text-emerald-400 text-6xl mb-4 flex justify-center">
                            <GiLaurelCrown className="w-16 h-16" />
                          </div>
                          <p className="text-lg font-medium text-gray-300 mb-2">No Super Players Yet</p>
                          <p className="text-sm text-gray-300 mb-4">
                            Super Players will appear here after Top Players are selected from Round 2.
                          </p>
                          <div className="text-sm text-gray-400">
                            Complete Round 2 and select Top Players to populate this section.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Groups Tab Content */}
        {selectedTab === "Groups" && (
          <GroupsTab
            tournamentId={tournamentId}
            activeSportId={activeSportId}
            defaultSubTab={groupsDefaultSubTab}
          />
        )}
      </div>

      {/* Step 1: Number of Groups */}
      {modalStep === 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#1A1D27] border border-white/[0.08] p-[52px] rounded-[24px] relative min-w-[395px] shadow-lg min-h-[291px]">
            <button
              className="absolute top-4 right-4 text-xl text-gray-400 hover:text-white bg-transparent hover:bg-transparent w-auto"
              onClick={resetModal}
            >
              <FiX />
            </button>
            <h2 className="text-[16px] md:text-[18px] font-[600] text-center text-white mb-[10px]">
              {isRound2Mode ? "Create Round 2 Groups" : "Create Number of Groups"}
            </h2>
            <p className="text-center text-gray-400 mb-6">
              {isRound2Mode ? `Selected Top Players for Round 2: ${selectedRound2Players.length}` : `Selected Players: ${selectedPlayers.length}`}
            </p>

            <div className="text-center">
              <label className="block text-sm font-medium mb-2 text-gray-300">Number of Groups:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={numGroups}
                onChange={(e) => setNumGroups(parseInt(e.target.value) || 0)}
                className="w-full bg-[#12141B] border border-white/[0.08] text-white rounded-lg px-3 py-3 mb-6 text-center text-lg focus:outline-none focus:border-emerald-500 placeholder:text-gray-600"
                placeholder="Enter number of groups"
              />
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={resetModal}
                className="px-6 py-2 text-gray-300 border border-white/[0.08] rounded-lg hover:bg-white/[0.04] w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-orange-500/100 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
                disabled={numGroups < 1}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Group Names */}
      {modalStep === 2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#1A1D27] border border-white/[0.08] p-[52px] rounded-[24px] relative min-w-[395px] max-h-[453px] shadow-lg overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-xl text-gray-400 hover:text-white bg-transparent hover:bg-transparent w-auto"
              onClick={resetModal}
            >
              <FiX />
            </button>
            <h2 className="font-[600] md:text-[18px] text-center text-white mb-6">
              Enter Group Names
            </h2>

            <div className="space-y-4 mb-6">
              {groupNames.map((name, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Group {index + 1}:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...groupNames];
                      newNames[index] = e.target.value;
                      setGroupNames(newNames);
                    }}
                    className="w-full bg-[#12141B] border border-white/[0.08] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder:text-gray-600"
                    placeholder={`Group ${String.fromCharCode(65 + index)}`}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setModalStep(1)}
                className="px-6 py-2 text-gray-300 border border-white/[0.08] rounded-lg hover:bg-white/[0.04] w-auto"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-orange-500/100 text-white rounded-lg hover:bg-orange-600"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Players per Group */}
      {modalStep === 3 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#1A1D27] border border-white/[0.08] p-[52px] rounded-[24px] relative min-w-[395px] max-h-[515px] shadow-lg overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-xl text-gray-400 hover:text-white bg-transparent hover:bg-transparent w-auto"
              onClick={resetModal}
            >
              <FiX />
            </button>
            <h2 className="md:text-[18px] font-[600] text-center text-gray-100 mb-4">
              Distribute Players in Groups
            </h2>
            <p className="text-center text-gray-300 mb-6">
              Total Selected Players: {isRound2Mode ? selectedRound2Players.length : selectedPlayers.length}
            </p>

            <div className="space-y-4 mb-6">
              {groupNames.map((name, index) => (
                <div key={index} className="flex items-center justify-between bg-[#181A22] p-3 rounded-lg">
                  <label className="font-medium text-gray-300">{name}:</label>
                  <input
                    type="number"
                    min="0"
                    max={isRound2Mode ? selectedRound2Players.length : selectedPlayers.length}
                    value={groupPlayers[name] || ""}
                    onChange={(e) => {
                      setGroupPlayers(prev => ({
                        ...prev,
                        [name]: e.target.value
                      }));
                    }}
                    className="w-20 bg-[#12141B] border border-white/[0.08] text-white rounded px-2 py-1 text-center focus:outline-none focus:border-emerald-500 placeholder:text-gray-600"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-gray-300">
                Assigned: {groupNames.reduce((sum, name) => sum + (parseInt(groupPlayers[name]) || 0), 0)} / {isRound2Mode ? selectedRound2Players.length : selectedPlayers.length}
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setModalStep(2)}
                className="px-6 py-2 text-gray-300 border border-white/[0.08] rounded-lg hover:bg-white/[0.04] w-auto"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-orange-500/100 text-white rounded-lg hover:bg-orange-600"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {modalStep === 4 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#1A1D27] border border-white/[0.08] p-[52px] rounded-[24px] relative min-w-[381px] min-h-[294px] shadow-lg">
            <button
              className="absolute top-4 right-4 text-xl text-gray-400 hover:text-white bg-transparent hover:bg-transparent w-auto"
              onClick={resetModal}
            >
              <FiX />
            </button>
            <h2 className="md:text-[18px] text-white font-[600] text-center mb-4">
              Confirm Group Creation
            </h2>

            <div className="space-y-3 mb-6">
              <p className="text-center text-gray-300 mb-4">Distribution of Players:</p>
              {groupNames.map((name, index) => (
                <div key={index} className="flex justify-between bg-[#181A22] p-2 rounded">
                  <span className="font-medium">{name}:</span>
                  <span>{groupPlayers[name]} players</span>
                </div>
              ))}
            </div>

            <p className="text-center text-gray-300 mb-6">
              Are you sure you want to create these groups?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setModalStep(3)}
                className="px-6 py-2 text-gray-300 border border-white/[0.08] rounded-lg hover:bg-white/[0.04] w-auto"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 w-auto flex items-center gap-1"
              >
                <FiPlus /> Create Groups
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Success */}
      {modalStep === 5 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#1A1D27] border border-white/[0.08] p-[52px] rounded-2xl relative min-w-[404px] min-h-[265px] shadow-lg">
            <button
              className="absolute top-4 right-4 text-xl text-gray-400 hover:text-white bg-transparent hover:bg-transparent w-auto"
              onClick={resetModal}
            >
              <FiX />
            </button>
            <h2 className="text-lg font-semibold text-center text-gray-100 mb-4">
              {isRound2Mode ? `Round 2 Groups Created Successfully!` : `Created ${numGroups} Groups Successfully`}
            </h2>

            <div className="text-center mb-6">
              <div className="text-green-500 text-6xl mb-4">
                <FiCheck className="mx-auto" />
              </div>
              <p className="text-gray-300">
                {isRound2Mode
                  ? "Round 2 groups have been created with Top Players. You can now generate matches and proceed with Round 2!"
                  : "All groups have been created and players have been distributed."
                }
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Page will refresh in 2 seconds...
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={resetModal}
                className="px-6 py-2 bg-orange-500/100 text-white rounded-lg hover:bg-orange-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#181A22] p-8 rounded-lg relative max-w-md mx-4 shadow-lg">
            <button
              className="absolute top-4 right-4 text-xl text-gray-300 hover:text-gray-100"
              onClick={() => setShowDeleteWarning(false)}
            >
              <FiX />
            </button>

            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4 flex justify-center">
                <FiAlertTriangle />
              </div>

              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                Delete All Groups?
              </h2>

              <p className="text-gray-300 mb-6 text-left">
                <strong>Warning:</strong> This will permanently delete all groups and remove all player assignments for this tournament.
                <br /><br />
                This action cannot be undone. All players will be available for new group creation.
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDeleteWarning(false)}
                  className="px-6 py-2 text-gray-300 border border-white/[0.08] rounded-lg hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAllGroups}
                  className="px-6 py-2 bg-red-500/100 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                >
                  <FiTrash /> Delete All Groups
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seeding Confirmation Modal */}
      {showSeedingModal && playerToSeed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#181A22] p-8 rounded-lg relative max-w-md mx-4 shadow-lg">
            <button
              className="absolute top-4 right-4 text-xl text-gray-300 hover:text-gray-100"
              onClick={() => {
                setShowSeedingModal(false);
                setPlayerToSeed(null);
              }}
            >
              <FiX />
            </button>

            <div className="text-center">
              <div className="text-yellow-500 text-4xl mb-4 flex justify-center">
                <FaStar />
              </div>

              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {seededPlayers.includes(playerToSeed.id) ? 'Remove Seeded Player?' : 'Add Seeded Player?'}
              </h2>

              <div className="text-left mb-6">
                <p className="text-gray-300 mb-4">
                  <strong>Player:</strong> {playerToSeed.name}
                </p>

                {seededPlayers.includes(playerToSeed.id) ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                    <p className="text-red-300">
                      <FiInfo className="inline mr-2" />
                      This will remove the player from seeded status and Top Players list.
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                    <p className="text-orange-400">
                      <FiInfo className="inline mr-2" />
                      This player will be marked as seeded and will:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-orange-500 text-sm">
                      <li>Skip group stage matches</li>
                      <li>Advance directly to Round 2/Knockouts</li>
                      <li>Appear in the Top Players list</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setShowSeedingModal(false);
                    setPlayerToSeed(null);
                  }}
                  className="px-6 py-2 text-gray-300 border border-white/[0.08] rounded-lg hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSeedPlayer}
                  className={`px-6 py-2 rounded-lg text-white flex items-center gap-2 ${seededPlayers.includes(playerToSeed.id)
                    ? 'bg-red-500/100 hover:bg-red-600'
                    : 'bg-amber-500/100 hover:bg-yellow-600'
                    }`}
                >
                  <FaStar />
                  {seededPlayers.includes(playerToSeed.id) ? 'Remove Star' : 'Add Star'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skip-Round-2 Confirmation Modal */}
      {showSkipR2Modal && playerToSkipR2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-[#181A22] p-8 rounded-lg relative max-w-md mx-4 shadow-lg">
            <button
              className="absolute top-4 right-4 text-xl text-gray-300 hover:text-gray-100"
              onClick={() => {
                setShowSkipR2Modal(false);
                setPlayerToSkipR2(null);
              }}
            >
              <FiX />
            </button>

            <div className="text-center">
              <div className="text-yellow-500 text-4xl mb-4 flex justify-center">
                <FaStar />
              </div>

              <h2 className="text-xl font-semibold text-gray-100 mb-4">
                {playerToSkipR2.currentlySkipping ? 'Un-seed for Round 2?' : 'Seed for Final Knockout?'}
              </h2>

              <div className="text-left mb-6">
                <p className="text-gray-300 mb-4">
                  <strong>Player:</strong> {playerToSkipR2.playerName}
                </p>

                {playerToSkipR2.currentlySkipping ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                    <p className="text-red-300">
                      <FiInfo className="inline mr-2" />
                      This player will play Round 2 again. They will be eligible for Round 2 group/knockout selection.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-yellow-500/30 rounded p-3">
                    <p className="text-amber-300">
                      <FiInfo className="inline mr-2" />
                      This player will be seeded for the final knockout (Round 3) and will:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-amber-300 text-sm">
                      <li>Skip Round 2 entirely</li>
                      <li>Be placed directly in the final knockout bracket</li>
                      <li>Show a "Skip R2" badge in the qualifiers list</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setShowSkipR2Modal(false);
                    setPlayerToSkipR2(null);
                  }}
                  className="px-6 py-2 text-gray-300 border border-white/[0.08] rounded-lg hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSkipR2}
                  className={`px-6 py-2 rounded-lg text-white flex items-center gap-2 ${playerToSkipR2.currentlySkipping
                    ? 'bg-red-500/100 hover:bg-red-600'
                    : 'bg-amber-500/100 hover:bg-yellow-600'
                    }`}
                >
                  <FaStar />
                  {playerToSkipR2.currentlySkipping ? 'Remove Skip-R2' : 'Confirm Skip R2'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Round 2 Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-[#181A22] rounded-2xl max-w-md mx-4 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-red-500/100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold">Reset Round 2</h3>
                  <p className="text-red-100 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                Are you sure you want to reset Round 2? This will permanently delete:
              </p>
              <div className="bg-red-500/10 rounded-xl p-4 space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-red-300">
                  <span className="w-1.5 h-1.5 bg-red-500/100 rounded-full" />
                  All Round 2 <strong>groups</strong> and their player assignments
                </div>
                <div className="flex items-center gap-2 text-sm text-red-300">
                  <span className="w-1.5 h-1.5 bg-red-500/100 rounded-full" />
                  All Round 2 <strong>matches</strong> and their scores
                </div>
                <div className="flex items-center gap-2 text-sm text-red-300">
                  <span className="w-1.5 h-1.5 bg-red-500/100 rounded-full" />
                  All <strong>knockout bracket</strong> matches (if any)
                </div>
              </div>
              <p className="text-gray-400 text-xs">
                You will be able to create new Round 2 groups and matches from scratch after resetting.
              </p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 py-3 rounded-xl border border-white/[0.06] text-gray-300 font-semibold text-sm hover:bg-white/[0.04] transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetRound2}
                disabled={resetting}
                className="flex-1 py-3 rounded-xl bg-red-500/100 text-white font-semibold text-sm hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resetting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Reset Round 2
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round 2 Option Selection Modal */}
      {showRound2Modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-[#181A22] p-8 rounded-[24px] relative max-w-2xl w-full mx-4 shadow-2xl animate-fadeIn">
            <button
              className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-100 hover:bg-white/[0.06] rounded-full transition-colors"
              onClick={() => setShowRound2Modal(false)}
            >
              <FiX className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <MdRocket className="w-10 h-10 text-green-500" />
              </div>

              <h2 className="text-3xl font-bold text-gray-100 mb-3">
                Choose Round 2 Format
              </h2>

              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                You have <strong className="text-white">{topPlayers.length} Top Players</strong> ready
                {skipR2Count > 0 && (
                  <> (<strong className="text-amber-300">{skipR2Count}</strong> seeded for final knockout — will skip Round 2)</>
                )}.
                Pick a format — you'll choose which players to include on the next screen.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Group Stage 2 */}
                <div
                  onClick={() => setRound2Option('group_stage')}
                  className={`group relative text-left flex flex-col p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${round2Option === 'group_stage'
                    ? 'border-orange-500 bg-orange-500/10/40 shadow-lg ring-4 ring-orange-100'
                    : 'border-white/[0.06] hover:border-orange-500/40 hover:shadow-md'
                    }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${round2Option === 'group_stage' ? 'bg-orange-500/100 text-white' : 'bg-orange-500/15 text-orange-500'}`}>
                    <GiTrophyCup className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-white">Group Stage 2</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Selected players play another round-robin group stage. Winners become Super Players for the final knockout.
                  </p>
                  {round2Option === 'group_stage' && (
                    <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-orange-500/100 text-white flex items-center justify-center shadow-md">
                      <FiCheck className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Direct Knockout */}
                <div
                  onClick={() => setRound2Option('knockout')}
                  className={`group relative text-left flex flex-col p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${round2Option === 'knockout'
                    ? 'border-red-500 bg-red-500/10/40 shadow-lg ring-4 ring-red-100'
                    : 'border-white/[0.06] hover:border-red-500/40 hover:shadow-md'
                    }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${round2Option === 'knockout' ? 'bg-red-500/100 text-white' : 'bg-red-500/15 text-red-500'}`}>
                    <MdFlashOn className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-white">Direct Knockout</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    Selected players go straight into a single-elimination bracket. Winner takes all.
                  </p>
                  {round2Option === 'knockout' && (
                    <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-red-500/100 text-white flex items-center justify-center shadow-md">
                      <FiCheck className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowRound2Modal(false)}
                  className="px-8 py-3 text-gray-300 font-medium hover:bg-white/[0.06] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRound2Option(round2Option)}
                  disabled={!round2Option}
                  className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform flex items-center gap-3 ${round2Option
                    ? 'bg-gray-900 hover:bg-black hover:scale-105 active:scale-95'
                    : 'bg-white/[0.10] cursor-not-allowed'
                    }`}
                >
                  Next: Pick Players <MdRocket className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knockout Scheduling Modal */}
      {showKnockoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#181A22] rounded-lg shadow-xl p-6 w-full max-w-xl my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MdFlashOn className="w-5 h-5 text-red-500" />
                Schedule Knockout Tournament
              </h3>
              <button
                onClick={() => setShowKnockoutModal(false)}
                className="text-gray-300 hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {tournamentCourts.length > 0 ? (
                // Catalog has active courts → show preview, hide manual input.
                // Server uses tournament.courts to round-robin assign matches
                // round-by-round (round-aware scheduling).
                <CourtPoolPreview
                  courts={tournamentCourts}
                  startTime={knockoutSettings.matchStartTime
                    ? new Date(knockoutSettings.matchStartTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : null}
                  intervalMinutes={knockoutSettings.intervalMinutes}
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Court Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={knockoutSettings.courtNumber}
                    onChange={(e) => setKnockoutSettings(prev => ({
                      ...prev,
                      courtNumber: parseInt(e.target.value)
                    }))}
                    className="w-full p-2 border border-white/[0.08] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter court number"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Match Start Time
                </label>
                <input
                  type="datetime-local"
                  value={knockoutSettings.matchStartTime}
                  onChange={(e) => setKnockoutSettings(prev => ({
                    ...prev,
                    matchStartTime: e.target.value
                  }))}
                  className="w-full p-2 border border-white/[0.08] rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Per-round bestOf + slot + match duration + inter-round break */}
              <KnockoutFormatPanel
                drawSize={knockoutSettings.drawSize}
                isSetBased={isSetBasedSport(tournament, activeSportId)}
                customizeRounds={knockoutSettings.customizeRounds}
                setCustomizeRounds={(v) => setKnockoutSettings(p => ({ ...p, customizeRounds: v }))}
                uniformBestOf={knockoutSettings.uniformBestOf}
                setUniformBestOf={(v) => setKnockoutSettings(p => ({ ...p, uniformBestOf: v }))}
                uniformSlot={knockoutSettings.slotDurationMinutes ?? 30}
                setUniformSlot={(v) => setKnockoutSettings(p => ({ ...p, slotDurationMinutes: v }))}
                uniformMatch={knockoutSettings.matchDurationMinutes ?? 20}
                setUniformMatch={(v) => setKnockoutSettings(p => ({ ...p, matchDurationMinutes: v }))}
                roundOverrides={knockoutSettings.roundOverrides}
                setRoundOverrides={(v) => setKnockoutSettings(p => ({
                  ...p,
                  roundOverrides: typeof v === "function" ? v(p.roundOverrides) : v,
                }))}
                breakBetweenRoundsMinutes={knockoutSettings.breakBetweenRoundsMinutes}
                setBreakBetweenRoundsMinutes={(v) => setKnockoutSettings(p => ({ ...p, breakBetweenRoundsMinutes: v }))}
              />

              {/* Draw Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Draw Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {VALID_KO_DRAW_SIZES.map((size) => {
                    const tooSmall = superPlayers.length > size;
                    const active = knockoutSettings.drawSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={tooSmall}
                        onClick={() => setKnockoutSettings((p) => ({
                          ...p,
                          drawSize: size,
                          numberOfSeeds: Math.min(p.numberOfSeeds, size / 2),
                        }))}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold w-auto transition-all ${
                          tooSmall
                            ? "bg-red-500/10 text-red-300 border border-red-500/30 cursor-not-allowed"
                            : active
                              ? "bg-orange-500/100 text-white shadow-sm"
                              : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {superPlayers.length}/{knockoutSettings.drawSize} players — {Math.max(0, knockoutSettings.drawSize - superPlayers.length)} BYEs
                </p>
              </div>

              {/* Number of Seeded Players */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Number of Seeded Players
                </label>
                <div className="flex flex-wrap gap-2">
                  {[0, 2, 4, 8, 16, 32].filter((n) => n <= knockoutSettings.drawSize / 2).map((n) => {
                    const active = knockoutSettings.numberOfSeeds === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setKnockoutSettings((p) => ({ ...p, numberOfSeeds: n }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold w-auto transition-all ${
                          active ? "bg-orange-500/100 text-white shadow-sm" : "bg-white/[0.06] text-gray-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        {n === 0 ? "None" : n}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {knockoutSettings.numberOfSeeds === 0
                    ? "No seeding — players placed in rank order (legacy sequential pairing)."
                    : `Top ${knockoutSettings.numberOfSeeds} ranked players get fixed Mirror & Flip positions. Remaining placed into unseeded slots.`}
                </p>
              </div>

              {/* Live preview — with actual player names once topPlayers + superPlayers are loaded */}
              <SeedPositionsPreview
                drawSize={knockoutSettings.drawSize}
                numberOfSeeds={knockoutSettings.numberOfSeeds}
                players={knockoutPlayerList}
              />

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="text-orange-500 mt-0.5">ℹ️</div>
                  <div className="text-sm text-orange-400">
                    <p className="font-medium mb-1">Tournament Info:</p>
                    <p>• {superPlayers.length} Super Players qualified from groups</p>
                    <p>• Draw size {knockoutSettings.drawSize}, {knockoutSettings.numberOfSeeds} seeded</p>
                    <p>• Matches scheduled with your specified interval</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowKnockoutModal(false)}
                className="px-4 py-2 text-gray-300 border border-white/[0.08] rounded-lg hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={generateKnockoutMatches}
                className="px-4 py-2 bg-red-500/100 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <MdFlashOn className="w-4 h-4" />
                Generate Knockout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 DIRECT KNOCKOUT PLAYER SELECTION MODAL (ENHANCED FOR SIZE SELECTION) */}
      {showDirectKnockoutPlayerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-[#181A22] p-8 rounded-[24px] relative max-w-5xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
                    <MdFlashOn className="w-6 h-6 text-red-500" />
                  </div>
                  Knockout Setup
                </h2>
                <p className="text-gray-400 mt-1 ml-14">Select the tournament structure based on available players.</p>
              </div>
              <button
                onClick={() => setShowDirectKnockoutPlayerModal(false)}
                className="p-2 text-gray-300 hover:text-gray-100 hover:bg-white/[0.06] rounded-full transition-colors"
                title="Close"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Skip-R2 banner (final-KO seeds excluded from the picker pool) */}
            {round2FilterCounts.skipR2 > 0 && (
              <div className="bg-amber-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                <FaStar className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <p className="text-sm text-amber-300">
                  <strong>{round2FilterCounts.skipR2}</strong> player{round2FilterCounts.skipR2 === 1 ? ' is' : 's are'} seeded for the final knockout and excluded from this bracket. They'll join Round 3 directly.
                </p>
              </div>
            )}

            {/* Filter chips — narrow the available pool by position / seeded */}
            {(() => {
              const chips = [
                { key: 'all', label: 'All', count: round2FilterCounts.all },
                ...Object.keys(round2FilterCounts.positions || {})
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((rank) => ({ key: `pos_${rank}`, label: `Top ${rank}`, count: round2FilterCounts.positions[rank] })),
                ...(round2FilterCounts.seeded > 0
                  ? [{ key: 'seeded', label: 'Seeded', count: round2FilterCounts.seeded }]
                  : []),
              ];
              return (
                <div className="flex items-center gap-2 flex-wrap mb-6">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Filter pool:</span>
                  {chips.map((c) => {
                    const active = round2Filter === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => setRound2Filter(c.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${active
                          ? 'bg-red-500/100 text-white border-red-500 shadow-sm'
                          : 'bg-[#181A22] text-gray-300 border-white/[0.08] hover:border-red-500/40 hover:text-red-400'
                          }`}
                      >
                        {c.label}
                        <span className={`ml-1.5 ${active ? 'text-red-100' : 'text-gray-500'}`}>({c.count})</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            <div className="mb-10">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 mb-8 border border-white/[0.06]">
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-[#181A22] p-2 rounded-lg shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Pool</span>
                  </div>
                  <div className="h-px bg-white/[0.10] flex-1"></div>
                </div>
                <p className="text-lg text-gray-300">
                  You have <span className="text-3xl font-bold text-white mx-1">{round2FilteredPlayers.length}</span>
                  {round2Filter === 'all' ? ' Top Players' : ` ${round2Filter === 'seeded' ? 'Seeded' : `Top ${round2Filter.replace('pos_', '')}`} players`} in the pool.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[4, 8, 16, 32, 64, 128].map((size) => {
                  const minForSize = Math.ceil(size / 2) + 1;
                  const isAvailable = round2FilteredPlayers.length >= minForSize;
                  const actualPlayers = Math.min(round2FilteredPlayers.length, size);
                  const byes = size - actualPlayers;
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        if (isAvailable) {
                          const newSelection = round2FilteredPlayers.slice(0, Math.min(round2FilteredPlayers.length, size));
                          setSelectedDirectKnockoutPlayers(newSelection);
                          setShowDirectKnockoutPlayerModal(false);
                          setShowDirectKnockoutScheduleModal(true);
                        }
                      }}
                      disabled={!isAvailable}
                      className={`group relative overflow-hidden p-8 rounded-[20px] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-4 h-64 ${isAvailable
                        ? 'border-white/[0.06] bg-[#181A22] hover:border-red-500 hover:shadow-xl cursor-pointer'
                        : 'border-white/[0.06] bg-gray-50/50 opacity-60 cursor-not-allowed grayscale'
                        }`}
                    >
                      {/* Decorative Background Element */}
                      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${isAvailable ? 'bg-red-500/100' : 'bg-white/[0.12]'}`}></div>

                      <div className={`text-6xl font-black tracking-tighter transition-transform group-hover:scale-110 ${isAvailable ? 'text-white group-hover:text-red-500' : 'text-gray-300'}`}>
                        {size}
                      </div>

                      <div className="text-center z-10 relative">
                        <div className={`text-lg font-bold mb-1 ${isAvailable ? 'text-gray-300' : 'text-gray-300'}`}>
                          Round of {size}
                        </div>
                        <div className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${isAvailable
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-red-500/10 text-red-500'
                          }`}>
                          {isAvailable ? '✅ Ready to Start' : `Need ${size - topPlayers.length} more`}
                        </div>
                      </div>

                      {isAvailable && (
                        <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 font-semibold text-sm flex items-center gap-1">
                          Select & Proceed <MdRocket />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Selection Toggle */}
            <div className="border-t border-white/[0.06] pt-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-100">Manual Selection</h3>
                  <p className="text-sm text-gray-400">Custom bracket sizes or specific player selection</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDirectKnockoutPlayers([])}
                    className="text-xs font-medium text-red-500 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Reset Checkboxes
                  </button>
                  {[4, 8].map(count => (
                    <button
                      key={count}
                      onClick={() => {
                        const newSelection = topPlayers.slice(0, count);
                        setSelectedDirectKnockoutPlayers(newSelection);
                      }}
                      disabled={topPlayers.length < count}
                      className="text-xs font-medium bg-white/[0.06] hover:bg-white/[0.08] text-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Pick Top {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-60 overflow-y-auto p-1">
                {topPlayers.map((player) => {
                  const isSelected = selectedDirectKnockoutPlayers.some(p =>
                    (p.playerId || p._id) === (player.playerId || player._id)
                  );
                  return (
                    <div
                      key={player.playerId || player._id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDirectKnockoutPlayers(prev =>
                            prev.filter(p => (p.playerId || p._id) !== (player.playerId || player._id))
                          );
                        } else {
                          setSelectedDirectKnockoutPlayers(prev => [...prev, player]);
                        }
                      }}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-3 group ${isSelected
                        ? 'border-red-500 bg-red-500/10 shadow-sm'
                        : 'border-white/[0.06] bg-[#181A22] hover:border-white/[0.08]'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500/100 border-red-500' : 'bg-transparent border-white/[0.08] group-hover:border-white/[0.10]'
                        }`}>
                        {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm truncate font-medium ${isSelected ? 'text-red-300' : 'text-gray-300'}`}>
                        {player.playerName || player.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/[0.06]">
                <div className="text-sm">
                  <span className="text-gray-400">Selected Count: </span>
                  <span className={`font-bold text-lg ${selectedDirectKnockoutPlayers.length >= 4 ? 'text-green-400' : 'text-white'}`}>{selectedDirectKnockoutPlayers.length}</span>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDirectKnockoutPlayerModal(false)}
                    className="px-6 py-2.5 text-gray-300 font-medium hover:bg-white/[0.06] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDirectKnockoutPlayerSelection}
                    disabled={selectedDirectKnockoutPlayers.length < 4}
                    className={`px-6 py-2.5 rounded-lg text-white font-bold flex items-center gap-2 shadow-lg transition-all ${selectedDirectKnockoutPlayers.length >= 4
                      ? 'bg-gray-900 hover:bg-black hover:-translate-y-0.5'
                      : 'bg-white/[0.10] cursor-not-allowed'
                      }`}
                  >
                    Confirm Selection <MdRocket />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 DIRECT KNOCKOUT SCHEDULE MODAL (ENHANCED) */}
      {showDirectKnockoutScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-[#181A22] rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl animate-fadeIn flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center flex-shrink-0">
                  <BiTrophy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate">Schedule Knockout Matches</h2>
                  <p className="text-[11px] text-gray-400 truncate">Review settings, then create the bracket</p>
                </div>
              </div>
              <button
                onClick={() => setShowDirectKnockoutScheduleModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] bg-transparent w-auto"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Body (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Stats strip — uses drawSize so math is always accurate */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-white/[0.06] px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Players</p>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {selectedDirectKnockoutPlayers.length}
                    <span className="text-sm text-gray-500 font-normal"> / {knockoutSchedule.drawSize}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.06] px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Matches</p>
                  <p className="text-lg font-bold text-white mt-0.5">{knockoutSchedule.drawSize - 1}</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] px-3 py-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rounds</p>
                  <p className="text-lg font-bold text-white mt-0.5">{Math.log2(knockoutSchedule.drawSize)}</p>
                </div>
              </div>

              {/* Schedule fields — single 4-column row */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Schedule</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={knockoutSchedule.startDate}
                      onChange={(e) => setKnockoutSchedule((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-2.5 py-2 text-sm bg-[#181A22] border border-white/[0.08] rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={knockoutSchedule.startTime}
                      onChange={(e) => setKnockoutSchedule((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-2.5 py-2 text-sm bg-[#181A22] border border-white/[0.08] rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                    />
                  </div>
                  {tournamentCourts.length === 0 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">Court</label>
                      <input
                        type="number" min="1" max="10" placeholder="1"
                        value={knockoutSchedule.courtNumber}
                        onChange={(e) => setKnockoutSchedule((prev) => ({ ...prev, courtNumber: parseInt(e.target.value) }))}
                        className="w-full px-2.5 py-2 text-sm bg-[#181A22] border border-white/[0.08] rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                      />
                    </div>
                  )}
                </div>
                {/* Per-round bestOf + slot + match duration + inter-round break */}
                <div className="mt-3">
                  <KnockoutFormatPanel
                    drawSize={knockoutSchedule.drawSize}
                    isSetBased={isSetBasedSport(tournament, activeSportId)}
                    customizeRounds={knockoutSchedule.customizeRounds}
                    setCustomizeRounds={(v) => setKnockoutSchedule(p => ({ ...p, customizeRounds: v }))}
                    uniformBestOf={knockoutSchedule.uniformBestOf}
                    setUniformBestOf={(v) => setKnockoutSchedule(p => ({ ...p, uniformBestOf: v }))}
                    uniformSlot={knockoutSchedule.slotDurationMinutes ?? 30}
                    setUniformSlot={(v) => setKnockoutSchedule(p => ({ ...p, slotDurationMinutes: v }))}
                    uniformMatch={knockoutSchedule.matchDurationMinutes ?? 20}
                    setUniformMatch={(v) => setKnockoutSchedule(p => ({ ...p, matchDurationMinutes: v }))}
                    roundOverrides={knockoutSchedule.roundOverrides}
                    setRoundOverrides={(v) => setKnockoutSchedule(p => ({
                      ...p,
                      roundOverrides: typeof v === "function" ? v(p.roundOverrides) : v,
                    }))}
                    breakBetweenRoundsMinutes={knockoutSchedule.breakBetweenRoundsMinutes}
                    setBreakBetweenRoundsMinutes={(v) => setKnockoutSchedule(p => ({ ...p, breakBetweenRoundsMinutes: v }))}
                    accent="#F97316"
                  />
                </div>
                {tournamentCourts.length > 0 && (
                  <div className="mt-3">
                    <CourtPoolPreview
                      courts={tournamentCourts}
                      startTime={knockoutSchedule.startTime}
                      intervalMinutes={knockoutSchedule.slotDurationMinutes}
                    />
                  </div>
                )}
              </div>

              {/* Draw Method — segmented control */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bracket Draw Method</p>
                <div className="inline-flex items-center gap-1 p-1 bg-white/[0.06] rounded-lg">
                  {[
                    { value: 'global', label: 'Global Rules', hint: '1 vs Last, balanced' },
                    { value: 'local', label: 'Local Rules', hint: 'Custom templates' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDrawMethod(opt.value)}
                      className={`px-4 py-1.5 rounded-md text-sm font-semibold w-auto transition-all ${
                        drawMethod === opt.value
                          ? 'bg-[#181A22] text-orange-400 shadow-sm'
                          : 'bg-transparent text-gray-300 hover:text-white'
                      }`}
                      title={opt.hint}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draw Size + Number of Seeded Players — side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Draw Size</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VALID_KO_DRAW_SIZES.map((size) => {
                      const tooSmall = selectedDirectKnockoutPlayers.length > size;
                      const active = knockoutSchedule.drawSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={tooSmall}
                          onClick={() => setKnockoutSchedule((p) => ({
                            ...p,
                            drawSize: size,
                            numberOfSeeds: Math.min(p.numberOfSeeds, Math.floor(size / 2)),
                          }))}
                          className={`px-3 py-1 rounded-md text-xs font-bold w-auto transition-all ${
                            tooSmall
                              ? 'bg-red-500/10 text-red-300 border border-red-500/30 cursor-not-allowed'
                              : active
                                ? 'bg-orange-500/100 text-white'
                                : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.08]'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {Math.max(0, knockoutSchedule.drawSize - selectedDirectKnockoutPlayers.length)} BYEs
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Seeded Players</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 2, 4, 8, 16, 32].filter((n) => n <= Math.floor(knockoutSchedule.drawSize / 2)).map((n) => {
                      const active = knockoutSchedule.numberOfSeeds === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setKnockoutSchedule((p) => ({ ...p, numberOfSeeds: n }))}
                          className={`px-3 py-1 rounded-md text-xs font-bold w-auto transition-all ${
                            active ? 'bg-orange-500/100 text-white' : 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.08]'
                          }`}
                        >
                          {n === 0 ? 'None' : n}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {knockoutSchedule.numberOfSeeds === 0
                      ? 'Sequential pairing.'
                      : `Top ${knockoutSchedule.numberOfSeeds} at fixed Mirror & Flip positions.`}
                  </p>
                </div>
              </div>

              {/* Live preview */}
              <SeedPositionsPreview
                drawSize={knockoutSchedule.drawSize}
                numberOfSeeds={knockoutSchedule.numberOfSeeds}
                players={round2KnockoutPlayerList}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/[0.05] flex items-center justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowDirectKnockoutScheduleModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300 bg-white/[0.06] hover:bg-white/[0.08] w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleDirectKnockoutCreation}
                disabled={!knockoutSchedule.startDate || !knockoutSchedule.startTime || isSubmittingKnockout}
                className={`px-5 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-2 w-auto transition-colors ${
                  knockoutSchedule.startDate && knockoutSchedule.startTime && !isSubmittingKnockout
                    ? 'bg-orange-500/100 hover:bg-orange-600'
                    : 'bg-white/[0.10] cursor-not-allowed'
                }`}
              >
                <MdFlashOn className="w-4 h-4" />
                {isSubmittingKnockout ? 'Creating…' : 'Create Matches'}
              </button>
            </div>
          </div>
        </div>
      )}

    </TournamentShell>
  );
};

export default GroupStageManagement;