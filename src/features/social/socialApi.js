import axios from "axios";

import { getAuthToken } from "../../shared/api/authToken";
const getAuthHeader = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const socialApi = {
  fetchPosts: async () => {
    const res = await axios.get("/api/posts", { headers: getAuthHeader() });
    return res.data?.posts || res.data || [];
  },

  createPost: async (postData) => {
    const res = await axios.post("/api/posts", postData, { headers: getAuthHeader() });
    return res.data;
  },

  toggleLike: async (postId) => {
    const res = await axios.post(`/api/posts/${postId}/like`, {}, { headers: getAuthHeader() });
    return res.data;
  },

  toggleSave: async (postId) => {
    const res = await axios.post(`/api/posts/${postId}/save`, {}, { headers: getAuthHeader() });
    return res.data;
  },

  // ── Comments (embedded in the post; mutations return the updated array) ──
  addComment: async ({ postId, text }) => {
    const res = await axios.post(`/api/posts/${postId}/comments`, { text }, { headers: getAuthHeader() });
    return res.data; // { success, comments, newComment }
  },

  deleteComment: async ({ postId, commentId }) => {
    const res = await axios.delete(`/api/posts/${postId}/comments/${commentId}`, { headers: getAuthHeader() });
    return res.data; // { success, comments }
  },

  // ── Delete a post (owner, or SuperAdmin moderation — enforced server-side) ──
  deletePost: async (postId) => {
    const res = await axios.delete(`/api/posts/${postId}`, { headers: getAuthHeader() });
    return res.data;
  },

  // ── Profile post lists (used by the profile views in a later phase) ──
  fetchUserPosts: async (userId) => {
    const res = await axios.get(`/api/posts/${userId}`, { headers: getAuthHeader() });
    return res.data?.posts || res.data || [];
  },

  fetchSavedPosts: async (userId) => {
    const res = await axios.get(`/api/posts/saved/${userId}`, { headers: getAuthHeader() });
    return res.data?.posts || res.data || [];
  },
};

export default socialApi;
