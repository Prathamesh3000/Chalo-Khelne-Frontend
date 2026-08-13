import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  MapPin, Check, Mail, Phone, User, Calendar, Search, Loader2, Trophy, Ban, CheckCircle2,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";
import { Pagination } from "../shared/ui";

import { getAuthToken } from "../shared/api/authToken";
const PAGE_SIZE = 10;

export default function TurfApprovals() {
  const [tab, setTab] = useState("pending"); // "pending" | "all"
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Pending tab (approval queue)
  const [pendingTurfs, setPendingTurfs] = useState([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPages, setPendingPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // All-turfs tab (booking toggle)
  const [allTurfs, setAllTurfs] = useState([]);
  const [allPage, setAllPage] = useState(1);
  const [allTotal, setAllTotal] = useState(0);
  const [allPages, setAllPages] = useState(1);
  const [allLoading, setAllLoading] = useState(false);
  const [allStats, setAllStats] = useState(null); // { total, disabled } marketplace-wide

  const [actionLoading, setActionLoading] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const authHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Debounce search; reset both tabs to page 1 when the term changes.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPendingPage(1); setAllPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pendingPage), limit: String(PAGE_SIZE) });
      if (debounced) params.set("q", debounced);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turfs/admin/pending?${params}`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPendingTurfs(data.turfs || []);
      setPendingTotal(data.total || 0);
      setPendingPages(data.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load pending turfs");
    } finally {
      setLoading(false);
    }
  }, [pendingPage, debounced]);

  const fetchAll = useCallback(async () => {
    setAllLoading(true);
    try {
      const params = new URLSearchParams({ page: String(allPage), limit: String(PAGE_SIZE) });
      if (debounced) params.set("q", debounced);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turfs/admin/all?${params}`, {
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAllTurfs(data.turfs || []);
      setAllTotal(data.total || 0);
      setAllPages(data.totalPages || 1);
      if (data.stats) setAllStats(data.stats);
    } catch (err) {
      toast.error("Failed to load turfs");
    } finally {
      setAllLoading(false);
    }
  }, [allPage, debounced]);

  // Fetch the active tab whenever it, the search, or its page changes.
  useEffect(() => {
    if (tab === "pending") fetchPending();
    else fetchAll();
  }, [tab, fetchPending, fetchAll]);

  const switchTab = (id) => {
    if (id === tab) return;
    setSearch("");
    setDebounced("");
    setPendingPage(1);
    setAllPage(1);
    setTab(id);
  };

  const handleApprove = async (turfId) => {
    setActionLoading(turfId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turfs/${turfId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ approved: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Turf approved — now live in the marketplace");
      if (pendingTurfs.length === 1 && pendingPage > 1) setPendingPage((p) => p - 1);
      else fetchPending();
    } catch (err) {
      toast.error("Failed to approve turf");
    } finally {
      setActionLoading(null);
    }
  };

  // SuperAdmin contact-only switch. When bookingDisabled=true, players can't book
  // online — their "Book a Turf" button becomes "Contact Turf".
  const toggleBooking = async (turf) => {
    const next = !turf.bookingDisabled;
    setTogglingId(turf._id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turfs/${turf._id}/booking-mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ bookingDisabled: next }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const val = typeof data.bookingDisabled === "boolean" ? data.bookingDisabled : next;
      setAllTurfs((prev) => prev.map((t) => (t._id === turf._id ? { ...t, bookingDisabled: val } : t)));
      setAllStats((s) => (s ? { ...s, disabled: Math.max(0, s.disabled + (val ? 1 : -1)) } : s));
      toast.success(val ? "Online booking disabled — players will see “Contact Turf”" : "Online booking enabled");
    } catch (err) {
      toast.error("Failed to update booking mode");
    } finally {
      setTogglingId(null);
    }
  };

  // One-click bulk switch — turn online booking OFF (contact-only) or ON for
  // every turf in the marketplace at once.
  const bulkToggle = async (disabled) => {
    if (disabled && !window.confirm("Disable online booking for ALL turfs? Every turf’s player button will become “Contact Turf”.")) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turfs/admin/booking-mode/all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ bookingDisabled: disabled }),
      });
      if (!res.ok) throw new Error("Failed");
      setAllTurfs((prev) => prev.map((t) => ({ ...t, bookingDisabled: disabled })));
      setAllStats((s) => (s ? { ...s, disabled: disabled ? s.total : 0 } : s));
      toast.success(disabled ? "Online booking disabled for all turfs" : "Online booking enabled for all turfs");
    } catch (err) {
      toast.error("Failed to update all turfs");
    } finally {
      setBulkLoading(false);
    }
  };

  const TabButton = ({ id, label, count }) => (
    <button
      onClick={() => switchTab(id)}
      className={`inline-flex items-center gap-2 h-9 px-4 rounded-md text-[13px] font-semibold transition ${
        tab === id ? "bg-white/[0.10] text-white" : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded bg-white/[0.08] text-gray-300">{count}</span>
      )}
    </button>
  );

  const OwnerMeta = ({ turf }) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
      {turf.owner?.name && (
        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <User className="w-3 h-3" /> {turf.owner.name}
        </span>
      )}
      {turf.owner?.email && (
        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <Mail className="w-3 h-3" /> {turf.owner.email}
        </span>
      )}
      {(turf.owner?.mobile || turf.contact?.phone) && (
        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <Phone className="w-3 h-3" /> <span className="font-mono tabular-nums">{turf.owner?.mobile || turf.contact?.phone}</span>
        </span>
      )}
      {turf.address?.city && (
        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
          <MapPin className="w-3 h-3" /> {turf.address.city}
        </span>
      )}
      <span className="flex items-center gap-1 text-[11px] text-gray-500">
        <Calendar className="w-3 h-3" />
        <span className="font-mono tabular-nums">
          {turf.createdAt ? new Date(turf.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
        </span>
      </span>
    </div>
  );

  const SportChips = ({ turf }) =>
    Array.isArray(turf.sports) && turf.sports.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        {turf.sports.slice(0, 4).map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-300 bg-white/[0.06] px-1.5 py-0.5 rounded">
            <Trophy className="w-2.5 h-2.5" /> {s.name}
            {s.pricePerHour ? ` · ₹${s.pricePerHour}/hr` : ""}
          </span>
        ))}
      </div>
    ) : null;

  const EmptyState = ({ title, sub }) => (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
      <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
        <MapPin className="w-5 h-5 text-gray-500" />
      </div>
      <h3 className="text-[14px] font-medium text-white">{title}</h3>
      <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">{sub}</p>
    </div>
  );

  return (
    <SuperAdminShell searchPlaceholder="Search turfs…">
      <header className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <MapPin className="w-3.5 h-3.5" />
            Turf marketplace
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Turf management
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Approve new turfs and control which ones accept online bookings.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by turf, owner or city…"
            className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </div>
      </header>

      <div className="flex items-center gap-1 mb-5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06] w-fit">
        <TabButton id="pending" label="Pending approval" count={pendingTotal} />
        <TabButton id="all" label="All turfs" count={allStats ? allStats.total : undefined} />
      </div>

      {/* Bulk booking switch — one click flips every turf */}
      {tab === "all" && allStats && allStats.total > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[12px] text-gray-400">
            <span className="font-mono tabular-nums text-gray-200">{allStats.disabled}</span>
            {" "}of{" "}
            <span className="font-mono tabular-nums text-gray-200">{allStats.total}</span> turfs are currently contact-only.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkToggle(true)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-rose-500/90 hover:bg-rose-500 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            >
              {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              Disable all bookings
            </button>
            <button
              onClick={() => bulkToggle(false)}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-gray-200 text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Enable all
            </button>
          </div>
        </div>
      )}

      {/* ── PENDING APPROVAL TAB ── */}
      {tab === "pending" && (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : pendingTurfs.length === 0 ? (
          <EmptyState
            title={debounced ? "No matching turfs" : "All caught up!"}
            sub={debounced ? "Try a different search." : "No turfs awaiting approval right now."}
          />
        ) : (
          <>
            <div className="space-y-2">
              {pendingTurfs.map((turf) => (
                <article key={turf._id} className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 transition hover:border-white/[0.12]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-md bg-emerald-500/15 text-emerald-400 grid place-items-center flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[14px] font-medium text-white truncate">{turf.name}</h4>
                        <OwnerMeta turf={turf} />
                        <SportChips turf={turf} />
                        {turf.address?.fullAddress && (
                          <p className="text-[11px] text-gray-500 mt-1 truncate">{turf.address.fullAddress}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(turf._id)}
                        disabled={actionLoading === turf._id}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                      >
                        {actionLoading === turf._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Approve
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <Pagination page={pendingPage} totalPages={pendingPages} total={pendingTotal} limit={PAGE_SIZE} onPage={setPendingPage} loading={loading} />
          </>
        )
      )}

      {/* ── ALL TURFS TAB (booking toggle) ── */}
      {tab === "all" && (
        allLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : allTurfs.length === 0 ? (
          <EmptyState
            title={debounced ? "No matching turfs" : "No turfs yet"}
            sub={debounced ? "Try a different search." : "Registered turfs will appear here."}
          />
        ) : (
          <>
            <div className="space-y-2">
              {allTurfs.map((turf) => {
                const disabled = !!turf.bookingDisabled;
                return (
                  <article key={turf._id} className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 transition hover:border-white/[0.12]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-md bg-emerald-500/15 text-emerald-400 grid place-items-center flex-shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-[14px] font-medium text-white truncate">{turf.name}</h4>
                            {turf.isApproved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                Pending
                              </span>
                            )}
                            {disabled && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                <Ban className="w-2.5 h-2.5" /> Contact-only
                              </span>
                            )}
                          </div>
                          <OwnerMeta turf={turf} />
                          <SportChips turf={turf} />
                          {turf.address?.fullAddress && (
                            <p className="text-[11px] text-gray-500 mt-1 truncate">{turf.address.fullAddress}</p>
                          )}
                        </div>
                      </div>

                      {/* Booking-mode toggle */}
                      <div className="flex items-center gap-3 flex-shrink-0 sm:pl-4 sm:border-l sm:border-white/[0.06]">
                        <div className="text-right">
                          <p className={`text-[12px] font-semibold ${disabled ? "text-rose-400" : "text-emerald-400"}`}>
                            {disabled ? "Booking off" : "Booking on"}
                          </p>
                          <p className="text-[10px] text-gray-500 max-w-[140px]">
                            {disabled ? "Players see “Contact Turf”" : "Players can book online"}
                          </p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={!disabled}
                          onClick={() => toggleBooking(turf)}
                          disabled={togglingId === turf._id}
                          title={disabled ? "Enable online booking" : "Disable online booking (contact-only)"}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                            disabled ? "bg-white/[0.12]" : "bg-emerald-500"
                          }`}
                        >
                          {togglingId === turf._id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
                          ) : (
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                disabled ? "translate-x-1" : "translate-x-6"
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <Pagination page={allPage} totalPages={allPages} total={allTotal} limit={PAGE_SIZE} onPage={setAllPage} loading={allLoading} />
          </>
        )
      )}
    </SuperAdminShell>
  );
}
