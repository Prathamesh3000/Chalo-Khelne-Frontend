import { Warehouse } from "lucide-react";
import DirectoryHub from "./DirectoryHub";

const CLUB_TYPES = ["club", "organization"];

export default function Clubs() {
  return (
    <DirectoryHub
      title="Affiliated Sports Clubs"
      subtitle="Manage affiliated clubs & academies, registrations and brackets."
      Icon={Warehouse}
      accountFilter={(a) => CLUB_TYPES.includes((a.orgType || "").toLowerCase())}
      accountEmptyText="No clubs under your agency yet. SuperAdmin can onboard clubs and assign them here."
    />
  );
}
