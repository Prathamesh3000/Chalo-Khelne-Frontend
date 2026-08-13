import axios from "axios";

import { getAuthToken } from "../../shared/api/authToken";
const getAuthHeader = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Follow system — same endpoints the mobile app uses (server-shared).
export const followApi = {
  toggle: async (targetId) => {
    const res = await axios.post(`/api/follow/${targetId}/toggle`, {}, { headers: getAuthHeader() });
    return res.data; // { success, following, followersCount, followingCount }
  },

  status: async (userId) => {
    const res = await axios.get(`/api/follow/${userId}/status`, { headers: getAuthHeader() });
    return res.data; // { success, isFollowing, isSelf, followersCount, followingCount, user }
  },

  followers: async (userId) => {
    const res = await axios.get(`/api/follow/${userId}/followers`, { headers: getAuthHeader() });
    return res.data?.users || [];
  },

  following: async (userId) => {
    const res = await axios.get(`/api/follow/${userId}/following`, { headers: getAuthHeader() });
    return res.data?.users || [];
  },

  search: async (q) => {
    const res = await axios.get(`/api/follow/search?q=${encodeURIComponent(q)}`, { headers: getAuthHeader() });
    return res.data?.users || [];
  },
};

export default followApi;
