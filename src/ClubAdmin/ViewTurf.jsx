import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import { assetUrl } from "../shared/lib/assetUrl";
import {
  Pencil, Trash2, MapPin, CheckCircle, Info, Users, Plus, X, Check,
  UserCheck, AlertTriangle, ArrowLeft, ImageIcon, Settings, UserX, Loader2,
} from "lucide-react";
import { ClubAdminShell } from "../shared/layout";

import { getAuthToken } from "../shared/api/authToken";
import DialogA11y from "../shared/components/DialogA11y";
const ViewTurf = () => {
  const { id } = useParams();
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [turf, setTurf] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [availableManagers, setAvailableManagers] = useState([]);
  const [assignedManagers, setAssignedManagers] = useState([]);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [managersLoading, setManagersLoading] = useState(false);

  const [showDeleteTurfModal, setShowDeleteTurfModal] = useState(false);
  const [showRemoveManagerModal, setShowRemoveManagerModal] = useState(false);
  const [showAssignConfirmModal, setShowAssignConfirmModal] = useState(false);
  const [selectedManagerForRemoval, setSelectedManagerForRemoval] = useState(null);
  const [selectedManagerForAssignment, setSelectedManagerForAssignment] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { fetchTurf(); }, [id, auth._id]);

  const fetchTurf = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const response = await axios.get(`/api/turfs/${id}?userId=${auth._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTurf(response.data);
      setAssignedManagers(response.data.assignedManagers || []);
      setErrors({});
    } catch (error) {
      toast.error("Failed to fetch turf details. Please try again.");
      setErrors({ fetch: "Failed to load turf data" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableManagers = async () => {
    try {
      setManagersLoading(true);
      const token = getAuthToken();
      const response = await axios.get(`/api/manager/club-admin/managers?clubId=${auth._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const managers = response.data.filter(
        (m) => m.isActive && !assignedManagers.some((a) => a._id === m._id)
      );
      setAvailableManagers(managers);
    } catch (error) {
      toast.error("Failed to fetch available managers");
    } finally {
      setManagersLoading(false);
    }
  };

  const handleAssignManager = async () => {
    if (!selectedManagerForAssignment) return;
    try {
      setIsAssigning(true);
      const token = getAuthToken();
      await axios.post(`/api/turfs/${id}/assign-manager`,
        { managerId: selectedManagerForAssignment._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAssignedManagers((prev) => [...prev, selectedManagerForAssignment]);
      setAvailableManagers((prev) => prev.filter((m) => m._id !== selectedManagerForAssignment._id));
      toast.success(`${selectedManagerForAssignment.name} assigned successfully`);
      setShowAssignConfirmModal(false);
      setSelectedManagerForAssignment(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to assign manager");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveManager = async () => {
    if (!selectedManagerForRemoval) return;
    try {
      const token = getAuthToken();
      await axios.delete(`/api/turfs/${id}/remove-manager/${selectedManagerForRemoval._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignedManagers((prev) => prev.filter((m) => m._id !== selectedManagerForRemoval._id));
      setAvailableManagers((prev) => [...prev, selectedManagerForRemoval]);
      toast.success(`${selectedManagerForRemoval.name} removed successfully`);
      setShowRemoveManagerModal(false);
      setSelectedManagerForRemoval(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to remove manager");
    }
  };

  const handleDeleteTurf = async () => {
    if (deleteConfirmText !== turf.name) {
      toast.error("Please type the turf name exactly to confirm deletion");
      return;
    }
    try {
      setIsDeleting(true);
      const token = getAuthToken();
      await axios.delete(`/api/turfs/${id}?userId=${auth._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Turf deleted successfully");
      navigate("/turf-management?tab=manage");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete turf");
    } finally {
      setIsDeleting(false);
      setShowDeleteTurfModal(false);
      setDeleteConfirmText("");
    }
  };

  const openManagerModal = () => {
    setShowManagerModal(true);
    fetchAvailableManagers();
  };

  const closeAllModals = () => {
    setShowManagerModal(false);
    setShowDeleteTurfModal(false);
    setShowRemoveManagerModal(false);
    setShowAssignConfirmModal(false);
    setSelectedManagerForRemoval(null);
    setSelectedManagerForAssignment(null);
    setDeleteConfirmText("");
  };

  if (isLoading) {
    return (
      <ClubAdminShell searchPlaceholder="Search turf details…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </ClubAdminShell>
    );
  }

  if (!turf) {
    return (
      <ClubAdminShell searchPlaceholder="Search turf details…">
        <div className="bg-[#181A22] border border-red-500/20 rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-red-500/15 inline-flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-[14px] font-medium text-white">Turf not found</p>
          <p className="text-[13px] text-gray-400 mt-1">The requested turf could not be found.</p>
          <Link to="/turf-management?tab=manage"
            className="mt-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to turf management
          </Link>
        </div>
      </ClubAdminShell>
    );
  }

  return (
    <ClubAdminShell searchPlaceholder="Search turf details…">
      {/* Header */}
      <header className="flex items-start gap-3 mb-6">
        <Link to="/turf-management?tab=manage"
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.04] transition w-auto flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <MapPin className="w-3.5 h-3.5" />
            Turfs · Detail
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">{turf.name}</h1>
          <p className="mt-1 text-[13px] text-gray-400">Created on <span className="font-mono tabular-nums">{new Date(turf.createdAt).toLocaleDateString()}</span></p>
        </div>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
          turf.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
        }`}>
          {turf.isActive ? "Active" : "Inactive"}
        </span>
      </header>

      {/* Club info */}
      {turf.clubName && (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 mb-3">
          <h3 className="text-[13px] font-medium text-white flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-orange-400" />
            Club information
          </h3>
          <p className="text-[13px] text-gray-300">Owned by <span className="font-semibold text-orange-300">{turf.clubName}</span></p>
        </div>
      )}

      {/* Main */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: images + quick actions */}
        <div className="lg:col-span-1 space-y-3">
          <Section title="Turf images" icon={ImageIcon}>
            {turf.images && turf.images.length > 0 ? (
              <>
                <div className="relative mb-3">
                  <img loading="lazy" src={assetUrl(turf.images[activeImageIndex])} alt={`${turf.name} view`}
                    className="w-full h-56 object-cover rounded-md" style={{ border: "1px solid rgba(255,255,255,0.06)" }} />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[11px] px-2 py-1 rounded font-mono tabular-nums">
                    {activeImageIndex + 1} / {turf.images.length}
                  </div>
                </div>
                {turf.images.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {turf.images.map((image, index) => (
                      <button key={index} onClick={() => setActiveImageIndex(index)}
                        className={`rounded-md overflow-hidden transition w-auto ${
                          index === activeImageIndex ? "ring-2 ring-orange-500" : "opacity-70 hover:opacity-100"
                        }`}>
                        <img loading="lazy" src={assetUrl(image)} alt={`Thumbnail ${index + 1}`} className="w-full h-14 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-56 rounded-md flex flex-col items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                <ImageIcon className="w-7 h-7 text-gray-600 mb-2" />
                <span className="text-[12px] text-gray-500">No images available</span>
              </div>
            )}
          </Section>

          <Section title="Quick actions" icon={Settings}>
            <div className="space-y-2">
              <Link to={`/turf/edit/${turf._id}`}
                className="w-full h-9 inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto">
                <Pencil className="w-3.5 h-3.5" /> Edit turf details
              </Link>
              <button onClick={() => setShowDeleteTurfModal(true)}
                className="w-full h-9 inline-flex items-center justify-center gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[13px] font-semibold rounded-md transition active:scale-[0.98] w-auto"
                style={{ border: "1px solid rgba(248,113,113,0.25)" }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete turf
              </button>
            </div>
          </Section>
        </div>

        {/* Right: details */}
        <div className="lg:col-span-2 space-y-3">
          <Section
            title={`Assigned managers (${assignedManagers.length})`}
            icon={Users}
            rightSlot={
              <button onClick={openManagerModal}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold transition active:scale-[0.98] w-auto">
                <Plus className="w-3 h-3" /> Assign
              </button>
            }
          >
            {assignedManagers.length === 0 ? (
              <div className="text-center py-8 rounded-md" style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
                <Users className="w-7 h-7 text-gray-600 mx-auto mb-2" />
                <p className="text-[13px] font-medium text-white">No managers assigned</p>
                <p className="text-[12px] text-gray-500 mt-0.5">Assign managers to help operate this turf.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {assignedManagers.map((manager) => (
                  <div key={manager._id} className="rounded-md p-3 flex items-start justify-between transition hover:border-white/[0.12]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-orange-500/15 grid place-items-center flex-shrink-0">
                        <UserCheck className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">{manager.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{manager.email}</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 mt-1">Active</span>
                      </div>
                    </div>
                    <button onClick={() => { setSelectedManagerForRemoval(manager); setShowRemoveManagerModal(true); }}
                      title="Remove manager"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0 w-auto">
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Location details" icon={MapPin}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <InfoCell label="Full address" value={turf.location?.address || "Address not available"} />
              <InfoCell label="Longitude" value={turf.location?.coordinates?.[0] ?? "N/A"} mono />
              <InfoCell label="Latitude"  value={turf.location?.coordinates?.[1] ?? "N/A"} mono />
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section title="Available sports" icon={CheckCircle}>
              {(turf.sports || []).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(turf.sports || []).map((sport, index) => (
                    <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400">
                      {sport.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-gray-500">No sports configured</p>
              )}
            </Section>

            <Section title="Facilities" icon={Info}>
              {turf.facilities ? (
                <div className="space-y-1.5">
                  {(Array.isArray(turf.facilities) ? turf.facilities : Object.entries(turf.facilities).filter(([, v]) => v).map(([k]) => k))
                    .map((facility) => (
                      <div key={facility} className="flex items-center text-[12px]">
                        <Check className="w-3 h-3 text-emerald-400 mr-2 flex-shrink-0" />
                        <span className="text-gray-300">
                          {facility.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[12px] text-gray-500">No facilities listed</p>
              )}
            </Section>
          </div>

          {turf.description && (
            <Section title="Description" icon={Info}>
              <p className="text-[13px] text-gray-300 leading-relaxed">{turf.description}</p>
            </Section>
          )}
        </div>
      </div>

      {/* Manager assignment modal */}
      {showManagerModal && (
        <DarkModal title="Assign manager to turf" onClose={closeAllModals} size="md">
          {managersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            </div>
          ) : availableManagers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-7 h-7 text-gray-600 mx-auto mb-2" />
              <p className="text-[13px] font-medium text-white">No available managers</p>
              <p className="text-[12px] text-gray-500 mt-1 max-w-xs mx-auto">All active managers are already assigned to this turf or no active managers exist.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {availableManagers.map((manager) => (
                <div key={manager._id} className="flex items-center justify-between p-3 rounded-md transition hover:bg-white/[0.04]"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] grid place-items-center flex-shrink-0">
                      <Users className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{manager.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{manager.email}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedManagerForAssignment(manager); setShowAssignConfirmModal(true); }}
                    className="inline-flex items-center h-8 px-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold transition active:scale-[0.98] w-auto flex-shrink-0">
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </DarkModal>
      )}

      {/* Assign confirm modal */}
      {showAssignConfirmModal && selectedManagerForAssignment && (
        <DarkModal title="Confirm manager assignment" subtitle="This will assign management rights." onClose={() => setShowAssignConfirmModal(false)} size="md">
          <div className="rounded-md p-4 mb-4" style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.25)" }}>
            <div className="text-[12px] text-orange-200 space-y-1">
              <p><span className="text-orange-300/80">Manager:</span> <span className="font-medium text-orange-100">{selectedManagerForAssignment.name}</span></p>
              <p><span className="text-orange-300/80">Email:</span> <span className="font-medium text-orange-100">{selectedManagerForAssignment.email}</span></p>
              <p><span className="text-orange-300/80">Turf:</span> <span className="font-medium text-orange-100">{turf.name}</span></p>
            </div>
          </div>
          <p className="text-[13px] text-gray-400 mb-4">
            Are you sure you want to assign <span className="text-white font-semibold">{selectedManagerForAssignment.name}</span> as a manager for <span className="text-white font-semibold">{turf.name}</span>? They will be able to manage bookings and operations for this turf.
          </p>
          <div className="flex gap-2">
            <DarkButton variant="ghost" className="flex-1" onClick={() => setShowAssignConfirmModal(false)}>Cancel</DarkButton>
            <DarkButton className="flex-1" onClick={handleAssignManager} disabled={isAssigning}>
              {isAssigning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assigning…</> : "Confirm assignment"}
            </DarkButton>
          </div>
        </DarkModal>
      )}

      {/* Remove manager modal */}
      {showRemoveManagerModal && selectedManagerForRemoval && (
        <DarkModal title="Remove manager access" subtitle="This will revoke management rights." onClose={closeAllModals} size="md">
          <div className="rounded-md p-4 mb-4" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div className="text-[12px] text-red-200 space-y-1">
              <p><span className="text-red-300/80">Manager:</span> <span className="font-medium text-red-100">{selectedManagerForRemoval.name}</span></p>
              <p><span className="text-red-300/80">Email:</span> <span className="font-medium text-red-100">{selectedManagerForRemoval.email}</span></p>
              <p><span className="text-red-300/80">Turf:</span> <span className="font-medium text-red-100">{turf.name}</span></p>
            </div>
          </div>
          <div className="rounded-md p-3 mb-4" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-amber-200">Warning</p>
                <p className="text-[12px] text-amber-200/90 mt-1">
                  Removing <span className="font-semibold">{selectedManagerForRemoval.name}</span> will immediately revoke their access to manage bookings and operations for <span className="font-semibold">{turf.name}</span>. This action cannot be undone automatically.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <DarkButton variant="ghost" className="flex-1" onClick={closeAllModals}>Cancel</DarkButton>
            <button onClick={handleRemoveManager}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition active:scale-[0.98] w-auto">
              Remove access
            </button>
          </div>
        </DarkModal>
      )}

      {/* Delete turf modal */}
      {showDeleteTurfModal && (
        <DarkModal title="Delete turf" subtitle="This action is permanent and cannot be undone." onClose={closeAllModals} size="md">
          <div className="rounded-md p-3 mb-4" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-red-200 mb-1.5">Permanent deletion warning</p>
                <ul className="text-[12px] text-red-200/90 space-y-0.5">
                  <li>• All turf data will be permanently deleted</li>
                  <li>• All associated bookings will be affected</li>
                  <li>• All uploaded images will be removed</li>
                  <li>• Manager assignments will be revoked</li>
                  <li>• This action cannot be reversed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">
              Type the turf name <span className="text-red-300">"{turf.name}"</span> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={`Type "${turf.name}" here`}
              className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${deleteConfirmText && deleteConfirmText !== turf.name ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.06)"}` }}
            />
            {deleteConfirmText && deleteConfirmText !== turf.name && (
              <p className="text-[11px] text-red-300 mt-1">Text doesn't match. Please type "{turf.name}" exactly.</p>
            )}
          </div>

          <div className="flex gap-2">
            <DarkButton variant="ghost" className="flex-1" onClick={closeAllModals}>Cancel</DarkButton>
            <button onClick={handleDeleteTurf} disabled={deleteConfirmText !== turf.name || isDeleting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-auto">
              {isDeleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : "Delete turf"}
            </button>
          </div>
        </DarkModal>
      )}
    </ClubAdminShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function Section({ title, icon: Icon, rightSlot, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-orange-400" />
            </span>
          )}
          <h3 className="text-[13px] font-medium text-white truncate">{title}</h3>
        </div>
        {rightSlot}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function InfoCell({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-[13px] text-gray-200 mt-1 ${mono ? "font-mono tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}

function DarkButton({ children, onClick, variant = "primary", type = "button", disabled, className = "" }) {
  const base = "h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-md transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-auto";
  if (variant === "ghost") {
    return (
      <button type={type} onClick={onClick} disabled={disabled}
        className={`${base} text-gray-200 hover:text-white hover:bg-white/[0.06] ${className}`}
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {children}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30 ${className}`}>
      {children}
    </button>
  );
}

function DarkModal({ title, subtitle, onClose, size = "md", children }) {
  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };
  return (
    <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <DialogA11y onClose={onClose} />
      <div
        className={`bg-[#181A22] border border-white/[0.06] rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.5)] w-full ${sizes[size]} max-h-[85vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-white">{title}</p>
            {subtitle && <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition flex-shrink-0 w-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export default ViewTurf;
