// Central role-based policy for the unified Social module.
//
// One module, one policy: every Social surface (feed, post card, composer,
// profiles, stories, follow) derives what a user can do from this function so
// behaviour stays consistent across roles. Per product decision (2026-06-09):
//  - Everyone is a FULL participant (post, story, like, save, comment, follow).
//  - Only SuperAdmin can MODERATE (delete content they don't own).
//  - Minor safety gating is layered separately (see useSafetyGate) and applies
//    to minors regardless of role.

export function socialPermissions(role) {
  const r = String(role || "").toLowerCase();
  const isSuperAdmin = r === "superadmin";
  return {
    role: r,
    isSuperAdmin,
    canPost: true,
    canStory: true,
    canComment: true,
    canLike: true,
    canSave: true,
    canFollow: true,
    canSearch: true,
    // Moderation = delete ANY post/comment/story. SuperAdmin only.
    canModerate: isSuperAdmin,
  };
}

export default socialPermissions;
