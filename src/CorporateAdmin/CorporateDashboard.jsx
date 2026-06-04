import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users, Building2, Trophy, ShieldCheck, ArrowRight, Info, Loader2,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { CorporateShell } from "../shared/layout";

const CorporateDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalManagers: 0,
    companySize: "—",
    totalTournaments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?._id) return;
      try {
        setLoading(true);
        const managersRes = await axios.get(`/api/manager/club-admin/managers?clubId=${user._id}`);
        const managersCount = Array.isArray(managersRes.data) ? managersRes.data.length : 0;

        let companySize = "—";
        try {
          const profileRes = await axios.get(`/api/corporate/${user._id}`);
          if (profileRes.data && profileRes.data.corporateProfile) {
            companySize = profileRes.data.corporateProfile.companySize || "—";
          }
        } catch (profileErr) {
          console.error("Error fetching corporate profile:", profileErr);
        }

        let tournamentsCount = 0;
        try {
          const tournRes = await axios.get(`/api/tournaments/corporate/${user._id}`);
          if (tournRes.data && tournRes.data.success) {
            tournamentsCount = tournRes.data.tournaments.length;
          }
        } catch (err) {
          console.error("Error fetching tournaments count:", err);
        }

        setStats({ totalManagers: managersCount, companySize, totalTournaments: tournamentsCount });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  const displayName = user?.name || "Corporate Admin";

  return (
    <CorporateShell searchPlaceholder="Search dashboard…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Corporate · Overview
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Welcome back, <span className="text-orange-400">{displayName}</span>
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Manage your corporate staff and tournaments from here.
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatTile icon={Users}      label="Total managers"     value={loading ? "…" : stats.totalManagers} />
        <StatTile icon={Building2}  label="Company size"       value={loading ? "…" : stats.companySize} tone="green" />
        <StatTile icon={Trophy}     label="Total tournaments"  value={loading ? "…" : stats.totalTournaments} />
      </div>

      {/* Info banner */}
      <div className="rounded-md px-4 py-3 flex items-start gap-3 mb-6"
        style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.25)" }}>
        <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
          <Info className="w-3.5 h-3.5 text-orange-400" />
        </span>
        <div>
          <p className="text-[13px] font-medium text-orange-200">Get started</p>
          <p className="text-[12px] text-orange-200/80 mt-0.5">
            Create managers in the <span className="font-semibold text-orange-100">Staff Management</span> section so they can organise tournaments for your employees.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <QuickAction icon={Users}     label="Staff / Managers" desc="Add or remove managers"     onClick={() => navigate("/corporate-staff")} />
        <QuickAction icon={Trophy}    label="Tournaments"      desc="View company tournaments"   onClick={() => navigate("/corporate-tournaments")} />
        <QuickAction icon={Building2} label="Company profile"  desc="Update company information" onClick={() => navigate("/corporate-profile")} />
      </div>
    </CorporateShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, tone = "orange" }) {
  const tones = {
    orange: { bg: "bg-orange-500/15",  text: "text-orange-400"  },
    green:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  };
  const t = tones[tone] || tones.orange;
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`grid w-[34px] h-[34px] rounded-md place-items-center ${t.bg}`}>
          <Icon className={`w-[18px] h-[18px] ${t.text}`} />
        </span>
      </div>
      <p className="text-[24px] font-medium leading-none text-white tabular-nums">{value ?? 0}</p>
      <p className="mt-1 text-[12px] text-gray-400">{label}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick }) {
  return (
    <button onClick={onClick}
      className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 text-left flex items-center gap-3 transition hover:border-white/[0.12] hover:bg-white/[0.02] group w-auto"
    >
      <span className="w-9 h-9 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
        <Icon className="w-4 h-4 text-orange-400" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate group-hover:text-orange-300 transition">{label}</p>
        <p className="text-[11px] text-gray-500 truncate">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition flex-shrink-0" />
    </button>
  );
}

export default CorporateDashboard;
