import { useEffect, useState } from "react";
import axios from "axios";
import { Package, Plus, X, Trash2, PackagePlus, ShoppingCart, AlertTriangle } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const CATEGORIES = ["Balls", "Nets", "Rackets", "Jerseys", "Bibs", "Cones", "Equipment", "Snacks", "Drinks"];
const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, stockValue: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [action, setAction] = useState(null); // { item, mode: 'restock' | 'rent' }
  const blank = { name: "", category: "Equipment", quantity: 0, minAlertThreshold: 5, unitPrice: 0 };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get("/api/club/inventory"); setItems(data.items || []); setStats(data.stats || stats); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load inventory"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Item name is required"); return; }
    try { await axios.post("/api/club/inventory", { ...form, quantity: Number(form.quantity) || 0, minAlertThreshold: Number(form.minAlertThreshold) || 0, unitPrice: Number(form.unitPrice) || 0 }); setForm(blank); setAddOpen(false); load(); }
    catch (e) { setErr(e?.response?.data?.message || "Could not add item"); }
  };
  const del = async (i) => { setItems((l) => l.filter((x) => x._id !== i._id)); try { await axios.delete(`/api/club/inventory/${i._id}`); load(); } catch { load(); } };

  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";
  const th = "text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left px-4 py-3";
  const td = "px-4 py-3 text-[13px] text-gray-300 border-t border-white/[0.05]";

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Inventory &amp; Stock</h2>
          <p className="text-gray-500 text-[13px] mt-1">Warehouse stock, restocking, and equipment rentals (POS).</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Item</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {[["Items", stats.total, "text-white"], ["Low Stock", stats.lowStock, stats.lowStock > 0 ? "text-rose-300" : "text-gray-300"], ["Stock Value", money(stats.stockValue), "text-emerald-300"]].map(([l, v, t]) => (
          <div key={l} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[130px]"><div className={`text-[20px] font-black ${t}`}>{v}</div><div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{l}</div></div>
        ))}
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : items.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500"><Package size={40} className="opacity-30 mx-auto mb-3" /><div className="text-gray-300 font-semibold">No stock items</div><div className="text-[13px] mt-1">Provision your first item.</div></div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr className="bg-white/[0.02]"><th className={th}>Item</th><th className={th}>Category</th><th className={th}>Qty</th><th className={th}>Unit Price</th><th className={th}>Last Restocked</th><th className={th}>Status</th><th className={th}></th></tr></thead>
            <tbody>
              {items.map((i) => {
                const low = i.quantity <= i.minAlertThreshold;
                return (
                  <tr key={i._id} className="group hover:bg-white/[0.02]">
                    <td className={`${td} font-bold text-white`}>{i.name}</td>
                    <td className={td}>{i.category}</td>
                    <td className={`${td} font-mono font-bold ${low ? "text-rose-300" : "text-gray-200"}`}>{i.quantity}</td>
                    <td className={td}>{money(i.unitPrice)}</td>
                    <td className={`${td} font-mono text-[11.5px] text-gray-500`}>{i.lastRestocked || "—"}</td>
                    <td className={td}>{low ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded px-2 py-0.5"><AlertTriangle size={11} /> Low ({i.minAlertThreshold})</span> : <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded px-2 py-0.5">In Stock</span>}</td>
                    <td className={td}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setAction({ item: i, mode: "restock" })} title="Restock" className="text-emerald-300 hover:bg-emerald-500/10 p-1.5 rounded-lg border border-white/[0.08] w-auto"><PackagePlus size={14} /></button>
                        <button onClick={() => setAction({ item: i, mode: "rent" })} title="Rent / sell" className="text-blue-300 hover:bg-blue-500/10 p-1.5 rounded-lg border border-white/[0.08] w-auto"><ShoppingCart size={14} /></button>
                        <button onClick={() => del(i)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1.5 w-auto bg-transparent"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <Modal title="Provision Stock Item" onClose={() => setAddOpen(false)}>
          <form onSubmit={addItem} className="p-5 space-y-3.5">
            <div><label className={label} htmlFor="item-name">Item Name *</label><input id="item-name" className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Match Footballs" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="category">Category</label><select id="category" className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#181A22]">{c}</option>)}</select></div>
              <div><label className={label} htmlFor="quantity">Quantity</label><input id="quantity" className={input} type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label} htmlFor="unit-price">Unit Price (₹)</label><input id="unit-price" className={input} type="number" min="0" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} /></div>
              <div><label className={label} htmlFor="low-stock-alert-at">Low-Stock Alert At</label><input id="low-stock-alert-at" className={input} type="number" min="0" value={form.minAlertThreshold} onChange={(e) => set("minAlertThreshold", e.target.value)} /></div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Add Item</button>
          </form>
        </Modal>
      )}

      {action && <ActionModal action={action} onClose={() => setAction(null)} onDone={load} setErr={setErr} />}
    </div>
  );
}

function ActionModal({ action, onClose, onDone, setErr }) {
  const { item, mode } = action;
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";
  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(qty) > 0)) { setErr("Quantity must be greater than 0"); return; }
    try {
      if (mode === "restock") await axios.patch(`/api/club/inventory/${item._id}/restock`, { qty: Number(qty) });
      else await axios.patch(`/api/club/inventory/${item._id}/rent`, { qty: Number(qty), customerName: customerName || "Walk-in" });
      onClose(); onDone();
    } catch (e) { setErr(e?.response?.data?.message || "Action failed"); }
  };
  return (
    <Modal title={mode === "restock" ? `Restock — ${item.name}` : `Rent / Sell — ${item.name}`} onClose={onClose}>
      <form onSubmit={submit} className="p-5 space-y-3.5">
        <div className="text-[12px] text-gray-500">In stock: <span className="text-gray-200 font-bold">{item.quantity}</span> · Unit: <span className="text-gray-200">{money(item.unitPrice)}</span></div>
        <div><label className={label}>{mode === "restock" ? "Quantity to add" : "Quantity to rent"}</label><input className={input} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></div>
        {mode === "rent" && <>
          <div><label className={label} htmlFor="customer">Customer</label><input id="customer" className={input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" /></div>
          <div className="text-[12px] text-gray-500">Total charge: <span className="text-emerald-300 font-bold">{money((Number(item.unitPrice) || 0) * (Number(qty) || 0))}</span> → posted to finance.</div>
        </>}
        <button type="submit" className={`w-full text-white font-bold text-[13px] py-2.5 rounded-lg ${mode === "restock" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}>{mode === "restock" ? "Add to Stock" : "Confirm Rental"}</button>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
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
          <div><span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">Inventory</span><h3 className="text-[17px] font-bold text-white mt-0.5">{title}</h3></div>
          <button onClick={onClose} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
