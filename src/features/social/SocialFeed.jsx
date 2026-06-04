import { useState, useContext } from "react";
import { Plus, MessageCircle } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import usePosts from "./usePosts";
import PostCard from "./PostCard";
import CreatePostModal from "./CreatePostModal";

/**
 * Unified Social Feed component.
 * Renders the same feed for Manager, ClubAdmin, or any authenticated role.
 *
 * Props:
 * - canCreate: boolean (default true) — show create post button
 * - readOnly: boolean (default false) — gate all interactions
 * - onGatedAction: () => void — called when readOnly user tries to interact
 * - className: string — extra classes on wrapper
 * - dark: boolean (default false) — render in dark theme (Manager dark shell)
 * - showHeader: boolean (default true in light, false in dark — page wrapper supplies its own)
 */
export default function SocialFeed({
  canCreate = true,
  readOnly = false,
  onGatedAction,
  className = "",
  dark = false,
  showHeader,
}) {
  const { auth } = useContext(AuthContext);
  const userId = auth?._id;
  const { posts, loading, createPost, creating, toggleLike, toggleSave } = usePosts(userId);
  const [showCreate, setShowCreate] = useState(false);

  const renderHeader = showHeader ?? !dark;

  return (
    <div className={`min-h-screen ${className}`}>
      {/* Header */}
      {renderHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-800"}`}>Social Feed</h1>
            <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{posts.length} posts</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`rounded-xl p-5 animate-pulse ${
                dark
                  ? "bg-[#181A22] border border-white/[0.06]"
                  : "bg-white border border-gray-100"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full ${dark ? "bg-white/[0.06]" : "bg-gray-200"}`} />
                <div className="space-y-2 flex-1">
                  <div className={`h-3 rounded w-24 ${dark ? "bg-white/[0.06]" : "bg-gray-200"}`} />
                  <div className={`h-2 rounded w-16 ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`} />
                </div>
              </div>
              <div className={`h-3 rounded w-full mb-2 ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`} />
              <div className={`h-3 rounded w-3/4 ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && posts.length === 0 && (
        <div
          className={`text-center py-16 rounded-2xl ${
            dark
              ? "bg-[#181A22]"
              : "bg-gray-50 border-2 border-dashed border-gray-200"
          }`}
          style={dark ? { border: "1px solid rgba(255,255,255,0.06)" } : undefined}
        >
          <div className={`w-10 h-10 rounded-md inline-flex items-center justify-center mb-3 ${
            dark ? "bg-white/[0.06]" : "bg-gray-100"
          }`}>
            <MessageCircle className={`w-5 h-5 ${dark ? "text-gray-500" : "text-gray-300"}`} />
          </div>
          <p className={`text-[14px] font-medium ${dark ? "text-white" : "text-gray-700"}`}>No posts yet</p>
          <p className={`text-[13px] mt-1 max-w-xs mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Be the first to share something with your community.
          </p>
          {canCreate && !readOnly && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold transition active:scale-[0.98] w-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Create post
            </button>
          )}
        </div>
      )}

      {/* Posts grid */}
      {!loading && posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              userId={userId}
              onLike={toggleLike}
              onSave={toggleSave}
              readOnly={readOnly}
              onGatedAction={onGatedAction}
              dark={dark}
            />
          ))}
        </div>
      )}

      {/* Floating create button */}
      {canCreate && !readOnly && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg shadow-orange-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-100 z-40 w-auto"
          aria-label="Create post"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Create post modal */}
      <CreatePostModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={createPost}
        loading={creating}
        dark={dark}
      />
    </div>
  );
}
