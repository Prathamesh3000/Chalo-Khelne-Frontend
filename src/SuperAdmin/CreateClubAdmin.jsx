import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Building2, Mail, Phone, User, MapPin, Loader2, Check, Copy, RotateCcw, Briefcase, Trophy, UserPlus,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";

const initialForm = {
  name: "", email: "", phone: "", designation: "Admin",
  clubName: "", sports: "", city: "", area: "", address: "",
};

export default function CreateClubAdmin() {
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/clubadminprofile/onboard", formData);
      setGeneratedCredentials(res.data.credentials || { email: formData.email, password: res.data.password || "Sent via email" });
      toast.success("Club admin account created successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(initialForm);
    setGeneratedCredentials(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <SuperAdminShell searchPlaceholder="Search admin…">
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
          <UserPlus className="w-3.5 h-3.5" />
          Clubs · Create club admin
        </p>
        <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
          Create club admin
        </h1>
        <p className="mt-1 text-[13px] text-gray-400">
          Directly onboard a club admin without an inquiry. Account credentials will be auto-generated and emailed.
        </p>
      </header>

      {generatedCredentials ? (
        // Success state
        <div className="bg-[#181A22] border border-emerald-500/25 rounded-lg overflow-hidden max-w-2xl">
          <div className="p-5 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.06) 100%)", borderBottom: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="w-11 h-11 rounded-md bg-emerald-500/25 grid place-items-center flex-shrink-0">
              <Check className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-medium text-white">Account created successfully!</h3>
              <p className="text-[12px] text-emerald-200/80">An email has been sent with these credentials.</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="rounded-md p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email</p>
                  <p className="text-[13px] font-semibold text-white mt-0.5 truncate">{generatedCredentials.email}</p>
                </div>
                <button onClick={() => copyToClipboard(generatedCredentials.email)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-orange-400 hover:bg-orange-500/15 transition flex-shrink-0 w-auto">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password</p>
                  <p className="text-[13px] font-semibold text-white mt-0.5 font-mono">{generatedCredentials.password}</p>
                </div>
                <button onClick={() => copyToClipboard(generatedCredentials.password)}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-orange-400 hover:bg-orange-500/15 transition flex-shrink-0 w-auto">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <DarkButton onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" /> Create another
              </DarkButton>
            </div>
          </div>
        </div>
      ) : (
        // Form
        <form onSubmit={handleSubmit} className="space-y-3 max-w-4xl">
          <Section icon={User} title="Admin details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DarkInput label="Full name *"  name="name"        value={formData.name}        onChange={handleChange} placeholder="John Doe" required />
              <DarkInput label="Designation"  name="designation" value={formData.designation} onChange={handleChange} placeholder="Admin"    required icon={Briefcase} />
              <DarkInput label="Email * (used for login)" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="admin@club.com" required icon={Mail} />
              <DarkInput label="Phone number *"           name="phone" type="tel"   value={formData.phone} onChange={handleChange} placeholder="+91 9876543210" required icon={Phone} />
            </div>
          </Section>

          <Section icon={Building2} title="Club details">
            <DarkInput label="Club name *" name="clubName" value={formData.clubName} onChange={handleChange} placeholder="Alpha Sports Club" required icon={Building2} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <DarkInput label="City *"  name="city"  value={formData.city}  onChange={handleChange} placeholder="Mumbai"        required />
              <DarkInput label="Area *"  name="area"  value={formData.area}  onChange={handleChange} placeholder="Andheri West"  required />
              <DarkInput label="Sports * (comma separated)" name="sports" value={formData.sports} onChange={handleChange} placeholder="Cricket, Football" required icon={Trophy} />
            </div>

            <div className="mt-3">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Detailed address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <textarea name="address" required rows={2} value={formData.address} onChange={handleChange}
                  placeholder="123 Main Street, Building, Landmark…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
              </div>
            </div>
          </Section>

          <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <DarkButton type="submit" disabled={isSubmitting} className="md:px-12">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating account…</> : <><Check className="w-3.5 h-3.5" /> Create account & send credentials</>}
            </DarkButton>
            <DarkButton type="button" variant="ghost" onClick={handleReset}>
              Reset
            </DarkButton>
          </div>
        </form>
      )}
    </SuperAdminShell>
  );
}

// ── Hoisted inline primitives (don't define inside the page component or
// keyboard focus drops on every keystroke; see memory note) ──────────────────

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-orange-400" />
        </span>
        <h3 className="text-[13px] font-medium text-white">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function DarkInput({ label, icon: Icon, ...rest }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />}
        <input
          {...rest}
          className={`w-full h-9 ${Icon ? "pl-9" : "pl-3"} pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none`}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        />
      </div>
    </div>
  );
}

function DarkButton({ children, onClick, variant = "primary", type = "button", disabled, className = "" }) {
  const base = "h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-md transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-auto";
  if (variant === "ghost") {
    return (
      <button type={type} onClick={onClick} disabled={disabled}
        className={`${base} text-gray-200 hover:text-white hover:bg-white/[0.06] ${className}`}
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {children}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/30 ${className}`}>
      {children}
    </button>
  );
}
