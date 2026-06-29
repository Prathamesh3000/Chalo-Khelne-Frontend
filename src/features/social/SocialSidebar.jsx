import { useState, useEffect } from "react";
import { Home, User, Bookmark, Search } from "lucide-react";
import Avatar from "./Avatar";
import followApi from "./followApi";

/**
 * Left column — logged-in user's profile card + navigation shortcuts.
 * Layout only; reuses the existing theme tokens (no new colors).
 *
 * Props: currentUser, dark, onFeed, onProfile, onSaved, onFindPeople
 */
export default function SocialSidebar({ currentUser, dark = false, onFeed, onProfile, onSaved, onFindPeople }) {
  const userId = currentUser?._id || currentUser?.id;
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    followApi
      .status(userId)
      .then((s) => { if (alive && s) setCounts({ followers: s.followersCount || 0, following: s.followingCount || 0 }); })
      .catch(() => {});
    return () => { alive = false; };
  }, [userId]);

  const meUser = { name: currentUser?.name, profileImage: currentUser?.image || currentUser?.profileImage };

  const t = dark
    ? { card: "bg-[#181A22] border border-white/[0.06]", divide: "border-white/[0.06]", name: "text-white", role: "text-orange-400 bg-orange-500/15", count: "text-white", countLbl: "text-gray-500", nav: "text-gray-300 hover:bg-white/[0.06]" }
    : { card: "bg-white border border-gray-100", divide: "border-gray-100", name: "text-gray-900", role: "text-blue-600 bg-blue-50", count: "text-gray-900", countLbl: "text-gray-500", nav: "text-gray-700 hover:bg-gray-100" };

  const navItems = [
    { Icon: Home, label: "Feed", onClick: onFeed },
    { Icon: User, label: "My Profile", onClick: onProfile },
    { Icon: Bookmark, label: "Saved", onClick: onSaved },
    { Icon: Search, label: "Find People", onClick: onFindPeople },
  ];

  return (
    <div className={`rounded-xl overflow-hidden ${t.card}`}>
      {/* Profile card */}
      <div className={`p-4 flex flex-col items-center text-center border-b ${t.divide}`}>
        <Avatar user={meUser} size={64} dark={dark} />
        <div className="flex items-center gap-2 mt-2.5">
          <p className={`text-[14px] font-bold ${t.name}`}>{currentUser?.name || "User"}</p>
          {currentUser?.role && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.role}`}>{currentUser.role}</span>
          )}
        </div>
        <div className="flex items-center gap-6 mt-3">
          <div className="text-center">
            <div className={`text-[15px] font-bold ${t.count}`}>{counts.followers}</div>
            <div className={`text-[11px] ${t.countLbl}`}>Followers</div>
          </div>
          <div className="text-center">
            <div className={`text-[15px] font-bold ${t.count}`}>{counts.following}</div>
            <div className={`text-[11px] ${t.countLbl}`}>Following</div>
          </div>
        </div>
      </div>

      {/* Navigation shortcuts */}
      <nav className="p-2">
        {navItems.map(({ Icon, label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition ${t.nav}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
