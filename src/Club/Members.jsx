import { useEffect, useState } from "react";
import axios from "axios";
import { Users, Search, Plus, X, RefreshCw, Ban, ArrowUpCircle, Undo2, Trash2, CreditCard, Check } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
const STATUS_BADGE = {
  Active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Expired: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  Pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Blocked: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};
const VALIDITY = ["Monthly", "Quarterly", "Yearly"];

export default function Members() {
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, pending: 0, blocked: 0 });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addPkgOpen, setAddPkgOpen] = useState(false);
  const [manage, setManage] = useState(null); // member being managed

  const blankMember = { name: "", phone: "", email: "", gender: "Male", dob: "", packageId: "", emergencyContact: { name: "", phone: "" } };
  const blankPkg = { name: "", price: 150, validity: "Monthly", bookingLimit: "Unlimited Access", guestAccess: true, benefits: "" };
  const [mForm, setMForm] = useState(blankMember);
  const [pForm, setPForm] = useState(blankPkg);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [mm, pp] = await Promise.all([axios.get("/api/club/members"), axios.get("/api/club/packages")]);
      setMembers(mm.data.members || []); setStats(mm.data.stats || stats); setPackages(pp.data.packages || []);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const refresh = (updatedMember) => { if (updatedMember) setMembers((list) => list.map((m) => m._id === updatedMember._id ? updatedMember : m)); load(); };

  const addMember = async (e) => {
    e.preventDefault();
    if (!mForm.name.trim()) { setErr("Member name is required"); return; }
    try { await axios.post("/api/club/members", mForm); setMForm(blankMember); setAddMemberOpen(false); load(); }
    catch (e) { setErr(e?.response?.data?.message || "Could not add member"); }
  };
  const addPkg = async (e) => {
    e.preventDefault();
    if (!pForm.name.trim()) { setErr("Package name is required"); return; }
    try { await axios.post("/api/club/packages", { ...pForm, price: Number(pForm.price) || 0, benefits: pForm.benefits.split(",").map((b) => b.trim()).filter(Boolean) }); setPForm(blankPkg); setAddPkgOpen(false); load(); }
    catch (e) { setErr(e?.response?.data?.message || "Could not add package"); }
  };
  const memberAction = async (member, verb, body) => {
    try { const { data } = await axios.patch(`/api/club/members/${member._id}/${verb}`, body || {}); refresh(data.member); }
    catch (e) { setErr(e?.response?.data?.message || "Action failed"); }
  };
  const delMember = async (m) => { setMembers((l) => l.filter((x) => x._id !== m._id)); try { await axios.delete(`/api/club/members/${m._id}`); load(); } catch { load(); } };
  const delPkg = async (p) => { setPackages((l) => l.filter((x) => x._id !== p._id)); try { await axios.delete(`/api/club/packages/${p._id}`); } catch { load(); } };

  const visible = members.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || (m.phone || "").includes(q));
  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";
  const iconBtn = "p-1.5 rounded-lg border border-white/[0.1] w-auto bg-transparent";

  return (
    <div className="space-y-5">
      {/* Header + tabs */}
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Members &amp; Packages</h2>
          <p className="text-gray-500 text-[13px] mt-1">Enroll members, manage subscription lifecycles, and configure plans.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#12141B] border border-white/[0.1] rounded-xl p-1">
            {["members", "packages"].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-lg capitalize w-auto ${tab === t ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}>{t}</button>
            ))}
          </div>
          {tab === "members"
            ? <button onClick={() => setAddMemberOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Member</button>
            : <button onClick={() => setAddPkgOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Package</button>}
        </div>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {tab === "members" ? (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-3 flex-wrap">
              {[["Total", stats.total, "text-white"], ["Active", stats.active, "text-emerald-300"], ["Expired", stats.expired, "text-gray-400"], ["Pending", stats.pending, "text-amber-300"], ["Blocked", stats.blocked, "text-rose-300"]].map(([l, v, t]) => (
                <div key={l} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-2.5 min-w-[100px]"><div className={`text-[18px] font-black ${t}`}>{v}</div><div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{l}</div></div>
              ))}
            </div>
            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / phone" className={`${input} pl-9 min-w-[220px]`} /></div>
          </div>

          {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : visible.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500"><Users size={40} className="opacity-30 mx-auto mb-3" /><div className="text-gray-300 font-semibold">No members</div><div className="text-[13px] mt-1">Enroll your first member.</div></div>
          ) : (
            <div className="space-y-2.5">
              {visible.map((m) => (
                <div key={m._id} className="group bg-[#181A22] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center flex-shrink-0">{m.name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap"><span className="text-[14px] font-bold text-white">{m.name}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[m.status]}`}>{m.status}</span></div>
                    <div className="text-[12px] text-gray-500 mt-0.5">{m.packageName || "No plan"} · {m.phone || "—"} · Lifetime {money(m.lifetimeSpending)}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => memberAction(m, "renew")} title="Renew" className={`${iconBtn} text-emerald-300 hover:bg-emerald-500/10`}><RefreshCw size={14} /></button>
                    <button onClick={() => setManage(m)} title="Manage / Upgrade / Refund" className={`${iconBtn} text-blue-300 hover:bg-blue-500/10`}><ArrowUpCircle size={14} /></button>
                    <button onClick={() => memberAction(m, "toggle-block")} title={m.status === "Blocked" ? "Unblock" : "Block"} className={`${iconBtn} ${m.status === "Blocked" ? "text-emerald-300" : "text-rose-300"} hover:bg-white/[0.05]`}>{m.status === "Blocked" ? <Undo2 size={14} /> : <Ban size={14} />}</button>
                    <button onClick={() => delMember(m)} title="Delete" className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1.5 w-auto bg-transparent"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : packages.length === 0 ? (
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500"><CreditCard size={40} className="opacity-30 mx-auto mb-3" /><div className="text-gray-300 font-semibold">No packages</div><div className="text-[13px] mt-1">Create a membership plan.</div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((p) => (
              <div key={p._id} className="group bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div><h4 className="text-[15px] font-bold text-white">{p.name}</h4><span className="text-[11px] text-gray-500 font-mono uppercase">{p.validity}</span></div>
                  <button onClick={() => delPkg(p)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={14} /></button>
                </div>
                <div className="text-[26px] font-black text-emerald-300 mt-2">{money(p.price)}<span className="text-[12px] text-gray-500 font-normal"> / {p.validity.toLowerCase()}</span></div>
                <div className="mt-3 space-y-1 text-[12.5px] text-gray-400">
                  <div>• {p.bookingLimit}</div>
                  <div>• Guest access: {p.guestAccess ? "Yes" : "No"}</div>
                  {(p.benefits || []).map((b, i) => <div key={i} className="flex items-center gap-1.5"><Check size={12} className="text-emerald-400" /> {b}</div>)}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Member modal */}
      {addMemberOpen && (
        <Modal title="Enroll New Member" tag="Membership" onClose={() => setAddMemberOpen(false)}>
          <form onSubmit={addMember} className="p-5 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="name">Name *</label><input id="name" className={input} value={mForm.name} onChange={(e) => setMForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div><label className={label} htmlFor="phone">Phone</label><input id="phone" className={input} value={mForm.phone} onChange={(e) => setMForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="email">Email</label><input id="email" className={input} value={mForm.email} onChange={(e) => setMForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div><label className={label} htmlFor="gender">Gender</label><select id="gender" className={input} value={mForm.gender} onChange={(e) => setMForm((f) => ({ ...f, gender: e.target.value }))}>{["Male", "Female", "Other"].map((g) => <option key={g} className="bg-[#181A22]">{g}</option>)}</select></div>
            </div>
            <div><label className={label} htmlFor="package">Package</label><select id="package" className={input} value={mForm.packageId} onChange={(e) => setMForm((f) => ({ ...f, packageId: e.target.value }))}><option value="" className="bg-[#181A22]">No plan (enroll only)</option>{packages.map((p) => <option key={p._id} value={p._id} className="bg-[#181A22]">{p.name} — {money(p.price)}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="emergency-contact">Emergency Contact</label><input id="emergency-contact" className={input} value={mForm.emergencyContact.name} onChange={(e) => setMForm((f) => ({ ...f, emergencyContact: { ...f.emergencyContact, name: e.target.value } }))} placeholder="Name" /></div>
              <div><label className={label} htmlFor="nbsp">&nbsp;</label><input id="nbsp" className={input} value={mForm.emergencyContact.phone} onChange={(e) => setMForm((f) => ({ ...f, emergencyContact: { ...f.emergencyContact, phone: e.target.value } }))} placeholder="Phone" /></div>
            </div>
            {mForm.packageId && <div className="text-[12px] text-gray-500">Plan fee <span className="text-emerald-300 font-bold">{money(packages.find((p) => p._id === mForm.packageId)?.price)}</span> will be posted to finance.</div>}
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Enroll Member</button>
          </form>
        </Modal>
      )}

      {/* Add Package modal */}
      {addPkgOpen && (
        <Modal title="New Membership Package" tag="Plans" onClose={() => setAddPkgOpen(false)}>
          <form onSubmit={addPkg} className="p-5 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="name-1">Name *</label><input id="name-1" className={input} value={pForm.name} onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))} placeholder="Gold Annual" required /></div>
              <div><label className={label} htmlFor="price">Price (₹)</label><input id="price" className={input} type="number" min="0" value={pForm.price} onChange={(e) => setPForm((f) => ({ ...f, price: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="validity">Validity</label><select id="validity" className={input} value={pForm.validity} onChange={(e) => setPForm((f) => ({ ...f, validity: e.target.value }))}>{VALIDITY.map((v) => <option key={v} className="bg-[#181A22]">{v}</option>)}</select></div>
              <div><label className={label} htmlFor="booking-limit">Booking Limit</label><input id="booking-limit" className={input} value={pForm.bookingLimit} onChange={(e) => setPForm((f) => ({ ...f, bookingLimit: e.target.value }))} /></div>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-gray-300"><input type="checkbox" checked={pForm.guestAccess} onChange={(e) => setPForm((f) => ({ ...f, guestAccess: e.target.checked }))} className="w-auto accent-emerald-500" /> Guest access included</label>
            <div><label className={label} htmlFor="benefits-comma-separated">Benefits (comma-separated)</label><input id="benefits-comma-separated" className={input} value={pForm.benefits} onChange={(e) => setPForm((f) => ({ ...f, benefits: e.target.value }))} placeholder="Free racket, Priority booking" /></div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Save Package</button>
          </form>
        </Modal>
      )}

      {/* Manage plan modal */}
      {manage && <ManageModal member={manage} packages={packages} onClose={() => setManage(null)} onAction={memberAction} />}
    </div>
  );
}

function ManageModal({ member, packages, onClose, onAction }) {
  const [pkgId, setPkgId] = useState(member.packageId || "");
  const [amount, setAmount] = useState(0);
  const [refund, setRefund] = useState(0);
  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";
  const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
  const run = async (verb, body) => { await onAction(member, verb, body); onClose(); };
  return (
    <Modal title={`Manage — ${member.name}`} tag="Lifecycle" onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="bg-[#12141B] border border-white/[0.08] rounded-xl p-3.5 text-[12.5px] text-gray-400">Current: <span className="text-gray-200 font-semibold">{member.packageName || "No plan"}</span> · {member.status} · Lifetime {money(member.lifetimeSpending)}</div>
        {/* Upgrade / change plan */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Change / Upgrade Plan</div>
          <div className="grid grid-cols-2 gap-3">
            <select className={input} value={pkgId} onChange={(e) => setPkgId(e.target.value)}><option value="" className="bg-[#181A22]">Select plan…</option>{packages.map((p) => <option key={p._id} value={p._id} className="bg-[#181A22]">{p.name} — {money(p.price)}</option>)}</select>
            <input className={input} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Charge amount" />
          </div>
          <button disabled={!pkgId} onClick={() => run("upgrade", { packageId: pkgId, customAmount: Number(amount) })} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[12.5px] py-2 rounded-lg">Apply Plan Change</button>
        </div>
        {/* Refund */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Refund &amp; Expire</div>
          <div className="grid grid-cols-2 gap-3">
            <input className={input} type="number" min="0" value={refund} onChange={(e) => setRefund(e.target.value)} placeholder="Refund amount" />
            <button onClick={() => run("refund", { amount: Number(refund) })} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[12.5px] py-2 rounded-lg">Refund &amp; Expire</button>
          </div>
        </div>
        <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
          <button onClick={() => run("renew")} className="flex-1 border border-white/[0.12] text-gray-300 hover:bg-white/[0.05] font-bold text-[12.5px] py-2 rounded-lg">Renew</button>
          <button onClick={() => run("expire")} className="flex-1 border border-white/[0.12] text-gray-300 hover:bg-white/[0.05] font-bold text-[12.5px] py-2 rounded-lg">Expire</button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, tag, onClose, children }) {
  return (
    <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <DialogA11y onClose={onClose} />
      <div onClick={(e) => e.stopPropagation()} className="bg-[#181A22] rounded-2xl max-w-md w-full overflow-hidden border border-white/[0.1] shadow-2xl">
        <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#0a0d14]">
          <div><span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">{tag}</span><h3 className="text-[17px] font-bold text-white mt-0.5">{title}</h3></div>
          <button onClick={onClose} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
