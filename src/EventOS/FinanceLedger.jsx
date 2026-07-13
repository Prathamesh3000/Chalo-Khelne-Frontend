import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DollarSign, Trash2 } from "lucide-react";

const CATEGORIES = ["Sponsorship", "Registrations", "Prize Money", "Venue Rental", "Staff Payout", "Marketing", "Equipment", "Logistics", "Other"];
const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function FinanceLedger() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ projectedGrossRevenue: 0, realizedReceivedCash: 0, totalExpenditures: 0, operatingProfit: 0 });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ direction: "income", category: "Sponsorship", details: "", amount: "", status: "Paid" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/agency-events");
        const list = data.events || [];
        setEvents(list);
        if (list.length) setSel(list[0]._id);
      } catch (e) { setErr(e?.response?.data?.message || "Failed to load events"); }
      finally { setLoadingEvents(false); }
    })();
  }, []);

  const load = async (id) => {
    setLoadingRows(true); setErr("");
    try {
      const { data } = await axios.get(`/api/agency-events/${id}/finance`);
      setItems(data.items || []);
      setSummary(data.summary || summary);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to load ledger"); }
    finally { setLoadingRows(false); }
  };
  useEffect(() => { if (sel) load(sel); }, [sel]);

  const post = async () => {
    if (!(Number(form.amount) > 0)) { setErr("Enter an amount greater than 0"); return; }
    setPosting(true); setErr("");
    try {
      const { data } = await axios.post(`/api/agency-events/${sel}/finance`, { ...form, amount: Number(form.amount) });
      setItems((it) => [data.item, ...it]);
      setSummary(data.summary);
      setForm((f) => ({ ...f, details: "", amount: "" }));
    } catch (e) { setErr(e?.response?.data?.message || "Could not post entry"); }
    finally { setPosting(false); }
  };
  const del = async (item) => {
    try {
      const { data } = await axios.delete(`/api/agency-events/${sel}/finance/${item._id}`);
      setItems((list) => list.filter((x) => x._id !== item._id));
      setSummary(data.summary);
    } catch (e) { setErr(e?.response?.data?.message || "Could not delete entry"); }
  };

  const input = "bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><DollarSign size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Finance Ledger</h1>
            <p className="text-gray-500 text-[13px]">Post income & expense lines and track the event's operating profit.</p>
          </div>
        </div>
        {events.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active workspace</span>
            <select value={sel} onChange={(e) => setSel(e.target.value)}
              className="bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-white/25 min-w-[240px]">
              {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-[#181A22]">{ev.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{err}</div>}

      {loadingEvents ? (
        <div className="text-gray-500 py-10 text-center">Loading…</div>
      ) : events.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500">
          <DollarSign size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button>.</div>
        </div>
      ) : (
        <>
          {/* Post Financial Entry Line */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4 mb-5">
            <h2 className="text-[14px] font-bold text-white mb-3">Post Financial Entry Line</h2>
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "180px 200px 1fr 140px" }}>
              <select className={input} value={form.direction} onChange={(e) => set("direction", e.target.value)}>
                <option value="income" className="bg-[#181A22]">Income (+)</option>
                <option value="expense" className="bg-[#181A22]">Expense (−)</option>
              </select>
              <select className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#181A22]">{c}</option>)}
              </select>
              <input className={input} value={form.details} onChange={(e) => set("details", e.target.value)} placeholder="Details e.g. Winner Cash Prize payout" />
              <input className={input} value={form.amount} onChange={(e) => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="1000" inputMode="decimal" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[12.5px] text-gray-400">
                <span>Status</span>
                <select className={`${input} py-1.5`} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="Paid" className="bg-[#181A22]">Paid</option>
                  <option value="Pending" className="bg-[#181A22]">Pending</option>
                </select>
              </label>
              <button onClick={post} disabled={posting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg disabled:opacity-60">
                {posting ? "Posting…" : "Post Finance Node"}
              </button>
            </div>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)" }}>
            {/* Income & Expense Logs */}
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]"><h2 className="text-[14px] font-bold text-white">Income & Expense Logs</h2></div>
              {loadingRows ? (
                <div className="text-gray-500 py-10 text-center">Loading…</div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-[13px]">No entries yet. Post one above.</div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {items.map((i) => {
                    const income = i.direction === "income";
                    return (
                      <div key={i._id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02]">
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-bold text-white truncate">{i.details || i.category}</div>
                          <div className="text-[11.5px] text-gray-500 mt-0.5 font-mono">{fmtDate(i.date)} • {i.category}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-[14px] font-black ${income ? "text-emerald-400" : "text-rose-400"}`}>{income ? "+" : "−"}{money(i.amount)}</div>
                          <div className={`text-[11px] font-semibold ${i.status === "Paid" ? "text-gray-400" : "text-amber-400"}`}>{i.status}</div>
                        </div>
                        <button onClick={() => del(i)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent flex-shrink-0"><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Balance Sheet Statement */}
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5 self-start">
              <h2 className="text-[14px] font-bold text-white mb-4">Balance Sheet Statement</h2>
              <div className="space-y-3 text-[13px]">
                <Row label="Projected Gross Revenue" value={money(summary.projectedGrossRevenue)} tone="text-gray-200" />
                <Row label="Realized Received Cash" value={money(summary.realizedReceivedCash)} tone="text-emerald-400" />
                <Row label="Total Expenditures" value={money(summary.totalExpenditures)} tone="text-rose-400" />
              </div>
              <div className="border-t border-white/[0.08] mt-4 pt-4 flex items-center justify-between">
                <span className="text-[15px] font-black text-white">Operating Profit</span>
                <span className={`text-[18px] font-black ${summary.operatingProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{money(summary.operatingProfit)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}:</span>
      <span className={`font-bold ${tone}`}>{value}</span>
    </div>
  );
}
