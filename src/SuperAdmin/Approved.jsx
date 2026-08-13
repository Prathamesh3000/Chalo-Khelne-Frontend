import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Search, CheckCircle, Eye, ArrowLeft, Pencil, Check, X, Shield, Mail, Phone, User, Loader2,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";
import { Pagination } from "../shared/ui";

const ROLES = ["All", "Player", "Trainer", "ClubAdmin", "corporate_admin"];
const EDITABLE_ROLES = ["Player", "Trainer", "ClubAdmin", "corporate_admin", "Manager"];
const PAGE_SIZE = 10;

export default function Approved() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("All");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState("");

  // Debounce the search box; reset to page 1 whenever the term changes.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever the role filter changes.
  useEffect(() => { setPage(1); }, [selectedRole]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (debounced) params.q = debounced;
      if (selectedRole !== "All") params.role = selectedRole;
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/update/approved-users`, { params });
      setUsers(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, selectedRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Both search (?q) and role (?role) are served by the backend now, so the
  // page already holds exactly what should be shown.
  const filtered = users;

  const handleStatusToggle = async () => {
    const newStatus = !selectedUser.isApproved;
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/update/user-status/${selectedUser._id}`, { isApproved: newStatus });
      setSelectedUser((p) => ({ ...p, isApproved: newStatus }));
      setUsers((p) => p.map((u) => u._id === selectedUser._id ? { ...u, isApproved: newStatus } : u));
      toast.success(newStatus ? "User activated" : "User deactivated");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleRoleUpdate = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/update/user-role/${selectedUser._id}`, { role: newRole });
      setSelectedUser((p) => ({ ...p, role: newRole }));
      setUsers((p) => p.map((u) => u._id === selectedUser._id ? { ...u, role: newRole } : u));
      setEditingRole(false);
      toast.success("Role updated");
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  // ── Detail View ────────────────────────────────────────────────────────────
  if (selectedUser) {
    return (
      <SuperAdminShell searchPlaceholder="Search users…">
        <button onClick={() => { setSelectedUser(null); setEditingRole(false); }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold text-gray-300 hover:text-white hover:bg-white/[0.06] transition mb-6 w-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to users
        </button>

        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden max-w-3xl">
          {/* Profile banner */}
          <div className="p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.20) 0%, rgba(249,115,22,0.06) 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-16 h-16 rounded-md bg-orange-500/25 text-orange-200 grid place-items-center text-[24px] font-medium flex-shrink-0">
              {(selectedUser.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px] font-medium text-white truncate">{selectedUser.name}</h2>
              <p className="text-[12px] text-orange-200/80 truncate">{selectedUser.email}</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Role */}
            <DetailRow icon={Shield} label="Role">
              {editingRole ? (
                <div className="flex items-center gap-2">
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                    className="h-8 px-3 rounded-md text-[12px] text-gray-200 focus:outline-none cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {EDITABLE_ROLES.map((r) => <option key={r} value={r} className="bg-[#181A22]">{r}</option>)}
                  </select>
                  <button onClick={handleRoleUpdate}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition w-auto">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingRole(false)}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition w-auto">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-white capitalize">{selectedUser.role}</span>
                  <button onClick={() => { setEditingRole(true); setNewRole(selectedUser.role); }}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-orange-400 hover:bg-orange-500/15 transition w-auto">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </DetailRow>

            <DetailRow icon={Mail}  label="Email">
              <span className="text-[13px] text-gray-200">{selectedUser.email}</span>
            </DetailRow>
            <DetailRow icon={Phone} label="Mobile">
              <span className="text-[13px] text-gray-200 font-mono tabular-nums">{selectedUser.mobile || "N/A"}</span>
            </DetailRow>

            <DetailRow icon={User} label="Status">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  selectedUser.isApproved ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                }`}>
                  {selectedUser.isApproved ? "Active" : "Inactive"}
                </span>
                <button onClick={handleStatusToggle}
                  className={`inline-flex items-center h-8 px-3 rounded-md text-[12px] font-semibold transition w-auto ${
                    selectedUser.isApproved
                      ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }`}
                  style={selectedUser.isApproved ? { border: "1px solid rgba(248,113,113,0.25)" } : undefined}>
                  {selectedUser.isApproved ? "Deactivate" : "Activate"}
                </button>
              </div>
            </DetailRow>
          </div>
        </div>
      </SuperAdminShell>
    );
  }

  // ── List View ──────────────────────────────────────────────────────────────
  return (
    <SuperAdminShell searchPlaceholder="Search users…">
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <CheckCircle className="w-3.5 h-3.5" />
            Club approvals · Approved users
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Approved users
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            <span className="font-mono tabular-nums">{total}</span> approved user{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="w-48 h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          </div>
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
            className="h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {ROLES.map((r) => <option key={r} value={r} className="bg-[#181A22]">{r === "All" ? "All roles" : r}</option>)}
          </select>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No users found</h3>
          <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">
            {search ? "Try a different search." : "No approved users yet."}
          </p>
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th align="center">Action</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition cursor-pointer"
                    onClick={() => { setSelectedUser(user); setEditingRole(false); }}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-orange-500/15 text-orange-400 grid place-items-center text-[13px] font-semibold flex-shrink-0">
                          {(user.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white truncate">{user.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400">
                        {user.role}
                      </span>
                    </Td>
                    <Td>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        user.isApproved ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                      }`}>
                        {user.isApproved ? "Active" : "Inactive"}
                      </span>
                    </Td>
                    <Td align="center">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setEditingRole(false); }}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-orange-400 hover:text-orange-300 hover:bg-orange-500/15 transition w-auto">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={PAGE_SIZE}
        onPage={setPage}
        loading={loading}
      />
    </SuperAdminShell>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-white/[0.04] last:border-b-0">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      {children}
    </div>
  );
}

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 ${a}`}>{children}</th>;
}
function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-4 ${a}`}>{children}</td>;
}
