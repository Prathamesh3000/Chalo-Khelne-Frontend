import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Building2 } from "lucide-react";

const STATUS_STYLE = {
  Approved: "text-emerald-300 border-emerald-500/30",
  Pending: "text-amber-300 border-amber-500/30",
  Cancelled: "text-red-300 border-red-500/30",
};

/**
 * Reusable Directory hub (Schools / Corporate Clients / Clubs).
 * Shows agency-wide affiliated accounts (filtered by `accountFilter`) + the
 * selected event's organizational registrations. Both share /agency-events/*.
 */
export default function DirectoryHub({ title, subtitle, Icon, accountFilter, accountEmptyText, accentIcon }) {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [rows, setRows] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [stats, setStats] = useState({ registrations: 0, projectedRevenue: 0 });
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [evRes, acctRes] = await Promise.all([
          axios.get("/api/agency-events"),
          axios.get("/api/agency-events/accounts"),
        ]);
        const list = evRes.data.events || [];
        setEvents(list);
        setAllAccounts(acctRes.data.accounts || []);
        if (list.length) setSel(list[0]._id);
      } catch (e) { setErr(e?.response?.data?.message || "Failed to load"); }
      finally { setLoadingEvents(false); }
    })();
  }, []);

  useEffect(() => {
    if (!sel) { setRows([]); return; }
    (async () => {
      setLoadingRows(true); setErr("");
      try {
        const { data } = await axios.get(`/api/agency-events/${sel}/directory`);
        setRows(data.rows || []);
        setStats(data.stats || { registrations: 0, projectedRevenue: 0 });
      } catch (e) { setErr(e?.response?.data?.message || "Failed to load directory"); }
      finally { setLoadingRows(false); }
    })();
  }, [sel]);

  const accounts = allAccounts.filter(accountFilter);
  const tiles = [
    { label: "Affiliated Accounts", value: `${accounts.length} Accounts`, color: "text-white" },
    { label: "Current Registrations", value: `${stats.registrations} Entries`, color: "text-emerald-400" },
    { label: "Projected Revenue", value: `₹${(stats.projectedRevenue || 0).toLocaleString()}`, color: "text-indigo-400" },
  ];
  const AccIcon = accentIcon || Icon;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><Icon size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">{title}</h1>
            <p className="text-gray-500 text-[13px]">{subtitle}</p>
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
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {tiles.map((t) => (
              <div key={t.label} className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t.label}</div>
                <div className={`text-[26px] font-black mt-1.5 ${t.color}`}>{t.value}</div>
              </div>
            ))}
          </div>

          {/* Affiliated accounts */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-gray-200">Affiliated Accounts</h2>
            <span className="text-[11px] text-gray-500">Onboarded under your agency</span>
          </div>
          {accounts.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl py-8 text-center text-gray-500 text-[13px] mb-6">
              {accountEmptyText || "No affiliated accounts yet. SuperAdmin can onboard accounts under your agency."}
            </div>
          ) : (
            <div className="space-y-2.5 mb-6">
              {accounts.map((a) => (
                <div key={a.id} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><AccIcon size={16} className="text-emerald-300" /></div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-white truncate">{a.clubName}</div>
                      <div className="text-[12px] text-gray-500 truncate">{a.name} · {a.email}{a.city ? ` · ${a.city}` : ""}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold rounded border px-2.5 py-1 flex-shrink-0 text-gray-300 border-white/10 uppercase">{a.orgType || a.role}</span>
                </div>
              ))}
            </div>
          )}

          {/* Organizational registrations */}
          <h2 className="text-[14px] font-bold text-gray-200 mb-3">Active Organizational Registrations</h2>
          {events.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl py-10 text-center text-gray-500 text-[13px]">
              No events yet — create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button> to see registrations.
            </div>
          ) : loadingRows ? (
            <div className="text-gray-500 py-8 text-center">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl py-12 text-center text-gray-500 text-[13px]">No registrations yet for this event.</div>
          ) : (
            <div className="space-y-2.5">
              {rows.map((r, i) => (
                <div key={i} className="bg-[#181A22] border border-white/[0.06] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0"><Building2 size={16} className="text-gray-400" /></div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-white truncate">{r.entity}</div>
                      <div className="text-[12px] text-gray-500 truncate">Contact Node: {r.contact}</div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold rounded border px-2.5 py-1 flex-shrink-0 bg-transparent ${STATUS_STYLE[r.status] || "text-gray-300 border-white/10"}`}>{r.status} Entry</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
