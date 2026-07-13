import { Building2 } from "lucide-react";
import DirectoryHub from "./DirectoryHub";

export default function Corporate() {
  return (
    <DirectoryHub
      title="Corporate Enterprise Clients"
      subtitle="Manage corporate registrations, custom invoices and enterprise relations."
      Icon={Building2}
      accountFilter={(a) => a.role === "corporate_admin" || (a.orgType || "").toLowerCase() === "corporate"}
      accountEmptyText="No corporate clients under your agency yet. SuperAdmin can onboard corporates and assign them here."
    />
  );
}
