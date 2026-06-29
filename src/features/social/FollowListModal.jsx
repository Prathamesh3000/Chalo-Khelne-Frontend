import { useState, useEffect } from "react";
import SocialModal from "./SocialModal";
import UserRow from "./UserRow";
import followApi from "./followApi";

/**
 * Followers / Following list for a user.
 * Props: open, onClose, userId, mode ("followers" | "following"), onOpenProfile, dark
 */
export default function FollowListModal({ open, onClose, userId, mode = "followers", onOpenProfile, dark = false }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    setLoading(true);
    (mode === "following" ? followApi.following(userId) : followApi.followers(userId))
      .then((list) => alive && setUsers(list))
      .catch(() => alive && setUsers([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, userId, mode]);

  const title = mode === "following" ? "Following" : "Followers";

  return (
    <SocialModal open={open} onClose={onClose} title={title} dark={dark}>
      {loading ? (
        <p className={`text-[12px] text-center py-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>Loading…</p>
      ) : users.length === 0 ? (
        <p className={`text-[12px] text-center py-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          {mode === "following" ? "Not following anyone yet." : "No followers yet."}
        </p>
      ) : (
        <div className="divide-y divide-gray-100/10">
          {users.map((u) => (
            <UserRow key={u._id} user={u} onOpenProfile={onOpenProfile} dark={dark} />
          ))}
        </div>
      )}
    </SocialModal>
  );
}
