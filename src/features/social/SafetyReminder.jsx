import { ShieldCheck, UserX, AlertCircle, Hand, Flag } from "lucide-react";

import DialogA11y from "../../shared/components/DialogA11y";
/**
 * In-app safety reminder (Families Policy) — shown to MINOR users before they
 * exchange freeform media or information (creating a post or a story). Mirrors
 * the mobile SafetyReminder.
 *
 * Props: open, onAcknowledge, onCancel, dark
 */
const TIPS = [
  { Icon: UserX, text: "Don't share personal info (your address, school, phone number, or passwords) with people you don't know in real life." },
  { Icon: AlertCircle, text: "People online may not be who they say they are. Be careful what you share." },
  { Icon: Hand, text: "Never agree to meet someone in person that you only know from online." },
  { Icon: Flag, text: "If something makes you uncomfortable, stop and tell a parent or trusted adult." },
];

export default function SafetyReminder({ open, onAcknowledge, onCancel, dark = false }) {
  if (!open) return null;

  const t = dark
    ? { card: "bg-[#181A22] border border-white/[0.08]", title: "text-white", sub: "text-gray-400", tip: "text-gray-200", secondary: "text-gray-400 hover:text-white" }
    : { card: "bg-white shadow-xl", title: "text-gray-900", sub: "text-gray-500", tip: "text-gray-700", secondary: "text-gray-500 hover:text-gray-800" };

  return (
    <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
        onClick={onCancel}
      >
        <DialogA11y onClose={onCancel} />
      <div
        className={`w-full max-w-md rounded-2xl p-6 ${t.card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
          </div>
        </div>
        <h3 className={`text-lg font-bold text-center ${t.title}`}>Stay safe online</h3>
        <p className={`text-[13px] text-center mt-1 mb-4 ${t.sub}`}>
          Talking to others online has real-world risks. Please keep these in mind
          before you post or share anything.
        </p>

        <div className="space-y-3 mb-5">
          {TIPS.map(({ Icon, text }, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Icon className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className={`text-[13px] leading-snug ${t.tip}`}>{text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onAcknowledge}
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[14px] font-semibold transition"
        >
          I understand
        </button>
        <button
          onClick={onCancel}
          className={`w-full h-10 mt-1 text-[13px] font-medium transition ${t.secondary}`}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
