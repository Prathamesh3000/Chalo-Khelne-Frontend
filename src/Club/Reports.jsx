import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart3, FileText, FileSpreadsheet, TrendingUp, Wallet, Receipt, Users, Dribbble } from "lucide-react";

const money = (n) => `₹${(Number(n) || 0).toLocaleString()}`;
const CHANNEL_COLOR = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-teal-500"];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try { const { data } = await axios.get("/api/club/reports/summary"); setData(data); }
      catch (e) { setErr(e?.response?.data?.message || "Failed to load reports"); }
      finally { setLoading(false); }
    })();
  }, []);

  const download = async (kind, endpoint, filename) => {
    setBusy(kind); setErr("");
    try {
      const res = await axios.get(`/api/club/reports/${endpoint}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) {
      let msg = "Could not generate export";
      try { const t = await e?.response?.data?.text?.(); if (t) msg = JSON.parse(t).message || msg; } catch { /* keep default */ }
      setErr(msg);
    } finally { setBusy(""); }
  };

  const rev = data?.revenue || { totalIncome: 0, totalExpense: 0, netProfit: 0, gstCollected: 0 };
  const channels = data?.channels || [];
  const c = data?.counts || {};
  const maxRev = Math.max(1, ...channels.map((ch) => ch.revenue));

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><BarChart3 size={22} className="text-emerald-300" /></div>
          <div>
            <h2 className="text-[20px] font-black text-white tracking-tight">Business Intelligence &amp; Reports</h2>
            <p className="text-gray-500 text-[13px] mt-0.5">Revenue channels, GST ledger, utilization and exports.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => download("csv", "finance.csv", "club_finance_ledger.csv")} disabled={busy === "csv"} className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.1] text-gray-200 hover:text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><FileSpreadsheet size={14} /> {busy === "csv" ? "Exporting…" : "Export CSV"}</button>
          <button onClick={() => download("pdf", "report.pdf", "club_business_report.pdf")} disabled={busy === "pdf"} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><FileText size={14} /> {busy === "pdf" ? "Generating…" : "Export PDF Report"}</button>
        </div>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Total Income", money(rev.totalIncome), "text-emerald-300", <TrendingUp size={16} key="i" />],
              ["Net Profit", money(rev.netProfit), rev.netProfit >= 0 ? "text-emerald-300" : "text-rose-300", <Wallet size={16} key="p" />],
              ["GST Collected", money(rev.gstCollected), "text-amber-300", <Receipt size={16} key="g" />],
              ["Active Members", `${c.activeMembers || 0}/${c.members || 0}`, "text-blue-300", <Users size={16} key="m" />],
            ].map(([l, v, t, ic]) => (
              <div key={l} className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{l}</span><span className="text-gray-500">{ic}</span></div>
                <div className={`text-[22px] font-black mt-2 ${t}`}>{v}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)" }}>
            {/* Revenue channels */}
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="text-[14px] font-bold text-white mb-4">Revenue Channels</h3>
              {channels.length === 0 ? <div className="py-8 text-center text-gray-600 text-[13px]">No revenue recorded yet.</div> : (
                <div className="space-y-3.5">
                  {channels.map((ch, i) => (
                    <div key={ch.channel}>
                      <div className="flex items-center justify-between text-[12.5px] mb-1"><span className="text-gray-300">{ch.channel}</span><span className="font-mono font-bold text-gray-100">{money(ch.revenue)} <span className="text-gray-500 text-[11px]">({ch.share}%)</span></span></div>
                      <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden"><div className={`h-full rounded-full ${CHANNEL_COLOR[i % CHANNEL_COLOR.length]}`} style={{ width: `${Math.round((ch.revenue / maxRev) * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Operations snapshot */}
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="text-[14px] font-bold text-white mb-4">Operations Snapshot</h3>
              <div className="space-y-2.5 text-[13px]">
                {[
                  ["Bookings (confirmed/total)", `${c.confirmedBookings || 0} / ${c.bookings || 0}`, Dribbble],
                  ["Courts", c.courts || 0, Dribbble],
                  ["Coaches", c.coaches || 0, Users],
                  ["Staff", c.staff || 0, Users],
                  ["Inventory (low-stock)", `${c.inventoryItems || 0} (${c.lowStock || 0})`, BarChart3],
                  ["Total Expense", money(rev.totalExpense), Wallet],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between border-b border-white/[0.05] pb-2"><span className="text-gray-400">{l}</span><span className="font-bold text-gray-100">{v}</span></div>
                ))}
              </div>
            </div>
          </div>

          {/* Membership breakdown */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-[14px] font-bold text-white mb-4">Membership Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(data?.memberBreakdown || {}).map(([k, v]) => (
                <div key={k} className="bg-[#12141B] border border-white/[0.06] rounded-xl px-4 py-3"><div className="text-[20px] font-black text-white">{v}</div><div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{k}</div></div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
