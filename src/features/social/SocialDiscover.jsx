import Avatar from "./Avatar";
import FollowButton from "./FollowButton";

/**
 * Right column — "Who to follow" suggestions, derived from the already-loaded
 * feed posts (no extra API calls). Layout only; reuses existing theme tokens.
 *
 * Props: posts, userId, onOpenProfile, dark
 */
export default function SocialDiscover({ posts = [], userId, onOpenProfile, dark = false }) {
  // Who to follow — unique post authors that aren't me.
  const seen = new Set([String(userId)]);
  const suggestions = [];
  for (const p of posts) {
    const u = p.user;
    const id = u?._id && String(u._id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    suggestions.push(u);
    if (suggestions.length >= 5) break;
  }

  const t = dark
    ? { card: "bg-[#181A22] border border-white/[0.06]", title: "text-white", name: "text-white", role: "text-orange-400 bg-orange-500/15", muted: "text-gray-500" }
    : { card: "bg-white border border-gray-100", title: "text-gray-900", name: "text-gray-800", role: "text-blue-600 bg-blue-50", muted: "text-gray-400" };

  return (
    <div className="space-y-4">
      {/* Who to follow */}
      <div className={`rounded-xl p-4 ${t.card}`}>
        <h3 className={`text-[13px] font-bold mb-3 ${t.title}`}>Who to follow</h3>
        {suggestions.length === 0 ? (
          <p className={`text-[12px] ${t.muted}`}>No suggestions yet.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((u) => (
              <div key={u._id} className="flex items-center gap-2.5">
                <button onClick={() => onOpenProfile?.(u._id)} className="flex items-center gap-2.5 flex-1 w-auto min-w-0 text-left">
                  <Avatar user={u} size={36} dark={dark} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[12px] font-semibold truncate ${t.name}`}>{u.name || "User"}</span>
                      {u.role && <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${t.role}`}>{u.role}</span>}
                    </div>
                  </div>
                </button>
                <FollowButton userId={u._id} dark={dark} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
