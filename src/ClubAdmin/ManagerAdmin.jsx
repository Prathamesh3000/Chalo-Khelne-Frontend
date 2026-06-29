import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Trash2, Check, X, UserPlus, BarChart3, Users, Calendar, IdCard,
  RotateCcw, Download, Filter, Search, ArrowUp, ArrowDown, Shuffle,
  Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { ClubAdminShell } from "../shared/layout";

const DARK_TOOLTIP = {
  contentStyle: {
    background: "#181A22",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    color: "#e5e7eb",
    fontSize: 12,
  },
  labelStyle: { color: "#9ca3af", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" },
  itemStyle: { color: "#e5e7eb" },
};

const ManagerAdmin = () => {
  const [managers, setManagers] = useState([]);
  const [filteredManagers, setFilteredManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newManager, setNewManager] = useState({ name: "", email: "", password: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState("managers");
  const [stats, setStats] = useState({
    activeManagers: 0, inactiveManagers: 0, totalManagers: 0,
    newManagersThisMonth: 0, avgResponseTime: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityPagination, setActivityPagination] = useState({
    totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10,
  });
  const [timeRange, setTimeRange] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "ascending" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const [statusTrend, setStatusTrend] = useState([]);
  const [statusTrendLoading, setStatusTrendLoading] = useState(true);
  const [trendTimeRange, setTrendTimeRange] = useState("6");

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));
      const clubId = user?._id;
      let url = `/api/manager/club-admin/managers`;
      if (clubId) url += `?clubId=${clubId}`;
      const response = await axios.get(url);
      const managersData = Array.isArray(response.data) ? response.data : [];
      setManagers(managersData);
      applyFiltersAndSort(managersData);
      setError(null);
    } catch (err) {
      setError("Failed to fetch managers. Please try again later.");
      setManagers([]);
      setFilteredManagers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerStatusTrend = async () => {
    try {
      setStatusTrendLoading(true);
      const response = await axios.get(`/api/manager/analytics/manager-status-trend`, { params: { months: trendTimeRange } });
      setStatusTrend(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error("Failed to load status trend data");
      setStatusTrend([]);
    } finally {
      setStatusTrendLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));
      const clubId = user?._id;
      let url = `/api/manager/analytics/manager-stats`;
      if (clubId) url += `?clubId=${clubId}`;
      const statsResponse = await axios.get(url);
      setStats(statsResponse.data || { activeManagers: 0, inactiveManagers: 0, totalManagers: 0, newManagersThisMonth: 0, avgResponseTime: 0 });
    } catch (error) {
      toast.error("Failed to load analytics data");
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchActivityLogs = async (page = 1) => {
    try {
      setActivityLoading(true);
      const response = await axios.get(`/api/manager/activity-log`, { params: { timeRange, page, limit: 10 } });
      setRecentActivities(response.data.activities);
      setActivityPagination(response.data.pagination);
    } catch (error) {
      toast.error("Failed to load activity data");
    } finally {
      setActivityLoading(false);
    }
  };

  const applyFiltersAndSort = (data = managers) => {
    let filtered = [...data];
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((m) => m.isActive === isActive);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    setFilteredManagers(filtered);
  };

  const logActivity = async (managerId, type, description, metadata = {}) => {
    try {
      await axios.post(`/api/manager/activity-log`, { managerId, type, description, metadata });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  useEffect(() => {
    fetchManagers();
    fetchStatistics();
    fetchActivityLogs();
    fetchManagerStatusTrend();
    const interval = setInterval(() => {
      fetchManagers();
      fetchStatistics();
      fetchActivityLogs(activityPagination.currentPage);
      fetchManagerStatusTrend();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { fetchManagerStatusTrend(); }, [trendTimeRange]);
  useEffect(() => { fetchActivityLogs(1); }, [timeRange]);
  useEffect(() => { applyFiltersAndSort(); }, [searchQuery, statusFilter, sortConfig]);

  const handleInputChange = (e) => setNewManager((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAddManager = async (e) => {
    e.preventDefault();
    if (!newManager.name || !newManager.email || !newManager.password) {
      toast.error("All fields are required");
      return;
    }
    try {
      setIsAdding(true);
      const user = JSON.parse(localStorage.getItem("user"));
      const clubId = user?._id;
      const managerData = { ...newManager };
      if (clubId) managerData.clubId = clubId;
      const response = await axios.post(`/api/manager/managers`, managerData);
      toast.success(response.data?.message || "Manager added successfully.");
      setNewManager({ name: "", email: "", password: "" });
      if (response.data && response.data._id) {
        await logActivity(response.data._id, "update", "Manager account created", { action: "create" });
      }
      fetchManagers();
      fetchStatistics();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add manager");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleManagerStatus = async (id, currentStatus) => {
    try {
      await axios.put(`/api/manager/managers/${id}/activate`, { isActive: !currentStatus });
      toast.success(`Manager ${currentStatus ? "deactivated" : "activated"} successfully`);
      await logActivity(id, "status", `Manager status changed to ${currentStatus ? "inactive" : "active"}`, { newStatus: !currentStatus });
      fetchManagers();
      fetchStatistics();
    } catch (err) {
      toast.error("Failed to update manager status");
    }
  };

  const deleteManager = async (id) => {
    if (!window.confirm("Are you sure you want to delete this manager?")) return;
    try {
      await axios.delete(`/api/manager/managers/${id}`);
      toast.success("Manager deleted successfully");
      const adminId = localStorage.getItem("adminId");
      if (adminId) await logActivity(adminId, "update", `Manager account deleted`, { deletedManagerId: id });
      fetchManagers();
      fetchStatistics();
    } catch (err) {
      toast.error("Failed to delete manager");
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
    let password = "";
    for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewManager((prev) => ({ ...prev, password }));
  };


  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") direction = "descending";
    setSortConfig({ key, direction });
  };

  const exportData = async () => {
    setIsExporting(true);
    try {
      const dataToExport = filteredManagers.map(({ name, email, isActive }) => ({
        name, email, status: isActive ? "Active" : "Inactive",
      }));
      const headers = ["Name", "Email", "Status"];
      const csvContent = [headers.join(","), ...dataToExport.map((r) => [r.name, r.email, r.status].join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `managers_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Data exported successfully");
    } catch (err) {
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePageChange = (page) => fetchActivityLogs(page);

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const timeDate = new Date(date);
    const diffMinutes = Math.floor((now - timeDate) / 60000);
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return timeDate.toLocaleDateString();
  };

  const refreshData = () => {
    fetchManagers();
    fetchStatistics();
    fetchActivityLogs(activityPagination.currentPage);
    fetchManagerStatusTrend();
    toast.info("Data refreshed");
  };

  return (
    <ClubAdminShell searchPlaceholder="Search managers…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Users className="w-3.5 h-3.5" />
            Management · Staff
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Club manager management
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Add, activate/deactivate, or remove managers for your club.
          </p>
        </div>
        <button
          onClick={refreshData}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <StatTile icon={Users} label="Total managers" value={statsLoading ? "—" : stats.totalManagers} hint={statsLoading ? "" : `+${stats.newManagersThisMonth} this month`} hintTone="green" />
        <StatTile icon={Check} label="Active managers" value={statsLoading ? "—" : stats.activeManagers} hint={statsLoading ? "" : stats.totalManagers > 0 ? `${Math.round((stats.activeManagers / stats.totalManagers) * 100)}% of total` : "0% of total"} tone="green" />
        <StatTile icon={X} label="Inactive managers" value={statsLoading ? "—" : stats.inactiveManagers} hint={statsLoading ? "" : stats.totalManagers > 0 ? `${Math.round((stats.inactiveManagers / stats.totalManagers) * 100)}% of total` : "0% of total"} tone="red" />
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06] mb-5">
        {[
          { key: "managers",  label: "Managers",        icon: Users },
          { key: "analytics", label: "Analytics",       icon: BarChart3 },
          { key: "activity",  label: "Recent activity", icon: Calendar },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[12px] font-medium transition w-auto ${
                active ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Managers tab ───────────────────────────────────────────────────── */}
      {activeTab === "managers" && (
        <div className="space-y-3">
          {/* Add manager */}
          <Section title="Add new manager" icon={UserPlus}>
            <form onSubmit={handleAddManager}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <DarkInput label="Name" name="name" value={newManager.name} onChange={handleInputChange} placeholder="Full name" required />
                <DarkInput label="Email" name="email" type="email" value={newManager.email} onChange={handleInputChange} placeholder="manager@example.com" required />
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="password"
                      value={newManager.password}
                      onChange={handleInputChange}
                      placeholder="Enter or generate"
                      required
                      className="flex-1 h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      title="Generate random password"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-orange-400 hover:bg-white/[0.06] transition w-auto"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={isAdding}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold shadow-sm shadow-orange-500/30 transition disabled:opacity-50 active:scale-[0.98] w-auto">
                  {isAdding ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><UserPlus className="w-3.5 h-3.5" /> Add manager</>}
                </button>
              </div>
            </form>
          </Section>

          {/* Managers list */}
          <Section
            title="Managers list"
            icon={Users}
            rightSlot={
              <button onClick={exportData} disabled={isExporting}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[12px] font-semibold transition disabled:opacity-50 w-auto"
                style={{ border: "1px solid rgba(16,185,129,0.25)" }}>
                <Download className="w-3.5 h-3.5" />
                {isExporting ? "Exporting…" : "Export CSV"}
              </button>
            }
          >
            {/* Search + filter */}
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or email"
                  className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <option value="all"      className="bg-[#181A22]">All statuses</option>
                <option value="active"   className="bg-[#181A22]">Active only</option>
                <option value="inactive" className="bg-[#181A22]">Inactive only</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="rounded-md px-4 py-3 flex items-center justify-between" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <p className="text-[13px] text-red-300">{error}</p>
                <button onClick={fetchManagers} className="text-[12px] font-semibold text-red-300 hover:text-red-200 transition w-auto">Try again</button>
              </div>
            ) : filteredManagers.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-gray-500">No managers found. Add your first manager above.</div>
            ) : (
              <div className="overflow-x-auto -mx-5 -mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <SortableTh sortKey="name"     label="Name"   sortConfig={sortConfig} onClick={() => requestSort("name")} />
                      <SortableTh sortKey="email"    label="Email"  sortConfig={sortConfig} onClick={() => requestSort("email")} />
                      <SortableTh sortKey="isActive" label="Status" sortConfig={sortConfig} onClick={() => requestSort("isActive")} align="center" />
                      <Th align="center">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredManagers.map((manager) => (
                      <tr key={manager._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition">
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-white">{manager.name}</span>
                            {manager.staffRole && manager.staffRole !== "manager" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-300">
                                {manager.staffRole}
                              </span>
                            )}
                          </div>
                          {manager.sports?.length > 0 && (
                            <span className="block text-[11px] text-gray-500 mt-0.5">{manager.sports.join(", ")}</span>
                          )}
                        </Td>
                        <Td><span className="text-[12px] text-gray-300">{manager.email}</span></Td>
                        <Td align="center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            manager.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                          }`}>
                            {manager.isActive ? "Active" : "Inactive"}
                          </span>
                        </Td>
                        <Td align="center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => toggleManagerStatus(manager._id, manager.isActive)}
                              title={manager.isActive ? "Deactivate" : "Activate"}
                              className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition w-auto ${
                                manager.isActive
                                  ? "text-red-300 bg-red-500/15 hover:bg-red-500/25"
                                  : "text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25"
                              }`}>
                              {manager.isActive ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => deleteManager(manager._id)}
                              title="Delete"
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ── Analytics tab ──────────────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="space-y-3">
          <Section
            title="Manager status trend"
            icon={BarChart3}
            rightSlot={
              <select value={trendTimeRange} onChange={(e) => setTrendTimeRange(e.target.value)}
                className="h-8 px-3 rounded-md text-[12px] text-gray-200 focus:outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <option value="3"  className="bg-[#181A22]">Last 3 months</option>
                <option value="6"  className="bg-[#181A22]">Last 6 months</option>
                <option value="12" className="bg-[#181A22]">Last 12 months</option>
              </select>
            }
          >
            {statusTrendLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={statusTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <Tooltip {...DARK_TOOLTIP} formatter={(value, name) => [value, name === "active" ? "Active managers" : "Inactive managers"]} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                    <Area type="monotone" dataKey="active"   stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Active" />
                    <Area type="monotone" dataKey="inactive" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Inactive" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {!statusTrendLoading && statusTrend.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Current status summary</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Active"   value={statusTrend[statusTrend.length - 1].active}   tone="green" />
                  <MiniStat label="Inactive" value={statusTrend[statusTrend.length - 1].inactive} tone="red" />
                  <MiniStat label="Total"    value={statusTrend[statusTrend.length - 1].total} />
                </div>
              </div>
            )}
          </Section>

          <Section title="Current manager status distribution" icon={Users}>
            {statsLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ name: "Active", value: stats.activeManagers }, { name: "Inactive", value: stats.inactiveManagers }]}
                      cx="50%" cy="50%" labelLine={false} outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      style={{ fontSize: 12, fill: "#e5e7eb" }}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip {...DARK_TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ── Activity tab ───────────────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <Section
          title="Recent activity"
          icon={Calendar}
          rightSlot={
            <div className="flex items-center gap-2">
              {recentActivities && recentActivities.length > 0 && (
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to clear all activities?")) {
                      try {
                        await axios.delete(`/api/manager/activity-log`, { params: { timeRange } });
                        setRecentActivities([]);
                        setActivityPagination({ ...activityPagination, totalItems: 0, totalPages: 1, currentPage: 1 });
                        toast.success("All activities cleared");
                      } catch (error) {
                        toast.error("Failed to clear activities");
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-red-300 hover:text-red-200 hover:bg-red-500/15 text-[12px] font-semibold transition w-auto"
                  style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Trash2 className="w-3 h-3" /> Clear all
                </button>
              )}
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}
                className="h-8 px-3 rounded-md text-[12px] text-gray-200 focus:outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <option value="day"   className="bg-[#181A22]">Last 24 hours</option>
                <option value="week"  className="bg-[#181A22]">Last 7 days</option>
                <option value="month" className="bg-[#181A22]">Last 30 days</option>
              </select>
            </div>
          }
        >
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            </div>
          ) : !recentActivities || recentActivities.length === 0 ? (
            <div className="text-center py-10 text-[13px] text-gray-500">No recent activities to display.</div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="rounded-md pl-4 py-2.5 pr-3"
                  style={{ borderLeft: "2px solid #f97316", background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white">{activity.manager}</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">{activity.description}</p>
                    </div>
                    <span className="text-[11px] text-gray-500 flex-shrink-0">{formatTime(activity.time)}</span>
                  </div>
                  <div className="mt-2">
                    <ActivityTypePill type={activity.type} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!activityLoading && recentActivities && recentActivities.length > 0 && activityPagination && activityPagination.totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <nav className="flex items-center gap-1">
                <PageBtn disabled={activityPagination.currentPage === 1} onClick={() => handlePageChange(activityPagination.currentPage - 1)}>Previous</PageBtn>
                {[...Array(activityPagination.totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (pageNum === 1 || pageNum === activityPagination.totalPages ||
                      (pageNum >= activityPagination.currentPage - 1 && pageNum <= activityPagination.currentPage + 1)) {
                    return (
                      <PageBtn key={pageNum} onClick={() => handlePageChange(pageNum)}
                        active={activityPagination.currentPage === pageNum}>{pageNum}</PageBtn>
                    );
                  } else if (pageNum === activityPagination.currentPage - 2 || pageNum === activityPagination.currentPage + 2) {
                    return <span key={pageNum} className="px-1 text-gray-500">…</span>;
                  }
                  return null;
                })}
                <PageBtn disabled={activityPagination.currentPage === activityPagination.totalPages} onClick={() => handlePageChange(activityPagination.currentPage + 1)}>Next</PageBtn>
              </nav>
            </div>
          )}
        </Section>
      )}
    </ClubAdminShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, hint, hintTone, tone = "orange" }) {
  const tones = {
    orange: { bg: "bg-orange-500/15",  text: "text-orange-400"  },
    green:  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
    red:    { bg: "bg-red-500/15",     text: "text-red-400"     },
  };
  const t = tones[tone] || tones.orange;
  const hintColor = hintTone === "green" ? "text-emerald-400" : "text-gray-500";
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`grid w-[34px] h-[34px] rounded-md place-items-center ${t.bg}`}>
          <Icon className={`w-[18px] h-[18px] ${t.text}`} />
        </span>
      </div>
      <p className="text-[24px] font-medium leading-none text-white tabular-nums">{value}</p>
      <p className="mt-1 text-[12px] text-gray-400">{label}</p>
      {hint && <p className={`mt-1.5 text-[11px] ${hintColor}`}>{hint}</p>}
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const tones = { green: "text-emerald-300", red: "text-red-300" };
  return (
    <div className="rounded-md p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className={`text-[18px] font-semibold tabular-nums leading-none ${tones[tone] || "text-white"}`}>{value}</p>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1.5">{label}</p>
    </div>
  );
}

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

function DarkInput({ label, ...rest }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <input
        {...rest}
        className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      />
    </div>
  );
}

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 ${a}`}>{children}</th>;
}

function SortableTh({ label, sortKey, sortConfig, onClick, align }) {
  const isActive = sortConfig.key === sortKey;
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`py-3 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 cursor-pointer hover:text-gray-300 transition ${a}`} onClick={onClick}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (sortConfig.direction === "ascending" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </span>
    </th>
  );
}

function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-3 ${a}`}>{children}</td>;
}

function ActivityTypePill({ type }) {
  const map = {
    login:   "bg-blue-500/15 text-blue-300",
    booking: "bg-emerald-500/15 text-emerald-300",
    status:  "bg-amber-500/15 text-amber-300",
    update:  "bg-indigo-500/15 text-indigo-300",
    cancel:  "bg-red-500/15 text-red-300",
    export:  "bg-purple-500/15 text-purple-300",
  };
  const cls = map[type] || "bg-white/[0.06] text-gray-400";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {type}
    </span>
  );
}

function PageBtn({ children, active, disabled, onClick }) {
  if (active) {
    return (
      <button className="h-7 min-w-[28px] px-2 rounded-md text-[12px] font-semibold bg-orange-500/15 text-orange-300 w-auto"
        style={{ border: "1px solid rgba(249,115,22,0.25)" }}>
        {children}
      </button>
    );
  }
  return (
    <button disabled={disabled} onClick={onClick}
      className="h-7 min-w-[28px] px-2 rounded-md text-[12px] font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-40 disabled:cursor-not-allowed w-auto"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {children}
    </button>
  );
}

export default ManagerAdmin;
