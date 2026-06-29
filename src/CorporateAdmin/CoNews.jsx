import MNews from "../Manager/MNews";
import { CorporateShell } from "../shared/layout";

// Corporate News — full news management in the dark Corporate shell.
export default function CoNews() {
  return (
    <CorporateShell searchPlaceholder="Search news…">
      <MNews canManage={true} dark={true} />
    </CorporateShell>
  );
}
