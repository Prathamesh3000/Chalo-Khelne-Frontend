import { useEffect, useState } from "react";
import axios from "axios";
import { DollarSign, Plus, X, TrendingUp, TrendingDown, Wallet, Receipt, Coffee, Trash2, Minus } from "lucide-react";

const CATEGORIES = ["Court Booking", "Membership", "Tournament Fee", "Equipment Rental", "POS Cafe", "Staff Salary", "Maintenance", "Utility Bill", "Refund", "Other"];
const METHODS = ["UPI", "Card", "Cash", "NetBanking"];
const CAFE_MENU = [
  { name: "Water Bottle", price: 20 }, { name: "Energy Drink", price: 60 }, { name: "Protein Bar", price: 80 },
  { name: "Coffee", price: 50 }, { name: "Sandwich", price: 120 }, { name: "Sports Towel", price: 150 },
];
const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const CAT_INCOME = new Set(["Court Booking", "Membership", "Tournament Fee", "Equipment Rental", "POS Cafe"]);

export default function Finance() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0, gstCollected: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("All"); // All | Income | Expense
  const [addOpen, setAddOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const blank = { type: "Income", category: "Court Booking", amount: 100, paymentMethod: "UPI", description: "" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get("/api/club/finance"); setItems(data.items || []); setSummary(data.summary || summary); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load ledger"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const post = async (body) => {
    setPosting(true); setErr("");
    try { const { data } = await axios.post("/api/club/finance", body); setItems((it) => [data.item, ...it]); setSummary(data.summary); return true; }
    catch (e) { setErr(e?.response?.data?.message || "Could not post entry"); return false; }
    finally { setPosting(false); }
  };
  const addEntry = async (e) => {
    e.preventDefault();
    if (!(Number(form.amount) > 0)) { setErr("Amount must be greater than 0"); return; }
    if (await post({ ...form, amount: Number(form.amount) })) { setForm(blank); setAddOpen(false); }
  };

  const visible = items.filter((i) => filter === "All" || i.type === filter);
  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Finance, GST Ledger &amp; POS</h2>
          <p className="text-gray-500 text-[13px] mt-1">Reconcile revenues, run café POS, track GST, and audit payroll overheads.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setPosOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Coffee size={14} /> POS Café</button>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Entry</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Total Income", money(summary.totalIncome), "text-emerald-300", <TrendingUp size={16} key="i" />],
          ["Total Expense", money(summary.totalExpense), "text-rose-300", <TrendingDown size={16} key="e" />],
          ["Net Profit", money(summary.netProfit), summary.netProfit >= 0 ? "text-emerald-300" : "text-rose-300", <Wallet size={16} key="p" />],
          ["GST Collected", money(summary.gstCollected), "text-amber-300", <Receipt size={16} key="g" />],
        ].map(([l, v, t, ic]) => (
          <div key={l} className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{l}</span><span className="text-gray-500">{ic}</span></div>
            <div className={`text-[22px] font-black mt-2 ${t}`}>{v}</div>
          </div>
        ))}
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {/* Ledger */}
      <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-white">Income &amp; Expense Ledger</h3>
          <div className="flex bg-[#12141B] border border-white/[0.1] rounded-lg p-0.5">
            {["All", "Income", "Expense"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`text-[11.5px] font-semibold px-3 py-1 rounded-md w-auto ${filter === f ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}>{f}</button>)}
          </div>
        </div>
        {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : visible.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-[13px]">No entries yet. Post one, or they arrive automatically from bookings, memberships and rentals.</div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {visible.map((i) => {
              const income = i.type === "Income";
              return (
                <div key={i._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${income ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{income ? <TrendingUp size={15} /> : <TrendingDown size={15} />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-gray-100 truncate">{i.description || i.category}</div>
                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">{fmtDate(i.date)} · {i.category} · {i.paymentMethod}{i.referenceId ? ` · ${i.referenceId}` : ""}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-[14px] font-black ${income ? "text-emerald-400" : "text-rose-400"}`}>{income ? "+" : "−"}{money(i.amount)}</div>
                    {i.gstAmount > 0 && <div className="text-[10px] text-amber-400/80 font-mono">GST {money(i.gstAmount)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Entry modal */}
      {addOpen && (
        <Modal title="Record Journal Entry" onClose={() => setAddOpen(false)}>
          <form onSubmit={addEntry} className="p-5 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Type</label><select className={input} value={form.type} onChange={(e) => set("type", e.target.value)}><option value="Income" className="bg-[#181A22]">Income (+)</option><option value="Expense" className="bg-[#181A22]">Expense (−)</option></select></div>
              <div><label className={label}>Category</label><select className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#181A22]">{c}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Amount (₹)</label><input className={input} type="number" min="0" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></div>
              <div><label className={label}>Method</label><select className={input} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>{METHODS.map((mth) => <option key={mth} value={mth} className="bg-[#181A22]">{mth}</option>)}</select></div>
            </div>
            <div><label className={label}>Description</label><input className={input} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Utility bill — July" /></div>
            {form.type === "Income" && <div className="text-[11px] text-gray-500">18% GST ({money(Math.round((Number(form.amount) || 0) * 0.18 * 100) / 100)}) will be recorded on this income.</div>}
            <button type="submit" disabled={posting} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-[13px] py-2.5 rounded-lg">{posting ? "Posting…" : "Post Entry"}</button>
          </form>
        </Modal>
      )}

      {/* POS Café modal */}
      {posOpen && <POSModal onClose={() => setPosOpen(false)} onCheckout={post} posting={posting} />}
    </div>
  );
}

function POSModal({ onClose, onCheckout, posting }) {
  const [basket, setBasket] = useState([]);
  const [cust, setCust] = useState("Walk-in");
  const add = (m) => setBasket((b) => { const ex = b.find((x) => x.name === m.name); return ex ? b.map((x) => x.name === m.name ? { ...x, qty: x.qty + 1 } : x) : [...b, { ...m, qty: 1 }]; });
  const chQty = (name, d) => setBasket((b) => b.map((x) => x.name === name ? { ...x, qty: Math.max(1, x.qty + d) } : x));
  const rm = (name) => setBasket((b) => b.filter((x) => x.name !== name));
  const total = basket.reduce((s, x) => s + x.price * x.qty, 0);
  const checkout = async () => {
    if (!basket.length) return;
    const desc = `POS order for ${cust}: ${basket.map((x) => `${x.qty}× ${x.name}`).join(", ")}`;
    if (await onCheckout({ type: "Income", category: "POS Cafe", amount: total, paymentMethod: "UPI", description: desc })) onClose();
  };
  const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
  return (
    <Modal title="POS Terminal — Café" onClose={onClose} wide>
      <div className="p-5 grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div className="text-[10px] font-mono text-gray-500 uppercase font-bold mb-2">Menu</div>
          <div className="grid grid-cols-2 gap-2">
            {CAFE_MENU.map((m) => (
              <button key={m.name} onClick={() => add(m)} className="text-left bg-[#12141B] border border-white/[0.08] hover:border-emerald-500/30 rounded-lg px-3 py-2.5 w-auto">
                <div className="text-[12.5px] font-semibold text-gray-100">{m.name}</div><div className="text-[11px] text-emerald-300 font-mono">{money(m.price)}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <div className="text-[10px] font-mono text-gray-500 uppercase font-bold mb-2">Order</div>
          <input value={cust} onChange={(e) => setCust(e.target.value)} placeholder="Customer" className="w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2 text-[13px] text-gray-100 mb-2 focus:outline-none focus:border-white/25" />
          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-52">
            {basket.length === 0 ? <div className="text-gray-600 text-[12px] py-6 text-center">Tap menu items to add.</div> : basket.map((x) => (
              <div key={x.name} className="flex items-center gap-2 bg-[#12141B] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
                <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-gray-200 truncate">{x.name}</div><div className="text-[10px] text-gray-500">{money(x.price)} × {x.qty}</div></div>
                <button onClick={() => chQty(x.name, -1)} className="w-6 h-6 rounded bg-white/[0.06] text-gray-300 flex items-center justify-center w-auto"><Minus size={12} /></button>
                <span className="text-[12px] font-bold text-gray-100 w-5 text-center">{x.qty}</span>
                <button onClick={() => chQty(x.name, 1)} className="w-6 h-6 rounded bg-white/[0.06] text-gray-300 flex items-center justify-center w-auto"><Plus size={12} /></button>
                <button onClick={() => rm(x.name)} className="text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.08]">
            <div className="flex justify-between text-[13px] mb-2"><span className="text-gray-400">Total (GST incl.)</span><span className="font-black text-white">{money(total)}</span></div>
            <button onClick={checkout} disabled={!basket.length || posting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[13px] py-2.5 rounded-lg">{posting ? "Processing…" : "Charge & Print Invoice"}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className={`bg-[#181A22] rounded-2xl w-full overflow-hidden border border-white/[0.1] shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#0a0d14]">
          <div><span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">Finance</span><h3 className="text-[17px] font-bold text-white mt-0.5">{title}</h3></div>
          <button onClick={onClose} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
