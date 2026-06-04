import { ChatPage } from "../features/groupChat";
import { CorporateShell } from "../shared/layout";

// ChatPage owns its own chat header (back / title / actions / members
// toggle) so we don't add a page header here.
export default function CoGroupChatPage() {
  return (
    <CorporateShell searchPlaceholder="Search chats…">
      <ChatPage dark={true} />
    </CorporateShell>
  );
}
