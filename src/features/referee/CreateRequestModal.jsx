import { toast } from "react-toastify";
import { useState } from "react";
import { X } from "lucide-react";

const SPORTS_LIST = [
  "Badminton", "Table Tennis", "Tennis", "Cricket", "Football",
  "Basketball", "Volleyball", "Chess", "Carrom", "Pickleball", "Kabaddi",
];

const INITIAL_FORM = {
  club: "", positionType: "Main Referee", game: "", matchFee: "",
  date: "", time: "", venue: "", duration: "", contact: "", notes: "",
};

export default function CreateRequestModal({ isOpen, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ ...INITIAL_FORM });

  if (!isOpen) return null;

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSubmit = async () => {
    const required = ["game", "matchFee", "date", "time", "venue", "duration", "contact"];
    const missing = required.filter((f) => !form[f]);
    if (missing.length) { toast.info(`Missing: ${missing.join(", ")}`); return; }
    await onSubmit(form);
    setForm({ ...INITIAL_FORM });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Create Referee Request</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg w-auto">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <Field label="Club Name" value={form.club} onChange={(v) => set("club", v)} placeholder="Your club name" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sport">Sport *</label>
            <select id="sport"
              value={form.game}
              onChange={(e) => set("game", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select sport</option>
              {SPORTS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="position-type">Position Type</label>
            <select id="position-type"
              value={form.positionType}
              onChange={(e) => set("positionType", e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400"
            >
              {["Main Referee", "Assistant Referee", "Line Judge", "Umpire", "Scorer"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Match Fee (₹) *" value={form.matchFee} onChange={(v) => set("matchFee", v)} type="number" placeholder="500" />
            <Field label="Duration *" value={form.duration} onChange={(v) => set("duration", v)} placeholder="2 hours" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *" value={form.date} onChange={(v) => set("date", v)} type="date" />
            <Field label="Time *" value={form.time} onChange={(v) => set("time", v)} type="time" />
          </div>

          <Field label="Venue *" value={form.venue} onChange={(v) => set("venue", v)} placeholder="Stadium name, City" />
          <Field label="Contact *" value={form.contact} onChange={(v) => set("contact", v)} placeholder="Phone number" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">Notes</label>
            <textarea id="notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Any special requirements..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg w-auto">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 w-auto"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
      />
    </div>
  );
}
