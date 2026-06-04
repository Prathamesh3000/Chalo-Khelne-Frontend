import { MessageCircle } from "lucide-react";
import { ChatList } from "../features/groupChat";
import { CorporateShell } from "../shared/layout";

export default function CoGroupChatList() {
  return (
    <CorporateShell searchPlaceholder="Search chats…">
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
            Coordinate with your team and managers in dedicated group spaces.
          </p>
        </div>
      </header>

      <ChatList dark={true} />
    </CorporateShell>
  );
}
