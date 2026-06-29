import SocialModal from "./SocialModal";
import ProfileView from "./ProfileView";

/**
 * Profile overlay — shows a user's profile (own or other) over the feed.
 * Props: open, onClose, userId, currentUserId, onOpenProfile, dark
 */
export default function ProfileModal({ open, onClose, userId, currentUserId, onOpenProfile, dark = false, initialTab = "posts" }) {
  return (
    <SocialModal open={open} onClose={onClose} title="Profile" dark={dark} maxWidth="max-w-xl">
      {open && userId && (
        <ProfileView
          key={`${userId}-${initialTab}`}
          userId={userId}
          currentUserId={currentUserId}
          onOpenProfile={onOpenProfile}
          dark={dark}
          initialTab={initialTab}
        />
      )}
    </SocialModal>
  );
}
