import { Bell } from "lucide-react";
import { ClubAdminShell } from "../shared/layout";

// ClubAdmin Notification page. The original ClubAdminApp routed
// /notification to the Manager's NotificationPage, but that page wraps
// itself in ManagerShell (wrong sidebar for ClubAdmin) and queries
// manager-scoped endpoints that don't apply to ClubAdmin. ClubAdmin's
// real notification surface lives in Payment History and Finance, so
// this is a placeholder until a dedicated ClubAdmin inbox lands.
export default function CNotification() {
  return (
    <ClubAdminShell searchPlaceholder="Search notifications…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Bell className="w-3.5 h-3.5" />
            Inbox · Notifications
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Notifications
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Updates and activity across your club.
          </p>
        </div>
      </header>

      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
        <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
          <Bell className="w-5 h-5 text-gray-500" />
        </div>
        <h3 className="text-[14px] font-medium text-white">You're all caught up</h3>
        <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
          New club activity will appear here. For payment activity, check Payment History or Finance overview.
        </p>
      </div>
    </ClubAdminShell>
  );
}
