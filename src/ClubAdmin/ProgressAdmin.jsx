import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { TrendingUp, Loader2, X, FileDown, Star } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const field = "h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none";

// Read-only stars (0–5).
function Stars({ n = 0, size = 13 }) {
  return (
    <span className="inline-flex items-center" style={{ gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={i <= n ? "text-amber-400" : "text-gray-700"} fill={i <= n ? "currentColor" : "none"} style={{ width: size, height: size }} />
      ))}
    </span>
  );
}

/**
 * Student progress (school/org admin). Pick a sport + standard, see each
 * student's average rating and open a per-student report card (with PDF).
 * Ratings themselves are filled by the coach on mobile — this view is read-only.
 */
export default function ProgressAdmin() {
  const [clubSports, setClubSports] = useState([]);
  const [syllabi, setSyllabi] = useState([]);
  const [sport, setSport] = useState("");
  const [standard, setStandard] = useState("");
  const [students, setStudents] = useState([]);
  const [totalTopics, setTotalTopics] = useState(0);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [view, setView] = useState("students"); // "students" | "history"
  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [snapLoading, setSnapLoading] = useState(false);

  useEffect(() => {
    axios.get("/api/club-sports").then((r) => setClubSports((r.data?.sports || []).map((s) => s.name))).catch(() => setClubSports([]));
    axios.get("/api/syllabus").then((r) => setSyllabi(r.data?.syllabi || [])).catch(() => setSyllabi([]));
    try {
      const last = JSON.parse(localStorage.getItem("progress_last") || "null");
      if (last?.sport) { setSport(last.sport); setStandard(last.standard || ""); }
    } catch { /* ignore */ }
  }, []);

  const loaded = sport && standard.trim();

  useEffect(() => {
    if (!loaded) { setStudents([]); return; }
    setLoading(true);
    axios.get("/api/progress/students", { params: { sport, standard: standard.trim() } })
      .then((r) => { setStudents(r.data?.students || []); setTotalTopics(r.data?.totalTopics || 0); })
      .catch((e) => { setStudents([]); toast.error(e.response?.data?.error || "Failed to load"); })
      .finally(() => setLoading(false));
    try { localStorage.setItem("progress_last", JSON.stringify({ sport, standard: standard.trim() })); } catch { /* ignore */ }
  }, [sport, standard]); // eslint-disable-line

  useEffect(() => {
    if (!loaded || view !== "history") return;
    setSubLoading(true);
    axios.get("/api/progress/history", { params: { sport, standard: standard.trim() } })
      .then((r) => setSubmissions(r.data?.submissions || []))
      .catch(() => setSubmissions([]))
      .finally(() => setSubLoading(false));
  }, [view, sport, standard]); // eslint-disable-line

  const openReport = async (studentId) => {
    setReportLoading(true);
    try {
      const r = await axios.get(`/api/progress/student/${studentId}`, { params: { sport } });
      setReport(r.data);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load report");
    } finally {
      setReportLoading(false);
    }
  };

  const openSnapshot = async (id) => {
    setSnapLoading(true);
    try {
      const r = await axios.get(`/api/progress/history/submission/${id}`);
      setSnapshot(r.data);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load report");
    } finally {
      setSnapLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector */}
      <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3 inline-flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-400" /> Choose sport &amp; standard
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5" htmlFor="sport">Sport</label>
            <select id="sport" value={sport} onChange={(e) => setSport(e.target.value)} className={`${field} w-44`} style={inputStyle}>
              <option value="">Select sport…</option>
              {clubSports.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5" htmlFor="standard">Standard</label>
            <input id="standard" value={standard} onChange={(e) => setStandard(e.target.value)} placeholder="e.g. V" className={`${field} w-28`} style={inputStyle} />
          </div>
        </div>
        {syllabi.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-2">Syllabi — click to open</p>
            <div className="flex flex-wrap gap-2">
              {syllabi.map((s) => {
                const active = s.sport === sport && (s.standard || "") === standard.trim();
                return (
                  <button key={s._id} onClick={() => { setSport(s.sport); setStandard(s.standard || ""); }}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition w-auto ${active ? "bg-orange-500 text-white" : "text-gray-300 hover:bg-white/[0.08]"}`}
                    style={active ? undefined : inputStyle}>
                    {s.sport}{s.standard ? ` · Std ${s.standard}` : ""} <span className="opacity-60">· {s.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!loaded ? (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center text-[13px] text-gray-400">
          Pick a sport and standard to see student progress.
        </div>
      ) : (
      <>
        <div className="inline-flex items-center gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06]">
          {[["students", "Current"], ["history", "History"]].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)}
              className={`h-7 px-3 rounded-[5px] text-[12px] font-medium transition w-auto ${view === k ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>

        {view === "history" ? (
          subLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center text-[13px] text-gray-400">No submitted reports yet. Coaches submit a session report on mobile and it appears here, read-only.</div>
          ) : (
            <div className="rounded-xl bg-[#181A22] border border-white/[0.06] overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-white/[0.06]">
                    <th className="px-4 py-2.5 font-semibold">Submitted</th>
                    <th className="px-4 py-2.5 font-semibold">By</th>
                    <th className="px-4 py-2.5 font-semibold w-24">Students</th>
                    <th className="px-4 py-2.5 font-semibold w-40">Average</th>
                    <th className="px-4 py-2.5 font-semibold w-24 text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-[13px] text-white">{fmtDate(s.createdAt)}</td>
                      <td className="px-4 py-2.5 text-[12px] text-gray-400">{s.submittedByName || "—"}</td>
                      <td className="px-4 py-2.5 text-[12px] text-gray-400">{s.studentsCount}</td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center gap-2"><Stars n={Math.round(s.average)} /><span className="text-[12px] text-gray-400">{s.average || "—"}</span></span></td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => openSnapshot(s._id)} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-gray-300 hover:text-white hover:bg-white/[0.06] transition w-auto" style={inputStyle}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
        ) : students.length === 0 ? (
          <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center text-[13px] text-gray-400">No students in this standard yet.</div>
        ) : (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] overflow-x-auto">
          <div className="px-4 py-3 border-b border-white/[0.06] text-[12px] text-gray-400">
            {sport} · Std {standard} — {students.length} student(s) · {totalTopics} topic(s) in syllabus
          </div>
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-white/[0.06]">
                <th className="px-4 py-2.5 font-semibold w-10">#</th>
                <th className="px-4 py-2.5 font-semibold">Student</th>
                <th className="px-4 py-2.5 font-semibold w-40">Average</th>
                <th className="px-4 py-2.5 font-semibold w-28">Rated</th>
                <th className="px-4 py-2.5 font-semibold w-28 text-right">Report</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-[12px] text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 text-[13px] text-white font-medium">
                    {s.name}{s.rollNo ? <span className="text-gray-500 font-normal"> · #{s.rollNo}</span> : null}
                  </td>
                  <td className="px-4 py-2.5"><span className="inline-flex items-center gap-2"><Stars n={Math.round(s.average)} /><span className="text-[12px] text-gray-400">{s.average || "—"}</span></span></td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-400">{s.rated}/{s.totalTopics}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => openReport(s._id)} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-gray-300 hover:text-white hover:bg-white/[0.06] transition w-auto" style={inputStyle}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </>
      )}

      {(report || reportLoading) && (
        <ReportModal report={report} loading={reportLoading} onClose={() => setReport(null)} />
      )}
      {(snapshot || snapLoading) && (
        <SnapshotModal data={snapshot} loading={snapLoading} onClose={() => setSnapshot(null)} />
      )}
    </div>
  );
}

// ── Read-only frozen session report ──
function SnapshotModal({ data, loading, onClose }) {
  return (
    <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <DialogA11y onClose={onClose} />
      <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl bg-[#181A22] border border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#181A22]">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-white">Session report</h3>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-white/[0.08] text-gray-400 rounded px-1.5 py-0.5">Read only</span>
          </div>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white w-auto"><X className="w-4 h-4" /></button>
        </div>
        {loading || !data ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
        ) : (
          <div className="p-5">
            <div className="mb-4">
              <p className="text-[16px] font-semibold text-white">{fmtDate(data.submission?.createdAt)}</p>
              <p className="text-[12px] text-gray-400">{data.submission?.sport} · Std {data.submission?.standard}{data.submission?.submittedByName ? ` · by ${data.submission.submittedByName}` : ""}</p>
            </div>
            {(data.students || []).map((st) => (
              <div key={st.studentId} className="mb-4 rounded-lg border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-2.5 bg-white/[0.03] flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-white">{st.name}{st.rollNo ? <span className="text-gray-500 font-normal"> · #{st.rollNo}</span> : null}</span>
                  <span className="text-[12px] text-gray-400 inline-flex items-center gap-2"><Stars n={Math.round(st.average)} /> {st.average || "—"}</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-white/[0.06]">
                      <th className="px-4 py-2 font-semibold w-14">Week</th>
                      <th className="px-4 py-2 font-semibold">Topic</th>
                      <th className="px-4 py-2 font-semibold w-28">Rating</th>
                      <th className="px-4 py-2 font-semibold">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.topics.map((t, i) => (
                      <tr key={i} className="border-b border-white/[0.04] last:border-b-0">
                        <td className="px-4 py-2 text-[12px] text-orange-300 font-semibold">W{t.weekNumber}</td>
                        <td className="px-4 py-2 text-[13px] text-white">{t.topic}</td>
                        <td className="px-4 py-2"><Stars n={t.stars} /></td>
                        <td className="px-4 py-2 text-[12px] text-gray-400">{t.remark || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Per-student report card modal + PDF (print) ──
function ReportModal({ report, loading, onClose }) {
  const downloadPdf = () => {
    const html = reportHtml(report);
    const w = window.open("", "_blank");
    if (!w) { toast.error("Allow pop-ups to download the PDF."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <DialogA11y onClose={onClose} />
      <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl bg-[#181A22] border border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] sticky top-0 bg-[#181A22]">
          <h3 className="text-[15px] font-semibold text-white">Progress report</h3>
          <div className="flex items-center gap-2">
            {report && (
              <button onClick={downloadPdf} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold w-auto"><FileDown className="w-3.5 h-3.5" /> PDF</button>
            )}
            <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white w-auto"><X className="w-4 h-4" /></button>
          </div>
        </div>
        {loading || !report ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
        ) : (
          <div className="p-5">
            <div className="mb-4">
              {report.schoolName ? <p className="text-[12px] text-gray-400">{report.schoolName}</p> : null}
              <p className="text-[18px] font-semibold text-white">{report.student?.name}</p>
              <p className="text-[12px] text-gray-400">Std {report.student?.standard}{report.student?.rollNo ? ` · Roll #${report.student.rollNo}` : ""}</p>
              <div className="mt-2 inline-flex items-center gap-2"><Stars n={Math.round(report.overall?.average || 0)} size={16} /><span className="text-[13px] text-gray-300">Overall {report.overall?.average || "—"} / 5 · {report.overall?.rated}/{report.overall?.total} topics</span></div>
              {report.trend && report.trend.length > 1 && (
                <div className="mt-3 rounded-lg border border-white/[0.06] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Progress over time</p>
                  <div className="flex flex-wrap gap-2">
                    {report.trend.map((p, i) => (
                      <span key={i} className="inline-flex flex-col items-center px-2.5 py-1.5 rounded-md bg-white/[0.04]">
                        <span className="text-[13px] font-bold text-amber-400">{p.average}★</span>
                        <span className="text-[10px] text-gray-500">{fmtDate(p.at)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(report.sports || []).length === 0 ? (
              <p className="text-[13px] text-gray-400">No syllabus topics rated yet.</p>
            ) : report.sports.map((sp) => (
              <div key={sp.sport} className="mb-4 rounded-lg border border-white/[0.06] overflow-hidden">
                <div className="px-4 py-2.5 bg-white/[0.03] flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-white">{sp.sport}</span>
                  <span className="text-[12px] text-gray-400 inline-flex items-center gap-2"><Stars n={Math.round(sp.average)} /> {sp.average || "—"} / 5</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-white/[0.06]">
                      <th className="px-4 py-2 font-semibold w-14">Week</th>
                      <th className="px-4 py-2 font-semibold">Topic</th>
                      <th className="px-4 py-2 font-semibold w-28">Rating</th>
                      <th className="px-4 py-2 font-semibold w-32">Over time</th>
                      <th className="px-4 py-2 font-semibold">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sp.topics.map((t, i) => (
                      <tr key={i} className="border-b border-white/[0.04] last:border-b-0">
                        <td className="px-4 py-2 text-[12px] text-orange-300 font-semibold">W{t.weekNumber}</td>
                        <td className="px-4 py-2 text-[13px] text-white">{t.topic}</td>
                        <td className="px-4 py-2">{t.stars ? <Stars n={t.stars} /> : <span className="text-[12px] text-gray-600">—</span>}</td>
                        <td className="px-4 py-2 text-[12px] font-semibold text-emerald-300">{t.history && t.history.length ? t.history.map((h) => h.stars).join(" → ") : <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-2 text-[12px] text-gray-400">{t.remark || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Printable HTML for the PDF (light theme, parent-friendly).
function reportHtml(r) {
  const star = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  const fmt = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch { return ""; } };
  const trendHtml = (r.trend && r.trend.length > 1)
    ? `<div class="trend"><span class="tl">Progress over time:</span> ${r.trend.map((p) => `<span class="tp">${fmt(p.at)} · ${p.average}★</span>`).join(" → ")}</div>`
    : "";
  const sportsHtml = (r.sports || []).map((sp) => `
    <div class="sport">
      <div class="sport-head"><span>${esc(sp.sport)}</span><span class="avg">${star(Math.round(sp.average))} ${sp.average || "—"} / 5</span></div>
      <table>
        <thead><tr><th>Week</th><th>Topic</th><th>Rating</th><th>Over time</th><th>Remark</th></tr></thead>
        <tbody>
          ${sp.topics.map((t) => `<tr><td>W${t.weekNumber}</td><td>${esc(t.topic)}</td><td class="stars">${t.stars ? star(t.stars) : "—"}</td><td class="ot">${(t.history && t.history.length) ? t.history.map((h) => h.stars).join(" → ") : "—"}</td><td>${esc(t.remark) || "—"}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Progress report — ${esc(r.student?.name || "")}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1a181b;margin:32px}
    .head{border-bottom:3px solid #15A765;padding-bottom:12px;margin-bottom:18px}
    .school{color:#15A765;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase}
    h1{margin:6px 0 2px;font-size:24px} .sub{color:#555;font-size:13px}
    .overall{margin-top:10px;font-size:14px} .overall .stars{color:#e0a800;font-size:18px;letter-spacing:2px}
    .sport{margin-top:18px;border:1px solid #e3e6ea;border-radius:8px;overflow:hidden}
    .sport-head{display:flex;justify-content:space-between;background:#f3f6f4;padding:8px 12px;font-weight:700;font-size:14px}
    .avg{color:#777;font-weight:600;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{text-align:left;color:#888;text-transform:uppercase;font-size:10px;padding:7px 12px;border-bottom:1px solid #e3e6ea}
    td{padding:7px 12px;border-bottom:1px solid #eef1f3} tr:last-child td{border-bottom:none}
    .stars{color:#e0a800;letter-spacing:2px;white-space:nowrap}
    .ot{color:#15A765;font-weight:600;white-space:nowrap}
    .trend{margin-top:8px;font-size:11px;color:#444} .trend .tl{color:#888;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
    .trend .tp{background:#f0f5f2;border-radius:4px;padding:1px 6px;white-space:nowrap}
    .foot{margin-top:24px;color:#999;font-size:11px;text-align:center}
    @media print{body{margin:14mm}}
  </style></head><body>
    <div class="head">
      ${r.schoolName ? `<div class="school">${esc(r.schoolName)}</div>` : ""}
      <h1>${esc(r.student?.name || "")}</h1>
      <div class="sub">Std ${esc(r.student?.standard || "")}${r.student?.rollNo ? ` · Roll #${esc(r.student.rollNo)}` : ""}</div>
      <div class="overall"><span class="stars">${star(Math.round(r.overall?.average || 0))}</span> Overall ${r.overall?.average || "—"} / 5 · ${r.overall?.rated}/${r.overall?.total} topics rated</div>
      ${trendHtml}
    </div>
    ${sportsHtml || "<p>No syllabus topics rated yet.</p>"}
    <div class="foot">Generated by Chalo Khelne · Progress report</div>
  </body></html>`;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  catch { return String(d || ""); }
}
