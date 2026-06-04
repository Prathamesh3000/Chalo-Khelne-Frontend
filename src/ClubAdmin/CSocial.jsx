import { MessageSquare } from "lucide-react";
import { SocialFeed } from "../features/social";
import { ClubAdminShell } from "../shared/layout";

// ClubAdmin Social — replaces the legacy inline implementation with the shared
// SocialFeed component (same as Manager's MSocial), wrapped in the dark
// ClubAdminShell. ClubAdmin can create + interact like Manager.
export default function CSocial() {
  return (
    <ClubAdminShell searchPlaceholder="Search posts…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <MessageSquare className="w-3.5 h-3.5" />
            Community · Social feed
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Social feed
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            See what your community is posting, share an update.
          </p>
        </div>
      </header>

      <SocialFeed canCreate={true} dark={true} />
    </ClubAdminShell>
  );
}
