import axios from "axios";

import { getAuthToken } from "../../shared/api/authToken";
const getAuth = () => {
  const token = getAuthToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const refereeApi = {
  fetchReferees: async () => {
    const res = await axios.get("/api/referee/referees", getAuth());
    return res.data?.referees || res.data || [];
  },

  fetchRequests: async (status) => {
    const url = status ? `/api/referee/requests?status=${status}` : "/api/referee/requests";
    const res = await axios.get(url, getAuth());
    return res.data?.requests || res.data || [];
  },

  createRequest: async (formData) => {
    const res = await axios.post("/api/referee/requests", formData, getAuth());
    return res.data;
  },

  updateRequestStatus: async ({ id, status }) => {
    const res = await axios.put(`/api/referee/requests/${id}/status`, { status }, getAuth());
    return res.data;
  },

  // Fetch umpire applicants for a tournament (Phase 2 — manager view).
  // Default returns status="pending" applicants. Pass { includeAll: true } to
  // also include accepted applicants (needed for the "Assign to Match" modal).
  fetchTournamentApplicants: async (tournamentId, { includeAll = false } = {}) => {
    const url = `/api/referee/applicants/${tournamentId}${includeAll ? "?includeAll=true" : ""}`;
    const res = await axios.get(url, getAuth());
    return res.data?.applicants || [];
  },

  // Assign an umpire to a specific match (Phase 2 — manager action).
  // Creates a match-level Assignment (status="pending") and writes match.referee.
  // Backend also flips the source StaffApplication to "accepted" if one exists.
  assignUmpireToMatch: async ({ matchId, refereeUserId }) => {
    const res = await axios.post(
      `/api/referee/assign-match/${matchId}`,
      { refereeUserId },
      getAuth()
    );
    return res.data;
  },

  // Active courts for a tournament (with their assigned umpire, if any).
  fetchCourts: async (tournamentId) => {
    const res = await axios.get(`/api/tournaments/${tournamentId}/courts`, getAuth());
    return res.data?.courts || res.data || [];
  },

  // Create a court/table on the tournament (inline add).
  createCourt: async (tournamentId, { name, type = null }) => {
    const res = await axios.post(`/api/tournaments/${tournamentId}/courts`, { name, type }, getAuth());
    return res.data?.court;
  },

  // Assign (or, with refereeUserId null, unassign) the umpire responsible for a
  // court. One umpire per court — they officiate every match played on it.
  assignUmpireToCourt: async (tournamentId, courtId, refereeUserId) => {
    const res = await axios.patch(
      `/api/tournaments/${tournamentId}/courts/${courtId}/umpire`,
      { refereeUserId: refereeUserId || null },
      getAuth()
    );
    return res.data?.court;
  },
};

export default refereeApi;
