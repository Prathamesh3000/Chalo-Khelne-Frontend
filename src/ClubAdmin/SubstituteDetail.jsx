import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X,
  UserCheck,
  Phone,
  Mail,
  Copy,
  Check,
  Loader2,
  Calendar,
  Clock,
  Power,
  AlertTriangle,
} from "lucide-react";

const imgSrc = (p) =>
  !p ? null : /^https?:\/\//.test(p) ? p : `/uploads/${String(p).replace(/^\/?uploads\/?/, "")}`;

const STATUS = {
  pending: { cls: "bg-amber-500/15 text-amber-300", label: "Pending" },
  accepted: { cls: "bg-emerald-500/15 text-emerald-300", label: "Accepted" },
  rejected: { cls: "bg-red-500/15 text-red-300", label: "Rejected" },
};

const initials = (name = "") =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

/**
 * Detail modal for a single substitute request. Opened from the list card.
 * Fetches /api/substitutes/:id to get the populated coach. Accept / Reject /
 * End all happen here too and notify the parent via onChanged().
 */
export default function SubstituteDetail({ subId, onClose, onChanged }) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState(null); // {email, password} after accept
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!subId) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/substitutes/${subId}`);
        if (active) setSub(res.data?.substitute || null);
      } catch (err) {
        if (active) {
          toast.error(err.response?.data?.error || "Failed to load request");
          onClose?.();
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [subId, onClose]);

  const accept = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`/api/substitutes/${sub._id}/accept`);
      setCreds(res.data?.credentials || null);
      setSub(res.data?.substitute || sub);
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to accept");
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    setBusy(true);
    try {
      await axios.post(`/api/substitutes/${sub._id}/reject`, { reason: reason.trim() });
      // refresh local copy
      const res = await axios.get(`/api/substitutes/${sub._id}`);
      setSub(res.data?.substitute || sub);
      setShowRejectForm(false);
      setReason("");
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reject");
    } finally {
      setBusy(false);
    }
  };

  const endSub = async () => {
    if (!window.confirm(`End ${sub.name}'s substitution (coach is back)?`)) return;
    setBusy(true);
    try {
      await axios.post(`/api/substitutes/${sub._id}/end`);
      const res = await axios.get(`/api/substitutes/${sub._id}`);
      setSub(res.data?.substitute || sub);
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to end");
    } finally {
      setBusy(false);
    }
  };

  const copy = (t) => {
    navigator.clipboard.writeText(t);
    toast.success("Copied");
  };

  const status = sub?.status ? STATUS[sub.status] : null;
  const isEnded = sub?.status === "accepted" && !sub?.active;
  const coach = sub?.coachId && typeof sub.coachId === "object" ? sub.coachId : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#181A22] border border-white/[0.08] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "92vh" }}>
        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/[0.06] flex-shrink-0">
          <h3 className="text-[15px] font-semibold text-white">Substitute Request</h3>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.06] transition w-auto">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading || !sub ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Hero */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl bg-white/[0.04] overflow-hidden flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
                  {imgSrc(sub.photo) ? (
                    <img loading="lazy" src={imgSrc(sub.photo)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCheck className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-semibold text-white truncate">{sub.name}</h2>
                  <p className="text-[12px] text-gray-500 mt-0.5">Proposed substitute</p>
                  {status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-2 ${status.cls}`}>
                      {status.label}
                      {isEnded ? " · ended" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact */}
              {sub.contactNumber ? (
                <Section title="Contact">
                  <Row icon={<Phone className="w-4 h-4 text-gray-500" />}>
                    <span className="text-[13px] text-gray-200 font-mono">{sub.contactNumber}</span>
                    <CopyBtn onClick={() => copy(sub.contactNumber)} />
                  </Row>
                </Section>
              ) : null}

              {/* Proposed by (coach) */}
              <Section title="Proposed by">
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-emerald-300 text-[13px] font-bold">
                    {initials(coach?.name || sub.coachName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-white truncate">{coach?.name || sub.coachName || "Coach"}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
                      {coach?.staffRole ? <span className="capitalize">{coach.staffRole}</span> : null}
                      {coach?.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {coach.email}
                        </span>
                      ) : null}
                    </div>
                    {Array.isArray(coach?.sports) && coach.sports.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {coach.sports.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.05] text-gray-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Section>

              {/* Timeline */}
              <Section title="Timeline">
                <ul className="space-y-2">
                  <TimelineItem icon={<Calendar className="w-3.5 h-3.5" />} label="Submitted" at={sub.createdAt} />
                  {sub.status === "accepted" && (
                    <TimelineItem icon={<Check className="w-3.5 h-3.5 text-emerald-400" />} label="Accepted" at={sub.decidedAt} />
                  )}
                  {sub.status === "rejected" && (
                    <TimelineItem icon={<X className="w-3.5 h-3.5 text-red-400" />} label="Rejected" at={sub.decidedAt} />
                  )}
                  {isEnded && sub.endedAt && (
                    <TimelineItem icon={<Power className="w-3.5 h-3.5 text-gray-400" />} label="Ended" at={sub.endedAt} />
                  )}
                </ul>
              </Section>

              {/* Rejection reason */}
              {sub.status === "rejected" && sub.rejectionReason ? (
                <Section title="Rejection reason">
                  <div className="rounded-lg bg-red-500/[0.06] border border-red-500/[0.2] p-3 flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-red-200 leading-relaxed">{sub.rejectionReason}</p>
                  </div>
                </Section>
              ) : null}

              {/* Credentials (only fresh from accept response). Email persists. */}
              {sub.status === "accepted" && (creds || sub.email) ? (
                <Section title="Login credentials">
                  {creds ? (
                    <>
                      <p className="text-[11px] text-emerald-300 mb-2">Generated just now — share these with the substitute.</p>
                      <CredRow label="Login (email)" value={creds.email} onCopy={() => copy(creds.email)} />
                      <CredRow label="Password" value={creds.password} onCopy={() => copy(creds.password)} />
                    </>
                  ) : (
                    <>
                      <CredRow label="Login (email)" value={sub.email} onCopy={() => copy(sub.email)} />
                      <p className="text-[11px] text-gray-500 mt-1.5">
                        The password was shown once at acceptance and isn't recoverable. End the substitution to revoke access.
                      </p>
                    </>
                  )}
                </Section>
              ) : null}

              {/* Inline reject form */}
              {showRejectForm && (
                <Section title="Reject this request">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Reason (shown to the coach)"
                    className="w-full px-3 py-2 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" }}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setReason("");
                      }}
                      className="flex-1 h-9 rounded-md text-gray-300 hover:bg-white/[0.06] text-[13px] font-semibold transition w-auto"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={doReject}
                      disabled={busy}
                      className="flex-1 h-9 rounded-md bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Confirm reject"}
                    </button>
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer actions — only renders when there are actions to show */}
        {!loading && sub && !showRejectForm && (sub.status === "pending" || (sub.status === "accepted" && sub.active)) && (
          <div className="px-5 py-3 border-t border-white/[0.06] flex-shrink-0 flex items-center justify-end gap-2">
            {sub.status === "pending" && (
              <>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-red-300 hover:bg-red-500/10 text-[13px] font-semibold transition w-auto"
                  style={{ border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
                <button
                  onClick={accept}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Accept
                </button>
              </>
            )}
            {sub.status === "accepted" && sub.active && (
              <button
                onClick={endSub}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-gray-200 hover:bg-white/[0.08] text-[13px] font-semibold transition w-auto"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />} End substitution
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Row({ icon, children }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white/[0.03] border border-white/[0.06] px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0 flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

function CopyBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-orange-400 hover:bg-orange-500/15 transition flex-shrink-0 w-auto"
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
}

function CredRow({ label, value, onCopy }) {
  return (
    <div className="flex items-center justify-between rounded-md p-3 mb-2 last:mb-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-[13px] font-semibold text-white mt-0.5 font-mono truncate">{value}</p>
      </div>
      <button onClick={onCopy} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-orange-400 hover:bg-orange-500/15 transition flex-shrink-0 w-auto">
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function TimelineItem({ icon, label, at }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5 text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-200">{label}</p>
        <p className="text-[11px] text-gray-500 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> {fmt(at)}
        </p>
      </div>
    </li>
  );
}
