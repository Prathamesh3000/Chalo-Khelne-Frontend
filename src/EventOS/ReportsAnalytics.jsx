import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BarChart3, FileText, Award, ScrollText } from "lucide-react";

export default function ReportsAnalytics() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState("");
  const [data, setData] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(""); // "blueprint" | "certs"
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

  const load = async (id) => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get(`/api/agency-events/${id}/report/summary`); setData(data); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load report"); setData(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (sel) load(sel); }, [sel]);

  // PDF endpoints require the auth header → fetch as blob then trigger a download.
  const download = async (kind, endpoint, filename) => {
    setBusy(kind); setErr("");
    try {
      const res = await axios.get(`/api/agency-events/${sel}/report/${endpoint}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
    } catch (e) {
      // blob error bodies come back as a Blob — read the JSON message out of it
      let msg = "Could not generate PDF";
      try { const t = await e?.response?.data?.text?.(); if (t) msg = JSON.parse(t).message || msg; } catch { /* keep default */ }
      setErr(msg);
    } finally { setBusy(""); }
  };

  const selEvent = events.find((e) => e._id === sel);
  const stats = data?.stats;
  const cert = data?.certificate;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0"><BarChart3 size={22} className="text-emerald-300" /></div>
          <div>
            <h1 className="text-[20px] font-black text-white">Reports, Analytics &amp; PDF Certificates</h1>
            <p className="text-gray-500 text-[13px]">Download tournament blueprints, check-in statistics, and generate participant certificates.</p>
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
          <BarChart3 size={40} className="opacity-30 mx-auto mb-3" />
          <div className="text-gray-300 font-semibold">No events yet</div>
          <div className="text-[13px] mt-1">Create one in the <button onClick={() => nav("/agency/planner")} className="text-emerald-400 w-auto bg-transparent">Event Planner</button>.</div>
        </div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
          {/* Operational Report Specifications */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><FileText size={15} className="text-emerald-300" /><h2 className="text-[12px] font-bold text-emerald-300 uppercase tracking-wider">Operational Report Specifications</h2></div>
            {loading ? <div className="text-gray-500 py-8 text-center">Loading…</div> : (
              <div className="divide-y divide-white/[0.05]">
                <Spec label="Check-in Completion Status" value={`${stats?.checkIn.percent ?? 0}% Verified`} tone="text-emerald-400" />
                <Spec label="Total Adjudicated Matches" value={`${stats?.totalMatches ?? 0} matches`} />
                <Spec label="On-ground Staff Roster Checklist" value={`${stats?.staffCount ?? 0} staff`} />
                <Spec label="Officials Assigned" value={`${stats?.officialsCount ?? 0}`} />
              </div>
            )}
            <button onClick={() => download("blueprint", "blueprint.pdf", `Blueprint_${(selEvent?.name || "event").replace(/[^a-z0-9]+/gi, "_")}.pdf`)} disabled={busy === "blueprint"}
              className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-3 rounded-lg disabled:opacity-60">
              {busy === "blueprint" ? "Generating…" : "Export Full Sports Operating Blueprint (.PDF)"}
            </button>
          </div>

          {/* Certificate Hub */}
          <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><Award size={15} className="text-emerald-300" /><h2 className="text-[12px] font-bold text-emerald-300 uppercase tracking-wider">Certificate Hub</h2></div>
            <p className="text-[13px] text-gray-400 leading-relaxed mb-4">
              Automatically compile digital certificates for the <span className="text-white font-semibold">{stats?.participants ?? 0}</span> players registered in <span className="text-white font-semibold">{selEvent?.name}</span>.
            </p>
            <div className="bg-[#12141B] border border-white/[0.08] rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-[12.5px]"><ScrollText size={14} className="text-amber-300" /><span className="text-gray-500 font-mono">Format:</span><span className="text-gray-200">{cert?.format || "ISO High Definition Certificate"}</span></div>
              <div className="flex items-center gap-2 text-[12.5px]"><Award size={14} className="text-amber-300" /><span className="text-gray-500 font-mono">Authority:</span><span className="text-gray-200">{cert?.authority || "IONIX Sports Agency Board"}</span></div>
            </div>
            <button onClick={() => download("certs", "certificates.pdf", `Certificates_${(selEvent?.name || "event").replace(/[^a-z0-9]+/gi, "_")}.pdf`)} disabled={busy === "certs" || !(stats?.participants > 0)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] py-3 rounded-lg disabled:opacity-50">
              {busy === "certs" ? "Compiling…" : "Batch Generate Participant Certificates"}
            </button>
            {!(stats?.participants > 0) && !loading && <p className="text-[12px] text-gray-600 mt-2 text-center">No registered participants yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Spec({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[13px] text-gray-400">{label}</span>
      <span className={`text-[13px] font-bold ${tone || "text-gray-200"}`}>{value}</span>
    </div>
  );
}
