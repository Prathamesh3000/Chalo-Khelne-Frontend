import MNews from "../Manager/MNews";
import { ClubAdminShell } from "../shared/layout";

// ClubAdmin News — full news management in the dark ClubAdmin shell.
// MNews is light-styled, so wrap it in a light panel for contrast.
export default function CNews() {
  return (
    <ClubAdminShell searchPlaceholder="Search news…">
      <MNews canManage={true} dark={true} />
    </ClubAdminShell>
  );
}
