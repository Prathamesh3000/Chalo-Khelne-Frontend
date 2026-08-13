import axios from "axios";

import { getAuthToken } from "../../shared/api/authToken";
const getAuthHeader = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Stories — same endpoints the mobile app uses. 24h expiry + audience privacy
// (followers ∪ following) are enforced server-side.
export const storiesApi = {
  createTextStory: async ({ text, bgColor, fontFamily }) => {
    const res = await axios.post(
      "/api/stories",
      { type: "text", text, bgColor, fontFamily },
      { headers: getAuthHeader() }
    );
    return res.data?.story;
  },

  createImageStory: async (file) => {
    const form = new FormData();
    form.append("storyImage", file);
    // No explicit Content-Type — the browser sets the multipart boundary.
    const res = await axios.post("/api/stories", form, { headers: getAuthHeader() });
    return res.data?.story;
  },

  fetchMine: async () => {
    const res = await axios.get("/api/stories/mine", { headers: getAuthHeader() });
    return res.data?.stories || [];
  },

  fetchFeed: async () => {
    const res = await axios.get("/api/stories/feed", { headers: getAuthHeader() });
    return res.data?.groups || [];
  },

  markViewed: async (id) => {
    const res = await axios.post(`/api/stories/${id}/view`, {}, { headers: getAuthHeader() });
    return res.data;
  },

  remove: async (id) => {
    const res = await axios.delete(`/api/stories/${id}`, { headers: getAuthHeader() });
    return res.data;
  },
};

export default storiesApi;
