import { useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import { Send, Loader2, Clock, Zap, ShieldCheck, ChevronDown, CheckCircle2 } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EMPTY = { name: "", email: "", phone: "", inquiryType: "Product", message: "", clubName: "", city: "", sports: "" };

const TYPES = [
  ["Product", "General Inquiry"],
  ["Service", "Booking Support"],
  ["Partnership", "Partnership"],
  ["Register Club", "Register Club / Corporate"],
  ["Other", "Other"],
];

const POINTS = [
  { icon: Clock, title: "24-hour response", desc: "Our team replies within one business day." },
  { icon: Zap, title: "1-day onboarding", desc: "Club Admin account provisioned fast." },
  { icon: ShieldCheck, title: "No setup fees", desc: "No migration drama, no hidden costs." },
];

const FIELD = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-green-500/50 focus:bg-white/[0.05]";

export function Inquiry() {
  const rootRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(null); // null | "error"
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isClub = form.inquiryType === "Register Club";

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await axios.post("/api/inquiries", form);
      setSent(true);
      setForm(EMPTY);
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".contact-anim", { y: 28, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out", immediateRender: false, scrollTrigger: { trigger: rootRef.current, start: "top 78%", once: true } });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="contact" ref={rootRef} className="relative overflow-hidden bg-[#0A0A0A] py-24">
      <div aria-hidden className="pointer-events-none absolute -left-20 top-1/3 h-[28rem] w-[28rem]" style={{ background: "radial-gradient(circle, rgba(21,167,101,0.11), transparent 68%)" }} />

      <div className="relative mx-auto grid max-w-[1300px] grid-cols-1 gap-12 px-6 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-16">
        {/* Left — copy */}
        <div>
          <p className="contact-anim font-mono text-xs font-bold uppercase tracking-[0.35em] text-green-500">Contact</p>
          <h2 className="contact-anim mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Let's get you <span className="text-green-600">on the field.</span>
          </h2>
          <p className="contact-anim mt-5 max-w-md text-lg leading-relaxed text-white/65">
            Questions, a booking issue, or ready to bring your club onboard? Send
            us a note and we'll take it from there.
          </p>

          <div className="contact-anim mt-9 space-y-4">
            {POINTS.map((p) => (
              <div key={p.title} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-600/10 text-green-500">
                  <p.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-bold text-white">{p.title}</div>
                  <div className="text-sm text-white/50">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form card */}
        <div className="contact-anim rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          {sent ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-green-500/25 bg-green-500/10 text-green-400">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <p className="mt-5 text-2xl font-black text-white">Message sent!</p>
              <p className="mt-2 max-w-xs text-sm text-white/55">
                Our team will get back to you shortly. A confirmation has been
                sent to your email.
              </p>
              <button type="button" onClick={() => setSent(false)} className="mt-6 w-auto text-sm font-bold uppercase tracking-wide text-green-400 hover:text-green-300">
                Send another →
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input className={FIELD} type="text" required placeholder="Full name *" value={form.name} onChange={set("name")} />
                <input className={FIELD} type="email" required placeholder="Email *" value={form.email} onChange={set("email")} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input className={FIELD} type="tel" placeholder="Phone" value={form.phone} onChange={set("phone")} />
                <div className="relative">
                  <select className={`${FIELD} appearance-none pr-10`} value={form.inquiryType} onChange={set("inquiryType")}>
                    {TYPES.map(([v, l]) => (
                      <option key={v} value={v} className="bg-[#0E0E0E]">{l}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                </div>
              </div>

              {isClub && (
                <div className="space-y-4 rounded-2xl border border-green-600/20 bg-green-600/[0.04] p-4">
                  <input className={FIELD} type="text" required placeholder="Club / Company name *" value={form.clubName} onChange={set("clubName")} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input className={FIELD} type="text" required placeholder="City *" value={form.city} onChange={set("city")} />
                    <input className={FIELD} type="text" required placeholder="Sports (e.g. Cricket) *" value={form.sports} onChange={set("sports")} />
                  </div>
                </div>
              )}

              <textarea className={`${FIELD} resize-none`} rows="4" placeholder="How can we help?" value={form.message} onChange={set("message")} />

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-500 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send message</>}
              </button>

              {status === "error" && (
                <p className="text-center text-xs font-semibold text-red-400">Failed to send. Please try again.</p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default Inquiry;
