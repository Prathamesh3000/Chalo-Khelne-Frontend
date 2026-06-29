import MNews from "../Manager/MNews";

// Player News — read-only news reader in the light Player shell.
export default function PNews() {
  return (
    <div className="p-4 sm:p-6">
      <MNews canManage={false} />
    </div>
  );
}
