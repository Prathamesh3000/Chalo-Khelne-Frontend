import { useState, useEffect, useCallback } from "react";
import { Trophy, MapPin, Bookmark, Grid3X3 } from "lucide-react";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import FollowListModal from "./FollowListModal";
import { assetUrl } from "../../shared/lib/assetUrl";
import socialApi from "./socialApi";
import followApi from "./followApi";

/**
 * Unified profile view — works for the current user (own) and any other user.
 * Shows avatar, name, role, bio, Posts/Followers/Following counts (tappable),
 * a Follow button (when not self), and tabs: Posts (everyone) + Saved (own only).
 *
 * Props: userId, currentUserId, onOpenProfile, dark
 */
export default function ProfileView({ userId, currentUserId, onOpenProfile, dark = false, initialTab = "posts" }) {
  const [status, setStatus] = useState(null);
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState(null); // { mode } for FollowListModal

  const isSelf = status?.isSelf || String(userId) === String(currentUserId);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, ps] = await Promise.all([
        followApi.status(userId).catch(() => null),
        socialApi.fetchUserPosts(userId).catch(() => []),
      ]);
      setStatus(st);
      setPosts(ps);
      if (st?.isSelf || String(userId) === String(currentUserId)) {
        socialApi.fetchSavedPosts(userId).then(setSaved).catch(() => setSaved([]));
      }
    } finally {
      setLoading(false);
    }
  }, [userId, currentUserId]);

  useEffect(() => { load(); }, [load]);

  const t = dark
    ? { name: "text-white", bio: "text-gray-300", role: "text-orange-400 bg-orange-500/15", count: "text-white", countLbl: "text-gray-400", tabOn: "text-orange-400 border-orange-400", tabOff: "text-gray-500 border-transparent hover:text-gray-300", tile: "bg-white/[0.04] border border-white/[0.06]", tileText: "text-gray-300", empty: "text-gray-500" }
    : { name: "text-gray-900", bio: "text-gray-600", role: "text-blue-600 bg-blue-50", count: "text-gray-900", countLbl: "text-gray-500", tabOn: "text-orange-600 border-orange-500", tabOff: "text-gray-400 border-transparent hover:text-gray-600", tile: "bg-gray-50 border border-gray-100", tileText: "text-gray-600", empty: "text-gray-400" };

  if (loading && !status) {
    return <div className={`text-center py-12 text-[13px] ${t.empty}`}>Loading profile…</div>;
  }

  const user = status?.user || {};
  const shown = tab === "saved" ? saved : posts;

  const Stat = ({ value, label, onClick }) => (
    <button onClick={onClick} disabled={!onClick} className="text-center px-2 w-auto">
      <div className={`text-[17px] font-bold ${t.count}`}>{value ?? 0}</div>
      <div className={`text-[11px] ${t.countLbl}`}>{label}</div>
    </button>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar user={user} size={72} dark={dark} />
        <div className="flex-1 flex items-center justify-around">
          <Stat value={posts.length} label="Posts" />
          <Stat value={status?.followersCount} label="Followers" onClick={() => setList({ mode: "followers" })} />
          <Stat value={status?.followingCount} label="Following" onClick={() => setList({ mode: "following" })} />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <h2 className={`text-[16px] font-bold ${t.name}`}>{user.name || "User"}</h2>
          {user.role && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.role}`}>{user.role}</span>}
        </div>
        {user.bio && <p className={`text-[13px] mt-1 leading-snug ${t.bio}`}>{user.bio}</p>}
      </div>

      {!isSelf && (
        <div className="mt-3">
          <FollowButton userId={userId} initialFollowing={status?.isFollowing} onChange={load} dark={dark} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 mt-5 border-b border-gray-200/10">
        <button onClick={() => setTab("posts")} className={`flex items-center gap-1.5 pb-2 text-[12px] font-semibold border-b-2 transition w-auto ${tab === "posts" ? t.tabOn : t.tabOff}`}>
          <Grid3X3 className="w-3.5 h-3.5" /> Posts
        </button>
        {isSelf && (
          <button onClick={() => setTab("saved")} className={`flex items-center gap-1.5 pb-2 text-[12px] font-semibold border-b-2 transition w-auto ${tab === "saved" ? t.tabOn : t.tabOff}`}>
            <Bookmark className="w-3.5 h-3.5" /> Saved
          </button>
        )}
      </div>

      {/* Posts grid */}
      {shown.length === 0 ? (
        <p className={`text-[12px] text-center py-8 ${t.empty}`}>
          {tab === "saved" ? "No saved posts yet." : "No posts yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {shown.map((p) => (
            <div key={p._id} className={`rounded-lg overflow-hidden ${t.tile}`}>
              {p.videoThumbnail ? (
                <img loading="lazy" src={assetUrl(p.videoThumbnail)} alt="" className="w-full h-24 object-cover" />
              ) : (
                <div className="p-2.5 h-24 flex flex-col justify-between">
                  {p.tournamentName && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-orange-500 font-semibold">
                      <Trophy className="w-2.5 h-2.5" />{p.tournamentName}
                    </span>
                  )}
                  <p className={`text-[11px] leading-snug line-clamp-3 ${t.tileText}`}>{p.caption}</p>
                  {p.location && (
                    <span className={`inline-flex items-center gap-1 text-[10px] ${t.empty}`}>
                      <MapPin className="w-2.5 h-2.5" />{p.location}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <FollowListModal
        open={!!list}
        onClose={() => setList(null)}
        userId={userId}
        mode={list?.mode}
        onOpenProfile={(id) => { setList(null); onOpenProfile?.(id); }}
        dark={dark}
      />
    </div>
  );
}
