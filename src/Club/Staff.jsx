import { useEffect, useState } from "react";
import axios from "axios";
import { Briefcase, Plus, X, Trash2, Check, RotateCcw } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const ROLES = ["Manager", "Reception", "Ground Staff", "Scorer", "Cameraman", "Referee Coordinator", "Security", "Cleaner"];
const SHIFTS = ["Morning", "Evening", "Night", "Full Day"];
const PERMS = ["bookings", "membership", "finance", "reports", "maintenance", "courtStatus", "payments", "sessions"];
const PERM_LABEL = { bookings: "Bookings", membership: "Membership", finance: "Finance", reports: "Reports", maintenance: "Maintenance", courtStatus: "Court Status", payments: "Payments", sessions: "Sessions" };
const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
const ATT_ON = { Present: "bg-emerald-600 text-white", Absent: "bg-rose-600 text-white" };

// Mirror of the backend role-default matrix (for reset-to-defaults).
const roleDefaults = (role) => ({
  bookings: ["Manager", "Reception", "Referee Coordinator"].includes(role),
  membership: ["Manager", "Reception"].includes(role),
  finance: role === "Manager",
  reports: role === "Manager",
  maintenance: ["Manager", "Ground Staff"].includes(role),
  courtStatus: ["Manager", "Reception", "Ground Staff"].includes(role),
  payments: ["Manager", "Reception"].includes(role),
  sessions: ["Manager", "Referee Coordinator"].includes(role),
});

export default function Staff() {
  const [tab, setTab] = useState("roster");
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState({ total: 0, onDuty: 0, payroll: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const blank = { name: "", role: "Reception", phone: "", email: "", shift: "Morning", salary: 650 };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get("/api/club/staff"); setStaff(data.staff || []); setStats(data.stats || stats); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load staff"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = (s) => setStaff((l) => l.map((x) => x._id === s._id ? s : x));
  const addStaff = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Staff name is required"); return; }
    try { const { data } = await axios.post("/api/club/staff", { ...form, salary: Number(form.salary) || 0 }); setStaff((s) => [...s, data.staff]); setStats((st) => ({ ...st, total: st.total + 1, onDuty: st.onDuty + 1, payroll: st.payroll + (Number(form.salary) || 0) })); setForm(blank); setAddOpen(false); }
    catch (e) { setErr(e?.response?.data?.message || "Could not add staff"); }
  };
  const setAtt = async (s, attendanceToday) => { try { const { data } = await axios.patch(`/api/club/staff/${s._id}/attendance`, { attendanceToday }); patch(data.staff); load(); } catch (e) { setErr(e?.response?.data?.message || "Failed"); } };
  const savePerms = async (s, permissions) => { try { const { data } = await axios.patch(`/api/club/staff/${s._id}/permissions`, { permissions }); patch(data.staff); } catch (e) { setErr(e?.response?.data?.message || "Failed"); } };
  const togglePerm = (s, key) => savePerms(s, { ...s.permissions, [key]: !s.permissions?.[key] });
  const del = async (s) => { setStaff((l) => l.filter((x) => x._id !== s._id)); try { await axios.delete(`/api/club/staff/${s._id}`); load(); } catch { load(); } };

  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Staff &amp; Roles</h2>
          <p className="text-gray-500 text-[13px] mt-1">Shift crew, salaries, attendance, and access permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#12141B] border border-white/[0.1] rounded-xl p-1">
            {[["roster", "Roster"], ["matrix", "Permissions"]].map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-lg w-auto ${tab === t ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}>{l}</button>)}
          </div>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Staff</button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {[["Staff", stats.total, "text-white"], ["On Duty", stats.onDuty, "text-emerald-300"], ["Monthly Payroll", money(stats.payroll), "text-amber-300"]].map(([l, v, t]) => (
          <div key={l} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[130px]"><div className={`text-[20px] font-black ${t}`}>{v}</div><div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{l}</div></div>
        ))}
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : staff.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500"><Briefcase size={40} className="opacity-30 mx-auto mb-3" /><div className="text-gray-300 font-semibold">No staff</div><div className="text-[13px] mt-1">Hire your first team member.</div></div>
      ) : tab === "roster" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <div key={s._id} className="group bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center">{s.name.charAt(0).toUpperCase()}</div>
                  <div><div className="text-[14px] font-bold text-white">{s.name}</div><div className="text-[11px] text-gray-500">{s.role}</div></div>
                </div>
                <button onClick={() => del(s)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={14} /></button>
              </div>
              <div className="mt-3 text-[12px] text-gray-500 space-y-1">
                <div>Shift: <span className="text-gray-300">{s.shift}</span> · Salary: <span className="text-gray-300">{money(s.salary)}</span></div>
                <div>{s.phone || "—"} {s.email ? `· ${s.email}` : ""}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.05]">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1.5">Attendance</div>
                <div className="flex gap-1.5">
                  {["Present", "Absent"].map((a) => <button key={a} onClick={() => setAtt(s, a)} className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg w-auto ${s.attendanceToday === a ? ATT_ON[a] : "bg-[#12141B] border border-white/[0.08] text-gray-400 hover:text-white"}`}>{a}</button>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase sticky left-0 bg-[#1c1f28]">Staff</th>
                  {PERMS.map((p) => <th key={p} className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center whitespace-nowrap">{PERM_LABEL[p]}</th>)}
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s._id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 sticky left-0 bg-[#181A22]"><div className="text-[13px] font-bold text-white">{s.name}</div><div className="text-[10px] text-gray-500">{s.role}</div></td>
                    {PERMS.map((p) => (
                      <td key={p} className="px-3 py-3 text-center">
                        <button onClick={() => togglePerm(s, p)} className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto w-auto ${s.permissions?.[p] ? "bg-emerald-600 text-white" : "bg-[#12141B] border border-white/[0.1] text-transparent hover:border-white/25"}`}>{s.permissions?.[p] && <Check size={13} />}</button>
                      </td>
                    ))}
                    <td className="px-3 py-3"><button onClick={() => savePerms(s, roleDefaults(s.role))} title="Reset to role defaults" className="text-gray-500 hover:text-emerald-300 w-auto bg-transparent"><RotateCcw size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addOpen && (
        <div
        role="dialog"
        aria-modal="true"
        onClick={() => setAddOpen(false)}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <DialogA11y onClose={() => setAddOpen(false)} />
          <div onClick={(e) => e.stopPropagation()} className="bg-[#181A22] rounded-2xl max-w-md w-full overflow-hidden border border-white/[0.1] shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#0a0d14]">
              <div><span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">Roster</span><h3 className="text-[17px] font-bold text-white mt-0.5">Add Staff</h3></div>
              <button onClick={() => setAddOpen(false)} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
            </div>
            <form onSubmit={addStaff} className="p-5 space-y-3.5">
              <div><label className={label} htmlFor="name">Name *</label><input id="name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="role">Role</label><select id="role" className={input} value={form.role} onChange={(e) => set("role", e.target.value)}>{ROLES.map((r) => <option key={r} value={r} className="bg-[#181A22]">{r}</option>)}</select></div>
                <div><label className={label} htmlFor="shift">Shift</label><select id="shift" className={input} value={form.shift} onChange={(e) => set("shift", e.target.value)}>{SHIFTS.map((s) => <option key={s} value={s} className="bg-[#181A22]">{s}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="phone">Phone</label><input id="phone" className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div><label className={label} htmlFor="salary">Salary (₹)</label><input id="salary" className={input} type="number" min="0" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></div>
              </div>
              <div><label className={label} htmlFor="email">Email</label><input id="email" className={input} value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div className="text-[11px] text-gray-500">Default permissions for <span className="text-emerald-300 font-semibold">{form.role}</span> will be applied (editable in the Permissions tab).</div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Add Staff</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
