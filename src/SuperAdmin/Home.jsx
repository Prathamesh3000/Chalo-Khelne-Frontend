import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Users, UserCheck, UserLock, MessageSquare, Building2, Trophy, Plus,
  Activity, Loader2, ArrowRight,
} from "lucide-react";

const SIG = "#5E6AD2";
const SIG_TINT = "rgba(94,106,210,0.12)";

export default function Home() {
  const [overview, setOverview] = useState({
    totalRequests: 0, pending: 0, approved: 0,
    stats: { players: 0, trainers: 0, clubAdmins: 0, corporateAdmins: 0, totalInquiries: 0, pendingInquiries: 0 },
  });

  const [sports, setSports] = useState([]);
  const [sportName, setSportName] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingSport, setAddingSport] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, sportsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/update/overview`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/sports`),
        ]);
        setOverview(overviewRes.data);
        setSports(sportsRes.data.data || sportsRes.data);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [success]);

  const handleAddSport = async () => {
    if (!sportName.trim()) return;
    setAddingSport(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/sports`,
        { name: sportName }
      );
      setSuccess("Sport added successfully");
      setSportName("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      toast.info(err.response?.data?.message || "Failed to add sport");
    } finally {
      setAddingSport(false);
    }
  };

  const toggleSportStatus = async (id, currentStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/sports/${id}`, {
        isActive: !currentStatus,
      });
      setSports((prev) =>
        prev.map((sport) => (sport._id === id ? { ...sport, isActive: !currentStatus } : sport))
      );
      setSuccess("Sport status updated");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  if (loading && !overview.totalRequests) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-7 h-7 text-neutral-400 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Total users",        value: overview.totalRequests,                icon: Users         },
    { label: "Pending approvals",  value: overview.pending,                      icon: UserLock      },
    { label: "Approved users",     value: overview.approved,                     icon: UserCheck     },
    { label: "Players",            value: overview.stats?.players          || 0, icon: Trophy        },
    { label: "Club admins",        value: overview.stats?.clubAdmins       || 0, icon: Building2     },
    { label: "Corporate admins",   value: overview.stats?.corporateAdmins  || 0, icon: Activity      },
    { label: "Total inquiries",    value: overview.stats?.totalInquiries   || 0, icon: MessageSquare },
    { label: "Pending inquiries",  value: overview.stats?.pendingInquiries || 0, icon: MessageSquare },
  ];

  return (
    <div className="p-6 max-w-[1320px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-1.5">
            Super admin · Overview
          </p>
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight text-neutral-950">
            Admin dashboard
          </h1>
          <p className="text-[13px] text-neutral-500 mt-1.5">
            Platform-wide statistics and management.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statCards.map((card) => (
          <StatTile key={card.label} icon={card.icon} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Add Sport */}
        <Section title="Add new sport" icon={Plus}>
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={sportName}
                onChange={(e) => setSportName(e.target.value)}
                placeholder="Enter sport name (e.g. Badminton)"
                className="flex-1 h-9 px-3 border border-neutral-200 rounded-lg text-[13px] bg-white text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[--sig] focus:ring-2 focus:ring-[--sig-tint]"
                style={{ "--sig": SIG, "--sig-tint": SIG_TINT }}
              />
              <SigButton onClick={handleAddSport} disabled={addingSport || !sportName.trim()}>
                <Plus className="w-3.5 h-3.5" /> {addingSport ? "Adding…" : "Add sport"}
              </SigButton>
            </div>
            {success && <p className="text-[12px] font-semibold text-emerald-700">{success}</p>}
          </div>
        </Section>

        {/* Available Sports */}
        <Section
          title="Available sports"
          icon={Trophy}
          rightSlot={
            <span className="text-[11px] font-semibold text-neutral-500 font-mono tabular-nums">{sports.length} sports</span>
          }
        >
          {sports.length === 0 ? (
            <EmptyInline icon={Trophy} title="No sports yet" desc="Add your first sport using the form on the left." />
          ) : (
            <div className="-mx-4 -mb-4 border-t border-neutral-100">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <Th>Sport</Th>
                    <Th align="center">Status</Th>
                    <Th align="right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {sports.map((sport) => (
                    <tr key={sport._id} className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50/40 transition">
                      <Td><span className="text-[13px] font-semibold text-neutral-900 capitalize">{sport.name}</span></Td>
                      <Td align="center"><StatusPill active={sport.isActive} /></Td>
                      <Td align="right">
                        <button
                          onClick={() => toggleSportStatus(sport._id, sport.isActive)}
                          className="h-7 px-2.5 rounded-md border border-neutral-200 hover:border-neutral-300 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 transition inline-flex items-center gap-1 w-auto"
                        >
                          {sport.isActive ? "Deactivate" : "Activate"}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

// ── SIG inline primitives ────────────────────────────────────────────────────

function SigButton({ children, onClick, variant = "primary", disabled, type = "button", className = "" }) {
  const base = "h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-lg transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  if (variant === "outline") {
    return (
      <button type={type} onClick={onClick} disabled={disabled}
        className={`${base} border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:bg-neutral-50 ${className}`}>
        {children}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} text-white ${className}`}
      style={{ backgroundColor: SIG }}>
      {children}
    </button>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="w-8 h-8 inline-flex items-center justify-center rounded-lg" style={{ background: SIG_TINT, color: SIG }}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="text-[22px] font-semibold leading-none text-neutral-950 tabular-nums">{value ?? 0}</p>
      <p className="mt-1.5 text-[12px] text-neutral-500">{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, rightSlot, children }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
          <h3 className="text-[13px] font-semibold text-neutral-950">{title}</h3>
        </div>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500 ${a}`}>{children}</th>;
}

function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-4 ${a}`}>{children}</td>;
}

function StatusPill({ active }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
      active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
    }`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function EmptyInline({ icon: Icon, title, desc }) {
  return (
    <div className="text-center py-10">
      <div className="w-10 h-10 rounded-xl bg-neutral-100 inline-flex items-center justify-center mb-2.5">
        <Icon className="w-4 h-4 text-neutral-400" />
      </div>
      <p className="text-[13px] font-semibold text-neutral-900">{title}</p>
      <p className="text-[12px] text-neutral-500 mt-1 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
