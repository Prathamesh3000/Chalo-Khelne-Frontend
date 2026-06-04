import { Bell } from "lucide-react";
import { SuperAdminShell } from "../shared/layout";

// SuperAdmin notifications placeholder. SuperAdminShell's bell icon
// navigates here. A real notification feed isn't wired up yet; this gives
// the icon a destination and matches the dark chrome of every other SA page.
export default function SuNotification() {
  return (
    <SuperAdminShell searchPlaceholder="Search notifications…">
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
            Platform-level activity and alerts will surface here.
          </p>
        </div>
      </header>

      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
        <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
          <Bell className="w-5 h-5 text-gray-500" />
        </div>
        <h3 className="text-[14px] font-medium text-white">
          You're all caught up
        </h3>
        <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
          New platform activity will appear here. For club approvals, check
          <span className="text-orange-300 font-semibold"> Pending </span>
          or
          <span className="text-orange-300 font-semibold"> Inquiries</span>.
        </p>
      </div>
    </SuperAdminShell>
  );
}
