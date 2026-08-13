import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import groupTabsApi from "./groupTabsApi";
import { getMatchFormat as getMatchFormatHelper } from "../../utils/sportTrack";

// ================================================
// CENTRALIZED STATE FOR THE ENTIRE GROUP TABS FLOW
// Eliminates 44 useState hooks scattered in one file
// ================================================

const GroupTabsContext = createContext(null);

export const useGroupTabs = () => {
  const ctx = useContext(GroupTabsContext);
  if (!ctx) throw new Error("useGroupTabs must be used within GroupTabsProvider");
  return ctx;
};

export function GroupTabsProvider({ tournamentId: propTournamentId, children }) {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("tournamentId") || propTournamentId;

  // ---- Core Data ----
  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- STEP 11c — Multi-sport active sport (null = legacy single-sport,
  //      no ?sportId query param sent → backend's STEP 11a fallback returns
  //      unfiltered data, matching pre-multi-sport behaviour).
  const [activeSportId, setActiveSportId] = useState(null);

  // ---- Navigation ----
  const [activeTab, setActiveTab] = useState("League"); // League | Top Players | Knockout
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  // ---- Round 1 Matches ----
  const [matchesData, setMatchesData] = useState({});
  const [groupsWithMatches, setGroupsWithMatches] = useState(new Set());

  // ---- Round 2 ----
  const [round2Groups, setRound2Groups] = useState([]);
  const [activeRound2Group, setActiveRound2Group] = useState(null);
  const [round2MatchesData, setRound2MatchesData] = useState({});

  // ---- Knockout ----
  const [knockoutMatchesByRound, setKnockoutMatchesByRound] = useState({});

  // ---- Direct Knockout ----
  const [directKnockoutMatches, setDirectKnockoutMatches] = useState([]);
  const [availablePlayersForKnockout, setAvailablePlayersForKnockout] = useState([]);

  // ---- Sub-step 5 — Court catalog for the active sport ----
  // Drives the inline <CourtPicker> on group-stage and knockout match cards.
  // Empty array → picker degrades to a static badge (no catalog).
  const [tournamentCourts, setTournamentCourts] = useState([]);

  // ================================================
  // DATA FETCHING
  // ================================================

  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await groupTabsApi.fetchTournament(tournamentId);
      if (res.data) {
        const t = res.data.tournament || res.data;
        setTournament(t);
      }
    } catch (err) {
      console.error("Error fetching tournament:", err.message);
    }
  }, [tournamentId]);

  const fetchGroups = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const res = await groupTabsApi.fetchGroups(tournamentId, activeSportId);
      if (res.data.success) {
        const round1Groups = (res.data.data || []).filter(
          (g) => !g.groupName?.toLowerCase().includes("round 2") && !g.isRound2
        );
        setGroups(round1Groups);
        if (round1Groups.length > 0 && !activeGroup) {
          setActiveGroup(round1Groups[0]._id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // STEP 11c: activeSportId in deps so this regenerates on sport switch
    // and the re-fetch effect below can rely on its identity changing.
    // activeGroup is INTENTIONALLY excluded — it's read inside (the
    // `!activeGroup` guard) but adding it to deps would re-fetch all groups
    // every time the user clicks a different group tab. Stale-closure
    // pattern preserved from the original code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, activeSportId]);

  const fetchMatches = useCallback(async (groupId) => {
    const gId = groupId || activeGroup;
    if (!tournamentId || !gId) return;
    try {
      const res = await groupTabsApi.fetchGroupMatches(tournamentId, gId);
      if (res.data.success) {
        setMatchesData((prev) => ({ ...prev, [gId]: res.data.matches || [] }));
        if ((res.data.matches || []).length > 0) {
          setGroupsWithMatches((prev) => new Set([...prev, gId]));
        }
      }
    } catch {
      setMatchesData((prev) => ({ ...prev, [gId]: [] }));
    }
  }, [tournamentId, activeGroup]);

  const fetchRound2Groups = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await groupTabsApi.fetchRound2Groups(tournamentId, activeSportId);
      if (res.data.success) {
        const r2 = (res.data.data || res.data.groups || []).filter(
          (g) => g.groupName?.toLowerCase().includes("round 2") || g.isRound2
        );
        setRound2Groups(r2);
        if (r2.length > 0 && !activeRound2Group) {
          setActiveRound2Group(r2[0]._id);
        }
        // Fetch matches for each R2 group
        for (const g of r2) {
          try {
            const mRes = await groupTabsApi.fetchGroupMatches(tournamentId, g._id);
            if (mRes.data.success) {
              setRound2MatchesData((prev) => ({ ...prev, [g._id]: mRes.data.matches || [] }));
            }
          } catch (err) {
            console.warn(`Round 2 match fetch failed for group ${g._id}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching Round 2 groups:", err.message);
    }
    // STEP 11c: activeSportId in deps so this regenerates on sport switch.
    // activeRound2Group intentionally excluded — same reason as fetchGroups.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, activeSportId]);

  const fetchKnockoutMatches = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await groupTabsApi.fetchKnockoutMatches(tournamentId, activeSportId);
      if (res.data.success) {
        const matches = res.data.matches || [];
        const byRound = {};
        matches.forEach((m) => {
          const round = m.roundName || m.round || "round-1";
          if (!byRound[round]) byRound[round] = [];
          byRound[round].push(m);
        });
        setKnockoutMatchesByRound(byRound);
      }
    } catch (err) {
      console.warn("Error fetching knockout matches:", err.message);
    }
    // STEP 11c: activeSportId in deps for sport-switch re-fetches.
  }, [tournamentId, activeSportId]);

  const fetchAvailablePlayers = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await groupTabsApi.fetchAvailablePlayers(tournamentId, activeSportId);
      if (res.data.success) {
        setAvailablePlayersForKnockout(res.data.players || []);
      }
    } catch (err) {
      console.warn("Error fetching available players:", err.message);
    }
    // STEP 11c: activeSportId in deps for sport-switch re-fetches.
  }, [tournamentId, activeSportId]);

  // ================================================
  // INITIAL LOAD
  // ================================================

  // Tournament metadata is sport-independent — only re-fetch on tournamentId.
  useEffect(() => {
    if (tournamentId) fetchTournamentData();
  }, [tournamentId, fetchTournamentData]);

  // STEP 11c — Init / re-validate activeSportId when tournament arrives
  // (mirrors STEP 11b fix #2: fires on data arrival, not just mount).
  useEffect(() => {
    if (!tournament) return;
    if (Array.isArray(tournament.sports) && tournament.sports.length > 0) {
      const validIds = tournament.sports.map((s) => String(s.sportId));
      const current = activeSportId ? String(activeSportId) : null;
      if (!current || !validIds.includes(current)) {
        setActiveSportId(tournament.sports[0].sportId);
      }
    } else {
      setActiveSportId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament]);

  // Sport-scoped fetches — re-fire whenever activeSportId changes (the
  // useCallback-wrapped functions above have activeSportId in their deps,
  // so their refs change on sport switch and trigger this effect).
  useEffect(() => {
    if (!tournamentId) return;
    fetchGroups();
    fetchKnockoutMatches();
    fetchRound2Groups();
  }, [tournamentId, activeSportId, fetchGroups, fetchKnockoutMatches, fetchRound2Groups]);

  // Sub-step 5 — court catalog fetch. Active courts only, sport-scoped.
  // Re-fires on tournament + sport change so the picker stays in sync.
  const fetchTournamentCourts = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const sportQuery = activeSportId ? `?sportId=${activeSportId}` : "";
      const res = await axios.get(`/api/tournaments/${tournamentId}/courts${sportQuery}`);
      setTournamentCourts(res.data?.courts || []);
    } catch (err) {
      console.error("Failed to fetch courts:", err.message);
      setTournamentCourts([]);
    }
  }, [tournamentId, activeSportId]);

  useEffect(() => {
    fetchTournamentCourts();
  }, [fetchTournamentCourts]);

  useEffect(() => {
    if (activeGroup) fetchMatches(activeGroup);
  }, [activeGroup, fetchMatches]);

  // STEP 11c — Sport switch handler. Resets activeGroup / activeRound2Group
  // so fetchGroups / fetchRound2Groups (re-fired by the effect above) can
  // pick a fresh "first group" for the new sport. V2 doesn't host a
  // destructive Round 2 reset flow, so no confirmation prompt here — add
  // one if a destructive flow lands in V2 panels later.
  const handleSportSwitch = useCallback((newSportId) => {
    if (String(newSportId) === String(activeSportId)) return;
    setActiveGroup(null);
    setActiveRound2Group(null);
    setMatchesData({});
    setRound2MatchesData({});
    setKnockoutMatchesByRound({});
    setActiveSportId(newSportId);
  }, [activeSportId]);

  // ================================================
  // DERIVED STATE
  // ================================================

  const filteredGroups = groups.filter((g) => {
    if (!selectedCategory) return true;
    const gCat = (g.category || "").toLowerCase().trim().replace(/_/g, " ");
    const sCat = selectedCategory.toLowerCase().trim().replace(/_/g, " ");
    return gCat === sCat || gCat.includes(sCat) || sCat.includes(gCat);
  });

  const currentGroup = filteredGroups.find((g) => g._id === activeGroup) || filteredGroups[0];

  const filteredRound2Groups = (round2Groups || []).filter((g) => {
    if (!selectedCategory) return true;
    const gCat = (g.category || "").toLowerCase().trim().replace(/_/g, " ");
    const sCat = selectedCategory.toLowerCase().trim().replace(/_/g, " ");
    return gCat === sCat || gCat.includes(sCat) || sCat.includes(gCat);
  });

  const currentRound2Group =
    filteredRound2Groups.find((g) => g._id === activeRound2Group) || filteredRound2Groups[0];

  const getMatchFormat = () => {
    const groupData = groups.find((g) => g._id === activeGroup);
    // STEP 17b.ii — read tournament.matchFormat per active sport.
    const sportMF = getMatchFormatHelper(tournament, activeSportId);
    const maxSets = groupData?.matchFormat?.totalSets || sportMF?.totalSets || 5;
    return { maxSets, setsToWin: Math.ceil(maxSets / 2) };
  };

  // ================================================
  // CONTEXT VALUE
  // ================================================

  const value = {
    // IDs
    tournamentId,

    // Core data
    tournament,
    groups,
    loading,
    error,

    // Navigation
    activeTab, setActiveTab,
    activeGroup, setActiveGroup,
    selectedCategory, setSelectedCategory,

    // Round 1
    matchesData, setMatchesData,
    groupsWithMatches,
    filteredGroups,
    currentGroup,

    // Round 2
    round2Groups,
    activeRound2Group, setActiveRound2Group,
    round2MatchesData,
    filteredRound2Groups,
    currentRound2Group,

    // Knockout
    knockoutMatchesByRound, setKnockoutMatchesByRound,

    // Direct Knockout
    directKnockoutMatches,
    availablePlayersForKnockout,

    // Sub-step 5 — Court catalog for the inline picker
    tournamentCourts,
    fetchTournamentCourts,

    // Derived
    getMatchFormat,

    // STEP 11c — Multi-sport
    activeSportId,
    handleSportSwitch,

    // Actions
    fetchMatches,
    fetchGroups,
    fetchRound2Groups,
    fetchKnockoutMatches,
    fetchAvailablePlayers,
    fetchTournamentData,
  };

  return (
    <GroupTabsContext.Provider value={value}>
      {children}
    </GroupTabsContext.Provider>
  );
}

export default GroupTabsContext;
