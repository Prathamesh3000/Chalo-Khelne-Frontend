import { toast } from "react-toastify";
import { useState, useEffect, useCallback, Fragment } from "react";
import axios from "axios";
import {
  Shield,
  Users,
  Key,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Plus,
  Trash2,
  RefreshCcw,
  Lock,
  Grid3X3,
  Search,
  AlertTriangle,
  UserCog,
  Ban,
  RotateCcw,
  UserX,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";
import { Pagination } from "../shared/ui";

const PAGE_SIZE = 10;

const MODULE_ICONS = {
  tournament: "🏆",
  turf: "🏟️",
  booking: "📅",
  player: "👤",
  manager: "💼",
  news: "📰",
  payment: "💳",
  expense: "📊",
  referee: "🏁",
  social: "💬",
  sport: "⚽",
  report: "📈",
  role: "🔐",
  club_admin: "🏢",
  trainer: "🎯",
  notification: "🔔",
  donation: "🎁",
  settings: "⚙️",
  staff: "👥",
  users: "🚫",
};

const USER_ROLES = ["all", "manager", "player", "club_admin", "trainer", "referee", "corporate_admin"];
const USER_STATUS = ["all", "active", "suspended", "rejected"];

function statusBadge(status) {
  if (status === "suspended") return "bg-amber-500/15 text-amber-300 border-amber-400/20";
  if (status === "rejected") return "bg-red-500/15 text-red-300 border-red-400/20";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

// Hoisted form helpers
const FieldLabel = ({ children }) => (
  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
    {children}
  </label>
);

const DarkInput = (props) => (
  <input
    {...props}
    className={
      "w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40 transition " +
      (props.className || "")
    }
  />
);

const DarkTextarea = (props) => (
  <textarea
    {...props}
    className={
      "w-full px-3 py-2 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40 transition " +
      (props.className || "")
    }
  />
);

const DarkSelect = ({ children, ...props }) => (
  <select
    {...props}
    className={
      "w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 transition appearance-none " +
      (props.className || "")
    }
  >
    {children}
  </select>
);

export default function RbacManagement() {
  const [activeTab, setActiveTab] = useState("matrix");
  const [matrixData, setMatrixData] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({ flat: [], modules: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedModules, setExpandedModules] = useState({});
  const [selectedRole, setSelectedRole] = useState(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreatePerm, setShowCreatePerm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newRole, setNewRole] = useState({
    name: "",
    slug: "",
    authorityLevel: 5,
    description: "",
    color: "#f97316",
  });

  const [newPerm, setNewPerm] = useState({
    key: "",
    name: "",
    module: "tournament",
    action: "read",
    description: "",
  });

  // ── User-lifecycle state (User Access + Suspended tabs) ───────────────
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilters, setUserFilters] = useState({ role: "all", status: "all", search: "" });
  const [usersDebounced, setUsersDebounced] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [suspendedUsers, setSuspendedUsers] = useState([]);
  const [suspendedLoading, setSuspendedLoading] = useState(false);
  const [actionTarget, setActionTarget] = useState(null); // { user, action: "suspend"|"reject"|"reactivate" }
  const [actionReason, setActionReason] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  // Debounce the search box; reset to page 1 whenever the term changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setUsersDebounced(userFilters.search.trim());
      setUsersPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [userFilters.search]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = { page: usersPage, limit: PAGE_SIZE };
      if (userFilters.role !== "all") params.role = userFilters.role;
      if (userFilters.status !== "all") params.status = userFilters.status;
      if (usersDebounced) params.q = usersDebounced;
      const { data } = await axios.get("/api/roles/users", { params });
      setUsers(data.items || []);
      setUsersTotal(data.total || 0);
      setUsersTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, userFilters.role, userFilters.status, usersDebounced]);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "suspended") fetchSuspended();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchUsers]);

  const fetchSuspended = async () => {
    setSuspendedLoading(true);
    try {
      const { data } = await axios.get("/api/roles/users/suspended");
      setSuspendedUsers(data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load suspended users");
    } finally {
      setSuspendedLoading(false);
    }
  };

  const openAction = (user, action) => {
    setActionTarget({ user, action });
    setActionReason("");
  };

  const submitAction = async () => {
    if (!actionTarget) return;
    const { user, action } = actionTarget;
    const status = action === "reactivate" ? "active" : action === "reject" ? "rejected" : "suspended";
    if (status !== "active" && !actionReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setActionSaving(true);
    try {
      await axios.patch(`/api/roles/users/${user.id}/status`, {
        status,
        reason: actionReason.trim(),
        userType: user.userType || user.role,
      });
      toast.success(`User ${action === "reactivate" ? "reactivated" : action + "ed"}`);
      setActionTarget(null);
      setActionReason("");
      // Refresh whichever tab the user is on. A status change can drop the row
      // from the current filtered page — if it was the last one on a non-first
      // page, step back so we don't land on an empty page.
      if (activeTab === "users") {
        if (users.length === 1 && usersPage > 1) setUsersPage((p) => p - 1);
        else fetchUsers();
      }
      if (activeTab === "suspended") fetchSuspended();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setActionSaving(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [matrixRes, rolesRes, permsRes] = await Promise.all([
        axios.get("/api/roles/matrix"),
        axios.get("/api/roles"),
        axios.get("/api/roles/permissions/list"),
      ]);
      setMatrixData(matrixRes.data);
      setRoles(rolesRes.data.roles || []);
      setPermissions({
        flat: permsRes.data.flat || [],
        modules: permsRes.data.permissions || {},
      });
    } catch (err) {
      console.error("RBAC fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      const res = await axios.post("/api/roles/seed");
      toast.info(
        `Seed complete! Permissions: ${res.data.permissions.created} created, ${res.data.permissions.skipped} skipped. Roles: ${res.data.roles.created} created, ${res.data.roles.updated} updated.`
      );
      fetchAll();
    } catch (err) {
      toast.error("Seed failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleTogglePermission = async (
    roleId,
    permissionId,
    currentlyGranted,
    isSuperAdmin
  ) => {
    if (isSuperAdmin) return;
    setSaving(true);
    try {
      if (currentlyGranted) {
        await axios.post("/api/roles/revoke-permission", {
          roleId,
          permissionId,
        });
      } else {
        await axios.post("/api/roles/assign-permission", {
          roleId,
          permissionId,
        });
      }
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/roles", newRole);
      setShowCreateRole(false);
      setNewRole({
        name: "",
        slug: "",
        authorityLevel: 5,
        description: "",
        color: "#f97316",
      });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeleteRole = async (roleId, roleName, isSystem) => {
    if (isSystem) {
      toast.info("System roles cannot be deleted.");
      return;
    }
    if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/roles/${roleId}`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleCreatePermission = async (e) => {
    e.preventDefault();
    try {
      const key = `${newPerm.module}:${newPerm.action}`;
      await axios.post("/api/roles/permissions", { ...newPerm, key });
      setShowCreatePerm(false);
      setNewPerm({
        key: "",
        name: "",
        module: "tournament",
        action: "read",
        description: "",
      });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleDeletePermission = async (permId, isSystem) => {
    if (isSystem) {
      toast.info("System permissions cannot be deleted.");
      return;
    }
    if (!confirm("Delete this permission?")) return;
    try {
      await axios.delete(`/api/roles/permissions/${permId}`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const toggleModule = (mod) => {
    setExpandedModules((prev) => ({ ...prev, [mod]: !prev[mod] }));
  };

  return (
    <SuperAdminShell searchPlaceholder="Search roles & permissions…">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            Admin · Access control
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Roles & Permissions
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            {roles.length} roles · {permissions.flat.length} permissions ·{" "}
            {Object.keys(permissions.modules).length} modules
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSeed}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Re-seed defaults
          </button>
          <button
            onClick={() => setShowCreateRole(true)}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
          >
            <Plus className="w-3.5 h-3.5" />
            New role
          </button>
          <button
            onClick={() => setShowCreatePerm(true)}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white"
          >
            <Key className="w-3.5 h-3.5" />
            New permission
          </button>
        </div>
      </header>

      <div className="inline-flex items-center gap-1 bg-[#181A22] border border-white/[0.06] rounded-md p-1 mb-4">
        {[
          { key: "matrix", label: "Permission matrix", icon: Grid3X3 },
          { key: "roles", label: "Roles", icon: Users },
          { key: "permissions", label: "Permissions", icon: Key },
          { key: "users", label: "User access", icon: UserCog },
          { key: "suspended", label: "Suspended", icon: Ban },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium transition ${
              activeTab === tab.key
                ? "bg-orange-500/15 text-orange-300"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <RefreshCcw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">Loading RBAC data…</p>
        </div>
      )}

      {/* MATRIX VIEW */}
      {!loading && activeTab === "matrix" && matrixData && (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500 sticky left-0 bg-[#181A22] z-10 min-w-[220px]">
                    Permission
                  </th>
                  {matrixData.matrix.map((col) => (
                    <th
                      key={col.role._id}
                      className="px-3 py-3 text-center min-w-[110px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: col.role.color }}
                        />
                        <span className="text-[11px] font-bold text-gray-300">
                          {col.role.name}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Lvl {col.role.authorityLevel}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(matrixData.modules).map(
                  ([moduleName, modulePerms]) => (
                    <Fragment key={moduleName}>
                      <tr className="bg-white/[0.02]">
                        <td
                          colSpan={matrixData.matrix.length + 1}
                          className="px-4 py-2 text-[11px] font-bold text-gray-300 uppercase tracking-[0.08em] cursor-pointer sticky left-0 bg-[#1F232C]"
                          onClick={() => toggleModule(moduleName)}
                        >
                          <span className="flex items-center gap-2">
                            {expandedModules[moduleName] === false ? (
                              <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                            <span>{MODULE_ICONS[moduleName] || "📦"}</span>
                            {moduleName}
                            <span className="text-gray-500 font-normal">
                              ({modulePerms.length})
                            </span>
                          </span>
                        </td>
                      </tr>
                      {expandedModules[moduleName] !== false &&
                        modulePerms.map((perm) => (
                          <tr
                            key={perm._id}
                            className="border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                          >
                            <td className="px-4 py-2.5 sticky left-0 bg-[#181A22] z-10">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-medium text-white">
                                  {perm.name}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {perm.key}
                                </span>
                              </div>
                            </td>
                            {matrixData.matrix.map((col) => {
                              const cellPerm = col.permissions.find(
                                (p) => p._id === perm._id
                              );
                              const granted = cellPerm?.granted || false;
                              return (
                                <td
                                  key={`${col.role._id}-${perm._id}`}
                                  className="px-3 py-2.5 text-center"
                                >
                                  <button
                                    onClick={() =>
                                      handleTogglePermission(
                                        col.role._id,
                                        perm._id,
                                        granted,
                                        col.isSuperAdmin
                                      )
                                    }
                                    disabled={col.isSuperAdmin || saving}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center mx-auto transition ${
                                      col.isSuperAdmin
                                        ? "bg-emerald-500/15 text-emerald-300 cursor-not-allowed"
                                        : granted
                                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                        : "bg-white/[0.04] text-gray-600 hover:bg-red-500/10 hover:text-red-300"
                                    }`}
                                    title={
                                      col.isSuperAdmin
                                        ? "SuperAdmin bypasses all checks"
                                        : granted
                                        ? "Click to revoke"
                                        : "Click to grant"
                                    }
                                  >
                                    {granted ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : (
                                      <X className="w-3 h-3" />
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </Fragment>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-white/[0.02] border-t border-white/[0.06] flex flex-wrap items-center gap-5 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </span>
              Granted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center">
                <X className="w-3 h-3 text-gray-600" />
              </span>
              Denied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <Lock className="w-3 h-3 text-emerald-300" />
              </span>
              SuperAdmin (auto-granted)
            </span>
          </div>
        </div>
      )}

      {/* ROLES VIEW */}
      {!loading && activeTab === "roles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((role) => (
            <button
              key={role._id}
              onClick={() =>
                setSelectedRole(
                  selectedRole?._id === role._id ? null : role
                )
              }
              className={`text-left bg-[#181A22] border rounded-lg p-4 transition ${
                selectedRole?._id === role._id
                  ? "border-orange-400/40"
                  : "border-white/[0.06] hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center text-white text-[13px] font-bold"
                    style={{ backgroundColor: role.color }}
                  >
                    {role.authorityLevel}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium text-white">
                      {role.name}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-mono">
                      {role.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {role.isSystem && (
                    <span className="text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                      System
                    </span>
                  )}
                  {!role.isSystem && (
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role._id, role.name, role.isSystem);
                      }}
                      className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[12px] text-gray-400 mb-3 line-clamp-2 min-h-[2.5em]">
                {role.description || "—"}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-orange-300 bg-orange-500/15 px-2 py-0.5 rounded-md">
                  {role.permissions?.length || 0} permissions
                </span>
                <span className="text-[10px] text-gray-500">
                  Authority: {role.authorityLevel}
                </span>
              </div>

              {selectedRole?._id === role._id && (
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Assigned permissions
                  </h4>
                  <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                    {role.permissions?.map((p) => (
                      <span
                        key={p._id}
                        className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-md font-medium border border-emerald-400/20 font-mono"
                      >
                        {p.key}
                      </span>
                    ))}
                    {(!role.permissions || role.permissions.length === 0) && (
                      <span className="text-[11px] text-gray-500 italic">
                        No permissions assigned
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* PERMISSIONS VIEW */}
      {!loading && activeTab === "permissions" && (
        <div>
          <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search permissions…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(permissions.modules).map(
              ([moduleName, modulePerms]) => {
                const filtered = modulePerms.filter(
                  (p) =>
                    !searchTerm ||
                    p.key.includes(searchTerm.toLowerCase()) ||
                    p.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
                if (filtered.length === 0) return null;

                return (
                  <div
                    key={moduleName}
                    className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition"
                      onClick={() => toggleModule(moduleName)}
                    >
                      <span className="text-[13px] font-medium text-white flex items-center gap-2">
                        <span>{MODULE_ICONS[moduleName] || "📦"}</span>
                        <span className="uppercase tracking-[0.08em] text-[11px] font-bold text-gray-300">
                          {moduleName}
                        </span>
                        <span className="text-gray-500 font-normal text-[11px]">
                          ({filtered.length})
                        </span>
                      </span>
                      {expandedModules[moduleName] === false ? (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {expandedModules[moduleName] !== false && (
                      <div className="border-t border-white/[0.06]">
                        {filtered.map((perm) => (
                          <div
                            key={perm._id}
                            className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-medium text-white">
                                  {perm.name}
                                </span>
                                <span className="text-[10px] font-mono bg-white/[0.04] text-gray-400 px-2 py-0.5 rounded-md">
                                  {perm.key}
                                </span>
                                {perm.isSystem && (
                                  <Lock className="w-3 h-3 text-amber-300" />
                                )}
                              </div>
                              {perm.description && (
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded-md font-medium uppercase tracking-wider">
                                {perm.action}
                              </span>
                              {!perm.isSystem && (
                                <button
                                  onClick={() =>
                                    handleDeletePermission(
                                      perm._id,
                                      perm.isSystem
                                    )
                                  }
                                  className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* USER ACCESS VIEW */}
      {!loading && activeTab === "users" && (
        <div>
          <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search name or email…"
                value={userFilters.search}
                onChange={(e) => setUserFilters((p) => ({ ...p, search: e.target.value }))}
                className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
              />
            </div>
            <select
              value={userFilters.role}
              onChange={(e) => { setUsersPage(1); setUserFilters((p) => ({ ...p, role: e.target.value })); }}
              className="h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>{r === "all" ? "All roles" : r}</option>
              ))}
            </select>
            <select
              value={userFilters.status}
              onChange={(e) => { setUsersPage(1); setUserFilters((p) => ({ ...p, status: e.target.value })); }}
              className="h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
            >
              {USER_STATUS.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
              ))}
            </select>
            <button
              onClick={fetchUsers}
              className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {usersLoading ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
              <RefreshCcw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
              <p className="text-[13px] text-gray-400 mt-2">Loading users…</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
              <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
                <UserCog className="w-5 h-5 text-gray-500" />
              </div>
              <h3 className="text-[14px] font-medium text-white">No users found</h3>
              <p className="text-[13px] text-gray-400 mt-1">Try different filters.</p>
            </div>
          ) : (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Name</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Email</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Role</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={`${u.userType}-${u.id}`} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3 text-[13px] text-white">{u.name || "—"}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-300">{u.email}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-300 font-mono">{u.role}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusBadge(u.status)}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end items-center gap-1">
                            {u.status === "active" ? (
                              <>
                                <button
                                  onClick={() => openAction(u, "suspend")}
                                  className="h-7 px-2 inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-amber-300 hover:bg-amber-500/10 transition"
                                  title="Suspend"
                                >
                                  <Ban className="w-3 h-3" /> Suspend
                                </button>
                                <button
                                  onClick={() => openAction(u, "reject")}
                                  className="h-7 px-2 inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-red-300 hover:bg-red-500/10 transition"
                                  title="Reject"
                                >
                                  <UserX className="w-3 h-3" /> Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => openAction(u, "reactivate")}
                                className="h-7 px-2 inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/10 transition"
                                title="Reactivate"
                              >
                                <RotateCcw className="w-3 h-3" /> Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Pagination
            page={usersPage}
            totalPages={usersTotalPages}
            total={usersTotal}
            limit={PAGE_SIZE}
            onPage={setUsersPage}
            loading={usersLoading}
          />
        </div>
      )}

      {/* SUSPENDED VIEW */}
      {!loading && activeTab === "suspended" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-gray-400">
              {suspendedUsers.length} suspended / rejected account
              {suspendedUsers.length === 1 ? "" : "s"}
            </p>
            <button
              onClick={fetchSuspended}
              className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {suspendedLoading ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
              <RefreshCcw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
              <p className="text-[13px] text-gray-400 mt-2">Loading…</p>
            </div>
          ) : suspendedUsers.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
              <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
                <Ban className="w-5 h-5 text-gray-500" />
              </div>
              <h3 className="text-[14px] font-medium text-white">All clear</h3>
              <p className="text-[13px] text-gray-400 mt-1">No suspended or rejected accounts.</p>
            </div>
          ) : (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Name</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Role</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Reason</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">When</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suspendedUsers.map((u) => (
                      <tr key={`${u.userType}-${u.id}`} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition">
                        <td className="px-4 py-3">
                          <div className="text-[13px] text-white">{u.name || "—"}</div>
                          <div className="text-[11px] text-gray-500">{u.email}</div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-300 font-mono">{u.role}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusBadge(u.status)}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-300 max-w-[260px] truncate" title={u.suspensionReason || ""}>
                          {u.suspensionReason || "—"}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-400">{fmtDate(u.suspendedAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => openAction(u, "reactivate")}
                              className="h-7 px-2 inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/10 transition"
                              title="Reactivate"
                            >
                              <RotateCcw className="w-3 h-3" /> Reactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUSPEND/REJECT/REACTIVATE MODAL */}
      {actionTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
                {actionTarget.action === "reactivate" ? (
                  <RotateCcw className="w-4 h-4 text-emerald-300" />
                ) : actionTarget.action === "reject" ? (
                  <UserX className="w-4 h-4 text-red-300" />
                ) : (
                  <Ban className="w-4 h-4 text-amber-300" />
                )}
                {actionTarget.action === "reactivate"
                  ? "Reactivate user"
                  : actionTarget.action === "reject"
                  ? "Reject user"
                  : "Suspend user"}
              </h3>
              <button
                onClick={() => setActionTarget(null)}
                className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#0F1117] border border-white/[0.06] rounded-md px-3 py-2">
                <p className="text-[13px] text-white">{actionTarget.user.name}</p>
                <p className="text-[11px] text-gray-500">
                  {actionTarget.user.email} · <span className="font-mono">{actionTarget.user.role}</span>
                </p>
              </div>
              {actionTarget.action !== "reactivate" && (
                <div>
                  <FieldLabel>Reason</FieldLabel>
                  <DarkTextarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Visible to the user when they try to log in"
                  />
                </div>
              )}
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-400/20 rounded-md p-3">
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200">
                  {actionTarget.action === "reactivate"
                    ? "User will be able to log in immediately."
                    : "User will be logged out of all sessions and blocked at login + every API call."}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                onClick={() => setActionTarget(null)}
                className="h-9 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={actionSaving}
                className={`h-9 px-4 rounded-md text-[12px] font-medium text-white disabled:opacity-60 ${
                  actionTarget.action === "reactivate"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : actionTarget.action === "reject"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {actionSaving
                  ? "Saving…"
                  : actionTarget.action === "reactivate"
                  ? "Reactivate"
                  : actionTarget.action === "reject"
                  ? "Reject user"
                  : "Suspend user"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ROLE MODAL */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateRole}
            className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-300" />
                Create new role
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateRole(false)}
                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <FieldLabel>Name</FieldLabel>
                <DarkInput
                  type="text"
                  required
                  value={newRole.name}
                  onChange={(e) => {
                    setNewRole({
                      ...newRole,
                      name: e.target.value,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "_")
                        .replace(/[^a-z_]/g, ""),
                    });
                  }}
                  placeholder="Volunteer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Slug</FieldLabel>
                  <DarkInput
                    type="text"
                    required
                    value={newRole.slug}
                    onChange={(e) =>
                      setNewRole({ ...newRole, slug: e.target.value })
                    }
                    placeholder="volunteer"
                    className="font-mono"
                  />
                </div>
                <div>
                  <FieldLabel>Authority level</FieldLabel>
                  <DarkInput
                    type="number"
                    required
                    min="1"
                    max="99"
                    value={newRole.authorityLevel}
                    onChange={(e) =>
                      setNewRole({
                        ...newRole,
                        authorityLevel: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <DarkTextarea
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole({ ...newRole, description: e.target.value })
                  }
                  rows={2}
                  placeholder="What can this role do?"
                />
              </div>

              <div>
                <FieldLabel>Color</FieldLabel>
                <input
                  type="color"
                  value={newRole.color}
                  onChange={(e) =>
                    setNewRole({ ...newRole, color: e.target.value })
                  }
                  className="w-full h-9 rounded-md cursor-pointer bg-[#0F1117] border border-white/[0.08]"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-400/20 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200">
                  Lower authority level = higher power. SuperAdmin is 0, Player
                  is 4. You cannot create roles with authority equal to or
                  above your own.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateRole(false)}
                className="h-9 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white"
              >
                Create role
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE PERMISSION MODAL */}
      {showCreatePerm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreatePermission}
            className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-orange-300" />
                Create new permission
              </h3>
              <button
                type="button"
                onClick={() => setShowCreatePerm(false)}
                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <FieldLabel>Name</FieldLabel>
                <DarkInput
                  type="text"
                  required
                  value={newPerm.name}
                  onChange={(e) =>
                    setNewPerm({ ...newPerm, name: e.target.value })
                  }
                  placeholder="Manage equipment"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Module</FieldLabel>
                  <DarkSelect
                    value={newPerm.module}
                    onChange={(e) =>
                      setNewPerm({ ...newPerm, module: e.target.value })
                    }
                  >
                    {Object.keys(MODULE_ICONS).map((m) => (
                      <option key={m} value={m}>
                        {MODULE_ICONS[m]} {m}
                      </option>
                    ))}
                  </DarkSelect>
                </div>
                <div>
                  <FieldLabel>Action</FieldLabel>
                  <DarkSelect
                    value={newPerm.action}
                    onChange={(e) =>
                      setNewPerm({ ...newPerm, action: e.target.value })
                    }
                  >
                    {[
                      "create",
                      "read",
                      "update",
                      "delete",
                      "manage",
                      "approve",
                      "reject",
                      "publish",
                      "assign",
                      "export",
                      "view_all",
                      "view_own",
                      "score",
                      "register",
                      "bulk_register",
                    ].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </DarkSelect>
                </div>
              </div>

              <div className="bg-[#0F1117] border border-white/[0.06] rounded-md px-3 py-2">
                <span className="text-[11px] text-gray-500">
                  Generated key:{" "}
                </span>
                <span className="text-[13px] font-mono font-bold text-orange-300">
                  {newPerm.module}:{newPerm.action}
                </span>
              </div>

              <div>
                <FieldLabel>Description</FieldLabel>
                <DarkInput
                  type="text"
                  value={newPerm.description}
                  onChange={(e) =>
                    setNewPerm({ ...newPerm, description: e.target.value })
                  }
                  placeholder="What does this permission allow?"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreatePerm(false)}
                className="h-9 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white"
              >
                Create permission
              </button>
            </div>
          </form>
        </div>
      )}
    </SuperAdminShell>
  );
}
