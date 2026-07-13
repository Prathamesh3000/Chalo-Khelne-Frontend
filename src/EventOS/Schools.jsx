import { School } from "lucide-react";
import DirectoryHub from "./DirectoryHub";

export default function Schools() {
  return (
    <DirectoryHub
      title="Schools & Universities Hub"
      subtitle="Manage school & university registrations, category metrics and revenue."
      Icon={School}
      accountFilter={(a) => (a.orgType || "").toLowerCase() === "school"}
      accountEmptyText="No school accounts under your agency yet. SuperAdmin can onboard schools and assign them here."
    />
  );
}
