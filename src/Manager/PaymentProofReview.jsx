import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ReceiptText, Check, X, ChevronDown, IndianRupee, Clock, Phone, Mail,
  Loader2, Inbox, AlertCircle, RefreshCw, CreditCard, Hash, Trophy,
} from "lucide-react";
import AppImage from "../shared/ui/AppImage";
import { getSocket } from "../features/realtime";
import { ManagerShell } from "../shared/layout";

const METHOD_LABELS = { qr: "QR", upi: "UPI", offline: "Offline" };

export default function PaymentProofReview() {
  const auth = JSON.parse(localStorage.getItem("user") || "{}");
  const managerId = auth?.id || auth?._id || "";
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["paymentProofs", managerId],
    queryFn: async () => {
      const r = await axios.get(`/api/payments/proofs/pending/${managerId}`);
      return r.data;
    },
    enabled: !!managerId,
  });
  const proofs = data?.data || (Array.isArray(data) ? data : []);

  const verifyMut = useMutation({
    mutationFn: ({ id, status }) => axios.patch(`/api/payments/proofs/${id}/verify`, { status }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["paymentProofs"] });
      setExpandedId(null);
      toast.success(`Payment ${vars.status === "approved" ? "approved" : "rejected"}.`, { autoClose: 2500 });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not update the payment.", { autoClose: 3000 });
    },
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = () => qc.invalidateQueries({ queryKey: ["paymentProofs"] });
    socket.on("booking:new", onNew);
    return () => socket.off("booking:new", onNew);
  }, [qc]);

  return (
    <ManagerShell searchPlaceholder="Search payment proofs…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ReceiptText className="w-3.5 h-3.5" />
            Inbox · Payment proofs
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Payment reviews
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {proofs.length > 0 ? (
              <span className="text-amber-300 font-semibold">{proofs.length} awaiting review</span>
            ) : (
              "No payments awaiting review"
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[#181A22] border border-white/[0.06] rounded-md p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-2.5 w-1/2 bg-white/[0.03] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-red-500/15 inline-flex items-center justify-center mb-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-[14px] font-medium text-white">Couldn't load payment proofs</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      ) : proofs.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Inbox className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">All caught up</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">Payment proofs awaiting your review will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {proofs.map((pmt) => {
            const isExp = expandedId === pmt._id;
            const player = pmt.playerId || {};
            const playerName = player.name || "Player";
            const tournament = pmt.tournamentId || {};
            const method = METHOD_LABELS[pmt.paymentMethod] || pmt.paymentMethod || "—";

            return (
              <article key={pmt._id} className="bg-[#181A22] border border-amber-500/20 rounded-lg overflow-hidden transition">
                {/* Row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition"
                  onClick={() => setExpandedId(isExp ? null : pmt._id)}
                >
                  <AppImage
                    src={player.profileImage}
                    alt={playerName}
                    style={{ width: 40, height: 40, borderRadius: "9999px" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-white">{playerName}</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400">
                        <CreditCard className="w-2.5 h-2.5" /> {method}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 flex-wrap">
                      {tournament.title && (
                        <span className="flex items-center gap-1 truncate max-w-[16rem]">
                          <Trophy className="w-3 h-3" /> {tournament.title}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono tabular-nums">{new Date(pmt.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExp ? "rotate-180" : ""}`} />
                </div>

                {/* Expanded */}
                {isExp && (
                  <div className="border-t border-white/[0.06] px-4 py-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex gap-4 text-[12px] text-gray-400 flex-wrap">
                      {player.email && (
                        <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-500" /> {player.email}</span>
                      )}
                      {player.mobile && (
                        <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-500" /> <span className="font-mono tabular-nums">{player.mobile}</span></span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Hash className="w-3 h-3" /> Transaction ID
                        </p>
                        <p className="text-[13px] text-gray-200 mt-1 break-all font-mono">{pmt.transactionId || "—"}</p>
                      </div>
                      {pmt.offlineReceiver?.name && (
                        <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Offline receiver</p>
                          <p className="text-[13px] text-gray-200 mt-1">
                            {pmt.offlineReceiver.name}
                            {pmt.offlineReceiver.contact ? ` · ${pmt.offlineReceiver.contact}` : ""}
                          </p>
                        </div>
                      )}
                    </div>

                    {pmt.screenshot ? (
                      <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" /> Payment proof
                        </p>
                        <AppImage
                          src={pmt.screenshot}
                          alt="Payment proof"
                          className="w-full max-w-sm rounded-md"
                          style={{ maxHeight: 420, objectFit: "contain", border: "1px solid rgba(255,255,255,0.06)" }}
                        />
                      </div>
                    ) : (
                      <p className="text-[12px] text-gray-500 italic">No screenshot uploaded for this payment.</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => verifyMut.mutate({ id: pmt._id, status: "approved" })}
                        disabled={verifyMut.isPending}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                      >
                        {verifyMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                      </button>
                      <button
                        onClick={() => verifyMut.mutate({ id: pmt._id, status: "rejected" })}
                        disabled={verifyMut.isPending}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                        style={{ border: "1px solid rgba(248,113,113,0.25)" }}
                      >
                        {verifyMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Reject
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </ManagerShell>
  );
}
