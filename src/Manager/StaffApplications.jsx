import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import DialogA11y from "../shared/components/DialogA11y";
import { activatable } from "../shared/utils/activatable";
import {
  Users, Check, X, Eye, ChevronDown, Briefcase, ShieldCheck, ShieldX,
  Star, Clock, Phone, Mail, Award, FileText, Calendar, MapPin,
  Download, BadgeCheck, AlertCircle, Loader2,
} from "lucide-react";

const ROLE_META = {
  trainer:     { label: "Trainer / Coach", icon: "🏋️", bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", color: "#F97316" },
  referee:     { label: "Referee / Umpire", icon: "🏅", bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-200", color: "#3B82F6" },
  scorer:      { label: "Scorer", icon: "📊", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", color: "#8B5CF6" },
  cameraman:   { label: "Cameraman", icon: "📹", bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200", color: "#EC4899" },
  commentator: { label: "Commentator", icon: "🎙️", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", color: "#14B8A6" },
  staff:       { label: "Ground Staff", icon: "👷", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", color: "#F59E0B" },
};

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

/**
 * StaffApplications — Full manager panel to review, verify, and manage staff applications.
 *
 * Props:
 * - tournamentId: string
 * - managerId: string
 */
export default function StaffApplications({ tournamentId, managerId }) {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [profileModal, setProfileModal] = useState(null); // full profile view
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [respondNote, setRespondNote] = useState("");
  // Phase 4d: stage grants for referee applications (default both = backward-compat "all stages")
  const [respondStages, setRespondStages] = useState(["group-stage", "knockout"]);
  const [verifyNote, setVerifyNote] = useState("");

  // Fetch applications
  const { data, isLoading } = useQuery({
    queryKey: ["staffApps", tournamentId, filterRole, filterStatus],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filterRole) p.append("role", filterRole);
      if (filterStatus) p.append("status", filterStatus);
      const r = await axios.get(`/api/staff-applications/tournament/${tournamentId}?${p}`);
      return r.data;
    },
    enabled: !!tournamentId,
  });

  // Fetch full profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["staffProfile", profileModal],
    queryFn: async () => {
      const r = await axios.get(`/api/staff-applications/${profileModal}/profile`);
      return r.data;
    },
    enabled: !!profileModal,
  });

  const acceptMut = useMutation({
    mutationFn: ({ id, stages }) =>
      axios.put(`/api/staff-applications/${id}/accept`, {
        managerId,
        managerNote: respondNote,
        stages,
      }),
    onSuccess: () => {
      qc.invalidateQueries(["staffApps"]);
      setRespondNote("");
      setRespondStages(["group-stage", "knockout"]);
      setExpandedId(null);
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id) => axios.put(`/api/staff-applications/${id}/reject`, { managerId, managerNote: respondNote }),
    onSuccess: () => { qc.invalidateQueries(["staffApps"]); setRespondNote(""); setExpandedId(null); },
  });

  const verifyMut = useMutation({
    mutationFn: ({ id, isVerified }) => axios.put(`/api/staff-applications/${id}/verify`, { managerId, isVerified, verificationNote: verifyNote }),
    onSuccess: () => { qc.invalidateQueries(["staffApps"]); qc.invalidateQueries(["staffProfile"]); setVerifyNote(""); },
  });

  const apps = data?.applications || [];
  const pendingCount = data?.pending || 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-500 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Staff Applications</h2>
            <p className="text-xs text-gray-500">
              {pendingCount > 0 ? <span className="text-yellow-600 font-bold">{pendingCount} pending review</span> : "All caught up"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium">
            <option value="">All Roles</option>
            {Object.entries(ROLE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white font-medium">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications */}
      {apps.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-400">No applications found</p>
          <p className="text-xs text-gray-300 mt-1">Staff applications will appear here when people apply</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => {
            const rm = ROLE_META[app.role] || ROLE_META.staff;
            const isExp = expandedId === app._id;
            const expLabel = app.experience > 0
              ? `${app.experience}yr${app.experienceMonths > 0 ? ` ${app.experienceMonths}mo` : ""}`
              : app.experienceLevel === "fresher" ? "Fresher" : "—";

            return (
              <div key={app._id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${app.status === "pending" ? "border-yellow-200 shadow-sm" : "border-gray-100"}`}>
                {/* Row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50/50 transition"
                  aria-expanded={isExp}
                  {...activatable(() => setExpandedId(isExp ? null : app._id))}
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: rm.color + "15" }}>
                    {rm.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-800">{app.userName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rm.bg} ${rm.text}`}>{rm.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[app.status]}`}>{app.status}</span>
                      {app.isVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                          <BadgeCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {expLabel}</span>
                      {app.rateAmount > 0 && <span>₹{app.rateAmount}/{(app.rateType || "").replace("per_", "")}</span>}
                      {app.sports?.length > 0 && <span>{app.sports.slice(0, 3).join(", ")}</span>}
                    </div>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExp ? "rotate-180" : ""}`} />
                </div>

                {/* Expanded */}
                {isExp && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50/40 space-y-4">
                    {/* Contact row */}
                    <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                      {app.userEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app.userEmail}</span>}
                      {app.userPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app.userPhone}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Cover note */}
                    {app.message && (
                      <div className="bg-white rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">Cover Note</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{app.message}</p>
                      </div>
                    )}

                    {/* View Full Profile button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setProfileModal(app._id); }}
                      className="flex items-center gap-2 text-sm font-bold text-orange-500 hover:text-orange-700 transition"
                    >
                      <Eye className="w-4 h-4" /> View Full Profile & Documents
                    </button>

                    {/* Verification Toggle */}
                    <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-600">Profile Verification</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {app.isVerified
                            ? `Verified on ${new Date(app.verifiedAt).toLocaleDateString()}`
                            : "Mark this applicant's credentials as verified"}
                        </p>
                      </div>
                      <button
                        onClick={() => verifyMut.mutate({ id: app._id, isVerified: !app.isVerified })}
                        disabled={verifyMut.isPending}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                          app.isVerified
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {app.isVerified ? <><ShieldCheck className="w-4 h-4" /> Verified</> : <><ShieldX className="w-4 h-4" /> Unverified</>}
                      </button>
                    </div>

                    {/* Manager response */}
                    {app.managerNote && (
                      <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">Your Response</p>
                        <p className="text-sm text-orange-600 mt-1">{app.managerNote}</p>
                      </div>
                    )}

                    {/* Actions — pending only */}
                    {app.status === "pending" && (
                      <div className="space-y-3 pt-2">
                        <textarea value={respondNote} onChange={(e) => setRespondNote(e.target.value)}
                          placeholder="Add a note to the applicant (optional)..."
                          className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 bg-white resize-none h-16 focus:ring-2 focus:ring-orange-100 focus:border-orange-300 outline-none transition" />

                        {/* Phase 4d: Stage scope (referee applications only) */}
                        {app.role === "referee" && (
                          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-2">
                              Authorize scoring for:
                            </p>
                            <div className="flex gap-3 flex-wrap">
                              {[
                                { key: "group-stage", label: "Group Stage" },
                                { key: "knockout", label: "Knockout" },
                              ].map((s) => {
                                const checked = respondStages.includes(s.key);
                                return (
                                  <label
                                    key={s.key}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition border ${
                                      checked
                                        ? "bg-orange-500 text-white border-orange-500"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setRespondStages((prev) =>
                                            prev.includes(s.key) ? prev : [...prev, s.key]
                                          );
                                        } else {
                                          setRespondStages((prev) => prev.filter((x) => x !== s.key));
                                        }
                                      }}
                                      className="sr-only"
                                    />
                                    {checked && <Check className="w-3 h-3" />}
                                    {s.label}
                                  </label>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">
                              Umpire will be authorized to score matches in the selected stage(s). Uncheck both → no match access.
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              acceptMut.mutate({
                                id: app._id,
                                stages: app.role === "referee" ? respondStages : undefined,
                              })
                            }
                            disabled={acceptMut.isPending}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition disabled:opacity-50">
                            {acceptMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
                          </button>
                          <button onClick={() => rejectMut.mutate(app._id)} disabled={rejectMut.isPending}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition border border-red-100 disabled:opacity-50">
                            {rejectMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Profile Modal */}
      {profileModal && (
        <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={() => setProfileModal(null)}
      >
        <DialogA11y onClose={() => setProfileModal(null)} />
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-[#F97316] p-5 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Applicant Profile</h3>
                <button onClick={() => setProfileModal(null)} className="text-white/60 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[70vh] p-5 space-y-4">
              {profileLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
              ) : profileData ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xl">
                      {profileData.user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{profileData.user?.name || "Unknown"}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        {profileData.user?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {profileData.user.email}</span>}
                        {profileData.user?.mobile && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {profileData.user.mobile}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        {profileData.user?.sex && <span className="capitalize">{profileData.user.sex}</span>}
                        {profileData.user?.dateOfBirth && <span>DOB: {new Date(profileData.user.dateOfBirth).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Application Details</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-400">Role:</span> <span className="font-bold text-gray-700">{ROLE_META[profileData.application?.role]?.label}</span></div>
                      <div><span className="text-gray-400">Experience:</span> <span className="font-bold text-gray-700">
                        {profileData.application?.experience > 0
                          ? `${profileData.application.experience} yr ${profileData.application.experienceMonths || 0} mo`
                          : profileData.application?.experienceLevel === "fresher" ? "Fresher" : "—"}
                      </span></div>
                      {profileData.application?.rateAmount > 0 && (
                        <div><span className="text-gray-400">Rate:</span> <span className="font-bold text-gray-700">₹{profileData.application.rateAmount} / {(profileData.application.rateType || "").replace("per_", "")}</span></div>
                      )}
                      {profileData.application?.sports?.length > 0 && (
                        <div className="col-span-2"><span className="text-gray-400">Sports:</span> <span className="font-bold text-gray-700">{profileData.application.sports.join(", ")}</span></div>
                      )}
                    </div>
                  </div>

                  {/* Service Profile (Trainer/Referee specific) */}
                  {profileData.serviceProfile && (
                    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        <Award className="w-3 h-3" /> Service Profile
                      </h5>

                      {profileData.serviceProfile.experienceDescription && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold">About</p>
                          <p className="text-sm text-gray-700 mt-0.5">{profileData.serviceProfile.experienceDescription}</p>
                        </div>
                      )}

                      {profileData.serviceProfile.certificationLevel && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Certification:</span>
                          <span className="text-xs font-bold bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">{profileData.serviceProfile.certificationLevel}</span>
                        </div>
                      )}

                      {profileData.serviceProfile.availableDays?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold mb-1">Available Days</p>
                          <div className="flex flex-wrap gap-1">
                            {profileData.serviceProfile.availableDays.map((d) => (
                              <span key={d} className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{d.slice(0, 3)}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profileData.serviceProfile.fees?.perSession > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Session Fee:</span>
                          <span className="text-xs font-bold text-gray-700">₹{profileData.serviceProfile.fees.perSession}</span>
                        </div>
                      )}

                      {/* Certificates */}
                      {profileData.serviceProfile.certificates?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold mb-1">Certificates</p>
                          <div className="space-y-1.5">
                            {profileData.serviceProfile.certificates.map((cert, i) => (
                              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-xs">
                                <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="font-bold text-gray-700 block truncate">{cert.name || `Certificate ${i + 1}`}</span>
                                  {cert.issuedBy && <span className="text-gray-400">by {cert.issuedBy}</span>}
                                </div>
                                {cert.certificateUrl && (
                                  <a href={cert.certificateUrl} target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-600">
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cover Note */}
                  {profileData.application?.message && (
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Cover Note</p>
                      <p className="text-sm text-gray-700 mt-1">{profileData.application.message}</p>
                    </div>
                  )}

                  {/* Verification Status */}
                  <div className={`rounded-xl p-3 border flex items-center gap-3 ${profileData.application?.isVerified ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                    {profileData.application?.isVerified
                      ? <><BadgeCheck className="w-5 h-5 text-emerald-600" /><span className="text-sm font-bold text-emerald-700">Profile Verified</span></>
                      : <><AlertCircle className="w-5 h-5 text-gray-400" /><span className="text-sm font-bold text-gray-500">Not Verified Yet</span></>
                    }
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">Failed to load profile</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
