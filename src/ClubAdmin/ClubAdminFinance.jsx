import { toast } from "react-toastify";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { getSportName, getTournamentType, getCurrentStage } from "../utils/sportTrack";
import {
  Users, Trophy, IndianRupee, TrendingUp, ArrowLeft, ChevronRight,
  MapPin, CreditCard, BarChart3, Eye, CheckCircle, Clock, Receipt, Loader2,
} from "lucide-react";
import { ClubAdminShell } from "../shared/layout";

import { getAuthToken } from "../shared/api/authToken";
const statusPillClass = (status) => {
  const s = (status || "").toLowerCase();
  if (["confirmed", "active", "paid"].includes(s)) return "bg-emerald-500/15 text-emerald-300";
  if (["pending"].includes(s)) return "bg-amber-500/15 text-amber-300";
  if (["cancelled", "rejected", "failed"].includes(s)) return "bg-red-500/15 text-red-300";
  if (["completed", "waived"].includes(s)) return "bg-blue-500/15 text-blue-300";
  if (["upcoming"].includes(s)) return "bg-blue-500/15 text-blue-300";
  if (["in-progress"].includes(s)) return "bg-orange-500/15 text-orange-300";
  return "bg-white/[0.06] text-gray-400";
};

export default function ClubAdminFinance() {
  const { auth } = useContext(AuthContext);
  const token = getAuthToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [view, setView] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [managerDetail, setManagerDetail] = useState(null);
  const [tournamentDetail, setTournamentDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedManagerName, setSelectedManagerName] = useState("");

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/club-admin/finance/overview", { headers });
      setOverview(res.data.overview);
    } catch (err) {
      console.error("Finance overview error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openManagerDetail = async (managerId, managerName) => {
    try {
      setLoading(true);
      setSelectedManagerName(managerName);
      const res = await axios.get(`/api/club-admin/finance/manager/${managerId}`, { headers });
      setManagerDetail(res.data);
      setView("manager");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const openTournamentDetail = async (tournamentId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/club-admin/finance/tournament/${tournamentId}`, { headers });
      setTournamentDetail(res.data);
      setView("tournament");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (view === "tournament") {
      setView("manager");
      setTournamentDetail(null);
    } else if (view === "manager") {
      setView("overview");
      setManagerDetail(null);
    }
  };

  const formatCurrency = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <ClubAdminShell searchPlaceholder="Search finance…">
      {/* Header */}
      <header className="flex items-start gap-3 mb-6">
        {view !== "overview" && (
          <button onClick={goBack}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.04] transition w-auto flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <TrendingUp className="w-3.5 h-3.5" />
            Finance · {view === "overview" ? "Overview" : view === "manager" ? "Manager detail" : "Tournament detail"}
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            {view === "overview" && "Financial overview"}
            {view === "manager" && `${selectedManagerName} — Details`}
            {view === "tournament" && `${tournamentDetail?.tournament?.title || "Tournament"}`}
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {view === "overview" && "Track all managers, tournaments, and revenue."}
            {view === "manager" && "Tournaments, bookings, and revenue breakdown."}
            {view === "tournament" && "Registrations and category-wise revenue."}
          </p>
        </div>
      </header>

      {loading && !overview ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {view === "overview" && overview && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <StatTile icon={Users}        label="Total managers"      value={overview.totalManagers} />
                <StatTile icon={Trophy}       label="Total tournaments"   value={overview.totalTournaments} />
                <StatTile icon={IndianRupee}  label="Tournament revenue"  value={formatCurrency(overview.totalTournamentRevenue)} tone="green" />
                <StatTile icon={TrendingUp}   label="Grand total revenue" value={formatCurrency(overview.grandTotalRevenue)} tone="green" />
              </div>

              <h2 className="text-[14px] font-medium text-white mb-3">Managers</h2>
              {overview.managers.length === 0 ? (
                <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
                  <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-gray-500" />
                  </div>
                  <h3 className="text-[14px] font-medium text-white">No managers found</h3>
                  <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">Create managers from your dashboard to see their financial data here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {overview.managers.map((mgr) => (
                    <ManagerCard key={mgr._id} mgr={mgr} onClick={() => openManagerDetail(mgr._id, mgr.name)} formatCurrency={formatCurrency} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* MANAGER DETAIL */}
          {view === "manager" && managerDetail && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                <StatTile icon={Trophy}       label="Tournaments"        value={managerDetail.totals.totalTournaments} />
                <StatTile icon={IndianRupee}  label="Tournament revenue" value={formatCurrency(managerDetail.totals.totalTournamentRevenue)} tone="green" />
                <StatTile icon={MapPin}       label="Turf bookings"      value={managerDetail.totals.totalTurfBookings} />
                <StatTile icon={CreditCard}   label="Turf revenue"       value={formatCurrency(managerDetail.totals.totalTurfRevenue)} tone="green" />
                <StatTile icon={TrendingUp}   label="Grand total"        value={formatCurrency(managerDetail.totals.grandTotal)} tone="green" />
              </div>

              <Section title={`Tournaments (${managerDetail.tournaments.length})`} icon={Trophy} className="mb-3">
                {managerDetail.tournaments.length === 0 ? (
                  <div className="text-center py-10 text-[13px] text-gray-500">No tournaments created by this manager</div>
                ) : (
                  <div className="overflow-x-auto -mx-5 -mb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <Th>Tournament</Th>
                          <Th>Sport</Th>
                          <Th align="center">Status</Th>
                          <Th align="center">Registrations</Th>
                          <Th align="right">Revenue</Th>
                          <Th>Dates</Th>
                          <Th align="center">Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {managerDetail.tournaments.map((t) => (
                          <tr key={t._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition">
                            <Td>
                              <p className="text-[13px] font-medium text-white">{t.tournamentName || t.title}</p>
                              <p className="text-[11px] text-gray-500">{getTournamentType(t)}</p>
                            </Td>
                            <Td><span className="text-[12px] text-gray-300">{t.sport || getSportName(t) || "—"}</span></Td>
                            <Td align="center">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusPillClass(t.status || getCurrentStage(t))}`}>
                                {t.status || getCurrentStage(t) || "—"}
                              </span>
                            </Td>
                            <Td align="center">
                              <p className="text-[13px] font-semibold text-white tabular-nums">{t.confirmedRegistrations}</p>
                              <p className="text-[10px] text-gray-500"><span className="font-mono tabular-nums">{t.totalRegistrations}</span> total</p>
                            </Td>
                            <Td align="right"><span className="text-[13px] font-semibold text-emerald-300 tabular-nums">{formatCurrency(t.paidRevenue)}</span></Td>
                            <Td><span className="text-[11px] text-gray-500 font-mono tabular-nums">{t.startDate || "—"} — {t.endDate || "—"}</span></Td>
                            <Td align="center">
                              <button onClick={() => openTournamentDetail(t._id)}
                                title="View details"
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-orange-400 hover:text-orange-300 hover:bg-orange-500/15 transition w-auto">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {managerDetail.turfSummary.length > 0 && (
                <Section title="Turf bookings" icon={MapPin}>
                  <div className="overflow-x-auto -mx-5 -mb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <Th>Turf</Th>
                          <Th align="center">Total</Th>
                          <Th align="center">Confirmed</Th>
                          <Th align="center">Cancelled</Th>
                          <Th align="right">Revenue</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {managerDetail.turfSummary.map((turf) => (
                          <tr key={turf.turfId} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition">
                            <Td><span className="text-[13px] font-medium text-white">{turf.turfName}</span></Td>
                            <Td align="center"><span className="text-[13px] text-gray-300 font-mono tabular-nums">{turf.totalBookings}</span></Td>
                            <Td align="center"><span className="text-[13px] text-emerald-300 font-mono tabular-nums">{turf.confirmedBookings}</span></Td>
                            <Td align="center"><span className="text-[13px] text-red-300 font-mono tabular-nums">{turf.cancelledBookings}</span></Td>
                            <Td align="right"><span className="text-[13px] font-semibold text-emerald-300 tabular-nums">{formatCurrency(turf.revenue)}</span></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}
            </>
          )}

          {/* TOURNAMENT DETAIL */}
          {view === "tournament" && tournamentDetail && (
            <>
              {/* Tournament info card */}
              <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-5 mb-3">
                <h2 className="text-[16px] font-medium text-white">{tournamentDetail.tournament.title}</h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300">
                    {getSportName(tournamentDetail.tournament)}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300">
                    {getTournamentType(tournamentDetail.tournament)}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusPillClass(getCurrentStage(tournamentDetail.tournament))}`}>
                    {getCurrentStage(tournamentDetail.tournament)}
                  </span>
                </div>
                <p className="text-[12px] text-gray-400 mt-2 font-mono tabular-nums">
                  {tournamentDetail.tournament.startDate} — {tournamentDetail.tournament.endDate}
                </p>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <StatTile icon={Users}        label="Total registrations" value={tournamentDetail.summary.totalRegistrations} />
                <StatTile icon={CheckCircle}  label="Confirmed"           value={tournamentDetail.summary.confirmedRegistrations} tone="green" />
                <StatTile icon={Clock}        label="Pending"             value={tournamentDetail.summary.pendingRegistrations} tone="amber" />
                <StatTile icon={IndianRupee}  label="Total revenue"       value={formatCurrency(tournamentDetail.summary.totalRevenue)} tone="green" />
              </div>

              {/* Category breakdown */}
              {tournamentDetail.summary.categoryBreakdown.length > 0 && (
                <Section title="Category-wise breakdown" icon={BarChart3} className="mb-3">
                  <div className="overflow-x-auto -mx-5 -mb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <Th>Category</Th>
                          <Th align="right">Fee</Th>
                          <Th align="center">Total</Th>
                          <Th align="center">Confirmed</Th>
                          <Th align="center">Paid</Th>
                          <Th align="right">Revenue</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournamentDetail.summary.categoryBreakdown.map((cat, idx) => (
                          <tr key={idx} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition">
                            <Td><span className="text-[13px] font-medium text-white">{cat.name}</span></Td>
                            <Td align="right"><span className="text-[12px] text-gray-300 font-mono tabular-nums">{formatCurrency(cat.fee)}</span></Td>
                            <Td align="center"><span className="text-[12px] text-gray-300 font-mono tabular-nums">{cat.total}</span></Td>
                            <Td align="center"><span className="text-[12px] text-emerald-300 font-mono tabular-nums">{cat.confirmed}</span></Td>
                            <Td align="center"><span className="text-[12px] text-blue-300 font-mono tabular-nums">{cat.paid}</span></Td>
                            <Td align="right"><span className="text-[13px] font-semibold text-emerald-300 tabular-nums">{formatCurrency(cat.revenue)}</span></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {/* Registration list */}
              <Section title={`All registrations (${tournamentDetail.registrations.length})`} icon={Receipt}>
                {tournamentDetail.registrations.length === 0 ? (
                  <div className="text-center py-10 text-[13px] text-gray-500">No registrations yet</div>
                ) : (
                  <div className="overflow-x-auto -mx-5 -mb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <Th>Player</Th>
                          <Th>Categories</Th>
                          <Th align="center">Status</Th>
                          <Th align="center">Payment</Th>
                          <Th align="right">Amount</Th>
                          <Th>Date</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournamentDetail.registrations.map((reg) => (
                          <tr key={reg._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition">
                            <Td>
                              <p className="text-[13px] font-medium text-white">{reg.userName}</p>
                              <p className="text-[11px] text-gray-500">{reg.userEmail || reg.userPhone || ""}</p>
                            </Td>
                            <Td>
                              <div className="flex flex-wrap gap-1">
                                {(Array.isArray(reg.sportSelections) ? reg.sportSelections : []).map((s, i) => (
                                  <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300">
                                    {s.categoryName} (<span className="font-mono tabular-nums">{formatCurrency(s.fee)}</span>)
                                  </span>
                                ))}
                              </div>
                            </Td>
                            <Td align="center">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusPillClass(reg.status)}`}>
                                {reg.status}
                              </span>
                            </Td>
                            <Td align="center">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusPillClass(reg.paymentStatus)}`}>
                                {reg.paymentStatus}
                              </span>
                            </Td>
                            <Td align="right"><span className="text-[13px] font-semibold text-white tabular-nums">{formatCurrency(reg.paymentAmount)}</span></Td>
                            <Td><span className="text-[11px] text-gray-500 font-mono tabular-nums">{new Date(reg.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </>
          )}
        </>
      )}
    </ClubAdminShell>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ManagerCard({ mgr, onClick, formatCurrency }) {
  return (
    <button onClick={onClick}
      className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 text-left transition hover:border-white/[0.12] hover:bg-white/[0.02] cursor-pointer group w-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-500/15 text-orange-400 grid place-items-center text-[16px] font-semibold flex-shrink-0">
          {mgr.name?.charAt(0)?.toUpperCase() || "M"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-medium text-white truncate group-hover:text-orange-300 transition">{mgr.name}</h3>
          <p className="text-[11px] text-gray-500 truncate">{mgr.email}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Tournaments"   value={mgr.tournaments}                         tone="amber" />
        <MiniStat label="Revenue"       value={formatCurrency(mgr.totalRevenue)}        tone="emerald" />
        <MiniStat label="Registrations" value={mgr.tournamentBookings}                   tone="blue" />
        <MiniStat label="Turf bookings" value={mgr.turfBookings}                         tone="orange" />
      </div>

      <div className="mt-3 flex justify-between items-center">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          mgr.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
        }`}>
          {mgr.isActive ? "Active" : "Inactive"}
        </span>
        <span className="text-[10px] text-gray-500">
          Joined <span className="font-mono tabular-nums">{new Date(mgr.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
        </span>
      </div>
    </button>
  );
}

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
      <p className="text-[22px] font-medium leading-none text-white tabular-nums">{value ?? 0}</p>
      <p className="mt-1 text-[12px] text-gray-400">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const tones = {
    amber:   "text-amber-300",
    emerald: "text-emerald-300",
    blue:    "text-blue-300",
    orange:  "text-orange-300",
  };
  return (
    <div className="rounded-md p-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className={`text-[15px] font-semibold tabular-nums leading-none ${tones[tone] || "text-white"}`}>{value}</p>
      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, className = "", children }) {
  return (
    <div className={`bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
        {Icon && (
          <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5 text-orange-400" />
          </span>
        )}
        <h3 className="text-[13px] font-medium text-white">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 ${a}`}>{children}</th>;
}

function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-3 ${a}`}>{children}</td>;
}
