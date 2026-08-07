import { useEffect, useState } from "react";
import axios from "axios";
import { Send, MessageSquare, PhoneCall, Mail, Smartphone, Trash2, ShieldCheck } from "lucide-react";

const CHANNELS = [
  { id: "WhatsApp", label: "WhatsApp", icon: MessageSquare, tone: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" },
  { id: "SMS", label: "SMS", icon: PhoneCall, tone: "text-blue-300 border-blue-500/40 bg-blue-500/10" },
  { id: "Email", label: "Email", icon: Mail, tone: "text-amber-300 border-amber-500/40 bg-amber-500/10" },
  { id: "Push", label: "Mobile Push", icon: Smartphone, tone: "text-violet-300 border-violet-500/40 bg-violet-500/10" },
];
const AUDIENCES = ["Members", "Coaches", "Staff", "Tournament Players"];
const STATUS_BADGE = { Queued: "bg-amber-500/15 text-amber-300 border-amber-500/30", Sent: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", Failed: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
const fmt = (d) => (d ? new Date(d).toLocaleString() : "");

export default function Communication() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const blank = { channel: "WhatsApp", audience: "Members", subject: "", text: "" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get("/api/club/broadcasts"); setHistory(data.broadcasts || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load history"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) { setErr("Message body is required"); return; }
    if (form.channel === "Email" && !form.subject.trim()) { setErr("Email subject is required"); return; }
    setSending(true); setErr("");
    try { const { data } = await axios.post("/api/club/broadcasts", form); setHistory((h) => [data.broadcast, ...h]); setForm({ ...blank, channel: form.channel, audience: form.audience }); }
    catch (e) { setErr(e?.response?.data?.message || "Could not send broadcast"); }
    finally { setSending(false); }
  };
  const del = async (b) => { setHistory((h) => h.filter((x) => x._id !== b._id)); try { await axios.delete(`/api/club/broadcasts/${b._id}`); } catch { load(); } };

  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06]">
        <h2 className="text-[20px] font-black text-white tracking-tight">Communication &amp; Broadcasts</h2>
        <p className="text-gray-500 text-[13px] mt-1">Compose broadcast announcements and target audience cohorts.</p>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)" }}>
        {/* Compose */}
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><Send size={16} className="text-emerald-300" /><h3 className="text-[14px] font-bold text-white">Compose Broadcast</h3></div>
          <form onSubmit={send} className="space-y-4">
            <div>
              <label className={label}>Delivery Channel</label>
              <div className="grid grid-cols-2 gap-2">
                {CHANNELS.map((ch) => {
                  const Icon = ch.icon; const on = form.channel === ch.id;
                  return <button type="button" key={ch.id} onClick={() => set("channel", ch.id)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[12.5px] font-semibold w-auto ${on ? ch.tone : "bg-[#12141B] border-white/[0.08] text-gray-400 hover:text-white"}`}><Icon size={15} /> {ch.label}</button>;
                })}
              </div>
            </div>
            <div>
              <label className={label}>Target Audience</label>
              <select className={input} value={form.audience} onChange={(e) => set("audience", e.target.value)}>{AUDIENCES.map((a) => <option key={a} value={a} className="bg-[#181A22]">{a}</option>)}</select>
            </div>
            {form.channel === "Email" && <div><label className={label}>Email Subject *</label><input className={input} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Subject line" /></div>}
            <div><label className={label}>Announcement Body *</label><textarea className={`${input} resize-none`} rows={4} value={form.text} onChange={(e) => set("text", e.target.value)} placeholder="Write your announcement…" /></div>
            <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-[13px] py-2.5 rounded-lg"><Send size={13} /> {sending ? "Dispatching…" : "Broadcast Announcement"}</button>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><ShieldCheck size={12} className="text-emerald-400" /> Logged &amp; queued. External delivery relay activates once a provider is connected.</div>
          </form>
        </div>

        {/* History */}
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: "70vh" }}>
          <div className="px-5 py-4 border-b border-white/[0.06]"><h3 className="text-[14px] font-bold text-white">Dispatch History</h3></div>
          {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : history.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-[13px]">No broadcasts yet.</div>
          ) : (
            <div className="overflow-y-auto divide-y divide-white/[0.05]">
              {history.map((b) => (
                <div key={b._id} className="group px-5 py-3.5 hover:bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-mono">{fmt(b.createdAt)}</span>
                      <button onClick={() => del(b)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {b.subject && <div className="text-[12.5px] font-semibold text-gray-200">{b.subject}</div>}
                  <div className="text-[12.5px] text-gray-400">{b.text}</div>
                  <div className="text-[10.5px] text-gray-500 font-mono mt-1">{b.channel} · {b.audience} · {b.recipientCount} recipients</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
