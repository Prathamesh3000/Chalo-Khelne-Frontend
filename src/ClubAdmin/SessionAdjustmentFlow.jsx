import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2, Check, X, CalendarClock, UserCog } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const field = "h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none w-full";
const REASONS = [
  ["coach_leave", "Coach Leave"],
  ["ground_unavailable", "Ground Unavailable"],
  ["weather", "Weather"],
  ["tournament", "Tournament"],
  ["exam", "Exam"],
];
const reasonLabel = (r) => REASONS.find(([k]) => k === r)?.[1] || r || "—";
const typeLabel = (t) => ({ postpone: "Postpone", cancel: "Cancel", reschedule: "Reschedule" }[t] || t);

/**
 * Session Adjustment Flow — coach-raised session-change requests that the admin
 * approves / rejects / reschedules / reassigns. Lives inside Schedule Management.
 */
export default function SessionAdjustmentFlow({ coaches = [], onChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending"); // pending | approved | rejected
  const [reasonFilter, setReasonFilter] = useState("");
  const [modal, setModal] = useState(null); // { type:"reschedule"|"assign", req, ... }

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/session-requests").catch(() => ({ data: {} }));
      setRequests(res.data?.requests || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchRequests(); }, []);

  const act = async (req, body) => {
    try {
      await axios.patch(`/api/session-requests/${req._id}`, body);
      await fetchRequests();
      onChanged?.(); // refresh the schedule (overrides/coach may have changed)
      setModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed");
    }
  };

  const shown = useMemo(
    () => requests.filter((r) => r.status === tab && (!reasonFilter || r.reason === reasonFilter)),
    [requests, tab, reasonFilter]
  );

  return (
    <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
      <h3 className="text-[14px] font-semibold text-white mb-3 inline-flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-orange-400" /> Session Adjustment Flow
      </h3>

      {/* Reason filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button onClick={() => setReasonFilter("")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold w-auto ${reasonFilter === "" ? "bg-white/[0.12] text-white" : "text-gray-400 bg-white/[0.04]"}`}>All</button>
        {REASONS.map(([k, label]) => (
          <button key={k} onClick={() => setReasonFilter(reasonFilter === k ? "" : k)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold w-auto ${reasonFilter === k ? "bg-white/[0.12] text-white" : "text-gray-400 bg-white/[0.04]"}`}>{label}</button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex rounded-lg bg-white/[0.04] p-1 mb-4 max-w-md">
        {["pending", "approved", "rejected"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-8 rounded-md text-[12px] font-semibold capitalize transition w-auto ${tab === t ? "bg-blue-600 text-white" : "text-gray-300 hover:text-white"}`}>
            {t} {t === "pending" && requests.filter((r) => r.status === "pending").length ? `(${requests.filter((r) => r.status === "pending").length})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-orange-500 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <p className="text-[13px] text-gray-500 py-6 text-center">No {tab} requests.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <div key={r._id} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-white">{r.coachName || "Coach"}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    Requested: {typeLabel(r.requestType)} {r.sport}{r.standard ? ` — Std ${r.standard}${r.section ? `-${r.section}` : ""}` : ""}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">{r.date}</p>
                  {r.reason ? <span className="inline-block mt-1.5 text-[11px] text-gray-300 bg-white/[0.06] rounded px-2 py-0.5">{reasonLabel(r.reason)}</span> : null}
                </div>
                <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 ${r.status === "pending" ? "bg-amber-500/15 text-amber-300" : r.status === "approved" ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>{r.status}</span>
              </div>

              {r.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button onClick={() => act(r, { action: "approve" })}
                    className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-green-600 hover:bg-green-700 text-white text-[12px] font-semibold w-auto"><Check className="w-3.5 h-3.5" /> Approve</button>
                  <button onClick={() => act(r, { action: "reject" })}
                    className="inline-flex items-center gap-1 h-7 px-3 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10 text-[12px] font-semibold w-auto"><X className="w-3.5 h-3.5" /> Reject</button>
                  <button onClick={() => setModal({ type: "reschedule", req: r, newDay: r.proposedNewDay || DAYS[0], newStart: r.proposedNewStartTime || "", newEnd: r.proposedNewEndTime || "" })}
                    className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold w-auto"><CalendarClock className="w-3.5 h-3.5" /> Reschedule</button>
                  <button onClick={() => setModal({ type: "assign", req: r, coach: "" })}
                    className="inline-flex items-center gap-1 h-7 px-3 rounded-md border border-white/15 text-gray-200 hover:bg-white/[0.08] text-[12px] font-semibold w-auto"><UserCog className="w-3.5 h-3.5" /> Assign New Coach</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={() => setModal(null)}
      >
        <DialogA11y onClose={() => setModal(null)} />
          <div className="w-full max-w-sm rounded-xl bg-[#181A22] border border-white/10 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[14px] font-semibold text-white">{modal.type === "reschedule" ? "Reschedule" : "Assign New Coach"}</h4>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white w-auto"><X className="w-4 h-4" /></button>
            </div>
            {modal.type === "reschedule" ? (
              <>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5" htmlFor="new-day">New Day</label>
                <select id="new-day" value={modal.newDay} onChange={(e) => setModal((m) => ({ ...m, newDay: e.target.value }))} className={field} style={inputStyle}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5" htmlFor="start">Start</label>
                    <input id="start" type="time" value={modal.newStart} onChange={(e) => setModal((m) => ({ ...m, newStart: e.target.value }))} className={field} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5" htmlFor="end">End</label>
                    <input id="end" type="time" value={modal.newEnd} onChange={(e) => setModal((m) => ({ ...m, newEnd: e.target.value }))} className={field} style={inputStyle} />
                  </div>
                </div>
                <button onClick={() => act(modal.req, { action: "reschedule", newDay: modal.newDay, newStartTime: modal.newStart, newEndTime: modal.newEnd })}
                  className="mt-4 w-full h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold">Reschedule &amp; Approve</button>
              </>
            ) : (
              <>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5" htmlFor="coach">Coach</label>
                <select id="coach" value={modal.coach} onChange={(e) => setModal((m) => ({ ...m, coach: e.target.value }))} className={field} style={inputStyle}>
                  <option value="">Select Coach</option>
                  {coaches.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <button onClick={() => act(modal.req, { action: "assign_coach", coach: modal.coach })} disabled={!modal.coach}
                  className="mt-4 w-full h-9 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold disabled:opacity-50">Assign &amp; Approve</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
