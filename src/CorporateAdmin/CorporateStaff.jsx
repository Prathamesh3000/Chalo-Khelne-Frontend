import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import {
  Users, UserPlus, Trash2, RotateCcw, Shuffle, Loader2,
} from "lucide-react";
import { CorporateShell } from "../shared/layout";

const CorporateStaff = () => {
  const { user } = useContext(AuthContext);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newManager, setNewManager] = useState({ name: "", email: "", password: "" });

  const fetchManagers = async () => {
    try {
      setLoading(true);
      if (!user?._id) return;
      const response = await axios.get(`/api/manager/club-admin/managers?clubId=${user._id}`);
      setManagers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching managers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchManagers(); }, [user]);

  const handleInputChange = (e) => {
    setNewManager((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
    let password = "";
    for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewManager((prev) => ({ ...prev, password }));
  };

  const handleAddManager = async (e) => {
    e.preventDefault();
    if (!newManager.name || !newManager.email || !newManager.password) {
      toast.error("All fields are required");
      return;
    }
    try {
      setIsAdding(true);
      await axios.post("/api/corporate/manager", { ...newManager, userId: user._id });
      toast.success("Manager added successfully! Credentials sent via email.");
      setNewManager({ name: "", email: "", password: "" });
      fetchManagers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to add manager");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteManager = async (id) => {
    if (!window.confirm("Are you sure you want to delete this manager?")) return;
    try {
      await axios.delete(`/api/manager/managers/${id}`);
      toast.success("Manager deleted successfully");
      fetchManagers();
    } catch (err) {
      toast.error("Failed to delete manager");
    }
  };

  return (
    <CorporateShell searchPlaceholder="Search staff…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Users className="w-3.5 h-3.5" />
            Organisation · Staff
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Staff management
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Add managers to organise tournaments for your company.
          </p>
        </div>
        <button
          onClick={fetchManagers}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          title="Refresh list"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="space-y-3">
        {/* Add Manager Form */}
        <Section title="Add new manager" icon={UserPlus}>
          <form onSubmit={handleAddManager}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <DarkInput label="Name"  name="name"  value={newManager.name}  onChange={handleInputChange} placeholder="Manager name"        required />
              <DarkInput label="Email" name="email" type="email" value={newManager.email} onChange={handleInputChange} placeholder="email@company.com" required />
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

        {/* Managers List */}
        <Section title="Active managers" icon={Users}>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            </div>
          ) : managers.length === 0 ? (
            <div className="text-center py-8 rounded-md" style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
              <Users className="w-7 h-7 text-gray-600 mx-auto mb-2" />
              <p className="text-[13px] font-medium text-white">No managers found</p>
              <p className="text-[12px] text-gray-500 mt-0.5">Add one above to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04] -my-2">
              {managers.map((manager) => (
                <li key={manager._id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-orange-500/15 grid place-items-center text-orange-400 font-semibold text-[15px] flex-shrink-0">
                      {manager.name?.charAt(0)?.toUpperCase() || "M"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{manager.name}</p>
                      <p className="text-[12px] text-gray-500 truncate">{manager.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      manager.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                    }`}>
                      {manager.isActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => handleDeleteManager(manager._id)}
                      title="Delete manager"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </CorporateShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-orange-400" />
        </span>
        <h3 className="text-[13px] font-medium text-white">{title}</h3>
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

export default CorporateStaff;
