import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Building2, Pencil, Trash2, X, Loader2, Search, Mail, Phone, MapPin,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";

export default function ManageClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => { fetchClubs(); }, []);

  const fetchClubs = async () => {
    try {
      const res = await axios.get("/api/clubadminprofile");
      setClubs(res.data);
      setSelectedUsers([]);
    } catch (error) {
      toast.error("Failed to fetch clubs");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await axios.patch(`/api/clubadminprofile/${userId}/status`);
      toast.success(res.data.message);
      setClubs(clubs.map((c) => c._id === userId ? { ...c, isActive: res.data.isActive } : c));
    } catch (error) {
      toast.error("Failed to toggle status");
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this club admin? This action cannot be undone.")) return;
    try {
      await axios.delete(`/api/clubadminprofile/${userId}`);
      toast.success("Club deleted successfully");
      fetchClubs();
    } catch (error) {
      toast.error("Failed to delete club");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedUsers.length} selected clubs? This cannot be undone.`)) return;
    try {
      await axios.delete("/api/clubadminprofile/bulk", { data: { userIds: selectedUsers } });
      toast.success("Selected clubs deleted");
      fetchClubs();
    } catch (error) {
      toast.error("Failed to delete selected");
    }
  };

  const handleSelectAll = (e) => setSelectedUsers(e.target.checked ? filtered.map((c) => c._id) : []);
  const handleSelectUser = (userId) =>
    setSelectedUsers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);

  const handleEditClick = (club) => {
    setEditForm({
      userId: club._id,
      name: club.name || "",
      email: club.email || "",
      mobile: club.mobile || "",
      clubName: club.profile?.clubName || club.clubName || "",
      address: club.profile?.address || "",
      city: club.profile?.city || "",
      area: club.profile?.area || "",
      sports: club.profile?.sports || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.put(`/api/clubadminprofile/${editForm.userId}`, editForm);
      toast.success("Club updated successfully");
      setIsEditModalOpen(false);
      fetchClubs();
    } catch (error) {
      toast.error("Failed to update club");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = clubs.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) ||
      (c.email || "").toLowerCase().includes(s) ||
      (c.profile?.clubName || c.clubName || "").toLowerCase().includes(s);
  });

  if (loading) {
    return (
      <SuperAdminShell searchPlaceholder="Search clubs…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell searchPlaceholder="Search clubs…">
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Building2 className="w-3.5 h-3.5" />
            Clubs · Manage
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Manage clubs
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            <span className="font-mono tabular-nums">{filtered.length}</span> of <span className="font-mono tabular-nums">{clubs.length}</span> clubs
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clubs…"
              className="w-56 h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          </div>
          {selectedUsers.length > 0 && (
            <button onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[13px] font-semibold transition w-auto"
              style={{ border: "1px solid rgba(248,113,113,0.25)" }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete (<span className="font-mono tabular-nums">{selectedUsers.length}</span>)
            </button>
          )}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">{search ? "No matching clubs" : "No clubs yet"}</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
            {search ? "Try a different search." : 'Create your first club from "Create club admin".'}
          </p>
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="w-12 px-4 py-3 text-center">
                    <input type="checkbox"
                      checked={selectedUsers.length > 0 && selectedUsers.length === filtered.length}
                      onChange={handleSelectAll}
                      className="rounded w-4 h-4 cursor-pointer"
                      style={{ accentColor: "#f97316" }} />
                  </th>
                  <Th>Club</Th>
                  <Th>Admin</Th>
                  <Th>Contact</Th>
                  <Th>Location</Th>
                  <Th align="center">Status</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((club) => {
                  const isSelected = selectedUsers.includes(club._id);
                  return (
                    <tr key={club._id}
                      className={`border-b border-white/[0.04] last:border-b-0 transition ${
                        isSelected ? "bg-orange-500/[0.04]" : "hover:bg-white/[0.02]"
                      }`}>
                      <td className="px-4 py-4 text-center">
                        <input type="checkbox" checked={isSelected} onChange={() => handleSelectUser(club._id)}
                          className="rounded w-4 h-4 cursor-pointer"
                          style={{ accentColor: "#f97316" }} />
                      </td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-orange-500/15 text-orange-400 grid place-items-center flex-shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-white">{club.profile?.clubName || club.clubName || "N/A"}</p>
                            {club.profile?.clubID && <p className="text-[10px] text-gray-500 font-mono">{club.profile.clubID}</p>}
                          </div>
                        </div>
                      </Td>
                      <Td><span className="text-[13px] text-gray-300">{club.name}</span></Td>
                      <Td>
                        <div className="space-y-0.5">
                          <p className="text-[11px] text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> {club.email}</p>
                          {club.mobile && (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> <span className="font-mono tabular-nums">{club.mobile}</span>
                            </p>
                          )}
                        </div>
                      </Td>
                      <Td>
                        {(club.profile?.city || club.profile?.area) ? (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[club.profile?.area, club.profile?.city].filter(Boolean).join(", ")}
                          </p>
                        ) : <span className="text-[11px] text-gray-500">—</span>}
                      </Td>
                      <Td align="center">
                        <button onClick={() => handleToggleStatus(club._id)}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition w-auto ${
                            club.isActive !== false
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              : "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                          }`}>
                          {club.isActive !== false ? "Active" : "Inactive"}
                        </button>
                      </Td>
                      <Td align="center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleEditClick(club)} title="Edit"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-orange-400 hover:bg-orange-500/15 transition w-auto">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(club._id)} title="Delete"
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-[#181A22] border border-white/[0.06] rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-[14px] font-medium text-white">Edit club details</h2>
              <button onClick={() => setIsEditModalOpen(false)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition w-auto">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="overflow-y-auto px-5 py-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ModalField label="Admin name *" name="name"     value={editForm.name}     onChange={handleEditChange} required />
                <ModalField label="Club name *"  name="clubName" value={editForm.clubName} onChange={handleEditChange} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ModalField label="Email (read-only)" name="email" type="email" value={editForm.email} disabled />
                <ModalField label="Phone *" name="mobile" type="tel" value={editForm.mobile} onChange={handleEditChange} required />
              </div>
              <div className="pt-3 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-3">
                <ModalField label="City" name="city" value={editForm.city} onChange={handleEditChange} />
                <ModalField label="Area" name="area" value={editForm.area} onChange={handleEditChange} />
              </div>
              <ModalField label="Sports (comma separated)" name="sports" value={editForm.sports} onChange={handleEditChange} />
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Detailed address</label>
                <textarea name="address" rows={2} value={editForm.address} onChange={handleEditChange}
                  className="w-full px-3 py-2.5 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
                <button type="button" onClick={() => setIsEditModalOpen(false)}
                  className="h-9 px-3.5 rounded-md text-[13px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="h-9 px-3.5 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-orange-500/30 w-auto">
                  {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}

// ── Hoisted primitives ───────────────────────────────────────────────────────

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 ${a}`}>{children}</th>;
}
function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-4 ${a}`}>{children}</td>;
}

function ModalField({ label, name, type = "text", value, onChange, required, disabled }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} disabled={disabled}
        className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
    </div>
  );
}
