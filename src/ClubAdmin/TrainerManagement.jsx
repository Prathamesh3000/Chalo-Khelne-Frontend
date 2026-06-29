import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { ClubAdminShell } from "../shared/layout";
import SportTrainers from "./SportTrainers";
import StudentsAdmin from "./StudentsAdmin";
import ScheduleAdmin from "./ScheduleAdmin";
import AttendanceView from "./AttendanceView";
import SubstitutesAdmin from "./SubstitutesAdmin";
import SyllabusAdmin from "./SyllabusAdmin";
import ProgressAdmin from "./ProgressAdmin";
import {
  Users, Dumbbell, GraduationCap, Calendar, ClipboardList, UserCheck, BookOpen, TrendingUp,
  UserPlus, Shuffle, Loader2, Trash2, Power, Mail,
} from "lucide-react";

const TABS = [
  { key: "trainers",   label: "Trainers",         icon: Users },
  { key: "sports",     label: "Sports & Trainers", icon: Dumbbell },
  { key: "students",   label: "Students",          icon: GraduationCap },
  { key: "schedule",   label: "Schedule",          icon: Calendar },
  { key: "syllabus",   label: "Syllabus",          icon: BookOpen },
  { key: "progress",   label: "Progress",          icon: TrendingUp },
  { key: "attendance", label: "Attendance",        icon: ClipboardList },
  { key: "substitutes", label: "Substitutes",      icon: UserCheck },
];

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const field = "w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none";

export default function TrainerManagement() {
  const [managers, setManagers] = useState([]);
  const [orgType, setOrgType] = useState("club");
  const [activeTab, setActiveTab] = useState("trainers");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", staffRole: "trainer" });
  const [adding, setAdding] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const clubId = user?._id;

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/manager/club-admin/managers${clubId ? `?clubId=${clubId}` : ""}`);
      setManagers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
    if (clubId) {
      axios.get(`/api/clubadminprofile/${clubId}`)
        .then((r) => {
          const ot = r.data?.clubProfile?.orgType || r.data?.orgType;
          if (ot) setOrgType(ot);
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const trainers = managers.filter((m) => m.staffRole === "trainer" || m.staffRole === "coach");
  const isSchoolOrg = orgType === "school" || orgType === "organization";

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm((f) => ({ ...f, password: p }));
  };

  const addTrainer = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error("All fields are required"); return; }
    setAdding(true);
    try {
      const res = await axios.post("/api/manager/managers", { ...form, clubId });
      toast.success(res.data?.message || "Trainer added.");
      setForm({ name: "", email: "", password: "", staffRole: "trainer" });
      fetchManagers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add trainer");
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await axios.put(`/api/manager/managers/${id}/activate`, { isActive: !isActive });
      fetchManagers();
    } catch { toast.error("Failed to update status"); }
  };

  const removeTrainer = async (id) => {
    if (!window.confirm("Delete this trainer?")) return;
    try {
      await axios.delete(`/api/manager/managers/${id}`);
      fetchManagers();
    } catch { toast.error("Failed to delete trainer"); }
  };

  return (
    <ClubAdminShell searchPlaceholder="Search trainers…">
      {/* Header */}
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
          <Dumbbell className="w-3.5 h-3.5" /> Management · Trainer
        </p>
        <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">Trainer management</h1>
        <p className="mt-1 text-[13px] text-gray-400">
          Trainers & coaches, sport assignments, student rosters, schedule and attendance.
        </p>
      </header>

      {!isSchoolOrg ? (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center">
          <GraduationCap className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-[14px] text-gray-300 font-semibold">Available for schools & organizations</p>
          <p className="text-[13px] text-gray-500 mt-1">This workspace is set as a club. Switch it to a school/organization to use the trainer module.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="inline-flex items-center gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06] mb-5 flex-wrap">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[12px] font-medium transition w-auto ${
                    active ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Trainers tab ── */}
          {activeTab === "trainers" && (
            <div className="space-y-3">
              <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
                <h3 className="text-[14px] font-semibold text-white mb-3 inline-flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-orange-400" /> Add a trainer / coach
                </h3>
                <form onSubmit={addTrainer}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Role</label>
                      <select value={form.staffRole} onChange={(e) => setForm((f) => ({ ...f, staffRole: e.target.value }))} className={field} style={inputStyle}>
                        <option value="trainer">Trainer</option>
                        <option value="coach">Coach</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Name</label>
                      <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" className={field} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Email</label>
                      <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="trainer@example.com" className={field} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Password</label>
                      <div className="flex gap-2">
                        <input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Enter or generate" className={field} style={inputStyle} />
                        <button type="button" onClick={generatePassword} title="Generate password"
                          className="h-9 w-9 flex-shrink-0 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-orange-400 hover:bg-white/[0.06] transition w-auto" style={inputStyle}>
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={adding}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto">
                      {adding ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><UserPlus className="w-3.5 h-3.5" /> Add {form.staffRole}</>}
                    </button>
                  </div>
                </form>
              </div>

              {/* Trainer list */}
              <div className="rounded-xl bg-[#181A22] border border-white/[0.06] overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
                ) : trainers.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-[13px] text-gray-400">No trainers yet. Add one above.</p>
                  </div>
                ) : (
                  trainers.map((t) => (
                    <div key={t._id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-white truncate">{t.name}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-300">{t.staffRole}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[12px] text-gray-500 mt-0.5"><Mail className="w-3 h-3" /> {t.email}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${t.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                          {t.isActive ? "Active" : "Inactive"}
                        </span>
                        <button onClick={() => toggleActive(t._id, t.isActive)} title={t.isActive ? "Deactivate" : "Activate"}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-orange-400 hover:bg-white/[0.06] transition w-auto">
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeTrainer(t._id)} title="Delete"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "sports" && <SportTrainers trainers={trainers} />}
          {activeTab === "students" && <StudentsAdmin />}
          {activeTab === "schedule" && <ScheduleAdmin />}
          {activeTab === "syllabus" && <SyllabusAdmin />}
          {activeTab === "progress" && <ProgressAdmin />}
          {activeTab === "attendance" && <AttendanceView trainers={trainers} />}
          {activeTab === "substitutes" && <SubstitutesAdmin />}
        </>
      )}
    </ClubAdminShell>
  );
}
