import { Heart, Bookmark, Share2, MapPin, ExternalLink, Trophy } from "lucide-react";
import { formatDescription } from "./formatText";

/**
 * Reusable post card. Works for all roles.
 *
 * Props:
 * - post: object
 * - userId: string (null for public/unauthenticated)
 * - onLike: (postId) => void
 * - onSave: (postId) => void
 * - readOnly: boolean (true = all actions gated)
 * - onGatedAction: () => void (called when readOnly user tries to interact)
 * - dark: boolean (default false) — render in dark theme
 */
export default function PostCard({ post, userId, onLike, onSave, readOnly, onGatedAction, dark = false }) {
  const isLiked = userId && post.likes?.includes(userId);
  const isSaved = userId && post.saves?.includes(userId);

  const handleAction = (action) => {
    if (readOnly && onGatedAction) {
      onGatedAction();
      return;
    }
    action();
  };

  const timeAgo = (date) => {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const t = dark
    ? {
        card:        "bg-[#181A22] overflow-hidden transition hover:border-white/[0.12]",
        cardBorder:  "border border-white/[0.06]",
        author:      "text-white",
        meta:        "text-gray-500",
        avatar:      "bg-orange-500/15 text-orange-400",
        roleBadge:   "text-orange-400 bg-orange-500/15",
        tournamentBadge: "text-orange-400 bg-orange-500/15",
        caption:     "text-gray-200",
        link:        "text-orange-400 hover:text-orange-300",
        location:    "text-gray-500",
        actionsBar:  "border-t border-white/[0.06]",
        actionDefault: "text-gray-400 hover:text-white hover:bg-white/[0.06]",
        actionLiked: "text-red-300 bg-red-500/10 hover:bg-red-500/20",
        actionSaved: "text-orange-300 bg-orange-500/10 hover:bg-orange-500/20",
        likedFill:   "fill-red-400",
        savedFill:   "fill-orange-400",
      }
    : {
        card:        "bg-white overflow-hidden hover:shadow-md transition-shadow",
        cardBorder:  "border border-gray-100",
        author:      "text-gray-800",
        meta:        "text-gray-400",
        avatar:      "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
        roleBadge:   "text-blue-600 bg-blue-50",
        tournamentBadge: "text-orange-700 bg-orange-50",
        caption:     "text-gray-700",
        link:        "text-blue-600 hover:underline",
        location:    "text-gray-500",
        actionsBar:  "border-t border-gray-50",
        actionDefault: "text-gray-500 hover:bg-gray-100",
        actionLiked: "text-red-500 bg-red-50 hover:bg-red-100",
        actionSaved: "text-blue-600 bg-blue-50 hover:bg-blue-100",
        likedFill:   "fill-red-500",
        savedFill:   "fill-blue-600",
      };

  return (
    <article className={`rounded-xl ${t.card} ${t.cardBorder}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${t.avatar}`}>
          {post.user?.name?.charAt(0)?.toUpperCase() || post.user?.userName?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-[13px] truncate ${t.author}`}>
              {post.user?.name || post.user?.userName || "User"}
            </span>
            {post.user?.role && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.roleBadge}`}>
                {post.user.role}
              </span>
            )}
          </div>
          <span className={`text-[11px] ${t.meta}`}>{timeAgo(post.createdAt)}</span>
        </div>
      </div>

      {/* Tournament badge */}
      {post.tournamentName && (
        <div className="px-5 pb-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${t.tournamentBadge}`}>
            <Trophy className="w-3 h-3" />
            {post.tournamentName}
          </span>
        </div>
      )}

      {/* Caption */}
      {post.caption && (
        <div className={`px-5 pb-3 text-[13px] leading-relaxed ${t.caption}`}>
          {formatDescription(post.caption)}
        </div>
      )}

      {/* Media */}
      {post.videoThumbnail && (
        <div className="px-5 pb-3">
          <img
            src={post.videoThumbnail}
            alt="Post media"
            className="w-full rounded-xl object-cover max-h-80"
            style={dark ? { border: "1px solid rgba(255,255,255,0.06)" } : undefined}
          />
        </div>
      )}

      {/* Link */}
      {post.link && (
        <div className="px-5 pb-3">
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-[11px] transition ${t.link}`}
          >
            <ExternalLink className="w-3 h-3" />
            {post.link.length > 40 ? post.link.substring(0, 40) + "..." : post.link}
          </a>
        </div>
      )}

      {/* Location */}
      {post.location && (
        <div className="px-5 pb-3">
          <span className={`inline-flex items-center gap-1 text-[11px] ${t.location}`}>
            <MapPin className="w-3 h-3" />
            {post.location}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center px-5 py-3 gap-1 ${t.actionsBar}`}>
        <button
          onClick={() => handleAction(() => onLike?.(post._id))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition w-auto ${
            isLiked ? t.actionLiked : t.actionDefault
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? t.likedFill : ""}`} />
          <span className="font-mono tabular-nums">{post.likes?.length || 0}</span>
        </button>

        <button
          onClick={() => handleAction(() => onSave?.(post._id))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition w-auto ${
            isSaved ? t.actionSaved : t.actionDefault
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? t.savedFill : ""}`} />
          <span className="font-mono tabular-nums">{post.saves?.length || 0}</span>
        </button>

        <button
          onClick={() => handleAction(() => {})}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition w-auto ${t.actionDefault}`}
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}
