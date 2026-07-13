import { useEffect, useState } from "react";
import axios from "axios";
import { Contact, Search, Phone, Mail, MessageCircle, Calendar, CreditCard, DollarSign, Notebook, Trophy, ClipboardCheck, Send } from "lucide-react";

const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
const MSTATUS = {
  Active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Expired: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  None: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};
const EVENT_ICON = {
  membership_purchased: <CreditCard size={12} className="text-blue-300" />,
  booking: <Calendar size={12} className="text-emerald-300" />,
  payment: <DollarSign size={12} className="text-amber-300" />,
  coach_note: <Notebook size={12} className="text-violet-300" />,
  tournament_participation: <Trophy size={12} className="text-fuchsia-300" />,
  attendance: <ClipboardCheck size={12} className="text-cyan-300" />,
};

export default function CRM() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ total: 0, members: 0, lifetimeValue: 0 });
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const { data } = await axios.get("/api/club/customers");
      setCustomers(data.customers || []); setStats(data.stats || stats);
      if (!selId && data.customers?.length) setSelId(data.customers[0]._id);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to load customers"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addNote = async () => {
    if (!note.trim() || !selId) return;
    try {
      const { data } = await axios.patch(`/api/club/customers/${selId}/note`, { note: note.trim() });
      setCustomers((list) => list.map((c) => c._id === selId ? data.customer : c));
      setNote("");
    } catch (e) { setErr(e?.response?.data?.message || "Could not add note"); }
  };

  const visible = customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q.toLowerCase()));
  const sel = customers.find((c) => c._id === selId);
  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">CRM &amp; Customer Timeline</h2>
          <p className="text-gray-500 text-[13px] mt-1">Lifetime player journeys — bookings, memberships, payments and notes.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[["Customers", stats.total, "text-white"], ["Members", stats.members, "text-emerald-300"], ["Lifetime Value", money(stats.lifetimeValue), "text-amber-300"]].map(([l, v, t]) => (
            <div key={l} className="bg-[#12141B] border border-white/[0.06] rounded-xl px-4 py-2.5 min-w-[110px]"><div className={`text-[18px] font-black ${t}`}>{v}</div><div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{l}</div></div>
          ))}
        </div>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : customers.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500"><Contact size={40} className="opacity-30 mx-auto mb-3" /><div className="text-gray-300 font-semibold">No customers yet</div><div className="text-[13px] mt-1">Profiles are created automatically from bookings &amp; memberships.</div></div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.8fr)" }}>
          {/* List */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: "70vh" }}>
            <div className="p-3 border-b border-white/[0.06] relative"><Search size={15} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers" className={`${input} pl-8`} /></div>
            <div className="overflow-y-auto divide-y divide-white/[0.05]">
              {visible.map((c) => (
                <button key={c._id} onClick={() => setSelId(c._id)} className={`w-full text-left px-4 py-3 flex items-center gap-3 ${selId === c._id ? "bg-emerald-600/10 border-l-2 border-emerald-500" : "hover:bg-white/[0.02] border-l-2 border-transparent"}`}>
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center flex-shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-gray-100 truncate">{c.name}</div>
                    <div className="text-[10.5px] text-gray-500 font-mono">Spent {money(c.lifetimeSpending)}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${MSTATUS[c.membershipStatus]}`}>{c.membershipStatus === "Active" ? "Member" : c.membershipStatus === "Expired" ? "Expired" : "Guest"}</span>
                </button>
              ))}
              {visible.length === 0 && <div className="py-8 text-center text-gray-600 text-[12px]">No matches.</div>}
            </div>
          </div>

          {/* Detail */}
          {sel && (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5 flex flex-col" style={{ maxHeight: "70vh" }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2"><h3 className="text-[18px] font-black text-white">{sel.name}</h3><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${MSTATUS[sel.membershipStatus]}`}>{sel.membershipStatus === "Active" ? "Active Member" : sel.membershipStatus === "Expired" ? "Expired" : "Guest Player"}</span></div>
                  <div className="text-[12px] text-gray-500 mt-1">{sel.phone || "—"} · {sel.email || "—"}{sel.favoriteSports?.length ? ` · ${sel.favoriteSports.join(", ")}` : ""}</div>
                </div>
                <div className="flex gap-1.5">
                  <a href={sel.phone ? `tel:${sel.phone}` : undefined} className="w-8 h-8 rounded-lg bg-[#12141B] border border-white/[0.1] flex items-center justify-center text-emerald-300 hover:border-emerald-500/40" title="Call"><Phone size={14} /></a>
                  <a href={sel.phone ? `https://wa.me/${sel.phone.replace(/[^0-9]/g, "")}` : undefined} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-[#12141B] border border-white/[0.1] flex items-center justify-center text-emerald-300 hover:border-emerald-500/40" title="WhatsApp"><MessageCircle size={14} /></a>
                  <a href={sel.email ? `mailto:${sel.email}` : undefined} className="w-8 h-8 rounded-lg bg-[#12141B] border border-white/[0.1] flex items-center justify-center text-blue-300 hover:border-blue-500/40" title="Email"><Mail size={14} /></a>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                {[["Lifetime", money(sel.lifetimeSpending)], ["Visits", sel.totalVisits], ["Bookings", sel.totalBookings]].map(([l, v]) => (
                  <div key={l} className="bg-[#12141B] border border-white/[0.06] rounded-xl px-3.5 py-2 flex-1"><div className="text-[15px] font-black text-gray-100">{v}</div><div className="text-[10px] font-bold text-gray-500 uppercase">{l}</div></div>
                ))}
              </div>

              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-5 mb-2">Journey Timeline</div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {(sel.timeline || []).length === 0 ? <div className="text-gray-600 text-[12px] py-6 text-center">No activity yet.</div> : sel.timeline.map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#12141B] border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">{EVENT_ICON[e.type] || <Calendar size={12} className="text-gray-400" />}</div>
                    <div className="min-w-0 flex-1 pb-2 border-b border-white/[0.04]">
                      <div className="flex items-center justify-between gap-2"><span className="text-[12.5px] font-semibold text-gray-200">{e.title || e.type}</span><span className="text-[10px] text-gray-600 font-mono flex-shrink-0">{e.date}{e.time ? ` ${e.time}` : ""}</span></div>
                      {e.description && <div className="text-[11.5px] text-gray-500 mt-0.5">{e.description}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.06] flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Append timeline note…" className={input} />
                <button onClick={addNote} disabled={!note.trim()} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[12.5px] px-4 rounded-lg w-auto whitespace-nowrap"><Send size={13} /> Add</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
