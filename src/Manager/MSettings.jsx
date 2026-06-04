import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  User, Lock, Mail, Shield, Info, LogOut, Eye, Loader2, Check, X,
  Edit2,
} from "lucide-react";
import { ManagerShell } from "../shared/layout";

export default function MSettings() {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const managerId = auth?._id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName]   = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameInput, setNameInput]   = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError,   setPasswordError]   = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!managerId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await axios.get(`/api/managers/${managerId}/profile`);
        if (res.data?.success) {
          setProfile(res.data.manager);
          setNameInput(res.data.manager.name || "");
          setEmailInput(res.data.manager.email || "");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [managerId]);

  const handleSaveProfile = async (field) => {
    setSaving(true);
    try {
      const data = {};
      if (field === "name")  data.name  = nameInput.trim();
      if (field === "email") data.email = emailInput.trim();

      const res = await axios.put(`/api/managers/${managerId}/profile`, data);
      if (res.data?.success) {
        setProfile((p) => ({ ...p, ...res.data.manager }));
        toast.success(`${field === "name" ? "Name" : "Email"} updated!`);
        setEditingName(false);
        setEditingEmail(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await axios.put(`/api/managers/${managerId}/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (res.data?.success) {
        setPasswordSuccess("Password updated successfully!");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => { setShowPasswordModal(false); setPasswordSuccess(""); }, 1500);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  if (loading) {
    return (
      <ManagerShell searchPlaceholder="Search settings…">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-7 h-7 text-gray-500 animate-spin" />
        </div>
      </ManagerShell>
    );
  }

  const displayName = profile?.name || auth?.name || "Manager";
  const displayEmail = profile?.email || auth?.email || "—";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <ManagerShell searchPlaceholder="Search settings…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <User className="w-3.5 h-3.5" />
            Account · Settings
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Settings
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Manage your account, security, and preferences.
          </p>
        </div>
      </header>

      <div className="space-y-3 max-w-3xl">
        {/* Profile card */}
        <Section icon={User} title="Profile">
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-white/[0.06]">
            <div className="w-14 h-14 rounded-md bg-orange-500/15 grid place-items-center text-orange-400 text-[22px] font-medium">
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-medium text-white">{displayName}</h3>
              <p className="text-[12px] text-gray-400">{displayEmail}</p>
              <Pill className="bg-orange-500/15 text-orange-400 mt-1.5">Manager</Pill>
            </div>
          </div>

          {/* Name */}
          <EditableRow
            icon={User}
            label="Full name"
            value={profile?.name || auth?.name || "—"}
            editing={editingName}
            inputValue={nameInput}
            onInputChange={setNameInput}
            onEdit={() => setEditingName(true)}
            onCancel={() => { setEditingName(false); setNameInput(profile?.name || ""); }}
            onSave={() => handleSaveProfile("name")}
            saving={saving}
          />

          {/* Email */}
          <EditableRow
            icon={Mail}
            label="Email address"
            value={profile?.email || auth?.email || "—"}
            editing={editingEmail}
            inputValue={emailInput}
            onInputChange={setEmailInput}
            onEdit={() => setEditingEmail(true)}
            onCancel={() => { setEditingEmail(false); setEmailInput(profile?.email || ""); }}
            onSave={() => handleSaveProfile("email")}
            saving={saving}
            type="email"
          />

          {/* Account ID — read-only */}
          <div className="flex items-center gap-3 py-3">
            <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-gray-500">Account ID</p>
              <p className="text-[12px] text-gray-300 font-mono break-all">{managerId}</p>
            </div>
          </div>
        </Section>

        {/* Security */}
        <Section icon={Lock} title="Security">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between py-3 px-3 -mx-3 rounded-md hover:bg-white/[0.04] transition group w-auto"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition" />
              <div className="text-left">
                <p className="text-[13px] font-medium text-white">Change password</p>
                <p className="text-[12px] text-gray-400">Update your account password</p>
              </div>
            </div>
            <span className="text-[12px] font-semibold text-orange-400 opacity-0 group-hover:opacity-100 transition">Change →</span>
          </button>
        </Section>

        {/* About */}
        <Section icon={Info} title="About">
          <div className="space-y-2.5">
            <InfoRow label="App name" value="Chalo Khelne" />
            <InfoRow label="Version"  value="v2.0.0" />
            <InfoRow label="Role"     value="Manager" />
            <InfoRow label="Support"  value="support@chalokhelne.com" />
          </div>
          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-white/[0.06]">
            <a href="/l/terms-and-conditions" className="text-[12px] text-orange-400 font-medium hover:text-orange-300 transition">Terms & Conditions</a>
            <a href="/l/privacy-policy"        className="text-[12px] text-orange-400 font-medium hover:text-orange-300 transition">Privacy Policy</a>
            <a href="/l/faq"                   className="text-[12px] text-orange-400 font-medium hover:text-orange-300 transition">FAQs</a>
          </div>
        </Section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-lg text-red-400 font-semibold text-[13px] transition active:scale-[0.98] hover:bg-red-500/10 w-auto"
          style={{ border: "1px solid rgba(248,113,113,0.25)" }}
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* Password modal */}
      {showPasswordModal && (
        <DarkModal
          title="Change password"
          subtitle="Update your account password."
          onClose={() => { setShowPasswordModal(false); setPasswordError(""); setPasswordSuccess(""); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }}
        >
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <PasswordInput label="Current password" value={passwordForm.currentPassword}
              onChange={(v) => setPasswordForm((p) => ({ ...p, currentPassword: v }))} />
            <PasswordInput label="New password" value={passwordForm.newPassword}
              onChange={(v) => setPasswordForm((p) => ({ ...p, newPassword: v }))} minLength={6} />
            <PasswordInput label="Confirm new password" value={passwordForm.confirmPassword}
              onChange={(v) => setPasswordForm((p) => ({ ...p, confirmPassword: v }))} minLength={6} />

            {passwordError && (
              <div className="px-3 py-2 rounded-md text-[12px] font-medium text-red-300"
                style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="px-3 py-2 rounded-md text-[12px] font-medium text-emerald-300"
                style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
                {passwordSuccess}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <DarkButton type="button" variant="ghost" className="flex-1"
                onClick={() => { setShowPasswordModal(false); setPasswordError(""); }}>
                Cancel
              </DarkButton>
              <DarkButton type="submit" className="flex-1" disabled={changingPassword}>
                {changingPassword ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…</> : "Update password"}
              </DarkButton>
            </div>
          </form>
        </DarkModal>
      )}
    </ManagerShell>
  );
}

// ── Dark inline primitives ───────────────────────────────────────────────────

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center">
          <Icon className="w-3.5 h-3.5 text-orange-400" />
        </span>
        <h3 className="text-[13px] font-medium text-white">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function EditableRow({ icon: Icon, label, value, editing, inputValue, onInputChange, onEdit, onCancel, onSave, saving, type = "text" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-white/[0.04] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-gray-500">{label}</p>
          {editing ? (
            <input
              type={type}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              autoFocus
              className="mt-0.5 text-[13px] font-medium text-white bg-transparent outline-none border-b border-orange-500 py-0.5 w-64 max-w-full"
            />
          ) : (
            <p className="text-[13px] font-medium text-white truncate">{value}</p>
          )}
        </div>
      </div>
      {editing ? (
        <div className="flex gap-1 flex-shrink-0">
          <IconBtn onClick={onSave} title="Save" disabled={saving} tone="emerald">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </IconBtn>
          <IconBtn onClick={onCancel} title="Cancel">
            <X className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      ) : (
        <IconBtn onClick={onEdit} title="Edit">
          <Edit2 className="w-3.5 h-3.5" />
        </IconBtn>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-gray-400">{label}</span>
      <span className="text-[13px] font-medium text-white">{value}</span>
    </div>
  );
}

function Pill({ className, children }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}

function IconBtn({ children, onClick, title, disabled, tone }) {
  const tones = {
    emerald: "text-emerald-400 hover:bg-emerald-500/10",
    default: "text-gray-500 hover:text-white hover:bg-white/5",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition disabled:opacity-50 w-auto ${tones[tone] || tones.default}`}
    >
      {children}
    </button>
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

function DarkModal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#181A22] border border-white/[0.06] rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.5)] max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-white">{title}</p>
            {subtitle && <p className="text-[12px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition flex-shrink-0 w-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange, minLength }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          className="w-full h-9 px-3 pr-9 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/5 transition w-auto"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
