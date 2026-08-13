import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { ClipboardCheck, QrCode, Check, X, ScanLine } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const badge = {
  Approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function Registrations() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");
  const [qr, setQr] = useState(null); // row being shown as a pass

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/agency-events");
        const list = data.events || [];
        setEvents(list);
        if (list.length) setSel(list[0]._id);
      } catch (e) { setErr(e?.response?.data?.message || "Failed to load events"); }
      finally { setLoadingEvents(false); }
    })();
  }, []);

  const load = async (id) => {
    setLoadingRows(true); setErr("");
    try {
      const { data } = await axios.get(`/api/agency-events/${id}/registrations`);
      setRows(data.rows || []);
      setStats(data.stats || { total: 0, approved: 0, pending: 0 });
    } catch (e) { setErr(e?.response?.data?.message || "Failed to load registrations"); }
    finally { setLoadingRows(false); }
  };
  useEffect(() => { if (sel) load(sel); else { setRows([]); setStats({ total: 0, approved: 0, pending: 0 }); } }, [sel]);

  const decide = async (row, decision) => {
    setBusyId(row.bookingId); setErr("");
    try {
      const { data } = await axios.patch(`/api/agency-events/${sel}/registrations/${row.bookingId}`, { decision });
      setRows((list) => list.map((r) => (r.bookingId === row.bookingId ? { ...r, ...data.row } : r)));
      setStats((s) => {
        const wasPending = row.status === "Pending";
        return {
          total: s.total,
          approved: s.approved + (decision === "accepted" ? 1 : 0),
          pending: s.pending - (wasPending ? 1 : 0),
        };
      });
    } catch (e) { setErr(e?.response?.data?.message || "Could not update registration"); }
    finally { setBusyId(""); }
  };

  const selEvent = events.find((e) => e._id === sel);
  const iconBtn = "w-9 h-9 rounded-lg bg-[#12141B] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/25 flex-shrink-0";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><ClipboardCheck size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Registration Desk & QR Pass Verification</h1>
            <p className="text-gray-500 text-[13px]">Verify payments, approve entries, and retrieve QR credentials for safe physical access.</p>
          </div>
        </div>
        {events.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active workspace</span>
            <select value={sel} onChange={(e) => setSel(e.target.value)}
              className="bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-white/25 min-w-[240px]">
              {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-[#181A22]">{ev.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {events.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {[["Total entrants", stats.total, "text-white"], ["Approved", stats.approved, "text-emerald-300"], ["Awaiting review", stats.pending, "text-amber-300"]].map(([label, val, tone]) => (
            <div key={label} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[140px]">
              <div className={`text-[22px] font-black ${tone}`}>{val}</div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {loadingEvents ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : events.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <ClipboardCheck size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button>.</div>
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden">
          {loadingRows ? (
            <div className="text-gray-500 py-10 text-center">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-[13px]">
              No registrations yet for {selEvent?.name || "this event"}.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {rows.map((r) => {
                const pending = r.status === "Pending";
                const busy = busyId === r.bookingId;
                return (
                  <div key={r.bookingId} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-white">{r.name}</span>
                        <span className="text-[10.5px] font-bold text-gray-400 bg-white/[0.05] border border-white/[0.08] rounded px-2 py-0.5 uppercase tracking-wide">{r.category}</span>
                      </div>
                      <div className="text-[12.5px] text-gray-500 mt-1">
                        Affiliated with: <span className="text-gray-300">{r.entity}</span>
                        {r.contact && r.contact !== "—" && <> &nbsp;|&nbsp; Contact: <span className="text-gray-300">{r.contact}</span></>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setQr(r)} className={iconBtn} title="Show QR pass"><QrCode size={16} /></button>
                      {pending ? (
                        <>
                          <button onClick={() => decide(r, "accepted")} disabled={busy}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12.5px] px-3.5 py-2 rounded-lg disabled:opacity-60 w-auto">
                            <Check size={14} /> Approve
                          </button>
                          <button onClick={() => decide(r, "rejected")} disabled={busy}
                            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[12.5px] px-3.5 py-2 rounded-lg disabled:opacity-60 w-auto">
                            <X size={14} /> Reject
                          </button>
                        </>
                      ) : (
                        <span className={`text-[11.5px] font-bold rounded-lg border px-3 py-2 uppercase ${badge[r.status] || badge.Pending}`}>{r.status}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* QR pass modal */}
      {qr && (
        <div
        role="dialog"
        aria-modal="true"
        onClick={() => setQr(null)}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      >
        <DialogA11y onClose={() => setQr(null)} />
          <div onClick={(e) => e.stopPropagation()} className="bg-[#181A22] border border-white/[0.1] rounded-2xl p-6 w-full max-w-[320px] text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-[12px] font-bold uppercase tracking-wider mb-4"><ScanLine size={14} /> Access Pass</div>
            <div className="bg-white rounded-xl p-4 inline-block">
              <QRCodeSVG value={qr.checkInToken} size={190} level="M" />
            </div>
            <div className="text-[15px] font-bold text-white mt-4">{qr.name}</div>
            <div className="text-[12.5px] text-gray-500">{qr.entity}</div>
            <span className={`inline-block mt-3 text-[11px] font-bold rounded-lg border px-3 py-1 uppercase ${badge[qr.status] || badge.Pending}`}>{qr.status}</span>
            <button onClick={() => setQr(null)} className="mt-5 w-full bg-[#12141B] border border-white/[0.1] hover:border-white/25 text-gray-300 font-bold text-[13px] py-2.5 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
