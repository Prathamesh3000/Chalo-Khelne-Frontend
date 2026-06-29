import MNews from "../Manager/MNews";

// Vendor News — read-only news reader in the light Vendor shell.
export default function VNews() {
  return (
    <div className="p-4 sm:p-6">
      <MNews canManage={false} />
    </div>
  );
}
