import { useState } from "react";
// The shared client, not raw axios: it carries the base URL, the timeout and
// the auth/refresh interceptors. Inquiry.jsx still imports axios directly —
// that is a pre-existing violation, not a precedent to copy.
import { api } from "../../../shared/api";
import { Send, Loader2, CheckCircle2, CalendarDays, Users, MapPin } from "lucide-react";
import { SPORTS } from "../data";

const EMPTY = {
  name: "", phone: "", email: "", city: "",
  sports: "", eventDate: "", expectedEntries: "", message: "",
};

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-green-500/50 focus:bg-white/[0.05]";
const LABEL = "mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-white/45";

/**
 * The organizer's form, replacing the general Inquiry on this page.
 *
 * The difference that matters is not styling — it is that this one qualifies.
 * The general form collects a message; this collects the event date, the sport
 * and the expected size, which is what separates a live deal from a browser.
 * An organizer five weeks from their tournament is worth calling today; one
 * with no date is worth an email in six months. Sorting the inbox by
 * `eventDate` turns a pile of messages into a pipeline.
 *
 * Carries id="inquire" because that anchor previously lived on CTABanner,
 * which this page does not render — the hero button and the header's "Get
 * Started" both target it.
 */
export function OrganizerInquiry() {
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      // "Tournament" keeps organizer leads separable from the general inbox.
      // Path is /inquiries, not /api/inquiries — `api` already sets that base.
      await api.post("/inquiries", { ...form, inquiryType: "Tournament" });
      setSent(true);
      setForm(EMPTY);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="inquire" className="relative overflow-hidden border-t border-white/10 bg-[#0A0A0A] py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2"
        style={{ background: "radial-gradient(circle, rgba(21,167,101,0.13), transparent 68%)" }}
      />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 gap-14 px-6 sm:px-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:px-16">
        {/* pitch */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">
            Next step
          </p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
            When is your <span className="text-green-600">next tournament?</span>
          </h2>
          <p className="mt-5 leading-relaxed text-white/60">
            Tell us the date and roughly how many entries you expect. We will
            show you the draw running on your own sport, and give you a price
            for that event — same day.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              [CalendarDays, "Set up before your event", "Onboarding takes a day, not a fortnight."],
              [Users, "We run the first one with you", "Someone from our side is on the day itself."],
              [MapPin, "Your sport, your city", "Shown on a draw that looks like yours, not a demo."],
            ].map(([Icon, title, body]) => (
              <li key={title} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-green-600/15 text-green-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">{title}</span>
                  <span className="block text-sm text-white/50">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* form */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          {sent ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-green-600/15 text-green-400">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-2xl font-black text-white">Got it.</h3>
              <p className="mt-2 max-w-sm text-white/60">
                We will call you about your event. If it is close, we will call today.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-6 w-auto text-sm font-semibold uppercase tracking-wide text-green-400 hover:text-green-300"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="org-name">Your name</label>
                  <input id="org-name" required value={form.name} onChange={set("name")} className={FIELD} placeholder="Rahul Menon" />
                </div>
                <div>
                  <label className={LABEL} htmlFor="org-phone">Phone</label>
                  <input id="org-phone" required type="tel" value={form.phone} onChange={set("phone")} className={FIELD} placeholder="98765 43210" />
                </div>
              </div>

              <div>
                <label className={LABEL} htmlFor="org-email">Email</label>
                <input id="org-email" required type="email" value={form.email} onChange={set("email")} className={FIELD} placeholder="you@club.com" />
              </div>

              {/* The qualifying three */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="org-sport">Sport</label>
                  <select id="org-sport" value={form.sports} onChange={set("sports")} className={FIELD}>
                    <option value="">Select a sport</option>
                    {SPORTS.map((s) => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                    <option value="Multi-sport">Multi-sport event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="org-date">Event date</label>
                  <input id="org-date" type="date" value={form.eventDate} onChange={set("eventDate")} className={FIELD} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="org-entries">Expected entries</label>
                  <input id="org-entries" type="number" min="0" value={form.expectedEntries} onChange={set("expectedEntries")} className={FIELD} placeholder="64" />
                </div>
                <div>
                  <label className={LABEL} htmlFor="org-city">City</label>
                  <input id="org-city" value={form.city} onChange={set("city")} className={FIELD} placeholder="Pune" />
                </div>
              </div>

              <div>
                <label className={LABEL} htmlFor="org-message">Anything else?</label>
                <textarea id="org-message" rows={3} value={form.message} onChange={set("message")} className={FIELD} placeholder="Annual open, 4 categories, two venues…" />
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  That did not send. Try again, or call us on the number in the footer.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-green-500 disabled:opacity-60"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  <>Get a price for my event <Send className="h-4 w-4" /></>
                )}
              </button>
              <p className="text-center text-[11px] text-white/35">
                No obligation. We will not add you to a mailing list.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default OrganizerInquiry;
