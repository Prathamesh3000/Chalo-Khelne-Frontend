import { useState, useEffect } from "react";
import axios from "axios";
import {
  Search, CheckCircle, XCircle, Calendar, CreditCard, Clock, User, FileText,
  Filter, Trophy, MapPin, Bell, Loader2,
} from "lucide-react";
import { ManagerShell } from "../shared/layout";

const NotificationPage = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tournamentStatusMap, setTournamentStatusMap] = useState({});
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [tournamentPaymentFilter, setTournamentPaymentFilter] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = localStorage.getItem("user");
      if (!user) return;
      const manager = JSON.parse(user);
      if (!manager?._id) return;

      try {
        const res = await axios.get(`/api/payments/${manager._id}/notifications`);
        let allNotifs = [];
        if (res.data.success) {
          const mapped = res.data.notifications.map((n) => ({
            ...n,
            type: "payment",
            status: n.transactionStatus,
            paymentMethod: n.paymentMethod,
            user: n.userId,
          }));
          allNotifs = [...mapped];
        }

        try {
          const bookingRes = await axios.get(`/api/payments/${manager._id}/booking-notifications`);
          if (bookingRes.data.success) {
            const bookingMapped = bookingRes.data.notifications.map((n) => ({
              ...n,
              type: "booking",
              status: n.type === "booking_cancel" ? "cancelled" : "info",
              paymentMethod: "turf",
              user: n.userId,
              message: n.message || `${n.title}`,
              tournamentId: n.turfId,
            }));
            allNotifs = [...allNotifs, ...bookingMapped];
          }
        } catch {}

        allNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(allNotifs);

        const paymentNotifs = allNotifs.filter((n) => n.type === "payment");
        if (paymentNotifs.length > 0) await fetchTournamentStatuses(paymentNotifs);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    const fetchTournamentStatuses = async (notificationsList) => {
      try {
        const tournamentIds = [...new Set(notificationsList.map((n) => n.tournamentId))];
        const statusMap = {};
        const activeList = [];

        for (const tournamentId of tournamentIds) {
          try {
            const r = await axios.get(`/api/tournaments/${tournamentId}`);
            if (r.data.success && r.data.tournament) {
              const t = r.data.tournament;
              const now = new Date();
              const endDate = t.endDate ? new Date(t.endDate) : null;
              if (endDate) endDate.setHours(23, 59, 59, 999);
              const isExpired = endDate && endDate < now;
              statusMap[tournamentId] = isExpired ? "expired" : "active";
              if (!isExpired) activeList.push(t);
            } else {
              statusMap[tournamentId] = "unknown";
            }
          } catch {
            statusMap[tournamentId] = "unknown";
          }
        }

        setTournamentStatusMap(statusMap);
        setActiveTournaments(activeList);
      } catch (err) {
        console.error("Failed to fetch tournament statuses:", err);
      }
    };

    fetchNotifications();
  }, []);

  const handleAction = async (notification, action) => {
    if (!notification?._id) return;
    try {
      const decision = action.toLowerCase();
      let bookingPaymentMethod = "cash";
      if (notification.paymentMethod && ["card", "upi", "netbanking", "wallet", "online"].includes(notification.paymentMethod.toLowerCase())) {
        bookingPaymentMethod = "cash";
      } else if (notification.paymentMethod && ["free", "waived"].includes(notification.paymentMethod.toLowerCase())) {
        bookingPaymentMethod = notification.paymentMethod.toLowerCase();
      }

      await axios.patch(`/api/payments/booking/update-status`, {
        tournamentId: notification.tournamentId,
        userId: notification.user._id,
        decision: decision === "accept" ? "accepted" : "rejected",
        paymentMethod: bookingPaymentMethod,
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, status: decision === "accept" ? "accepted" : "rejected" } : n
        )
      );
    } catch (err) {
      console.error("Failed to update booking/payment:", err);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const bulkAction = async (action) => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const items = notifications
        .filter((n) => selected.includes(n._id))
        .map((n) => ({
          userId: n.user._id,
          tournamentId: n.tournamentId,
          paymentMethod: n.paymentMethod && ["card", "upi", "netbanking", "wallet", "online"].includes(n.paymentMethod.toLowerCase())
            ? "cash"
            : n.paymentMethod && ["free", "waived"].includes(n.paymentMethod.toLowerCase())
            ? n.paymentMethod.toLowerCase()
            : "cash",
        }));
      await axios.patch(`/api/payments/booking/bulk-update`, { items, decision: action });
      setNotifications((prev) => prev.map((n) => (selected.includes(n._id) ? { ...n, status: action } : n)));
      setSelected([]);
    } catch (err) {
      console.error("Bulk update failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (typeFilter === "tournament")  filtered = filtered.filter((n) => n.type === "payment");
    else if (typeFilter === "turf")    filtered = filtered.filter((n) => n.type === "booking");

    if (statusFilter !== "all") {
      filtered = filtered.filter((n) => {
        if (n.type === "booking") {
          if (statusFilter === "pending")  return false;
          if (statusFilter === "accepted") return n.type !== "booking_cancel";
          if (statusFilter === "rejected") return n.type === "booking_cancel";
        }
        return n.status === statusFilter;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((n) =>
        (n.user?.name && n.user.name.toLowerCase().includes(q)) ||
        (n.registrationId && n.registrationId.toLowerCase().includes(q)) ||
        (n.message && n.message.toLowerCase().includes(q)) ||
        (n.turfName && n.turfName.toLowerCase().includes(q)) ||
        (n.sport && n.sport.toLowerCase().includes(q)) ||
        (n.playerName && n.playerName.toLowerCase().includes(q)) ||
        (n.tournamentId && n.tournamentId.toLowerCase().includes(q))
      );
    }

    if (activeTab !== "All") {
      filtered = filtered.filter((n) => n.tournamentId === activeTab);
      const sub = tournamentPaymentFilter[activeTab] || "All";
      if (sub !== "All") {
        filtered = filtered.filter((n) => n.paymentMethod?.toLowerCase() === sub.toLowerCase());
      }
    }

    return filtered;
  };

  const filtered = getFilteredNotifications();
  const allSelected = filtered.length > 0 && filtered.every((n) => selected.includes(n._id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected((prev) => prev.filter((id) => !filtered.some((n) => n._id === id)));
    else { const ids = filtered.map((n) => n._id); setSelected((prev) => Array.from(new Set([...prev, ...ids]))); }
  };
  const clearAllSelections = () => setSelected([]);

  const counts = {
    all:        notifications.length,
    tournament: notifications.filter((n) => n.type === "payment").length,
    turf:       notifications.filter((n) => n.type === "booking").length,
  };

  return (
    <ManagerShell searchPlaceholder="Search notifications…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Bell className="w-3.5 h-3.5" />
            Inbox · Notifications & requests
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Notifications & requests
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Manage payment approvals and booking requests.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-9 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white w-auto">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-[#181A22] border border-white/[0.06] rounded-md p-2.5">
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-gray-500 mr-1" />
          <Eyebrow>Type:</Eyebrow>
          {[
            { key: "all",        label: "All",        icon: null,   count: counts.all },
            { key: "tournament", label: "Tournament", icon: Trophy, count: counts.tournament },
            { key: "turf",       label: "Turf booking", icon: MapPin, count: counts.turf },
          ].map(({ key, label, icon: Icon, count }) => {
            const active = typeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium transition w-auto ${
                  active ? "bg-orange-500/15 text-orange-400" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {label}
                <span className="text-[10px] opacity-60 font-mono tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-white/[0.06] hidden sm:block" />

        <div className="flex items-center gap-1">
          <Eyebrow>Status:</Eyebrow>
          {[
            { key: "all",      label: "All",      dot: null },
            { key: "pending",  label: "Pending",  dot: "bg-amber-500" },
            { key: "accepted", label: "Accepted", dot: "bg-emerald-500" },
            { key: "rejected", label: "Rejected", dot: "bg-red-500" },
          ].map(({ key, label, dot }) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium transition w-auto ${
                  active ? "bg-white/[0.06] text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                {label}
              </button>
            );
          })}
        </div>

        {(typeFilter !== "all" || statusFilter !== "all") && (
          <button
            onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
            className="text-[11px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-md transition w-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Tournament tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {["All", ...activeTournaments.map((t) => t._id)].map((tab) => {
          const tournament = activeTournaments.find((t) => t._id === tab);
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-7 px-3 rounded-md text-[12px] font-medium transition w-auto ${
                active ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
              style={!active ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" } : undefined}
            >
              {tab === "All" ? "All notifications" : tournament?.title || `Tournament ${tab.substring(0, 8)}…`}
            </button>
          );
        })}
      </div>

      {/* Per-tournament payment-method sub-filter */}
      {activeTab !== "All" && (
        <div className="flex items-center gap-2 mb-4">
          <Eyebrow>Filter by method:</Eyebrow>
          <div className="inline-flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-md border border-white/[0.06]">
            {["All", "Online", "Cash"].map((m) => {
              const current = tournamentPaymentFilter[activeTab] || "All";
              const isSub = current === m;
              return (
                <button
                  key={m}
                  onClick={() => setTournamentPaymentFilter((prev) => ({ ...prev, [activeTab]: m }))}
                  className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-[5px] text-[11px] font-medium transition w-auto ${
                    isSub ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {m}
                  {isSub && <CheckCircle className="w-2.5 h-2.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk header */}
      {filtered.length > 0 && (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-md px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
              style={{ accentColor: "#f97316" }}
            />
            <span className="text-[13px] font-medium text-gray-200">Select all ({filtered.length})</span>
            {selected.length > 0 && (
              <>
                <span className="h-4 w-px bg-white/[0.06] mx-1" />
                <button onClick={clearAllSelections} className="text-[12px] font-medium text-red-400 hover:text-red-300 transition w-auto">
                  Clear selection
                </button>
              </>
            )}
          </label>

          <div className="flex gap-3 text-[11px] font-medium text-gray-400 bg-white/[0.04] px-3 py-1 rounded-md">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active: <span className="font-mono tabular-nums text-emerald-300">{filtered.filter((n) => tournamentStatusMap[n.tournamentId] === "active").length}</span>
            </span>
            <span className="h-3 w-px bg-white/[0.06]" />
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Expired: <span className="font-mono tabular-nums text-red-300">{filtered.filter((n) => tournamentStatusMap[n.tournamentId] === "expired").length}</span>
            </span>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Search className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No notifications found</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((n) => (
            <NotificationRow
              key={n._id}
              n={n}
              selected={selected.includes(n._id)}
              disabledCheckbox={tournamentStatusMap[n.tournamentId] !== "active"}
              tournamentStatus={tournamentStatusMap[n.tournamentId]}
              onToggle={() => toggleSelect(n._id)}
              onAccept={() => handleAction(n, "accept")}
              onReject={() => handleAction(n, "reject")}
            />
          ))}
        </div>
      )}

      {/* Bulk floating bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#181A22] text-white rounded-full px-5 py-2.5 flex items-center gap-4 border border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 pr-3 border-r border-white/[0.06]">
              <span className="bg-orange-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                {selected.length}
              </span>
              <span className="text-[12px] font-medium">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => bulkAction("accepted")} disabled={loading}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Accept all
              </button>
              <button onClick={() => bulkAction("rejected")} disabled={loading}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-[12px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Reject all
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerShell>
  );
};

// ── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({ n, selected, disabledCheckbox, tournamentStatus, onToggle, onAccept, onReject }) {
  const isBooking = n.type === "booking";

  return (
    <article
      className={`relative flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-md border transition mb-1 ${
        selected ? "border-orange-500/50 bg-orange-500/[0.04]" : "border-white/[0.06] hover:border-white/[0.12]"
      }`}
      style={{ background: selected ? "rgba(249,115,22,0.04)" : "#181A22" }}
    >
      <div className="flex items-start gap-3 flex-1 w-full">
        {/* Checkbox or icon */}
        <div className="pt-0.5 flex-shrink-0">
          {isBooking ? (
            <div className="w-5 h-5 rounded bg-orange-500/15 flex items-center justify-center">
              <Calendar className="w-3 h-3 text-orange-400" />
            </div>
          ) : (
            <input
              type="checkbox"
              checked={selected}
              disabled={disabledCheckbox}
              onChange={onToggle}
              className="w-4 h-4 rounded cursor-pointer disabled:opacity-40"
              style={{ accentColor: "#f97316" }}
            />
          )}
        </div>

        {/* Content */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-medium text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-500" />
              {n.user?.name || n.playerName || "Player"}
            </span>
            {isBooking ? (
              <Pill className="bg-orange-500/15 text-orange-400">
                <Calendar className="w-2.5 h-2.5" /> Turf booking
              </Pill>
            ) : (
              <Pill className="bg-white/[0.06] text-gray-300">
                <CreditCard className="w-2.5 h-2.5" /> {n.paymentMethod || "Unknown"}
              </Pill>
            )}
            {/* Status */}
            <span className="ml-auto md:ml-0">
              {isBooking ? (
                <Pill className={n.type === "booking_cancel" ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}>
                  {n.type === "booking_cancel" ? "Cancelled" : "New booking"}
                </Pill>
              ) : (
                <Pill className={
                  tournamentStatus === "active" ? "bg-emerald-500/15 text-emerald-300"
                  : tournamentStatus === "expired" ? "bg-red-500/15 text-red-300"
                  : "bg-white/[0.06] text-gray-400"
                }>
                  {tournamentStatus || "unknown"}
                </Pill>
              )}
            </span>
          </div>

          <p className="text-[12px] text-gray-300 bg-white/[0.04] px-2.5 py-1.5 rounded">{n.message}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
            {isBooking ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span className="font-mono tabular-nums">{n.date} · {n.timeSlot}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-300 font-mono tabular-nums">₹{n.amount}</span>
                  <span>· {n.sport}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  <span className="font-mono tracking-wide">{n.registrationId || "N/A"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>Tournament: <span className="font-mono">{n.tournamentId?.substring(0, 8)}…</span></span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 md:mt-0 md:ml-4 flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/[0.06]">
        {isBooking ? (
          <div className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold ${
            n.type === "booking_cancel"
              ? "bg-red-500/15 text-red-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}>
            {n.type === "booking_cancel" ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {n.type === "booking_cancel" ? "Cancelled" : "Booked"}
          </div>
        ) : n.status === "pending" ? (
          <>
            <button onClick={onAccept}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold transition active:scale-[0.98] w-auto">
              <CheckCircle className="w-3.5 h-3.5" /> Accept
            </button>
            <button onClick={onReject}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[12px] font-semibold transition active:scale-[0.98] w-auto"
              style={{ border: "1px solid rgba(248,113,113,0.25)" }}>
              <XCircle className="w-3.5 h-3.5" /> Decline
            </button>
          </>
        ) : (
          <div className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold ${
            n.status === "accepted" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
          }`}>
            {n.status === "accepted" ? <CheckCircle className="w-3.5 h-3.5" /> : n.status === "rejected" ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            <span className="capitalize">{n.status}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function Eyebrow({ children }) {
  return <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-1">{children}</span>;
}

function Pill({ className, children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}

export default NotificationPage;
