import MNews from "../Manager/MNews";

// Trainer News — read-only news reader in the light Trainer shell.
export default function TNews() {
  return (
    <div className="p-4 sm:p-6">
      <MNews canManage={false} />
    </div>
  );
}
