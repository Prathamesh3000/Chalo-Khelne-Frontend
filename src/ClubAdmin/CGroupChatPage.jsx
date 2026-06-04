import { ChatPage } from "../features/groupChat";
import { ClubAdminShell } from "../shared/layout";

// ClubAdmin Group Chat detail — wraps the shared ChatPage in the dark
// ClubAdminShell. ChatPage owns its own chat header (back / title / actions
// / members toggle) so we do NOT add a page header here.
export default function CGroupChatPage() {
  return (
    <ClubAdminShell searchPlaceholder="Search chats…">
      <ChatPage dark={true} />
    </ClubAdminShell>
  );
}
