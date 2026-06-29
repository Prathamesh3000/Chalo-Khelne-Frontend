import { useState, useContext, useRef } from "react";
import { Plus, MessageCircle, Search, UserCircle } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import usePosts from "./usePosts";
import PostCard from "./PostCard";
import CreatePostModal from "./CreatePostModal";
import socialPermissions from "./permissions";
import useSafetyGate from "./useSafetyGate";
import SafetyReminder from "./SafetyReminder";
import UserSearchModal from "./UserSearchModal";
import ProfileModal from "./ProfileModal";
import StoriesTray from "./StoriesTray";
import SocialSidebar from "./SocialSidebar";
import SocialDiscover from "./SocialDiscover";
import Avatar from "./Avatar";

/**
 * Unified Social Feed — a 3-column social layout, identical for every role.
 *  Left:   profile card + nav shortcuts (lg+)
 *  Center: stories tray → create-post bar → single-column posts feed
 *  Right:  who-to-follow + trending (xl+)
 * Side columns collapse on small screens, leaving the centered feed.
 *
 * Props: canCreate, readOnly, onGatedAction, className, dark, showHeader
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
  const perms = socialPermissions(auth?.role);
  const {
    posts, loading, createPost, creating, toggleLike, toggleSave,
    addComment, deleteComment, deletePost,
  } = usePosts(userId);
  const [showCreate, setShowCreate] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profile, setProfile] = useState(null); // { userId, tab }
  const { guard, safetyProps } = useSafetyGate();
  const topRef = useRef(null);

  // Minors see the safety reminder before composing (Families Policy).
  const openCreate = () => guard(() => setShowCreate(true));
  const openProfile = (id, tab = "posts") => setProfile({ userId: id, tab });
  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const renderHeader = showHeader ?? !dark;
  const allowCreate = canCreate && !readOnly && perms.canPost;
  const showActions = !!userId && !readOnly;

  const meUser = { name: auth?.name, profileImage: auth?.image || auth?.profileImage };
  const cardCls = dark ? "bg-[#181A22] border border-white/[0.06]" : "bg-white border border-gray-100";
  const composerBtn = dark
    ? "bg-white/[0.04] text-gray-500 hover:bg-white/[0.07]"
    : "bg-gray-100 text-gray-500 hover:bg-gray-200";
  const actionBtn = dark
    ? "border border-white/[0.1] text-gray-200 hover:bg-white/[0.06]"
    : "border border-gray-200 text-gray-700 hover:bg-gray-100 bg-white";

  return (
    <div ref={topRef} className={`min-h-screen ${className}`}>
      {/* Optional page header (light shells supply none of their own) */}
      {renderHeader && (
        <div className="mb-6">
          <h1 className={`text-xl font-bold ${dark ? "text-white" : "text-gray-800"}`}>Social Feed</h1>
          <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>{posts.length} posts</p>
        </div>
      )}

      {/* ── 3-column layout (items-start so side columns can stay sticky) ── */}
      <div className="flex justify-center items-start gap-6">
        {/* LEFT — profile + nav (sticky: stays put while the feed scrolls) */}
        {showActions && (
          <aside className="hidden lg:block w-[280px] flex-shrink-0 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <SocialSidebar
              currentUser={auth}
              dark={dark}
              onFeed={scrollToTop}
              onProfile={() => openProfile(userId, "posts")}
              onSaved={() => openProfile(userId, "saved")}
              onFindPeople={() => setSearchOpen(true)}
            />
          </aside>
        )}

        {/* CENTER — stories, create bar, single-column feed */}
        <main className="flex-1 w-full max-w-[680px] min-w-0">
          {showActions && <StoriesTray currentUser={auth} dark={dark} />}

          {/* Compact actions for small screens where the left column is hidden */}
          {showActions && (
            <div className="flex lg:hidden items-center gap-2 mb-4">
              <button onClick={() => setSearchOpen(true)} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition w-auto ${actionBtn}`}>
                <Search className="w-3.5 h-3.5" /> Find people
              </button>
              <button onClick={() => openProfile(userId, "posts")} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition w-auto ${actionBtn}`}>
                <UserCircle className="w-3.5 h-3.5" /> My profile
              </button>
            </div>
          )}

          {/* Create-post bar */}
          {allowCreate && (
            <div className={`flex items-center gap-3 p-3 mb-4 rounded-xl ${cardCls}`}>
              <Avatar user={meUser} size={40} dark={dark} />
              <button onClick={openCreate} className={`flex-1 w-auto text-left h-10 px-4 rounded-full text-[13px] transition ${composerBtn}`}>
                Share an update…
              </button>
              <button onClick={openCreate} className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition flex-shrink-0 w-auto">
                <Plus className="w-4 h-4" /> Post
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`rounded-xl p-5 animate-pulse ${cardCls}`}>
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
              className={`text-center py-16 rounded-2xl ${dark ? "bg-[#181A22]" : "bg-gray-50 border-2 border-dashed border-gray-200"}`}
              style={dark ? { border: "1px solid rgba(255,255,255,0.06)" } : undefined}
            >
              <div className={`w-10 h-10 rounded-md inline-flex items-center justify-center mb-3 ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                <MessageCircle className={`w-5 h-5 ${dark ? "text-gray-500" : "text-gray-300"}`} />
              </div>
              <p className={`text-[14px] font-medium ${dark ? "text-white" : "text-gray-700"}`}>No posts yet</p>
              <p className={`text-[13px] mt-1 max-w-xs mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>
                Be the first to share something with your community.
              </p>
              {allowCreate && (
                <button onClick={openCreate} className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold transition active:scale-[0.98] w-auto">
                  <Plus className="w-3.5 h-3.5" /> Create post
                </button>
              )}
            </div>
          )}

          {/* Posts — single column */}
          {!loading && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  userId={userId}
                  currentUser={auth}
                  perms={perms}
                  onLike={toggleLike}
                  onSave={toggleSave}
                  onComment={addComment}
                  onDeleteComment={deleteComment}
                  onDeletePost={deletePost}
                  onOpenProfile={(id) => openProfile(id, "posts")}
                  readOnly={readOnly}
                  onGatedAction={onGatedAction}
                  dark={dark}
                />
              ))}
            </div>
          )}
        </main>

        {/* RIGHT — discovery (sticky: stays put while the feed scrolls) */}
        {showActions && (
          <aside className="hidden xl:block w-[300px] flex-shrink-0 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <SocialDiscover posts={posts} userId={userId} onOpenProfile={(id) => openProfile(id, "posts")} dark={dark} />
          </aside>
        )}
      </div>

      {/* Create post modal */}
      <CreatePostModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={createPost}
        loading={creating}
        dark={dark}
      />

      {/* Families Policy: safety reminder for minors before composing */}
      <SafetyReminder {...safetyProps} dark={dark} />

      {/* Find people */}
      <UserSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenProfile={(id) => { setSearchOpen(false); openProfile(id, "posts"); }}
        dark={dark}
      />

      {/* Profile overlay (own + others) */}
      <ProfileModal
        open={!!profile}
        onClose={() => setProfile(null)}
        userId={profile?.userId}
        currentUserId={userId}
        initialTab={profile?.tab}
        onOpenProfile={(id) => openProfile(id, "posts")}
        dark={dark}
      />
    </div>
  );
}
