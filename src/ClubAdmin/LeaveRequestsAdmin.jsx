import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2, Check, X, CalendarRange } from "lucide-react";

/**
 * Leave Requests (school admin). Coaches apply for leave (date range + reason);
 * the admin approves or rejects. No substitute selection (school flow).
 */
export default function LeaveRequestsAdmin() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending"); // pending | approved | rejected

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/leave-requests").catch(() => ({ data: {} }));
      setLeaves(res.data?.leaves || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchLeaves(); }, []);

  const act = async (id, status) => {
    try {
      await axios.patch(`/api/leave-requests/${id}`, { status });
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed");
    }
  };

  const pendingCount = leaves.filter((l) => l.status === "pending").length;
  const shown = useMemo(() => leaves.filter((l) => l.status === tab), [leaves, tab]);

  return (
    <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
      <h3 className="text-[14px] font-semibold text-white mb-3 inline-flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-orange-400" /> Leave Requests
      </h3>

      <div className="flex rounded-lg bg-white/[0.04] p-1 mb-4 max-w-md">
        {["pending", "approved", "rejected"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-8 rounded-md text-[12px] font-semibold capitalize transition w-auto ${tab === t ? "bg-blue-600 text-white" : "text-gray-300 hover:text-white"}`}>
            {t}{t === "pending" && pendingCount ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-orange-500 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <p className="text-[13px] text-gray-500 py-6 text-center">No {tab} leave requests.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((l) => (
            <div key={l._id} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-white">{l.coachName || "Coach"}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">{l.fromDate} → {l.toDate}</p>
                  {l.reason ? <p className="text-[12px] text-gray-500 mt-1">{l.reason}</p> : null}
                </div>
                <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 ${l.status === "pending" ? "bg-amber-500/15 text-amber-300" : l.status === "approved" ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>{l.status}</span>
              </div>
              {l.status === "pending" && (
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => act(l._id, "approved")}
                    className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-green-600 hover:bg-green-700 text-white text-[12px] font-semibold w-auto"><Check className="w-3.5 h-3.5" /> Approve</button>
                  <button onClick={() => act(l._id, "rejected")}
                    className="inline-flex items-center gap-1 h-7 px-3 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10 text-[12px] font-semibold w-auto"><X className="w-3.5 h-3.5" /> Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
