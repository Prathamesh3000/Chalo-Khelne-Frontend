import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Users, Check, X, Eye, ChevronDown, Briefcase, ShieldCheck, ShieldX,
  Clock, Phone, Mail, Award, FileText, Calendar, Download,
  BadgeCheck, AlertCircle, Loader2,
} from "lucide-react";
import { ManagerShell } from "../shared/layout";

const ROLE_META = {
  trainer:     { label: "Trainer",     icon: "🏋️", color: "#F97316" },
  referee:     { label: "Referee",     icon: "🏅", color: "#3B82F6" },
  scorer:      { label: "Scorer",      icon: "📊", color: "#8B5CF6" },
  cameraman:   { label: "Cameraman",   icon: "📹", color: "#EC4899" },
  commentator: { label: "Commentator", icon: "🎙️", color: "#14B8A6" },
  staff:       { label: "Staff",       icon: "👷", color: "#F59E0B" },
};

export default function AllStaffApplicationsPage() {
  const auth = JSON.parse(localStorage.getItem("user") || "{}");
  const managerId = auth?.id || auth?._id || "";
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [respondNote, setRespondNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["allStaffApps", managerId, filterStatus, filterRole],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filterStatus) p.append("status", filterStatus);
      if (filterRole) p.append("role", filterRole);
      const r = await axios.get(`/api/staff-applications/manager/${managerId}/pending?${p}`);
      return r.data;
    },
    enabled: !!managerId,
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["staffProfile", profileModal],
    queryFn: async () => {
      const r = await axios.get(`/api/staff-applications/${profileModal}/profile`);
      return r.data;
    },
    enabled: !!profileModal,
  });

  const acceptMut = useMutation({
    mutationFn: (id) => axios.put(`/api/staff-applications/${id}/accept`, { managerId, managerNote: respondNote }),
    onSuccess: () => { qc.invalidateQueries(["allStaffApps"]); setRespondNote(""); setExpandedId(null); },
  });

  const rejectMut = useMutation({
    mutationFn: (id) => axios.put(`/api/staff-applications/${id}/reject`, { managerId, managerNote: respondNote }),
    onSuccess: () => { qc.invalidateQueries(["allStaffApps"]); setRespondNote(""); setExpandedId(null); },
  });

  const verifyMut = useMutation({
    mutationFn: ({ id, isVerified }) => axios.put(`/api/staff-applications/${id}/verify`, { managerId, isVerified }),
    onSuccess: () => { qc.invalidateQueries(["allStaffApps"]); qc.invalidateQueries(["staffProfile"]); },
  });

  const apps = data?.applications || [];
  const pendingCount = data?.pending || 0;

  return (
    <ManagerShell searchPlaceholder="Search staff applications…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Briefcase className="w-3.5 h-3.5" />
            Management · Staff applications
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Staff applications
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {pendingCount > 0 ? (
              <><span className="text-amber-300 font-semibold">{pendingCount} pending</span> · {apps.length} total</>
            ) : `${apps.length} application${apps.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex gap-2">
          <FilterSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="" className="bg-[#181A22]">All status</option>
            <option value="pending"  className="bg-[#181A22]">Pending</option>
            <option value="accepted" className="bg-[#181A22]">Accepted</option>
            <option value="rejected" className="bg-[#181A22]">Rejected</option>
          </FilterSelect>
          <FilterSelect value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="" className="bg-[#181A22]">All roles</option>
            {Object.entries(ROLE_META).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#181A22]">{v.label}</option>
            ))}
          </FilterSelect>
        </div>
      </header>

      {/* Stats Bar */}
      {!isLoading && apps.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatTile label="Total"    value={apps.length} />
          <StatTile label="Pending"  value={apps.filter((a) => a.status === "pending").length}  tone="amber" />
          <StatTile label="Accepted" value={apps.filter((a) => a.status === "accepted").length} tone="emerald" />
          <StatTile label="Rejected" value={apps.filter((a) => a.status === "rejected").length} tone="red" />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No applications found</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
            {filterStatus || filterRole ? "Try changing filters" : "Applications will appear when staff apply to your tournaments."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => {
            const rm = ROLE_META[app.role] || ROLE_META.staff;
            const isExp = expandedId === app._id;
            const tournamentTitle = app.tournamentId?.title || app.tournamentName || "Tournament";
            const sportType = app.tournamentId?.sportsType || "";
            const expLabel = app.experience > 0
              ? `${app.experience}yr${app.experienceMonths > 0 ? ` ${app.experienceMonths}mo` : ""}`
              : app.experienceLevel === "fresher" ? "Fresher" : "—";

            const statusPill =
              app.status === "pending"   ? { cls: "bg-amber-500/15 text-amber-300",   label: "Pending" }
              : app.status === "accepted"  ? { cls: "bg-emerald-500/15 text-emerald-300", label: "Accepted" }
              : app.status === "rejected"  ? { cls: "bg-red-500/15 text-red-300",      label: "Rejected" }
              : app.status === "withdrawn" ? { cls: "bg-white/[0.06] text-gray-400",   label: "Withdrawn" }
              : { cls: "bg-white/[0.06] text-gray-400", label: app.status };

            return (
              <article key={app._id} className={`bg-[#181A22] border rounded-lg overflow-hidden transition ${
                app.status === "pending" ? "border-amber-500/20" : "border-white/[0.06]"
              }`}>
                {/* Row */}
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition" onClick={() => setExpandedId(isExp ? null : app._id)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: rm.color + "20", border: `1px solid ${rm.color}30` }}>
                    {rm.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-white">{app.userName}</span>
                      <Pill className="bg-white/[0.06] text-gray-300">{rm.label}</Pill>
                      <Pill className={statusPill.cls}>{statusPill.label}</Pill>
                      {app.isVerified && (
                        <Pill className="bg-emerald-500/15 text-emerald-300">
                          <BadgeCheck className="w-2.5 h-2.5" /> Verified
                        </Pill>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 flex-wrap">
                      <span className="font-medium text-orange-400">{tournamentTitle}</span>
                      {sportType && <><span className="text-gray-600">·</span><span>{sportType}</span></>}
                      <span className="text-gray-600">·</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {expLabel}</span>
                      {app.rateAmount > 0 && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span className="font-mono tabular-nums">₹{app.rateAmount}/{(app.rateType || "").replace("per_", "")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExp ? "rotate-180" : ""}`} />
                </div>

                {/* Expanded */}
                {isExp && (
                  <div className="border-t border-white/[0.06] px-4 py-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex gap-4 text-[12px] text-gray-400 flex-wrap">
                      {app.userEmail && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-500" /> {app.userEmail}</span>}
                      {app.userPhone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-500" /> <span className="font-mono tabular-nums">{app.userPhone}</span></span>}
                      {app.sports?.length > 0 && <span className="flex items-center gap-1.5"><Award className="w-3 h-3 text-gray-500" /> {app.sports.join(", ")}</span>}
                      <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-gray-500" /> Applied <span className="font-mono tabular-nums">{new Date(app.createdAt).toLocaleDateString()}</span></span>
                    </div>

                    {app.message && (
                      <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cover note</p>
                        <p className="text-[13px] text-gray-200 mt-1 leading-relaxed">{app.message}</p>
                      </div>
                    )}

                    <button onClick={(e) => { e.stopPropagation(); setProfileModal(app._id); }}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-orange-400 hover:text-orange-300 transition w-auto">
                      <Eye className="w-3.5 h-3.5" /> View full profile & documents
                    </button>

                    {/* Verify */}
                    <div className="flex items-center gap-3 rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex-1">
                        <p className="text-[12px] font-medium text-white">Profile verification</p>
                        <p className="text-[11px] text-gray-500">
                          {app.isVerified ? `Verified on ${new Date(app.verifiedAt).toLocaleDateString()}` : "Mark credentials as verified after review"}
                        </p>
                      </div>
                      <button onClick={() => verifyMut.mutate({ id: app._id, isVerified: !app.isVerified })}
                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold transition w-auto ${
                          app.isVerified ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]"
                        }`}
                        style={!app.isVerified ? { border: "1px solid rgba(255,255,255,0.06)" } : undefined}>
                        {app.isVerified ? <><ShieldCheck className="w-3.5 h-3.5" /> Verified</> : <><ShieldX className="w-3.5 h-3.5" /> Unverified</>}
                      </button>
                    </div>

                    {app.managerNote && (
                      <div className="rounded-md p-3" style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.25)" }}>
                        <p className="text-[10px] font-bold text-orange-300 uppercase tracking-wider">Your response</p>
                        <p className="text-[13px] text-orange-100 mt-1">{app.managerNote}</p>
                      </div>
                    )}

                    {app.status === "pending" && (
                      <div className="space-y-3 pt-1">
                        <textarea
                          value={respondNote}
                          onChange={(e) => setRespondNote(e.target.value)}
                          placeholder="Note to applicant (optional)…"
                          className="w-full text-[13px] px-3 py-2.5 rounded-md text-gray-200 placeholder:text-gray-500 resize-none h-14 outline-none focus:border-orange-500/50"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => acceptMut.mutate(app._id)} disabled={acceptMut.isPending}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto">
                            {acceptMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Accept
                          </button>
                          <button onClick={() => rejectMut.mutate(app._id)} disabled={rejectMut.isPending}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 w-auto"
                            style={{ border: "1px solid rgba(248,113,113,0.25)" }}>
                            {rejectMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Full Profile Modal */}
      {profileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setProfileModal(null)}>
          <div className="bg-[#181A22] border border-white/[0.06] rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.5)] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-white">Applicant profile</h3>
              <button onClick={() => setProfileModal(null)} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition w-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {profileLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
              ) : profileData ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-400 font-semibold text-[18px]">
                      {profileData.user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[15px] font-medium text-white">{profileData.user?.name}</h4>
                      <div className="flex gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
                        {profileData.user?.email  && <span><Mail className="w-3 h-3 inline" /> {profileData.user.email}</span>}
                        {profileData.user?.mobile && <span><Phone className="w-3 h-3 inline" /> <span className="font-mono tabular-nums">{profileData.user.mobile}</span></span>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md p-3 grid grid-cols-2 gap-2 text-[12px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div><span className="text-gray-500">Role:</span> <span className="font-semibold text-gray-200">{ROLE_META[profileData.application?.role]?.label}</span></div>
                    <div><span className="text-gray-500">Experience:</span> <span className="font-semibold text-gray-200">
                      {profileData.application?.experience > 0
                        ? `${profileData.application.experience}yr ${profileData.application.experienceMonths || 0}mo`
                        : "Fresher"}
                    </span></div>
                    {profileData.application?.rateAmount > 0 && (
                      <div><span className="text-gray-500">Rate:</span> <span className="font-semibold text-gray-200 font-mono tabular-nums">₹{profileData.application.rateAmount}/{(profileData.application.rateType || "").replace("per_", "")}</span></div>
                    )}
                    {profileData.application?.sports?.length > 0 && (
                      <div className="col-span-2"><span className="text-gray-500">Sports:</span> <span className="font-semibold text-gray-200">{profileData.application.sports.join(", ")}</span></div>
                    )}
                  </div>

                  {profileData.serviceProfile && (
                    <div className="rounded-md p-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider"><Award className="w-3 h-3 inline" /> Service profile</h5>
                      {profileData.serviceProfile.experienceDescription && (
                        <p className="text-[13px] text-gray-200">{profileData.serviceProfile.experienceDescription}</p>
                      )}
                      {profileData.serviceProfile.certificationLevel && (
                        <Pill className="bg-orange-500/15 text-orange-400">{profileData.serviceProfile.certificationLevel}</Pill>
                      )}
                      {profileData.serviceProfile.availableDays?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {profileData.serviceProfile.availableDays.map((d) => (
                            <Pill key={d} className="bg-emerald-500/15 text-emerald-300">{d.slice(0, 3)}</Pill>
                          ))}
                        </div>
                      )}
                      {profileData.serviceProfile.certificates?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Certificates</p>
                          {profileData.serviceProfile.certificates.map((cert, i) => (
                            <div key={i} className="flex items-center gap-2 rounded p-2 text-[12px]" style={{ background: "rgba(255,255,255,0.04)" }}>
                              <FileText className="w-3.5 h-3.5 text-orange-400" />
                              <span className="font-medium text-gray-200 flex-1 truncate">{cert.name || `Certificate ${i + 1}`}</span>
                              {cert.certificateUrl && (
                                <a href={cert.certificateUrl} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 transition">
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {profileData.application?.message && (
                    <div className="rounded-md p-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
                      <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Cover note</p>
                      <p className="text-[13px] text-amber-100 mt-1">{profileData.application.message}</p>
                    </div>
                  )}

                  <div className={`rounded-md p-3 flex items-center gap-3 ${
                    profileData.application?.isVerified
                      ? "bg-emerald-500/[0.10]"
                      : "bg-white/[0.04]"
                  }`} style={{ border: `1px solid ${profileData.application?.isVerified ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)"}` }}>
                    {profileData.application?.isVerified
                      ? <><BadgeCheck className="w-4 h-4 text-emerald-400" /><span className="text-[13px] font-semibold text-emerald-300">Profile verified</span></>
                      : <><AlertCircle className="w-4 h-4 text-gray-400" /><span className="text-[13px] font-semibold text-gray-400">Not verified</span></>}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-[12px] text-gray-500">Failed to load profile</div>
              )}
            </div>
          </div>
        </div>
      )}
    </ManagerShell>
  );
}

function StatTile({ label, value, tone }) {
  const tones = {
    amber:   { bg: "bg-amber-500/10",   text: "text-amber-300"   },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-300" },
    red:     { bg: "bg-red-500/10",     text: "text-red-300"     },
  };
  const t = tones[tone] || { bg: "bg-white/[0.04]", text: "text-white" };
  return (
    <div className={`${t.bg} rounded-md p-3 text-center`} style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className={`text-[18px] font-semibold ${t.text} tabular-nums leading-none`}>{value}</p>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1.5">{label}</p>
    </div>
  );
}

function FilterSelect({ children, ...rest }) {
  return (
    <select
      {...rest}
      className="h-8 px-3 rounded-md text-[12px] font-medium text-gray-200 focus:outline-none cursor-pointer"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {children}
    </select>
  );
}

function Pill({ className, children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}
