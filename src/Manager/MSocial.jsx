import { toast } from "react-toastify";
import React, { useState, useEffect, useContext } from "react";
import { Heart, Bookmark, Share2, Plus, X, Send, MapPin, Link2, Trophy, MessageCircle, Clock } from "lucide-react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

import { getAuthToken } from "../shared/api/authToken";
function MSocial() {
  const { auth } = useContext(AuthContext);
  const userId = auth?._id;
  const token = getAuthToken();

  const [tournamentName, setTournamentName] = useState("");
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/posts");
      setPosts(res.data);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim()) return;
    setSubmitting(true);
    try {
      const tags = (caption.match(/@(\w+)/g) || []).map((t) => t.slice(1));
      const res = await axios.post("/api/posts", { tournamentName, caption, tags, location, link }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts([res.data, ...posts]);
      setTournamentName(""); setCaption(""); setLink(""); setLocation("");
      setModalOpen(false);
    } catch (err) {
      toast.info(err.response?.data?.message || "Post creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (postId) => {
    try {
      const res = await axios.post(`/api/posts/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setPosts(posts.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.warn("Failed to toggle like:", err.message);
    }
  };

  const toggleSave = async (postId) => {
    try {
      const res = await axios.post(`/api/posts/${postId}/save`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setPosts(posts.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.warn("Failed to toggle save:", err.message);
    }
  };

  const timeAgo = (date) => {
    if (!date) return "";
    const ms = Date.now() - new Date(date).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const formatText = (text) => {
    if (!text) return null;
    return text.split(/(@\w+|#\w+)/g).map((part, i) => {
      if (part.startsWith("@")) return <span key={i} className="text-orange-500 font-semibold cursor-pointer hover:underline">{part}</span>;
      if (part.startsWith("#")) return <span key={i} className="text-orange-500 font-semibold cursor-pointer hover:underline">{part}</span>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Social Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">{posts.length} posts from your community</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-28" />
                  <div className="h-2 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && posts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700">No posts yet</h3>
          <p className="text-sm text-gray-400 mt-1">Be the first to share something!</p>
        </div>
      )}

      {/* Posts */}
      {!loading && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => {
            const isLiked = post.likes?.some((l) => (l._id || l) === userId);
            const isSaved = post.saves?.some((s) => (s._id || s) === userId);
            return (
              <div key={post._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                {/* Post Header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-[#2DA5FF] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                    {(post.user?.name || post.user?.userName || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 text-sm truncate">
                        {post.user?.name || post.user?.userName || "User"}
                      </span>
                      {post.user?.role && (
                        <span className="text-[9px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          {post.user.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(post.createdAt)}</span>
                      {post.location && (
                        <>
                          <span className="text-gray-300">·</span>
                          <MapPin className="w-3 h-3" />
                          <span>{post.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tournament Badge */}
                {post.tournamentName && (
                  <div className="px-5 pb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-full">
                      <Trophy className="w-3 h-3" />
                      {post.tournamentName}
                    </span>
                  </div>
                )}

                {/* Caption */}
                {post.caption && (
                  <div className="px-5 pb-3 text-sm text-gray-700 leading-relaxed">
                    {formatText(post.caption)}
                  </div>
                )}

                {/* Link */}
                {post.link && (
                  <div className="px-5 pb-3">
                    <a href={post.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-orange-500 hover:underline font-medium">
                      <Link2 className="w-3 h-3" />
                      {post.link.length > 45 ? post.link.substring(0, 45) + "..." : post.link}
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center border-t border-gray-50 px-5 py-3 gap-1">
                  <button onClick={() => toggleLike(post._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition w-auto ${
                      isLiked ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-gray-500 hover:bg-gray-100"
                    }`}>
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} />
                    <span>{post.likes?.length || 0}</span>
                  </button>

                  <button onClick={() => toggleSave(post._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition w-auto ${
                      isSaved ? "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20" : "text-gray-500 hover:bg-gray-100"
                    }`}>
                    <Bookmark className={`w-4 h-4 ${isSaved ? "fill-orange-500" : ""}`} />
                  </button>

                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition w-auto">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Create Button */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-[#E55D00] text-white rounded-full shadow-lg shadow-orange-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create Post Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Create Post</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition w-auto">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePostSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Tournament</label>
                <div className="relative">
                  <Trophy className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={tournamentName} onChange={(e) => setTournamentName(e.target.value)}
                    placeholder="e.g. Pune Open 2026"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider" htmlFor="caption">Caption *</label>
                <textarea id="caption" rows={3} value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's happening? Use @mentions and #hashtags..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                      placeholder="City"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Link</label>
                  <div className="relative">
                    <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={link} onChange={(e) => setLink(e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-xl transition w-auto">
                  Cancel
                </button>
                <button type="submit" disabled={!caption.trim() || submitting}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2 w-auto active:scale-[0.97]">
                  {submitting ? "Posting..." : <><Send className="w-4 h-4" /> Post</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MSocial;
