import Avatar from "./Avatar";
import FollowButton from "./FollowButton";

/**
 * A single user row — avatar + name + role badge + Follow button.
 * Used by the user-search and followers/following lists.
 *
 * Props: user ({_id,name,profileImage,role,isFollowing,isSelf}), onOpenProfile, dark
 */
export default function UserRow({ user, onOpenProfile, dark = false }) {
  const t = dark
    ? { name: "text-white", role: "text-orange-400 bg-orange-500/15" }
    : { name: "text-gray-800", role: "text-blue-600 bg-blue-50" };

  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        onClick={() => onOpenProfile?.(user._id)}
        className="flex items-center gap-3 flex-1 w-auto min-w-0 text-left"
      >
        <Avatar user={user} size={40} dark={dark} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-semibold truncate ${t.name}`}>{user.name || "User"}</span>
            {user.role && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.role}`}>{user.role}</span>
            )}
          </div>
        </div>
      </button>
      {!user.isSelf && (
        <FollowButton userId={user._id} initialFollowing={user.isFollowing} dark={dark} size="sm" />
      )}
    </div>
  );
}
