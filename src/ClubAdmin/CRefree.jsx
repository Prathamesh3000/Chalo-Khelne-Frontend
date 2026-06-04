import { ShieldCheck } from "lucide-react";
import HireReferees from "../features/referee/HireReferees";
import { ClubAdminShell } from "../shared/layout";

// ClubAdmin "Hire Referees" page — the same HireReferees component is reused
// by Manager at /mrefree. We wrap it here in the dark ClubAdminShell so the
// chrome matches the rest of the ClubAdmin dashboard.
export default function CRefree() {
  return (
    <ClubAdminShell searchPlaceholder="Search referees…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Management · Referees
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Hire referees
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Browse certified referees and send hire requests for your club tournaments.
          </p>
        </div>
      </header>

      <HireReferees dark={true} />
    </ClubAdminShell>
  );
}
