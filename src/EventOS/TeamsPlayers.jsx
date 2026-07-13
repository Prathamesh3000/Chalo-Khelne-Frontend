import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Users } from "lucide-react";

const STATUS_STYLE = {
  Approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function TeamsPlayers() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [err, setErr] = useState("");

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

  useEffect(() => {
    if (!sel) { setRows([]); return; }
    (async () => {
      setLoadingRows(true); setErr("");
      try { const { data } = await axios.get(`/api/agency-events/${sel}/directory`); setRows(data.rows || []); }
      catch (e) { setErr(e?.response?.data?.message || "Failed to load directory"); }
      finally { setLoadingRows(false); }
    })();
  }, [sel]);

  const th = "text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left px-4 py-3";
  const td = "px-4 py-3.5 text-[13px] text-gray-300 border-t border-white/[0.05]";

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-white flex items-center gap-2.5"><Users size={22} /> Teams & Players</h1>
          <p className="text-gray-500 text-[13px] mt-0.5">Athlete roster synced automatically from each event's registrations.</p>
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
          <Users size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button> — registrations appear here.</div>
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-[14px] font-bold text-white">Teams & Player Directory</h2>
            <p className="text-[12.5px] text-gray-500 mt-0.5">IONIX operates a local directory synced from registration forms — the active athlete roster.</p>
          </div>
          {loadingRows ? (
            <div className="text-gray-500 py-10 text-center">Loading roster…</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-[13px]">No registrations yet for this event.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className={th}>Player / Team Name</th>
                    <th className={th}>Category</th>
                    <th className={th}>Affiliated Entity</th>
                    <th className={th}>Contact</th>
                    <th className={th}>Approval Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className={`${td} font-bold text-white`}>{r.name}</td>
                      <td className={td}>{r.category}</td>
                      <td className={td}>{r.entity}</td>
                      <td className={`${td} text-gray-400`}>{r.contact}</td>
                      <td className={td}>
                        <span className={`text-[11px] font-bold rounded border px-2.5 py-1 ${STATUS_STYLE[r.status] || "bg-white/10 text-gray-300 border-white/10"}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
