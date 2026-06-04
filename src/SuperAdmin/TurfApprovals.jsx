import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  MapPin, Check, Mail, Phone, User, Calendar, Search, Loader2, Trophy, Tag,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";

export default function TurfApprovals() {
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turfs/admin/pending`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTurfs(data.turfs || []);
    } catch (err) {
      toast.error("Failed to load pending turfs");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (turfId) => {
    setActionLoading(turfId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/turfs/${turfId}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ approved: true }),
      });
      if (!res.ok) throw new Error("Failed");
      setTurfs((prev) => prev.filter((t) => t._id !== turfId));
      toast.success("Turf approved — now live in the marketplace");
    } catch (err) {
      toast.error("Failed to approve turf");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = turfs.filter((t) =>
    (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.owner?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.address?.city || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminShell searchPlaceholder="Search turfs…">
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <MapPin className="w-3.5 h-3.5" />
            Turf marketplace · Pending approval
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Turf approvals
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            <span className="font-mono tabular-nums">{turfs.length}</span> turf{turfs.length === 1 ? "" : "s"} awaiting review. Approved turfs become publicly bookable.
          </p>
        </div>
        {turfs.length > 0 && (
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
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <MapPin className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">
            {search ? "No matching turfs" : "All caught up!"}
          </h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
            {search ? "Try a different search." : "No turfs awaiting approval right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((turf) => (
            <article key={turf._id} className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 transition hover:border-white/[0.12]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-md bg-emerald-500/15 text-emerald-400 grid place-items-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-medium text-white truncate">{turf.name}</h4>
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
                      {turf.owner?.mobile && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Phone className="w-3 h-3" /> <span className="font-mono tabular-nums">{turf.owner.mobile}</span>
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
                    {Array.isArray(turf.sports) && turf.sports.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {turf.sports.slice(0, 4).map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-300 bg-white/[0.06] px-1.5 py-0.5 rounded">
                            <Trophy className="w-2.5 h-2.5" /> {s.name}
                            {s.pricePerHour ? ` · ₹${s.pricePerHour}/hr` : ""}
                          </span>
                        ))}
                      </div>
                    )}
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
      )}
    </SuperAdminShell>
  );
}
