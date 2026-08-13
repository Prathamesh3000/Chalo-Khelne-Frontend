import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Shield, Search, Award, MapPin, Star, Send, X, Loader2, IndianRupee,
} from "lucide-react";
import { assetUrl } from "../../shared/lib/assetUrl";

/*
 * Hire Referees — shared by Manager (/mrefree) and ClubAdmin (/club-refree).
 * Browses the referee directory (ProfessionalProfile, role=referee) and sends
 * a HireRequest to a specific referee user. The referee receives it in their
 * mobile inbox (BrowseJobs) and accepts/declines. Backed by the Jobs module:
 *   GET  /api/jobs/professionals?role=referee
 *   POST /api/jobs/hire-requests   (allowUserOrManager — manager + clubadmin both work)
 *
 * Props:
 * - dark: boolean (default false) — render in Manager dark theme
 * - showHeader: boolean (default true in light, false in dark — page wrapper supplies its own)
 */

const EMPTY_FORM = {
  title: "", sport: "", location: "", eventDate: "",
  duration: "", offerPayment: "", description: "",
};

const HireReferees = ({ dark = false, showHeader }) => {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [hireTarget, setHireTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);

  const renderHeader = showHeader ?? !dark;

  const fetchReferees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("/api/jobs/professionals?role=referee");
      setReferees(res.data?.professionals || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReferees(); }, []);

  const filtered = referees.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (r.userId?.name || "").toLowerCase();
    const sports = (r.sports || []).join(" ").toLowerCase();
    return name.includes(q) || sports.includes(q) || (r.city || "").toLowerCase().includes(q);
  });

  const openHire = (ref) => {
    setHireTarget(ref);
    setForm({ ...EMPTY_FORM, sport: (ref.sports || [])[0] || "" });
  };

  const sendHire = async () => {
    if (!hireTarget) return;
    if (!form.title.trim()) { toast.warn("Add the tournament / event name"); return; }
    try {
      setSending(true);
      await axios.post("/api/jobs/hire-requests", {
        toProfileId: hireTarget._id,
        title: form.title.trim(),
        role: "referee",
        sport: form.sport || (hireTarget.sports || [])[0] || "",
        location: form.location.trim(),
        eventDate: form.eventDate,
        duration: form.duration.trim(),
        offerPayment: form.offerPayment.trim(),
        description: form.description.trim(),
      });
      toast.success(`Hire request sent to ${hireTarget.userId?.name || "referee"}`);
      setHireTarget(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not send the hire request");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        {dark
          ? <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          : <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />}
      </div>
    );
  }

  return (
    <div className={dark ? "" : "p-6 lg:p-8 max-w-[1400px] mx-auto"}>
      {/* Header — light variant only; dark wrapper supplies its own */}
      {renderHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>Hire Referees</h1>
            <p className={`text-sm mt-0.5 ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {referees.length} referee{referees.length !== 1 ? "s" : ""} available to hire
            </p>
          </div>
          <SearchInput dark={dark} value={search} onChange={setSearch} />
        </div>
      )}

      {/* When dark, render only the search bar at the top (header is in the wrapper) */}
      {dark && (
        <div className="mb-4 max-w-sm">
          <SearchInput dark value={search} onChange={setSearch} />
        </div>
      )}

      {error && <p className={`text-sm mb-4 ${dark ? "text-red-300" : "text-red-500"}`}>{error}</p>}

      {filtered.length === 0 ? (
        <div
          className={`text-center py-16 rounded-2xl ${
            dark ? "bg-[#181A22]" : "bg-white border border-gray-100"
          }`}
          style={dark ? { border: "1px solid rgba(255,255,255,0.06)" } : undefined}
        >
          <div className={`w-10 h-10 rounded-md inline-flex items-center justify-center mb-3 ${
            dark ? "bg-white/[0.06]" : "bg-gray-100"
          }`}>
            <Shield className={`w-5 h-5 ${dark ? "text-gray-500" : "text-gray-300"}`} />
          </div>
          <h3 className={`text-[14px] font-medium ${dark ? "text-white" : "text-gray-700"}`}>
            {search ? "No referees match your search" : "No referees available yet"}
          </h3>
          <p className={`text-[13px] mt-1 max-w-md mx-auto ${dark ? "text-gray-400" : "text-gray-500"}`}>
            Referees appear here once they create a referee profile in the app.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ref) => (
            <RefereeCard key={ref._id} ref_={ref} dark={dark} onHire={() => openHire(ref)} />
          ))}
        </div>
      )}

      {/* Hire request modal */}
      {hireTarget && (
        <HireModal
          dark={dark}
          target={hireTarget}
          form={form}
          setForm={setForm}
          sending={sending}
          onClose={() => setHireTarget(null)}
          onSend={sendHire}
        />
      )}
    </div>
  );
};

// ── Search input ─────────────────────────────────────────────────────────────

function SearchInput({ dark, value, onChange }) {
  if (dark) {
    return (
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by name, sport, city…"
          className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        />
      </div>
    );
  }
  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, sport, city..."
        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
      />
    </div>
  );
}

// ── Referee card ─────────────────────────────────────────────────────────────

function RefereeCard({ ref_: ref, dark, onHire }) {
  const user = ref.userId || {};
  const avatar = assetUrl(user.profileImage);
  const ratingAvg = ref.rating || 0;

  const t = dark
    ? {
        card:       "bg-[#181A22] transition hover:border-white/[0.12]",
        border:     "border border-white/[0.06]",
        avatarBg:   "bg-orange-500/15 text-orange-400",
        avatarBorder: "border-[#181A22]",
        name:       "text-white",
        meta:       "text-gray-500",
        statBox:    "rounded-md p-3",
        statLabel:  "text-[10px] font-bold text-gray-500 uppercase tracking-wider",
        statValue:  "text-[13px] font-medium text-white",
        sportPill:  "bg-orange-500/15 text-orange-400",
      }
    : {
        card:       "bg-white hover:border-orange-200 hover:shadow-md transition-all",
        border:     "border border-gray-100",
        avatarBg:   "bg-orange-50 text-orange-500",
        avatarBorder: "border-orange-100",
        name:       "text-gray-900",
        meta:       "text-gray-400",
        statBox:    "bg-gray-50 rounded-xl p-3",
        statLabel:  "text-[10px] font-semibold text-gray-400 uppercase tracking-wider",
        statValue:  "text-sm font-bold text-gray-900",
        sportPill:  "text-orange-600 bg-orange-50 border border-orange-100",
      };

  return (
    <article className={`rounded-2xl overflow-hidden flex flex-col ${t.card} ${t.border}`}>
      {/* Profile header */}
      <div className="p-4 flex items-center gap-3">
        {avatar ? (
          <img loading="lazy" src={avatar} alt={user.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            style={{ border: `2px solid ${dark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}` }} />
        ) : (
          <div className={`w-12 h-12 rounded-full grid place-items-center font-semibold text-[15px] flex-shrink-0 ${t.avatarBg}`}
            style={dark ? { border: "2px solid rgba(255,255,255,0.06)" } : undefined}>
            {(user.name || "R").charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className={`text-[14px] font-medium truncate ${t.name}`}>{user.name || "Referee"}</h3>
          <div className={`flex items-center gap-2 text-[11px] mt-0.5 ${t.meta}`}>
            {ref.city && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ref.city}</span>
            )}
            {ratingAvg > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="font-mono tabular-nums">{ratingAvg.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div className={t.statBox} style={dark ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" } : undefined}>
          <div className="flex items-center gap-1.5 mb-1">
            <Award className={`w-3 h-3 ${dark ? "text-orange-400" : "text-orange-500"}`} />
            <span className={t.statLabel}>Level</span>
          </div>
          <p className={`${t.statValue} capitalize`}>{ref.experienceLevel || "N/A"}</p>
        </div>
        <div className={t.statBox} style={dark ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" } : undefined}>
          <div className="flex items-center gap-1.5 mb-1">
            <IndianRupee className={`w-3 h-3 ${dark ? "text-emerald-400" : "text-emerald-500"}`} />
            <span className={t.statLabel}>Rate</span>
          </div>
          <p className={`${t.statValue} tabular-nums`}>
            {ref.rateAmount ? `₹${ref.rateAmount}` : "—"}
            {ref.rateType ? <span className={`text-[10px] ml-0.5 ${dark ? "text-gray-500" : "text-gray-400"} font-medium`}>/{ref.rateType}</span> : null}
          </p>
        </div>
      </div>

      {/* Sports */}
      {ref.sports?.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {ref.sports.map((s, i) => (
              <span key={i} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${t.sportPill}`}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hire CTA */}
      <div className="mt-auto px-4 pb-4">
        <button
          onClick={onHire}
          className="w-full h-9 inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
        >
          <Send className="w-3.5 h-3.5" /> Send hire request
        </button>
      </div>
    </article>
  );
}

// ── Hire modal ───────────────────────────────────────────────────────────────

function HireModal({ dark, target, form, setForm, sending, onClose, onSend }) {
  const t = dark
    ? {
        backdrop:   "bg-black/60 backdrop-blur-sm",
        card:       "bg-[#181A22]",
        cardBorder: "border border-white/[0.06] shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
        headerBorder: "border-b border-white/[0.06]",
        title:      "text-white",
        subtitle:   "text-gray-400",
        closeBtn:   "text-gray-500 hover:text-white hover:bg-white/5",
        label:      "text-gray-500 text-[11px] uppercase tracking-[0.06em] font-semibold",
        input:      "rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none",
        inputStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
        footerBorder: "border-t border-white/[0.06] bg-white/[0.02]",
        cancelBtn:  "text-gray-300 hover:text-white hover:bg-white/[0.06]",
        cancelStyle: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" },
      }
    : {
        backdrop:   "bg-black/50",
        card:       "bg-white",
        cardBorder: "",
        headerBorder: "border-b border-gray-100",
        title:      "text-gray-800",
        subtitle:   "text-gray-400",
        closeBtn:   "text-gray-400 hover:text-gray-600",
        label:      "text-gray-700 text-sm font-medium",
        input:      "rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-orange-400",
        inputStyle: undefined,
        footerBorder: "border-t border-gray-100",
        cancelBtn:  "text-gray-600 border border-gray-200 hover:bg-gray-50",
        cancelStyle: undefined,
      };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.backdrop}`} onClick={onClose}>
      <div
        className={`rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden ${t.card} ${t.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-5 py-4 flex justify-between items-start ${t.headerBorder}`}>
          <div className="min-w-0">
            <h3 className={`text-[14px] font-medium ${t.title}`}>Hire {target.userId?.name || "Referee"}</h3>
            <p className={`text-[12px] mt-0.5 ${t.subtitle}`}>They'll get this request in their app to accept or decline.</p>
          </div>
          <button onClick={onClose} className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition w-auto ${t.closeBtn}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <Field label="Tournament / event *" t={t}>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Summer Championship 2026"
              className={`w-full h-9 px-3 ${t.input}`} style={t.inputStyle} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sport" t={t}>
              <input type="text" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}
                className={`w-full h-9 px-3 ${t.input}`} style={t.inputStyle} />
            </Field>
            <Field label="Date" t={t}>
              <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className={`w-full h-9 px-3 ${t.input}`} style={t.inputStyle} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location" t={t}>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. City Sports Complex"
                className={`w-full h-9 px-3 ${t.input}`} style={t.inputStyle} />
            </Field>
            <Field label="Duration" t={t}>
              <input type="text" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="e.g. 2 days"
                className={`w-full h-9 px-3 ${t.input}`} style={t.inputStyle} />
            </Field>
          </div>
          <Field label="Offered payment (₹)" t={t}>
            <input type="text" value={form.offerPayment} onChange={(e) => setForm({ ...form, offerPayment: e.target.value })}
              placeholder="e.g. 2000"
              className={`w-full h-9 px-3 ${t.input}`} style={t.inputStyle} />
          </Field>
          <Field label="Message (optional)" t={t}>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} placeholder="Any details for the referee…"
              className={`w-full px-3 py-2.5 resize-none ${t.input}`} style={t.inputStyle} />
          </Field>
        </div>
        <div className={`px-5 py-3 flex justify-end gap-2 ${t.footerBorder}`}>
          <button onClick={onClose}
            className={`h-9 px-3.5 rounded-md text-[13px] font-semibold transition active:scale-[0.98] w-auto ${t.cancelBtn}`}
            style={t.cancelStyle}>
            Cancel
          </button>
          <button onClick={onSend} disabled={sending}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-orange-500/30 w-auto">
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send request
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, t, children }) {
  return (
    <div>
      <label className={`block mb-1.5 ${t.label}`}>{label}</label>
      {children}
    </div>
  );
}

export default HireReferees;
