import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import followApi from "./followApi";

/**
 * Follow / Following toggle button. Optimistic, self-contained.
 *
 * Props:
 * - userId: target user id
 * - initialFollowing: boolean
 * - onChange: (following: boolean) => void  (so parents can update counts)
 * - dark, size ("sm" | "md")
 */
export default function FollowButton({ userId, initialFollowing = false, onChange, dark = false, size = "md" }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e?.stopPropagation?.();
    if (busy || !userId) return;
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      const res = await followApi.toggle(userId);
      const real = typeof res?.following === "boolean" ? res.following : next;
      setFollowing(real);
      onChange?.(real);
    } catch {
      setFollowing(!next); // revert
    } finally {
      setBusy(false);
    }
  };

  const pad = size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-9 px-3.5 text-[13px]";

  const cls = following
    ? dark
      ? "bg-white/[0.06] text-gray-200 border border-white/[0.1] hover:bg-white/[0.1]"
      : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
    : "bg-orange-500 text-white hover:bg-orange-600";

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-60 w-auto ${pad} ${cls}`}
    >
      {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
