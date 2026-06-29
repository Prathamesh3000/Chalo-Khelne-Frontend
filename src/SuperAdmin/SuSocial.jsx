import { MessageSquare } from "lucide-react";
import { SocialFeed } from "../features/social";
import { SuperAdminShell } from "../shared/layout";

// SuperAdmin Social — the unified Social module in the dark SuperAdmin shell.
// SuperAdmin is a full participant AND the platform moderator: PostCard shows a
// "Remove (moderation)" control on any post for this role (see socialPermissions).
export default function SuSocial() {
  return (
    <SuperAdminShell searchPlaceholder="Search posts…">
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
            Browse the community feed, post updates, and moderate content.
          </p>
        </div>
      </header>

      <SocialFeed canCreate={true} dark={true} />
    </SuperAdminShell>
  );
}
