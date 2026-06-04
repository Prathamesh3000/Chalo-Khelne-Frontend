import { MessageSquare } from "lucide-react";
import { SocialFeed } from "../features/social";
import { ManagerShell } from "../shared/layout";

// Manager Social — authenticated, can create posts.
// Passes dark={true} so PostCard + CreatePostModal render in the dark theme
// that matches the rest of the Manager dashboard.
export default function MSocialV2() {
  return (
    <ManagerShell searchPlaceholder="Search posts…">
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
    </ManagerShell>
  );
}
