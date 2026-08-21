import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Search, CheckCircle, XCircle, Calendar, CreditCard, Clock, User, FileText,
  Filter, Trophy, MapPin, Bell, Loader2, Trash2, RotateCcw, AlertTriangle, Copy,
} from "lucide-react";
import { ManagerShell } from "../shared/layout";
import { Modal, Pagination } from "../shared/ui";

// The manager id is read straight from the stored session on every call rather
// than threaded through state — the page already trusts localStorage for it.
const getManagerId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?._id || null;
  } catch {
    return null;
  }
};

const pairKey = (n) => `${n.tournamentId}|${n.user?._id || n.userId || ""}`;

// Mirrors MAX_ITEMS in bookingTrashController — a selection larger than this is
// split across requests instead of being rejected.
const BATCH_LIMIT = 200;

const NotificationPage = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tournamentStatusMap, setTournamentStatusMap] = useState({});
  // One tab per tournament present in the inbox: { _id, title, status }.
  const [tournamentTabs, setTournamentTabs] = useState([]);
  const [tournamentPaymentFilter, setTournamentPaymentFilter] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Delete stack (recycle bin) ──
  const [view, setView] = useState("inbox");          // "inbox" | "trash"
  const [trash, setTrash] = useState([]);
  const [trashSelected, setTrashSelected] = useState([]);
  // Set to the rows awaiting confirmation — nothing is deleted until the
  // manager answers the dialog this drives.
  const [pendingDelete, setPendingDelete] = useState(null);
  // Bin entries awaiting the "this cannot be undone" confirmation.
  const [pendingPurge, setPendingPurge] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);      // { tone, text }

  // ── Paging ──
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchNotifications = useCallback(async () => {
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
        } catch (err) {
          console.warn("Failed to load booking notifications:", err.message);
        }

        allNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(allNotifs);

        const paymentNotifs = allNotifs.filter((n) => n.type === "payment");
        if (paymentNotifs.length > 0) await fetchTournamentStatuses(paymentNotifs);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    // fetchTournamentStatuses only closes over setState functions, which React
    // keeps stable, so it does not belong in the dependency list.
    }, []);

  const fetchTournamentStatuses = async (notificationsList) => {
    try {
      // Distinct tournaments in inbox order — newest notification first.
      const tournamentIds = [...new Set(notificationsList.map((n) => n.tournamentId).filter(Boolean))];

      // Fallback label for a tournament whose document is gone. Deleting a
      // tournament leaves its notification rows behind (16 of the 21
      // tournaments in one live inbox no longer exist), and the id alone makes
      // an unreadable tab. The message captured the title at registration
      // time, which is the only copy left.
      const titleFromMessage = new Map();
      for (const n of notificationsList) {
        if (!n.tournamentId || titleFromMessage.has(n.tournamentId)) continue;
        const quoted = /registered for "([^"]+)"/.exec(n.message || "");
        if (quoted) titleFromMessage.set(n.tournamentId, quoted[1]);
      }

      const statusMap = {};
      const tabs = [];
      const now = new Date();

      // Was one sequential request per tournament. At 21 tournaments that is 21
      // round trips before a single tab can render; a manager with a season's
      // history waits through all of them.
      const CONCURRENCY = 6;
      for (let i = 0; i < tournamentIds.length; i += CONCURRENCY) {
        const batch = await Promise.all(
          tournamentIds.slice(i, i + CONCURRENCY).map(async (tournamentId) => {
            try {
              const r = await axios.get(`/api/tournaments/${tournamentId}`);
              if (r.data.success && r.data.tournament) return { tournamentId, t: r.data.tournament };
            } catch {
              // 404 = the tournament was deleted; the rows outlived it.
            }
            return { tournamentId, t: null };
          })
        );

        for (const { tournamentId, t } of batch) {
          if (!t) {
            statusMap[tournamentId] = "unknown";
            tabs.push({ _id: tournamentId, title: titleFromMessage.get(tournamentId) || null, status: "unknown" });
            continue;
          }
          const endDate = t.endDate ? new Date(t.endDate) : null;
          if (endDate) endDate.setHours(23, 59, 59, 999);
          statusMap[tournamentId] = endDate && endDate < now ? "expired" : "active";
          tabs.push({
            _id: tournamentId,
            title: t.title || titleFromMessage.get(tournamentId) || null,
            status: statusMap[tournamentId],
          });
        }
      }

      // Every tournament in the inbox gets a tab, not just the running ones.
      // The old rule pushed only unexpired tournaments, so a manager whose
      // events have all finished saw NO filter at all — 174 rows across 21
      // tournaments and no way to narrow them. Running events lead; sort is
      // stable, so recency holds within each group.
      const rank = { active: 0, expired: 1, unknown: 2 };
      tabs.sort((a, b) => rank[a.status] - rank[b.status]);

      setTournamentStatusMap(statusMap);
      setTournamentTabs(tabs);
    } catch (err) {
      console.error("Failed to fetch tournament statuses:", err);
    }
  };

  const loadTrash = useCallback(async () => {
    const managerId = getManagerId();
    if (!managerId) return;
    try {
      const { data } = await axios.get(`/api/payments/${managerId}/trash`);
      if (data.success) setTrash(data.entries || []);
    } catch (err) {
      console.warn("Failed to load the delete stack:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    loadTrash();
  }, [fetchNotifications, loadTrash]);

  // Narrowing the list while sitting on page 7 would otherwise land the
  // manager on an empty page.
  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, searchQuery, activeTab, pageSize, view]);

  // ── Delete / restore ───────────────────────────────────────────────────
  //
  // Deleting is confirmed, never immediate: askDelete() only opens the dialog.
  // The single-row button and the bulk bar both land here, so one row and forty
  // rows take exactly the same path through the API.
  const askDelete = (rows) => {
    const deletable = rows.filter((n) => n.type === "payment");
    if (!deletable.length) return;
    setDeleteReason("");
    setPendingDelete(deletable);
  };

  const confirmDelete = async () => {
    const rows = pendingDelete || [];
    const items = rows
      .map((n) => ({ tournamentId: n.tournamentId, userId: n.user?._id || n.userId }))
      .filter((i) => i.tournamentId && i.userId);
    if (!items.length) { setPendingDelete(null); return; }

    setBusy(true);
    try {
      // "Select all N matching" can reach past the endpoint's 200-per-request
      // cap, so send it in batches rather than letting the whole thing 400.
      const entries = [];
      let skipped = 0;
      for (let i = 0; i < items.length; i += BATCH_LIMIT) {
        const { data } = await axios.post("/api/payments/booking/delete", {
          items: items.slice(i, i + BATCH_LIMIT),
          reason: deleteReason.trim() || undefined,
        });
        entries.push(...(data.entries || []));
        skipped += (data.skipped || []).length;
      }

      // Drop only what the server actually deleted — a skipped row stays on
      // screen instead of vanishing into a bin it never reached.
      const gone = new Set(entries.map((e) => `${e.tournamentId}|${e.userId}`));
      setNotifications((prev) => prev.filter((n) => !gone.has(pairKey(n))));
      setSelected((prev) => prev.filter((id) => !rows.some((r) => r._id === id && gone.has(pairKey(r)))));
      await loadTrash();

      setFeedback({
        tone: skipped ? "warn" : "ok",
        text: skipped
          ? `${entries.length} moved to the delete stack · ${skipped} skipped`
          : `${entries.length} registration${entries.length === 1 ? "" : "s"} moved to the delete stack — restore any of them from the Delete stack tab.`,
      });
    } catch (err) {
      console.error("Delete failed:", err);
      setFeedback({
        tone: "error",
        text: err.response?.data?.message || "Delete failed — nothing was removed.",
      });
    } finally {
      setBusy(false);
      setPendingDelete(null);
      setDeleteReason("");
    }
  };

  const restoreEntries = async (entryIds) => {
    if (!entryIds.length) return;
    setBusy(true);
    try {
      const restoredIds = [];
      const skipped = [];
      for (let i = 0; i < entryIds.length; i += BATCH_LIMIT) {
        const { data } = await axios.post("/api/payments/booking/restore", {
          entryIds: entryIds.slice(i, i + BATCH_LIMIT),
        });
        restoredIds.push(...(data.restored || []).map((r) => String(r.entryId)));
        skipped.push(...(data.skipped || []));
      }

      const restored = new Set(restoredIds);
      setTrash((prev) => prev.filter((e) => !restored.has(String(e._id))));
      setTrashSelected((prev) => prev.filter((id) => !restored.has(String(id))));
      // The booking and its inbox row are back in their own collections — pull
      // the inbox again so the manager sees them, not a stale list.
      await fetchNotifications();

      setFeedback({
        tone: skipped.length ? "warn" : "ok",
        text: skipped.length
          ? `${restored.size} restored · ${skipped.length} skipped (${skipped[0].reason})`
          : `${restored.size} registration${restored.size === 1 ? "" : "s"} restored.`,
      });
    } catch (err) {
      console.error("Restore failed:", err);
      setFeedback({
        tone: "error",
        text: err.response?.data?.message || "Restore failed — the entry is still in the delete stack.",
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleTrashSelect = (id) =>
    setTrashSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  // Emptying the bin — the one step with no way back, so it gets its own
  // confirmation rather than sharing the delete dialog.
  const purgeEntries = async (entryIds) => {
    if (!entryIds.length) return;
    setBusy(true);
    try {
      let purged = 0;
      for (let i = 0; i < entryIds.length; i += BATCH_LIMIT) {
        const { data } = await axios.post("/api/payments/booking/purge", {
          entryIds: entryIds.slice(i, i + BATCH_LIMIT),
        });
        purged += data.purgedCount || 0;
      }
      const gone = new Set(entryIds.map(String));
      setTrash((prev) => prev.filter((e) => !gone.has(String(e._id))));
      setTrashSelected((prev) => prev.filter((id) => !gone.has(String(id))));
      setFeedback({
        tone: "ok",
        text: `${purged} entr${purged === 1 ? "y" : "ies"} permanently deleted.`,
      });
    } catch (err) {
      console.error("Purge failed:", err);
      setFeedback({
        tone: "error",
        text: err.response?.data?.message || "Permanent delete failed — nothing was removed.",
      });
    } finally {
      setBusy(false);
      setPendingPurge(null);
    }
  };

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
      // Was console-only, so a refused batch looked like nothing happened —
      // bulk-update rejects the whole batch if any tournament has been deleted.
      console.error("Bulk update failed:", err);
      setFeedback({
        tone: "error",
        text: err.response?.data?.message || "Bulk update failed — nothing was changed.",
      });
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

  // ── Pagination ─────────────────────────────────────────────────────────
  //
  // Client-side, because every filter on this page already is: the type,
  // status, search and tournament tabs all narrow the list the browser holds,
  // and their counts are computed from it. Paging on the server would make
  // those counts describe a page instead of the inbox. 206 rows platform-wide
  // is well inside what one fetch can carry; the cost was rendering 180
  // <article>s at once, which is what this fixes.
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Deleting the last row of the last page (or tightening a filter) can strand
  // the page number past the end — derive rather than trust it.
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Deleting the tail of the list shortens it under the current page; write the
  // clamp back so the number doesn't spring forward if the list grows again.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Selecting "all" means all on THIS page — the rows the manager can see.
  // Reaching past the page is a separate, explicit action below.
  const pageAllSelected = pageRows.length > 0 && pageRows.every((n) => selected.includes(n._id));
  const allMatchingSelected = filtered.length > 0 && filtered.every((n) => selected.includes(n._id));
  const toggleSelectAll = () => {
    const ids = pageRows.map((n) => n._id);
    if (pageAllSelected) setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    else setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  };
  const selectAllMatching = () =>
    setSelected((prev) => Array.from(new Set([...prev, ...filtered.map((n) => n._id)])));
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

      {/* Inbox / delete stack switch */}
      <div className="flex items-center gap-1.5 mb-4">
        {[
          { key: "inbox", label: "Inbox", icon: Bell, count: notifications.length },
          { key: "trash", label: "Delete stack", icon: Trash2, count: trash.length },
        ].map(({ key, label, icon: Icon, count }) => {
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[12px] font-medium transition w-auto ${
                active ? "bg-white/[0.08] text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
              style={!active ? { border: "1px solid rgba(255,255,255,0.06)" } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className="text-[10px] opacity-60 font-mono tabular-nums">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Result of the last delete / restore */}
      {feedback && (
        <div
          className={`flex items-start gap-2 mb-4 px-3.5 py-2.5 rounded-md text-[12px] ${
            feedback.tone === "error"
              ? "bg-red-500/10 text-red-300 border border-red-500/20"
              : feedback.tone === "warn"
              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
          }`}
        >
          {feedback.tone === "ok" ? (
            <CheckCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          )}
          <span className="flex-1">{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-current opacity-60 hover:opacity-100 w-auto">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {view === "trash" ? (
        <TrashPanel
          entries={trash}
          selected={trashSelected}
          busy={busy}
          onToggle={toggleTrashSelect}
          onRestore={(ids) => restoreEntries(ids)}
          onPurge={(ids) => setPendingPurge(trash.filter((e) => ids.includes(e._id)))}
          onClearSelection={() => setTrashSelected([])}
        />
      ) : (
      <>
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
        {["All", ...tournamentTabs.map((t) => t._id)].map((tab) => {
          const tournament = tournamentTabs.find((t) => t._id === tab);
          const active = activeTab === tab;
          const count = tab === "All"
            ? notifications.length
            : notifications.filter((n) => n.tournamentId === tab).length;
          const dot =
            tournament?.status === "active" ? "bg-emerald-500"
            : tournament?.status === "expired" ? "bg-red-500"
            : "bg-gray-500";
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              title={tournament?.status === "unknown" ? "This tournament no longer exists" : tournament?.status}
              className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium transition w-auto max-w-xs ${
                active ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
              style={!active ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" } : undefined}
            >
              {tab !== "All" && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />}
              <span className="truncate">
                {tab === "All" ? "All notifications" : tournament?.title || `Tournament ${tab.substring(0, 8)}…`}
              </span>
              <span className="text-[10px] opacity-60 font-mono tabular-nums flex-shrink-0">({count})</span>
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
          <label className="flex flex-wrap items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={pageAllSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
              style={{ accentColor: "#f97316" }}
            />
            <span className="text-[13px] font-medium text-gray-200">
              Select all on this page ({pageRows.length})
            </span>
            {/* Reaching past the visible page is deliberate, never implied by
                the checkbox — "Accept all" on 180 invisible rows should take a
                second decision. */}
            {pageAllSelected && !allMatchingSelected && filtered.length > pageRows.length && (
              <button
                onClick={(e) => { e.preventDefault(); selectAllMatching(); }}
                className="text-[12px] font-medium text-orange-400 hover:text-orange-300 transition w-auto"
              >
                Select all {filtered.length} matching
              </button>
            )}
            {selected.length > 0 && (
              <>
                <span className="h-4 w-px bg-white/[0.06] mx-1" />
                <span className="text-[12px] text-gray-400 font-mono tabular-nums">{selected.length} selected</span>
                <button onClick={clearAllSelections} className="text-[12px] font-medium text-red-400 hover:text-red-300 transition w-auto">
                  Clear selection
                </button>
              </>
            )}
          </label>

          <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Eyebrow>Rows:</Eyebrow>
            <div className="inline-flex items-center gap-0.5 bg-white/[0.04] p-0.5 rounded-md border border-white/[0.06]">
              {[25, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => setPageSize(size)}
                  className={`h-6 px-2 rounded-[5px] text-[11px] font-medium transition w-auto font-mono tabular-nums ${
                    pageSize === size ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

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
          {pageRows.map((n) => (
            <NotificationRow
              key={n._id}
              n={n}
              selected={selected.includes(n._id)}
              // Selection used to be limited to rows from a RUNNING tournament,
              // which also locked them out of bulk delete — and the rows most
              // worth clearing are the finished and deleted ones (140 expired
              // in one live inbox). Per-row Accept/Decline was never gated this
              // way, so the restriction only ever cost the bulk bar. The server
              // still refuses a bulk accept on a tournament that is gone.
              disabledCheckbox={false}
              tournamentStatus={tournamentStatusMap[n.tournamentId]}
              onToggle={() => toggleSelect(n._id)}
              onAccept={() => handleAction(n, "accept")}
              onReject={() => handleAction(n, "reject")}
              onDelete={() => askDelete([n])}
            />
          ))}
        </div>
      )}

      <Pagination
        page={safePage}
        totalPages={totalPages}
        total={filtered.length}
        limit={pageSize}
        onPage={setPage}
      />

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
              {/* Turf-booking rows live in a different collection and are not
                  deletable here, so the count reflects only what will go. */}
              <button
                onClick={() => askDelete(filtered.filter((n) => selected.includes(n._id)))}
                disabled={loading || busy || !filtered.some((n) => selected.includes(n._id) && n.type === "payment")}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-red-300 hover:text-white hover:bg-red-500/20 text-[12px] font-semibold transition active:scale-[0.98] disabled:opacity-40 w-auto"
                style={{ border: "1px solid rgba(248,113,113,0.3)" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Delete confirmation — nothing is removed until this is answered */}
      <Modal
        open={!!pendingDelete}
        onClose={() => (busy ? null : setPendingDelete(null))}
        title={pendingDelete?.length === 1 ? "Delete this booking?" : `Delete ${pendingDelete?.length || 0} bookings?`}
        theme="dark"
        size="md"
        footer={
          <>
            <button
              onClick={() => setPendingDelete(null)}
              disabled={busy}
              className="flex-1 h-9 rounded-md text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-50"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Yes, delete
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-gray-300">
            {pendingDelete?.length === 1
              ? "This removes the player's registration and its notification from this tournament."
              : `This removes ${pendingDelete?.length} players' registrations and their notifications from this tournament.`}
          </p>

          <div className="rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 max-h-40 overflow-y-auto space-y-1.5">
            {(pendingDelete || []).slice(0, 8).map((n) => (
              <div key={n._id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-gray-200 truncate">{n.user?.name || "Player"}</span>
                <span className="text-gray-500 font-mono text-[11px] flex-shrink-0">
                  {n.hasBooking === false ? "notification only" : `₹${n.amount || 0} · ${n.paymentMethod || "cash"}`}
                </span>
              </div>
            ))}
            {(pendingDelete?.length || 0) > 8 && (
              <p className="text-[11px] text-gray-500">+{pendingDelete.length - 8} more</p>
            )}
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reason (optional)</span>
            <input
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. duplicate entry, paid at venue"
              className="mt-1.5 w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            />
          </label>

          <p className="flex items-start gap-2 text-[12px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
            <RotateCcw className="w-3.5 h-3.5 mt-px flex-shrink-0" />
            Nothing is lost — this moves to your <strong className="font-semibold">Delete stack</strong>, where you can restore it.
          </p>
        </div>
      </Modal>

      {/* Permanent delete — separate dialog, because this one is final */}
      <Modal
        open={!!pendingPurge}
        onClose={() => (busy ? null : setPendingPurge(null))}
        title={pendingPurge?.length === 1 ? "Delete this forever?" : `Delete ${pendingPurge?.length || 0} entries forever?`}
        theme="dark"
        size="md"
        footer={
          <>
            <button
              onClick={() => setPendingPurge(null)}
              disabled={busy}
              className="flex-1 h-9 rounded-md text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-50"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Keep in delete stack
            </button>
            <button
              onClick={() => purgeEntries((pendingPurge || []).map((e) => e._id))}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete forever
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="flex items-start gap-2 text-[12px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
            <span>
              <strong className="font-semibold">This cannot be undone.</strong> The saved booking
              {pendingPurge?.length === 1 ? "" : "s"} and notification
              {pendingPurge?.length === 1 ? "" : "s"} will be gone for good — Restore will no longer bring
              {pendingPurge?.length === 1 ? " it" : " them"} back.
            </span>
          </p>

          <div className="rounded-md bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 max-h-40 overflow-y-auto space-y-1.5">
            {(pendingPurge || []).slice(0, 8).map((e) => (
              <div key={e._id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-gray-200 truncate">{e.userName || "Player"}</span>
                <span className="text-gray-500 text-[11px] flex-shrink-0 truncate max-w-[50%]">
                  {e.tournamentTitle || "Deleted tournament"}
                </span>
              </div>
            ))}
            {(pendingPurge?.length || 0) > 8 && (
              <p className="text-[11px] text-gray-500">+{pendingPurge.length - 8} more</p>
            )}
          </div>

          <p className="text-[12px] text-gray-400">
            You can also leave them — anything whose tournament has finished clears itself automatically.
          </p>
        </div>
      </Modal>
    </ManagerShell>
  );
};

// ── Delete stack (recycle bin) ───────────────────────────────────────────────

const PAGE_SIZE = 25;

function TrashPanel({ entries, selected, busy, onToggle, onRestore, onPurge, onClearSelection }) {
  const [page, setPage] = useState(1);

  if (!entries.length) {
    return (
      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
        <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
          <Trash2 className="w-5 h-5 text-gray-500" />
        </div>
        <h3 className="text-[14px] font-medium text-white">The delete stack is empty</h3>
        <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
          Bookings you delete land here with everything they carried, and can be restored from this tab.
        </p>
      </div>
    );
  }

  // The bin only grows — a manager clearing a season of dead rows can put
  // hundreds in here — so it pages exactly like the inbox does.
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEntries = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allSelected = pageEntries.length > 0 && pageEntries.every((e) => selected.includes(e._id));

  return (
    <>
      <div className="bg-[#181A22] border border-white/[0.06] rounded-md px-4 py-2.5 flex items-center justify-between gap-3 mb-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => (allSelected ? onClearSelection() : pageEntries.forEach((e) => !selected.includes(e._id) && onToggle(e._id)))}
            className="w-4 h-4 rounded"
            style={{ accentColor: "#f97316" }}
          />
          <span className="text-[13px] font-medium text-gray-200">
            Select all on this page ({pageEntries.length})
          </span>
        </label>
        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRestore(selected)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Restore {selected.length}
            </button>
            <button
              onClick={() => onPurge(selected)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-red-300 hover:text-white hover:bg-red-500/20 text-[12px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
              style={{ border: "1px solid rgba(248,113,113,0.3)" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete forever
            </button>
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 text-[11px] text-gray-500 mb-3 px-1">
        <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
        Entries clear themselves once their tournament's end date has passed. Ones whose
        tournament no longer exists stay until you delete them here.
      </p>

      <div className="grid gap-2">
        {pageEntries.map((e) => (
          <article
            key={e._id}
            className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-md border transition ${
              selected.includes(e._id) ? "border-orange-500/50" : "border-white/[0.06] hover:border-white/[0.12]"
            }`}
            style={{ background: selected.includes(e._id) ? "rgba(249,115,22,0.04)" : "#181A22" }}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <input
                type="checkbox"
                checked={selected.includes(e._id)}
                onChange={() => onToggle(e._id)}
                className="w-4 h-4 rounded cursor-pointer mt-0.5"
                style={{ accentColor: "#f97316" }}
              />
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-medium text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    {e.userName || "Player"}
                  </span>
                  <Pill className="bg-white/[0.06] text-gray-300">
                    {e.entryType === "registration" ? "Booking + notification" : "Notification only"}
                  </Pill>
                  {e.bookingStatus && (
                    <Pill className="bg-white/[0.06] text-gray-400">{e.bookingStatus}</Pill>
                  )}
                </div>

                {e.message && (
                  <p className="text-[12px] text-gray-300 bg-white/[0.04] px-2.5 py-1.5 rounded truncate">{e.message}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" />
                    {e.tournamentTitle || `Tournament ${String(e.tournamentId).substring(0, 8)}…`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Deleted {e.deletedAt ? new Date(e.deletedAt).toLocaleString() : "—"}
                  </span>
                  <span className="font-mono tabular-nums text-gray-400">₹{e.amount || 0}</span>
                  {e.reason && <span className="italic">“{e.reason}”</span>}
                </div>

                {/* When the sweep will take this entry — or that it won't. */}
                <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {e.tournamentEndDate ? (
                    new Date(e.tournamentEndDate) < new Date() ? (
                      <span className="text-amber-400/80">Tournament has ended — clears on the next nightly sweep</span>
                    ) : (
                      <>Clears automatically after {new Date(e.tournamentEndDate).toLocaleDateString()}</>
                    )
                  ) : (
                    <span>Tournament no longer exists — stays until you delete it here</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onRestore([e._id])}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-500/20 text-[12px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                style={{ border: "1px solid rgba(52,211,153,0.25)" }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restore
              </button>
              <button
                onClick={() => onPurge([e._id])}
                disabled={busy}
                title="Delete forever"
                aria-label="Delete forever"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-red-300 hover:bg-red-500/10 transition active:scale-[0.98] disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        total={entries.length}
        limit={PAGE_SIZE}
        onPage={setPage}
      />
    </>
  );
}

// ── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({ n, selected, disabledCheckbox, tournamentStatus, onToggle, onAccept, onReject, onDelete }) {
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
            {/* Older registrations can carry several identical notification
                rows; the server collapses them into this one. */}
            {n.duplicateCount > 1 && (
              <Pill className="bg-white/[0.06] text-gray-400" title={`${n.duplicateCount} duplicate notifications merged`}>
                <Copy className="w-2.5 h-2.5" /> ×{n.duplicateCount}
              </Pill>
            )}
            {n.hasBooking === false && (
              <Pill className="bg-amber-500/15 text-amber-300" title="No booking exists for this notification">
                <AlertTriangle className="w-2.5 h-2.5" /> No booking
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

        {/* Delete — tournament rows only. A turf booking is a different record
            in a different collection and is not this screen's to remove. */}
        {!isBooking && (
          <button
            onClick={onDelete}
            title="Delete this booking"
            aria-label="Delete this booking"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-red-300 hover:bg-red-500/10 transition active:scale-[0.98] flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
