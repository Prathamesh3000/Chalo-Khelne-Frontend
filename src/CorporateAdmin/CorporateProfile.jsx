import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import {
  Building2, Pencil, Check, X, User, Loader2, Save,
} from "lucide-react";
import { CorporateShell } from "../shared/layout";

const EMPTY_FORM = {
  companyName: "",
  industryType: "",
  companySize: "",
  location: "",
  hrContact: { name: "", designation: "", contactNumber: "", email: "" },
};

const CorporateProfile = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (user?._id) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/corporate/${user._id}`);
      const profile = res.data.corporateProfile;
      if (profile) {
        setFormData({
          companyName: profile.companyName || "",
          industryType: profile.industryType || "",
          companySize: profile.companySize || "",
          location: profile.location || "",
          hrContact: profile.hrContact || { name: "", designation: "", contactNumber: "", email: "" },
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("hr_")) {
      const field = name.split("hr_")[1];
      setFormData((prev) => ({ ...prev, hrContact: { ...prev.hrContact, [field]: value } }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`/api/corporate/${user._id}`, formData);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const ro = !isEditing;

  if (loading) {
    return (
      <CorporateShell searchPlaceholder="Search profile…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </CorporateShell>
    );
  }

  return (
    <CorporateShell searchPlaceholder="Search profile…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Building2 className="w-3.5 h-3.5" />
            Account · Company profile
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Corporate profile
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Keep your company details current. HR contact info is used to coordinate tournament logistics.
          </p>
        </div>
        {!isEditing ? (
          <DarkButton onClick={() => setIsEditing(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit profile
          </DarkButton>
        ) : (
          <div className="flex gap-2">
            <DarkButton variant="ghost" onClick={() => { setIsEditing(false); fetchProfile(); }} disabled={saving}>
              <X className="w-3.5 h-3.5" /> Cancel
            </DarkButton>
            <DarkButton onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save changes</>}
            </DarkButton>
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-5xl">
        <Section title="Company information" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DarkInput label="Company name"           name="companyName"  value={formData.companyName}  onChange={handleChange} readOnly={ro} placeholder="e.g. Vedant Corp" />
            <DarkInput label="Industry type"          name="industryType" value={formData.industryType} onChange={handleChange} readOnly={ro} placeholder="e.g. IT Services" />
            <DarkInput label="Company size"           name="companySize"  value={formData.companySize}  onChange={handleChange} readOnly={ro} placeholder="e.g. 50-200" />
            <DarkInput label="Headquarters location"  name="location"     value={formData.location}     onChange={handleChange} readOnly={ro} placeholder="City, Country" />
          </div>
        </Section>

        <Section title="HR / Contact person" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DarkInput label="Full name"        name="hr_name"          value={formData.hrContact.name}          onChange={handleChange} readOnly={ro} placeholder="HR contact name" />
            <DarkInput label="Designation"      name="hr_designation"   value={formData.hrContact.designation}   onChange={handleChange} readOnly={ro} placeholder="e.g. HR Manager" />
            <DarkInput label="Work email"       name="hr_email"  type="email" value={formData.hrContact.email}   onChange={handleChange} readOnly={ro} placeholder="hr@company.com" />
            <DarkInput label="Contact number"   name="hr_contactNumber" value={formData.hrContact.contactNumber} onChange={handleChange} readOnly={ro} placeholder="10-digit number" />
          </div>
        </Section>

        {isEditing && (
          <div className="flex justify-end gap-2 pt-2 pb-6">
            <DarkButton type="button" variant="ghost" onClick={() => { setIsEditing(false); fetchProfile(); }} disabled={saving}>
              Cancel
            </DarkButton>
            <DarkButton type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Check className="w-3.5 h-3.5" /> Save changes</>}
            </DarkButton>
          </div>
        )}
      </form>
    </CorporateShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function Section({ title, icon: Icon, children }) {
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

function DarkInput({ label, ...rest }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <input
        {...rest}
        className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none read-only:opacity-70"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      />
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

export default CorporateProfile;
