import { ChatPage } from "../features/groupChat";
import { ManagerShell } from "../shared/layout";

// Manager Group Chat detail — wraps the shared ChatPage in the dark
// ManagerShell. ChatPage owns its own chat header (back / title / actions
// / members toggle) so we do NOT add a page header here; the chat header
// is the page header.
export default function MGroupChatPage() {
  return (
    <ManagerShell searchPlaceholder="Search chats…">
      <ChatPage dark={true} />
    </ManagerShell>
  );
}
