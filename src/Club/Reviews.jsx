import { useEffect, useState } from "react";
import axios from "axios";
import { Star, Plus, X, Trash2, CornerDownRight, Send } from "lucide-react";

import DialogA11y from "../shared/components/DialogA11y";
const TARGETS = ["Club", "Coach", "Court"];
const TARGET_BADGE = { Club: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", Coach: "bg-blue-500/15 text-blue-300 border-blue-500/30", Court: "bg-violet-500/15 text-violet-300 border-violet-500/30" };

function Stars({ n, size = 13 }) {
  return <span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={size} className={s <= n ? "text-amber-400 fill-amber-400" : "text-gray-700"} />)}</span>;
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, average: 0, byRating: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, replied: 0 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [replyId, setReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const blank = { author: "", targetType: "Club", targetName: "", rating: 5, comment: "" };
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true); setErr("");
    try { const { data } = await axios.get("/api/club/reviews"); setReviews(data.reviews || []); setStats(data.stats || stats); }
    catch (e) { setErr(e?.response?.data?.message || "Failed to load reviews"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addReview = async (e) => {
    e.preventDefault();
    if (!form.author.trim()) { setErr("Author is required"); return; }
    try { await axios.post("/api/club/reviews", { ...form, rating: Number(form.rating) }); setForm(blank); setAddOpen(false); load(); }
    catch (e) { setErr(e?.response?.data?.message || "Could not add review"); }
  };
  const submitReply = async (r) => {
    if (!replyText.trim()) return;
    try { const { data } = await axios.patch(`/api/club/reviews/${r._id}/reply`, { reply: replyText.trim() }); setReviews((l) => l.map((x) => x._id === r._id ? data.review : x)); setReplyId(null); setReplyText(""); load(); }
    catch (e) { setErr(e?.response?.data?.message || "Could not reply"); }
  };
  const del = async (r) => { setReviews((l) => l.filter((x) => x._id !== r._id)); try { await axios.delete(`/api/club/reviews/${r._id}`); load(); } catch { load(); } };

  const visible = reviews.filter((r) => filter === "all" || r.rating === Number(filter));
  const input = "w-full bg-[#12141B] border border-white/[0.1] rounded-lg px-3 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-white/25";
  const label = "block text-[10px] font-mono text-gray-500 uppercase font-bold mb-1";

  return (
    <div className="space-y-5">
      <div className="bg-[#181A22] p-5 rounded-2xl border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-white tracking-tight">Reviews &amp; Ratings</h2>
          <p className="text-gray-500 text-[13px] mt-1">Respond to testimonials for the club, coaches and courts.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right"><div className="text-[26px] font-black text-amber-300 leading-none">{stats.average || 0}</div><Stars n={Math.round(stats.average)} /></div>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-[12px] font-semibold w-auto"><Plus size={14} /> Add Review</button>
        </div>
      </div>

      {err && <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3.5 py-2.5 text-[13px]">{err}</div>}

      <div className="grid gap-5" style={{ gridTemplateColumns: "220px minmax(0,1fr)" }}>
        {/* Filter sidebar */}
        <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-3 self-start">
          <button onClick={() => setFilter("all")} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-semibold mb-1 ${filter === "all" ? "bg-emerald-600 text-white" : "text-gray-400 hover:bg-white/[0.04]"}`}>All Reviews <span className="text-[11px]">{stats.total}</span></button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button key={s} onClick={() => setFilter(String(s))} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] mb-0.5 ${filter === String(s) ? "bg-white/[0.06] text-white" : "text-gray-400 hover:bg-white/[0.04]"}`}>
              <span className="flex items-center gap-1.5"><span className="font-bold">{s}</span><Stars n={s} size={10} /></span>
              <span className="text-[11px] text-gray-500">{stats.byRating?.[s] || 0}</span>
            </button>
          ))}
          <div className="mt-2 pt-2 border-t border-white/[0.06] px-3 py-1 text-[11px] text-gray-500">{stats.replied} of {stats.total} replied</div>
        </div>

        {/* Reviews list */}
        <div className="space-y-3">
          {loading ? <div className="text-gray-500 py-10 text-center">Loading…</div> : visible.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-2xl p-12 text-center text-gray-500"><Star size={40} className="opacity-30 mx-auto mb-3" /><div className="text-gray-300 font-semibold">No reviews</div><div className="text-[13px] mt-1">Add a review or wait for testimonials.</div></div>
          ) : visible.map((r) => (
            <div key={r._id} className="group bg-[#181A22] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap"><span className="text-[14px] font-bold text-white">{r.author}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TARGET_BADGE[r.targetType]}`}>{r.targetType}{r.targetName ? `: ${r.targetName}` : ""}</span></div>
                  <div className="mt-1"><Stars n={r.rating} /></div>
                </div>
                <button onClick={() => del(r)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 w-auto bg-transparent"><Trash2 size={14} /></button>
              </div>
              {r.comment && <p className="text-[13px] text-gray-300 mt-2.5">{r.comment}</p>}

              {r.reply ? (
                <div className="mt-3 ml-3 pl-3 border-l-2 border-emerald-500/40 flex gap-2"><CornerDownRight size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" /><div><div className="text-[10px] font-bold text-emerald-300 uppercase">Club response</div><div className="text-[12.5px] text-gray-400">{r.reply}</div></div></div>
              ) : replyId === r._id ? (
                <div className="mt-3 flex gap-2">
                  <input autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitReply(r)} placeholder="Write a public response…" className={input} />
                  <button onClick={() => submitReply(r)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12.5px] px-3.5 rounded-lg w-auto"><Send size={13} /></button>
                  <button onClick={() => { setReplyId(null); setReplyText(""); }} className="text-gray-500 hover:text-white px-2 w-auto bg-transparent"><X size={16} /></button>
                </div>
              ) : (
                <button onClick={() => { setReplyId(r._id); setReplyText(""); }} className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 hover:text-emerald-300 w-auto bg-transparent"><CornerDownRight size={13} /> Reply</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {addOpen && (
        <div
        role="dialog"
        aria-modal="true"
        onClick={() => setAddOpen(false)}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <DialogA11y onClose={() => setAddOpen(false)} />
          <div onClick={(e) => e.stopPropagation()} className="bg-[#181A22] rounded-2xl max-w-md w-full overflow-hidden border border-white/[0.1] shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#0a0d14]">
              <div><span className="text-[10px] font-mono tracking-wider font-bold text-emerald-400 uppercase">Reviews</span><h3 className="text-[17px] font-bold text-white mt-0.5">Record a Review</h3></div>
              <button onClick={() => setAddOpen(false)} className="text-gray-500 hover:text-white w-auto bg-transparent"><X size={18} /></button>
            </div>
            <form onSubmit={addReview} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="author">Author *</label><input id="author" className={input} value={form.author} onChange={(e) => set("author", e.target.value)} required /></div>
                <div><label className={label} htmlFor="rating">Rating</label><select id="rating" className={input} value={form.rating} onChange={(e) => set("rating", e.target.value)}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n} className="bg-[#181A22]">{n} Star{n > 1 ? "s" : ""}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label} htmlFor="target">Target</label><select id="target" className={input} value={form.targetType} onChange={(e) => set("targetType", e.target.value)}>{TARGETS.map((t) => <option key={t} value={t} className="bg-[#181A22]">{t}</option>)}</select></div>
                <div><label className={label} htmlFor="target-name">Target Name</label><input id="target-name" className={input} value={form.targetName} onChange={(e) => set("targetName", e.target.value)} placeholder="e.g. Coach Vik" /></div>
              </div>
              <div><label className={label} htmlFor="comment">Comment</label><textarea id="comment" className={`${input} resize-none`} rows={3} value={form.comment} onChange={(e) => set("comment", e.target.value)} placeholder="What did they say?" /></div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] py-2.5 rounded-lg">Add Review</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
