import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import {
  UserCheck, Check, X, ChevronDown, Briefcase, Clock, Phone, Mail,
  Award, Loader2, Inbox, AlertCircle, RefreshCw, Star,
} from "lucide-react";
import AppImage from "../shared/ui/AppImage";
import { getSocket } from "../features/realtime";
import { ManagerShell } from "../shared/layout";

export default function HireRequests() {
  const auth = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = auth?.id || auth?._id || "";
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["hireRequests", userId],
    queryFn: async () => {
      const r = await axios.get(`/api/jobs/hire-requests/received/${userId}`);
      return r.data;
    },
    enabled: !!userId,
  });
  const requests = data?.requests || data?.hireRequests || (Array.isArray(data) ? data : []);

  const expandedReq = requests.find((r) => r._id === expandedId);
  const profileId = expandedReq?.profile?._id || expandedReq?.professionalId || expandedReq?.profileId || null;
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["professional", profileId],
    queryFn: async () => {
      const r = await axios.get(`/api/jobs/professionals/${profileId}`);
      return r.data;
    },
    enabled: !!profileId,
  });
  const professional = profileData?.profile || profileData || null;

  const respondMut = useMutation({
    mutationFn: ({ id, status }) => axios.patch(`/api/jobs/hire-requests/${id}/respond`, { status }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["hireRequests"] });
      setExpandedId(null);
      toast.success(`Request ${vars.status === "accepted" ? "accepted" : "rejected"}.`, { autoClose: 2500 });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not update the request.", { autoClose: 3000 });
    },
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (payload) => {
      qc.invalidateQueries({ queryKey: ["hireRequests"] });
      toast.info(
        <div>
          <strong>New hire request</strong>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            {payload?.message || "Someone wants to hire you."}
          </p>
        </div>,
        { autoClose: 6000 }
      );
    };
    socket.on("hireRequest:new", onNew);
    return () => socket.off("hireRequest:new", onNew);
  }, [qc]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <ManagerShell searchPlaceholder="Search hire requests…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <UserCheck className="w-3.5 h-3.5" />
            Inbox · Hire requests
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Hire requests
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {pendingCount > 0 ? (
              <>
                <span className="text-amber-300 font-semibold">{pendingCount} pending</span> ·{" "}
                {requests.length} total
              </>
            ) : (
              `${requests.length} request${requests.length === 1 ? "" : "s"}`
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
          <p className="text-[14px] font-medium text-white">Couldn't load hire requests</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Inbox className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No hire requests yet</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">Incoming requests to hire you will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const isExp = expandedId === req._id;
            const requester = req.fromUser || req.from || {};
            const requesterName = requester.name || req.fromUserName || "Someone";
            const requesterImg = requester.profileImage || requester.image;
            const statusPill =
              req.status === "pending"  ? { cls: "bg-amber-500/15 text-amber-300",   label: "Pending" }
              : req.status === "accepted" ? { cls: "bg-emerald-500/15 text-emerald-300", label: "Accepted" }
              : req.status === "rejected" ? { cls: "bg-red-500/15 text-red-300",      label: "Rejected" }
              : { cls: "bg-white/[0.06] text-gray-400", label: req.status };

            return (
              <article
                key={req._id}
                className={`bg-[#181A22] border rounded-lg overflow-hidden transition ${
                  req.status === "pending" ? "border-amber-500/20" : "border-white/[0.06]"
                }`}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition"
                  onClick={() => setExpandedId(isExp ? null : req._id)}
                >
                  <AppImage
                    src={requesterImg}
                    alt={requesterName}
                    style={{ width: 40, height: 40, borderRadius: "9999px" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-white">{requesterName}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusPill.cls}`}>
                        {statusPill.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono tabular-nums">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </span>
                      {req.message && <span className="truncate max-w-[18rem]">· {req.message}</span>}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExp ? "rotate-180" : ""}`} />
                </div>

                {/* Expanded */}
                {isExp && (
                  <div className="border-t border-white/[0.06] px-4 py-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex gap-4 text-[12px] text-gray-400 flex-wrap">
                      {requester.email && (
                        <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-500" /> {requester.email}</span>
                      )}
                      {requester.mobile && (
                        <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-500" /> <span className="font-mono tabular-nums">{requester.mobile}</span></span>
                      )}
                    </div>

                    {req.message && (
                      <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Message</p>
                        <p className="text-[13px] text-gray-200 mt-1 leading-relaxed">{req.message}</p>
                      </div>
                    )}

                    {profileId && (
                      <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Professional profile</p>
                        {profileLoading ? (
                          <div className="flex items-center gap-2 text-gray-500 text-[12px]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                          </div>
                        ) : professional ? (
                          <div className="flex items-center gap-3">
                            <AppImage
                              src={professional.profileImage || professional.image || professional.user?.profileImage}
                              alt={professional.name || professional.user?.name || "Professional"}
                              style={{ width: 44, height: 44, borderRadius: 8 }}
                            />
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-white truncate">
                                {professional.name || professional.user?.name || "Professional"}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap mt-0.5">
                                {professional.role && (
                                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {professional.role}</span>
                                )}
                                {professional.sport && (
                                  <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {professional.sport}</span>
                                )}
                                {professional.rating != null && (
                                  <span className="flex items-center gap-1"><Star className="w-3 h-3" /> <span className="font-mono tabular-nums">{professional.rating}</span></span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[12px] text-gray-500">Profile unavailable</p>
                        )}
                      </div>
                    )}

                    {req.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => respondMut.mutate({ id: req._id, status: "accepted" })}
                          disabled={respondMut.isPending}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                        >
                          {respondMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Accept
                        </button>
                        <button
                          onClick={() => respondMut.mutate({ id: req._id, status: "rejected" })}
                          disabled={respondMut.isPending}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                          style={{ border: "1px solid rgba(248,113,113,0.25)" }}
                        >
                          {respondMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Reject
                        </button>
                      </div>
                    )}
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
