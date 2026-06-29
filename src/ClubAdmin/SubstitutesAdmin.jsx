import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserCheck, Loader2, Check, X, Phone, Copy, Power } from "lucide-react";
import SubstituteDetail from "./SubstituteDetail";

const imgSrc = (p) => (!p ? null : /^https?:\/\//.test(p) ? p : `/uploads/${String(p).replace(/^\/?uploads\/?/, "")}`);
const STATUS = {
  pending: "bg-amber-500/15 text-amber-300",
  accepted: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
};

/**
 * Substitutes (school/org admins). Coaches/trainers propose a stand-in when
 * absent; the admin accepts (generates login credentials to share) or rejects.
 */
export default function SubstitutesAdmin() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [creds, setCreds] = useState(null); // { name, email, password } after accept
  const [rejectFor, setRejectFor] = useState(null);
  const [reason, setReason] = useState("");
  const [detailId, setDetailId] = useState(null); // id of sub being viewed in detail modal

  const fetchSubs = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/substitutes");
      setSubs(res.data?.substitutes || []);
    } catch {
      setSubs([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchSubs(); }, []);

  const accept = async (s) => {
    setBusyId(s._id);
    try {
      const res = await axios.post(`/api/substitutes/${s._id}/accept`);
      setCreds({ name: s.name, ...(res.data?.credentials || {}) });
      fetchSubs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to accept");
    } finally { setBusyId(null); }
  };

  const doReject = async () => {
    setBusyId(rejectFor._id);
    try {
      await axios.post(`/api/substitutes/${rejectFor._id}/reject`, { reason: reason.trim() });
      setRejectFor(null); setReason("");
      fetchSubs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reject");
    } finally { setBusyId(null); }
  };

  const endSub = async (s) => {
    if (!window.confirm(`End ${s.name}'s substitution (coach is back)?`)) return;
    setBusyId(s._id);
    try {
      await axios.post(`/api/substitutes/${s._id}/end`);
      fetchSubs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to end");
    } finally { setBusyId(null); }
  };

  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

  const pending = subs.filter((s) => s.status === "pending");
  const others = subs.filter((s) => s.status !== "pending");

  const Card = ({ s }) => (
    <div
      onClick={() => setDetailId(s._id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") setDetailId(s._id); }}
      className="rounded-xl bg-[#181A22] border border-white/[0.06] p-4 flex items-center gap-3 cursor-pointer hover:bg-[#1C1E27] hover:border-white/[0.1] transition"
    >
      <div className="w-12 h-12 rounded-lg bg-white/[0.04] overflow-hidden flex items-center justify-center flex-shrink-0">
        {imgSrc(s.photo) ? <img src={imgSrc(s.photo)} alt="" className="w-full h-full object-cover" /> : <UserCheck className="w-5 h-5 text-gray-600" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-white truncate">{s.name}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS[s.status] || ""}`}>
            {s.status}{s.status === "accepted" && !s.active ? " · ended" : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[12px] text-gray-400">
          {s.contactNumber ? <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {s.contactNumber}</span> : null}
          <span>for <span className="text-gray-300">{s.coachName || "coach"}</span></span>
          {s.status === "rejected" && s.rejectionReason ? <span className="text-red-300/80">— {s.rejectionReason}</span> : null}
          {s.status === "accepted" && s.email ? <span className="text-gray-500">{s.email}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {s.status === "pending" && (
          <>
            <button onClick={() => accept(s)} disabled={busyId === s._id}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[12px] font-semibold transition disabled:opacity-50 w-auto" style={{ border: "1px solid rgba(16,185,129,0.25)" }}>
              {busyId === s._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Accept
            </button>
            <button onClick={() => { setRejectFor(s); setReason(""); }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-red-300 hover:bg-red-500/10 text-[12px] font-semibold transition w-auto" style={{ border: "1px solid rgba(239,68,68,0.25)" }}>
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </>
        )}
        {s.status === "accepted" && s.active && (
          <button onClick={() => endSub(s)} disabled={busyId === s._id}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-gray-300 hover:bg-white/[0.08] text-[12px] font-semibold transition w-auto" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <Power className="w-3.5 h-3.5" /> End
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Pending approval</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
        ) : pending.length === 0 ? (
          <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-6 text-center text-[13px] text-gray-400">No pending substitute requests.</div>
        ) : (
          <div className="space-y-2">{pending.map((s) => <Card key={s._id} s={s} />)}</div>
        )}
      </div>

      {others.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-500 mb-2">History</h3>
          <div className="space-y-2">{others.map((s) => <Card key={s._id} s={s} />)}</div>
        </div>
      )}

      {/* Detail modal (opened by clicking a card) */}
      {detailId && (
        <SubstituteDetail
          subId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={fetchSubs}
        />
      )}

      {/* Credentials modal (after accept) */}
      {creds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#181A22] border border-emerald-500/25 rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.20), rgba(16,185,129,0.06))", borderBottom: "1px solid rgba(16,185,129,0.25)" }}>
              <Check className="w-5 h-5 text-emerald-300" />
              <h3 className="text-[15px] font-semibold text-white">{creds.name} accepted</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[12px] text-gray-400">Share these login credentials with the substitute. They expire when you end the substitution.</p>
              {["email", "password"].map((k) => (
                <div key={k} className="flex items-center justify-between rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{k === "email" ? "Login (email)" : "Password"}</p>
                    <p className="text-[13px] font-semibold text-white mt-0.5 font-mono truncate">{creds[k]}</p>
                  </div>
                  <button onClick={() => copy(creds[k])} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-orange-400 hover:bg-orange-500/15 transition flex-shrink-0 w-auto"><Copy className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={() => setCreds(null)} className="w-full h-9 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition mt-1">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#181A22] border border-white/[0.08] rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-white">Reject {rejectFor.name}?</h3>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason (shown to the coach)"
              className="w-full px-3 py-2 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" }} />
            <div className="flex gap-2">
              <button onClick={() => setRejectFor(null)} className="flex-1 h-9 rounded-md text-gray-300 hover:bg-white/[0.06] text-[13px] font-semibold transition w-auto" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
              <button onClick={doReject} disabled={busyId === rejectFor._id} className="flex-1 h-9 rounded-md bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
