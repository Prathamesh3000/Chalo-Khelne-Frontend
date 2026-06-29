import { useState } from "react";
import { Heart, Bookmark, Share2, MapPin, ExternalLink, Trophy, MessageCircle, Trash2, Send } from "lucide-react";
import { formatDescription } from "./formatText";
import Avatar from "./Avatar";

/**
 * Reusable post card — works for all roles. Role-aware via `perms` (see
 * socialPermissions): comments are open to everyone; delete is gated to the
 * post owner, the comment author, or a SuperAdmin moderator.
 *
 * Props:
 * - post, userId (null for public/unauthenticated)
 * - currentUser: the auth user object (for the composer avatar/name)
 * - perms: { canComment, canModerate, ... } from socialPermissions(role)
 * - onLike, onSave: (postId) => void
 * - onComment: (postId, text) => Promise|void
 * - onDeleteComment: (postId, commentId) => void
 * - onDeletePost: (postId) => void
 * - readOnly: gate all write actions; onGatedAction: () => void
 * - dark: dark theme
 */
export default function PostCard({
  post, userId, currentUser, perms = {},
  onLike, onSave, onComment, onDeleteComment, onDeletePost, onOpenProfile,
  readOnly, onGatedAction, dark = false,
}) {
  const isLiked = userId && post.likes?.includes(userId);
  const isSaved = userId && post.saves?.includes(userId);
  const comments = post.comments || [];

  const ownerId = String(post.user?._id || post.user || "");
  const isPostOwner = userId && ownerId === String(userId);
  const canDeletePost = !readOnly && (isPostOwner || perms.canModerate);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const handleAction = (action) => {
    if (readOnly && onGatedAction) { onGatedAction(); return; }
    action();
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || posting) return;
    if (readOnly) { onGatedAction?.(); return; }
    setPosting(true);
    try {
      await onComment?.(post._id, text);
      setCommentText("");
    } finally {
      setPosting(false);
    }
  };

  const timeAgo = (date) => {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // ── Theme tokens ───────────────────────────────────────────────────────────
  const t = dark
    ? {
        card: "bg-[#181A22] overflow-hidden transition hover:border-white/[0.12]",
        cardBorder: "border border-white/[0.06]",
        author: "text-white", meta: "text-gray-500",
        avatar: "bg-orange-500/15 text-orange-400",
        roleBadge: "text-orange-400 bg-orange-500/15",
        tournamentBadge: "text-orange-400 bg-orange-500/15",
        caption: "text-gray-200", link: "text-orange-400 hover:text-orange-300",
        location: "text-gray-500", actionsBar: "border-t border-white/[0.06]",
        actionDefault: "text-gray-400 hover:text-white hover:bg-white/[0.06]",
        actionLiked: "text-red-300 bg-red-500/10 hover:bg-red-500/20",
        actionSaved: "text-orange-300 bg-orange-500/10 hover:bg-orange-500/20",
        likedFill: "fill-red-400", savedFill: "fill-orange-400",
        commentBox: "border-t border-white/[0.06] bg-white/[0.02]",
        commentText: "text-gray-200", commentMeta: "text-gray-500",
        commentInput: "text-gray-200 placeholder:text-gray-500",
        commentInputStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
        del: "text-gray-500 hover:text-red-400 hover:bg-red-500/10",
      }
    : {
        card: "bg-white overflow-hidden hover:shadow-md transition-shadow",
        cardBorder: "border border-gray-100",
        author: "text-gray-800", meta: "text-gray-400",
        avatar: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
        roleBadge: "text-blue-600 bg-blue-50",
        tournamentBadge: "text-orange-700 bg-orange-50",
        caption: "text-gray-700", link: "text-blue-600 hover:underline",
        location: "text-gray-500", actionsBar: "border-t border-gray-50",
        actionDefault: "text-gray-500 hover:bg-gray-100",
        actionLiked: "text-red-500 bg-red-50 hover:bg-red-100",
        actionSaved: "text-blue-600 bg-blue-50 hover:bg-blue-100",
        likedFill: "fill-red-500", savedFill: "fill-blue-600",
        commentBox: "border-t border-gray-100 bg-gray-50/60",
        commentText: "text-gray-700", commentMeta: "text-gray-400",
        commentInput: "text-gray-700 placeholder:text-gray-400 border border-gray-200",
        commentInputStyle: undefined,
        del: "text-gray-400 hover:text-red-500 hover:bg-red-50",
      };

  return (
    <article className={`rounded-xl ${t.card} ${t.cardBorder}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Avatar
          user={post.user}
          size={40}
          dark={dark}
          onClick={ownerId && onOpenProfile ? () => onOpenProfile(ownerId) : undefined}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ownerId && onOpenProfile ? () => onOpenProfile(ownerId) : undefined}
              className={`font-semibold text-[13px] truncate ${t.author} ${onOpenProfile ? "hover:underline" : ""}`}
            >
              {post.user?.name || post.user?.userName || "User"}
            </button>
            {post.user?.role && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.roleBadge}`}>
                {post.user.role}
              </span>
            )}
          </div>
          <span className={`text-[11px] ${t.meta}`}>{timeAgo(post.createdAt)}</span>
        </div>
        {canDeletePost && (
          <button
            onClick={() => onDeletePost?.(post._id)}
            title={isPostOwner ? "Delete post" : "Remove post (moderation)"}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition flex-shrink-0 ${t.del}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
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
          <a href={post.link} target="_blank" rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-[11px] transition ${t.link}`}>
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition w-auto ${isLiked ? t.actionLiked : t.actionDefault}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? t.likedFill : ""}`} />
          <span className="font-mono tabular-nums">{post.likes?.length || 0}</span>
        </button>

        <button
          onClick={() => setShowComments((s) => !s)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition w-auto ${showComments ? t.actionSaved : t.actionDefault}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="font-mono tabular-nums">{comments.length}</span>
        </button>

        <button
          onClick={() => handleAction(() => onSave?.(post._id))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition w-auto ${isSaved ? t.actionSaved : t.actionDefault}`}
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

      {/* Comments */}
      {showComments && (
        <div className={`px-5 py-3 ${t.commentBox}`}>
          {comments.length === 0 ? (
            <p className={`text-[12px] py-1 ${t.commentMeta}`}>No comments yet. Be the first!</p>
          ) : (
            <ul className="space-y-3 mb-3">
              {comments.map((c, i) => {
                const author = c.user || {};
                const authorId = String(author?._id || author || "");
                const canDelComment =
                  !readOnly && userId && (authorId === String(userId) || isPostOwner || perms.canModerate);
                return (
                  <li key={c._id || i} className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${t.avatar}`}>
                      {(author?.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] font-semibold ${t.author}`}>{author?.name || "User"}</span>
                        <span className={`text-[10px] ${t.commentMeta}`}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className={`text-[12px] leading-snug ${t.commentText}`}>{c.text}</p>
                    </div>
                    {canDelComment && (
                      <button
                        onClick={() => onDeleteComment?.(post._id, c._id)}
                        title="Delete comment"
                        className={`h-6 w-6 inline-flex items-center justify-center rounded-md transition flex-shrink-0 ${t.del}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Composer */}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${t.avatar}`}>
              {(currentUser?.name || "U").charAt(0).toUpperCase()}
            </div>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
              placeholder="Add a comment…"
              className={`flex-1 h-9 px-3 rounded-full text-[12px] focus:outline-none ${t.commentInput}`}
              style={t.commentInputStyle}
            />
            <button
              onClick={submitComment}
              disabled={!commentText.trim() || posting}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white transition disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
