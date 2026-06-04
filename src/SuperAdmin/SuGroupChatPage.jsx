import { ChatPage } from "../features/groupChat";
import { SuperAdminShell } from "../shared/layout";

// ChatPage owns its own chat header (back / title / actions / members
// toggle) so we don't add a page header here.
export default function SuGroupChatPage() {
  return (
    <SuperAdminShell searchPlaceholder="Search chats…">
      <ChatPage dark={true} />
    </SuperAdminShell>
  );
}
