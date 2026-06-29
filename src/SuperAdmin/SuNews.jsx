import MNews from "../Manager/MNews";
import { SuperAdminShell } from "../shared/layout";

// SuperAdmin News — full news management in the dark SuperAdmin shell.
export default function SuNews() {
  return (
    <SuperAdminShell searchPlaceholder="Search news…">
      <MNews canManage={true} dark={true} />
    </SuperAdminShell>
  );
}
