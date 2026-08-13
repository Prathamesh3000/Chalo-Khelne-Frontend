import { assetUrl } from "../../shared/lib/assetUrl";

/**
 * Avatar — shows the user's profile image, falling back to an initial circle.
 * Shared across the Social module (post cards, comments, user rows, profiles).
 *
 * Props: user, size (px, default 40), dark, onClick, ring (string class)
 */
export default function Avatar({ user, size = 40, dark = false, onClick, ring = "" }) {
  const img = user?.profileImage;
  const initial = (user?.name || user?.userName || "?").charAt(0).toUpperCase();
  const tone = dark ? "bg-orange-500/15 text-orange-400" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white";
  const dim = { width: size, height: size };

  const inner = img ? (
    <img loading="lazy"
      src={assetUrl(img)}
      alt={user?.name || "User"}
      className="rounded-full object-cover w-full h-full"
    />
  ) : (
    <div
      className={`rounded-full flex items-center justify-center font-semibold w-full h-full ${tone}`}
      style={{ fontSize: Math.max(11, size * 0.4) }}
    >
      {initial}
    </div>
  );

  const className = `rounded-full overflow-hidden flex-shrink-0 ${ring} ${onClick ? "cursor-pointer" : ""}`;

  return onClick ? (
    <button type="button" onClick={onClick} className={className} style={dim}>{inner}</button>
  ) : (
    <div className={className} style={dim}>{inner}</div>
  );
}
