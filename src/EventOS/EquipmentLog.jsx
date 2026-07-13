import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Package, Plus, Trash2, Sparkles } from "lucide-react";

const isStocked = (i) => (Number(i.available) || 0) >= (Number(i.required) || 0) && (Number(i.damaged) || 0) === 0;

export default function EquipmentLog() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [items, setItems] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", sport: "", required: "" });
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
    try { const { data } = await axios.get(`/api/agency-events/${id}/equipment`); setItems(data.items || []); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load inventory"); }
    finally { setLoadingRows(false); }
  };
  useEffect(() => { if (sel) load(sel); else setItems([]); }, [sel]);

  const selEvent = events.find((e) => e._id === sel);
  const sports = selEvent?.sports || [];

  const addItem = async () => {
    if (!form.name.trim()) return;
    try {
      const { data } = await axios.post(`/api/agency-events/${sel}/equipment`, { name: form.name.trim(), sport: form.sport, required: Number(form.required) || 0 });
      setItems((it) => [...it, data.item]);
      setForm({ name: "", sport: "", required: "" });
    } catch (e) { setErr(e?.response?.data?.message || "Could not add asset"); }
  };
  const seed = async () => {
    setBusy(true);
    try { const { data } = await axios.post(`/api/agency-events/${sel}/equipment/seed`); setItems(data.items || []); }
    catch (e) { setErr(e?.response?.data?.message || "Could not seed inventory"); }
    finally { setBusy(false); }
  };
  const setField = (item, field, value) => setItems((list) => list.map((x) => x._id === item._id ? { ...x, [field]: value } : x));
  const saveField = async (item, field, value) => {
    try { await axios.patch(`/api/agency-events/${sel}/equipment/${item._id}`, { [field]: Number(value) || 0 }); } catch { load(sel); }
  };
  const del = async (item) => {
    setItems((list) => list.filter((x) => x._id !== item._id));
    try { await axios.delete(`/api/agency-events/${sel}/equipment/${item._id}`); } catch { load(sel); }
  };

  const input = "bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const numCell = "w-14 bg-[#12141B] border border-white/[0.08] rounded px-2 py-1 text-[13px] text-center focus:outline-none focus:border-white/25";
  const th = "text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left px-4 py-3";
  const td = "px-4 py-3 text-[13px] text-gray-300 border-t border-white/[0.05]";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><Package size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Equipment Inventory Logs</h1>
            <p className="text-gray-500 text-[13px]">Required sports assets compared with physical counts in storage.</p>
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
          <Package size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button>.</div>
        </div>
      ) : (
        <>
          {/* Add asset */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-white">Add Inventory Asset</h2>
              <button onClick={seed} disabled={busy}
                className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg disabled:opacity-60 w-auto">
                <Sparkles size={13} /> {busy ? "Seeding…" : "Seed from sport templates"}
              </button>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "1.6fr 1fr 120px auto" }}>
              <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Asset item (e.g. Match Footballs)" />
              <select className={input} value={form.sport} onChange={(e) => set("sport", e.target.value)}>
                <option value="" className="bg-[#181A22]">Sport…</option>
                {sports.map((s) => <option key={s} value={s} className="bg-[#181A22]">{s}</option>)}
              </select>
              <input className={input} value={form.required} onChange={(e) => set("required", e.target.value.replace(/[^0-9]/g, ""))} placeholder="Required" inputMode="numeric" />
              <button onClick={addItem} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] px-4 rounded-lg w-auto whitespace-nowrap">Add Asset</button>
            </div>
          </div>

          {/* Inventory table */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[14px] font-bold text-white">Equipment Inventory</h2>
              <p className="text-[12.5px] text-gray-500 mt-0.5">Edit available / missing / damaged counts — status updates automatically.</p>
            </div>
            {loadingRows ? (
              <div className="text-gray-500 py-10 text-center">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-[13px]">No assets yet. Add one, or seed from sport templates.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className={th}>Asset Item</th>
                      <th className={th}>Required</th>
                      <th className={th}>Available</th>
                      <th className={th}>Missing</th>
                      <th className={th}>Damaged</th>
                      <th className={th}>Status Roster</th>
                      <th className={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const stocked = isStocked(i);
                      const num = (field, tone) => (
                        <td className={td}>
                          <input value={i[field] ?? 0} inputMode="numeric"
                            onChange={(e) => setField(i, field, e.target.value.replace(/[^0-9]/g, ""))}
                            onBlur={(e) => saveField(i, field, e.target.value)}
                            className={`${numCell} ${tone === "warn" && Number(i[field]) > 0 ? "text-rose-300" : "text-gray-200"}`} />
                        </td>
                      );
                      return (
                        <tr key={i._id} className="group hover:bg-white/[0.02]">
                          <td className={`${td} font-bold text-white`}>{i.name}</td>
                          {num("required")}
                          {num("available")}
                          {num("missing", "warn")}
                          {num("damaged", "warn")}
                          <td className={td}>
                            <span className={`text-[11px] font-bold rounded border px-2.5 py-1 uppercase ${stocked ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"}`}>
                              {stocked ? "Stocked" : "Under Stocked"}
                            </span>
                          </td>
                          <td className={td}>
                            <button onClick={() => del(i)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
