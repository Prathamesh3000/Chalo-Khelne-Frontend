import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import {
  Search, Trophy, MapPin, CreditCard, IndianRupee, CheckCircle, Clock,
  ChevronLeft, ChevronRight, TrendingUp, Loader2,
} from "lucide-react";
import { ClubAdminShell } from "../shared/layout";

const TABS = [
  { key: "all",        label: "All payments", icon: CreditCard },
  { key: "tournament", label: "Tournament",   icon: Trophy     },
  { key: "turf",       label: "Turf bookings",icon: MapPin     },
];

const formatCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const PaymentHistoryPage = () => {
  const { auth } = useContext(AuthContext);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState({ count: 0, revenue: 0, completed: 0, pending: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPayments();
  }, [activeTab, statusFilter, pagination.page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pagination.page, limit: 30 });
      if (activeTab !== "all") params.append("type", activeTab);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await axios.get(`/api/club-admin/finance/payments?${params}`, { headers });
      setPayments(res.data.payments || []);
      setTotals(res.data.totals || { count: 0, revenue: 0, completed: 0, pending: 0 });
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error("Fetch payments error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchPayments();
  };

  return (
    <ClubAdminShell searchPlaceholder="Search payments…">
      {/* Header */}
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
          <CreditCard className="w-3.5 h-3.5" />
          Finance · Payments
        </p>
        <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
          Payment history
        </h1>
        <p className="mt-1 text-[13px] text-gray-400">
          All tournament registrations and turf-booking payments.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatTile icon={IndianRupee} label="Total payments" value={totals.count} />
        <StatTile icon={TrendingUp}  label="Total revenue"  value={formatCurrency(totals.revenue)} tone="green" />
        <StatTile icon={CheckCircle} label="Completed"      value={totals.completed} tone="green" />
        <StatTile icon={Clock}       label="Pending"        value={totals.pending} tone="amber" />
      </div>

      {/* Tabs + filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="inline-flex items-center gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06]">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setPagination((p) => ({ ...p, page: 1 })); }}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[12px] font-medium transition w-auto ${
                  active ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearch} className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player, tournament, manager…"
            className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none cursor-pointer"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <option value="all"       className="bg-[#181A22]">All statuses</option>
          <option value="paid"      className="bg-[#181A22]">Paid</option>
          <option value="pending"   className="bg-[#181A22]">Pending</option>
          <option value="cancelled" className="bg-[#181A22]">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5 text-gray-500" />
            </div>
            <h3 className="text-[14px] font-medium text-white">No payments found</h3>
            <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">Payments from tournament registrations and turf bookings will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <Th>Type</Th>
                  <Th>Player</Th>
                  <Th>Reference</Th>
                  <Th>Manager</Th>
                  <Th align="right">Amount</Th>
                  <Th align="center">Method</Th>
                  <Th align="center">Status</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition">
                    <Td>
                      <TypePill type={p.type} />
                    </Td>
                    <Td>
                      <p className="text-[13px] font-medium text-white">{p.playerName}</p>
                      <p className="text-[11px] text-gray-500">{p.playerEmail}</p>
                    </Td>
                    <Td>
                      <p className="text-[12px] text-gray-300">{p.reference}</p>
                      {p.categories && <p className="text-[11px] text-gray-500">{p.categories}</p>}
                      {p.timeSlot   && <p className="text-[11px] text-gray-500">{p.timeSlot}</p>}
                    </Td>
                    <Td>
                      <span className="text-[12px] text-gray-300">{p.manager || "—"}</span>
                    </Td>
                    <Td align="right">
                      <span className="text-[13px] font-semibold text-white tabular-nums">{formatCurrency(p.amount)}</span>
                    </Td>
                    <Td align="center">
                      <span className="text-[11px] text-gray-500 capitalize">{p.paymentMethod || "—"}</span>
                    </Td>
                    <Td align="center">
                      <PaymentStatusPill status={p.paymentStatus || p.status} />
                    </Td>
                    <Td>
                      <span className="text-[12px] text-gray-400 font-mono tabular-nums">{formatDate(p.date)}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
            <span className="text-[12px] text-gray-400">
              Page <span className="font-mono tabular-nums">{pagination.page}</span> of <span className="font-mono tabular-nums">{pagination.pages}</span>
              {" "}(<span className="font-mono tabular-nums">{pagination.total}</span> total)
            </span>
            <div className="flex gap-1.5">
              <IconBtn onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </IconBtn>
              <IconBtn onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </IconBtn>
            </div>
          </div>
        )}
      </div>
    </ClubAdminShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, tone = "orange" }) {
  const tones = {
    orange: { bg: "bg-orange-500/15",  text: "text-orange-400"  },
    green:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
    amber:  { bg: "bg-amber-500/15",   text: "text-amber-400"   },
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

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 ${a}`}>{children}</th>;
}

function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-4 ${a}`}>{children}</td>;
}

function IconBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-40 disabled:cursor-not-allowed w-auto"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {children}
    </button>
  );
}

function TypePill({ type }) {
  const isTour = type === "tournament";
  const cls = isTour ? "bg-amber-500/15 text-amber-300" : "bg-blue-500/15 text-blue-300";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {isTour ? <Trophy className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
      {isTour ? "Tournament" : "Turf"}
    </span>
  );
}

function PaymentStatusPill({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "bg-white/[0.06] text-gray-400";
  if (["paid", "approved", "completed"].includes(s)) cls = "bg-emerald-500/15 text-emerald-300";
  else if (["confirmed", "waived"].includes(s))      cls = "bg-blue-500/15 text-blue-300";
  else if (s === "pending")                          cls = "bg-amber-500/15 text-amber-300";
  else if (["cancelled", "rejected", "failed"].includes(s)) cls = "bg-red-500/15 text-red-300";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status || "—"}
    </span>
  );
}

export default PaymentHistoryPage;
