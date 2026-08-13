import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  ClipboardCheck, Check, X, Mail, Phone, Building2, Calendar, Search, Loader2,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";
import { Pagination } from "../shared/ui";

import { getAuthToken } from "../shared/api/authToken";
const PAGE_SIZE = 10;

export default function Pending() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  // Debounce the search box; reset to page 1 whenever the term changes.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debounced) params.set("q", debounced);
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/update/pending-approval?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPendingUsers(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApproval = async (userId, status) => {
    const action = status === "approved" ? "approve" : "reject";
    if (status === "rejected" && !window.confirm("Reject this request? The user will be removed.")) return;
    setActionLoading(userId);
    try {
      const token = getAuthToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/update/${action}/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(status === "approved" ? "Club approved successfully!" : "Request rejected");
      // If this was the last row on a non-first page, step back a page.
      if (pendingUsers.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchPending();
    } catch (err) {
      toast.error(`Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = pendingUsers;

  return (
    <SuperAdminShell searchPlaceholder="Search pending…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Club approvals · Pending
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Pending approvals
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            <span className="font-mono tabular-nums">{total}</span> request{total === 1 ? "" : "s"} awaiting review.
          </p>
        </div>
        {(total > 0 || debounced) && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            />
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <ClipboardCheck className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">
            {search ? "No matching requests" : "All caught up!"}
          </h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
            {search ? "Try a different search." : "No pending club requests right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <article key={user._id} className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 transition hover:border-white/[0.12]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* User Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-md bg-orange-500/15 text-orange-400 grid place-items-center text-[15px] font-semibold flex-shrink-0">
                    {(user.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-medium text-white truncate">{user.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Mail className="w-3 h-3" /> {user.email}
                      </span>
                      {user.mobile && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Phone className="w-3 h-3" /> <span className="font-mono tabular-nums">{user.mobile}</span>
                        </span>
                      )}
                      {user.clubName && (
                        <span className="flex items-center gap-1 text-[11px] text-orange-400 font-semibold">
                          <Building2 className="w-3 h-3" /> {user.clubName}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span className="font-mono tabular-nums">
                          {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                    </div>
                    <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
                      {user.role || "ClubAdmin"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApproval(user._id, "approved")}
                    disabled={actionLoading === user._id}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                  >
                    {actionLoading === user._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(user._id, "rejected")}
                    disabled={actionLoading === user._id}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                    style={{ border: "1px solid rgba(248,113,113,0.25)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={PAGE_SIZE}
        onPage={setPage}
        loading={loading}
      />
    </SuperAdminShell>
  );
}
