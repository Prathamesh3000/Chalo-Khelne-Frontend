import { MessageCircle } from "lucide-react";
import { ChatList } from "../features/groupChat";
import { ManagerShell } from "../shared/layout";

// Manager Group Chats list — wraps the shared ChatList in the dark
// ManagerShell so chrome matches the rest of the Manager dashboard.
// ChatList renders its own internal header in dark mode via the `dark` flag.
export default function MGroupChatList() {
  return (
    <ManagerShell searchPlaceholder="Search chats…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <MessageCircle className="w-3.5 h-3.5" />
            Community · Group chats
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Group chats
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Chat with your community in dedicated group spaces.
          </p>
        </div>
      </header>

      <ChatList dark={true} />
    </ManagerShell>
  );
}
