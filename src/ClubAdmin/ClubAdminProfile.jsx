import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";
import { Pencil, X, Plus, Save, Building2, Users, Clock, FileText, UserCog } from "lucide-react";
import { ClubAdminShell } from "../shared/layout";

const EMPTY_CONTACT = { contactPersonName: "", designation: "", contactNumber: "" };
const EMPTY_FORM = {
  name: "", email: "", mobile: "", address: "", area: "", city: "",
  typeOfRegistration: "Private", registrationDate: "",
  sports: "", noOfPlayers: "", timeToOpen: "", timeToClose: "",
  contacts: [{ ...EMPTY_CONTACT }],
  clubPhotosID: "", clubVideosID: "", addressLink: "",
  validityDate: "", locations: "", authorizations: "",
};

const ClubAdminProfile = () => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user?._id) localStorage.setItem("userId", user._id);
  }, [user]);

  const userId = localStorage.getItem("userId");

  const [formData, setFormData] = useState({
    ...EMPTY_FORM,
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
  });
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`/api/clubadminprofile/${userId}`);
      const data = res.data;
      const profile = data.clubProfile || {};
      setFormData({
        name: data.name || user?.name || "",
        email: data.email || user?.email || "",
        mobile: data.mobile || user?.mobile || "",
        address: profile.address || "",
        area: profile.area || "",
        city: profile.city || "",
        typeOfRegistration: profile.typeOfRegistration || "Private",
        registrationDate: profile.registrationDate || "",
        sports: profile.sports || "",
        noOfPlayers: profile.noOfPlayers || "",
        timeToOpen: profile.timeToOpen || "",
        timeToClose: profile.timeToClose || "",
        contacts: profile.contacts?.length > 0 ? profile.contacts : [{ ...EMPTY_CONTACT }],
        clubPhotosID: profile.clubPhotosID || "",
        clubVideosID: profile.clubVideosID || "",
        addressLink: profile.addressLink || "",
        validityDate: profile.validityDate || "",
        locations: profile.locations || "",
        authorizations: profile.authorizations || "",
      });
      setIsNewProfile(false);
    } catch (error) {
      setIsNewProfile(true);
    }
  };

  const handleChange = (e, index = null, field = null) => {
    const { name, value } = e.target;
    if (index !== null && field) {
      const updatedContacts = [...formData.contacts];
      updatedContacts[index] = { ...updatedContacts[index], [field]: value };
      setFormData({ ...formData, contacts: updatedContacts });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addContact = () => {
    setFormData({ ...formData, contacts: [...formData.contacts, { ...EMPTY_CONTACT }] });
  };

  const removeContact = (index) => {
    if (formData.contacts.length <= 1) return;
    setFormData({ ...formData, contacts: formData.contacts.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNewProfile) {
        await axios.post("/api/clubadminprofile/", { userId, ...formData });
        toast.success("Profile created successfully!");
      } else {
        await axios.put(`/api/clubadminprofile/${userId}`, formData);
        toast.success("Profile updated successfully!");
      }
      fetchProfile();
      setIsEditable(false);
    } catch (error) {
      console.error("Error submitting form:", error.response?.data || error.message);
      toast.error("An error occurred while submitting the form.");
    } finally {
      setSaving(false);
    }
  };

  const ro = !isEditable;
  const dateValue = (d) => (d ? String(d).split("T")[0] : "");

  return (
    <ClubAdminShell searchPlaceholder="Search profile…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <UserCog className="w-3.5 h-3.5" />
            Account · Profile
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            {isNewProfile ? "Create club profile" : "Club profile"}
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Keep your club details accurate — players see this on the public listing.
          </p>
        </div>
        {!isEditable ? (
          <DarkButton onClick={() => setIsEditable(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </DarkButton>
        ) : (
          <DarkButton variant="ghost" onClick={() => { fetchProfile(); setIsEditable(false); }}>
            <X className="w-3.5 h-3.5" /> Cancel
          </DarkButton>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-5xl">
        <Section title="Basic information" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DarkInput label="Club name" name="name"   value={formData.name}   onChange={handleChange} placeholder="e.g. Striker's Arena" readOnly={ro} required />
            <DarkInput label="Email"     name="email"  value={formData.email}  onChange={handleChange} placeholder="club@example.com"     type="email" readOnly={ro} required />
            <DarkInput label="Mobile"    name="mobile" value={formData.mobile} onChange={handleChange} placeholder="10-digit number"      readOnly={ro} required />
            <DarkInput label="Address"   name="address" value={formData.address} onChange={handleChange} placeholder="Street / building" readOnly={ro} />
            <DarkInput label="Area"      name="area"    value={formData.area}    onChange={handleChange} placeholder="Neighborhood"      readOnly={ro} />
            <DarkInput label="City"      name="city"    value={formData.city}    onChange={handleChange} placeholder="City"              readOnly={ro} />
          </div>
        </Section>

        <Section title="Club details" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DarkSelect label="Type of registration" name="typeOfRegistration" value={formData.typeOfRegistration} onChange={handleChange} disabled={ro}>
              <option value="Private" className="bg-[#181A22]">Private</option>
              <option value="Govt"    className="bg-[#181A22]">Govt</option>
            </DarkSelect>
            <DarkInput label="Registration date" type="date" name="registrationDate" value={dateValue(formData.registrationDate)} onChange={handleChange} readOnly={ro} />
            <DarkInput label="Sports offered" name="sports" value={formData.sports} onChange={handleChange} placeholder="Cricket, Football…" readOnly={ro} />
            <DarkInput label="No. of players" type="number" name="noOfPlayers" value={formData.noOfPlayers} onChange={handleChange} placeholder="Approx capacity" readOnly={ro} />
          </div>
        </Section>

        <Section title="Operating hours" icon={Clock}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DarkInput label="Time to open"  type="time" name="timeToOpen"  value={formData.timeToOpen}  onChange={handleChange} readOnly={ro} />
            <DarkInput label="Time to close" type="time" name="timeToClose" value={formData.timeToClose} onChange={handleChange} readOnly={ro} />
          </div>
        </Section>

        <Section
          title="Contact persons"
          icon={Users}
          actionLabel={isEditable ? "Add contact" : undefined}
          onAction={isEditable ? addContact : undefined}
        >
          <div className="space-y-3">
            {formData.contacts.map((contact, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 relative pr-9">
                <DarkInput label="Name"           value={contact.contactPersonName} onChange={(e) => handleChange(e, index, "contactPersonName")} placeholder="Person name" readOnly={ro} />
                <DarkInput label="Designation"    value={contact.designation}       onChange={(e) => handleChange(e, index, "designation")}       placeholder="Role"        readOnly={ro} />
                <DarkInput label="Contact number" value={contact.contactNumber}     onChange={(e) => handleChange(e, index, "contactNumber")}     placeholder="Phone"       readOnly={ro} />
                {isEditable && formData.contacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="absolute top-6 right-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"
                    aria-label="Remove contact"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {isEditable && (
              <DarkButton type="button" variant="ghost" onClick={addContact}>
                <Plus className="w-3.5 h-3.5" /> Add another contact
              </DarkButton>
            )}
          </div>
        </Section>

        <Section title="Documents & references" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DarkInput label="Photos ID"      name="clubPhotosID"  value={formData.clubPhotosID}   onChange={handleChange} placeholder="Drive / cloud ID"  readOnly={ro} />
            <DarkInput label="Videos ID"      name="clubVideosID"  value={formData.clubVideosID}   onChange={handleChange} placeholder="Drive / cloud ID"  readOnly={ro} />
            <DarkInput label="Address link"   name="addressLink"   value={formData.addressLink}    onChange={handleChange} placeholder="Google Maps URL"   readOnly={ro} />
            <DarkInput label="Validity date"  type="date" name="validityDate" value={dateValue(formData.validityDate)} onChange={handleChange} readOnly={ro} />
            <DarkInput label="Locations"      name="locations"     value={formData.locations}      onChange={handleChange} placeholder="Branch locations"  readOnly={ro} />
            <DarkInput label="Authorizations" name="authorizations" value={formData.authorizations} onChange={handleChange} placeholder="Licenses / approvals" readOnly={ro} />
          </div>
        </Section>

        {isEditable && (
          <div className="flex justify-end gap-2 pt-2 pb-6">
            <DarkButton type="button" variant="ghost" onClick={() => { fetchProfile(); setIsEditable(false); }} disabled={saving}>
              Cancel
            </DarkButton>
            <DarkButton type="submit" disabled={saving}>
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving…" : isNewProfile ? "Create profile" : "Save changes"}
            </DarkButton>
          </div>
        )}
      </form>
    </ClubAdminShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

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

function Section({ title, icon: Icon, actionLabel, onAction, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
          <h3 className="text-[13px] font-medium text-white">{title}</h3>
        </div>
        {actionLabel && onAction && (
          <button type="button" onClick={onAction}
            className="text-[12px] font-semibold inline-flex items-center gap-1 transition text-orange-400 hover:text-orange-300 w-auto">
            <Plus className="w-3 h-3" /> {actionLabel}
          </button>
        )}
      </div>
      {children}
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

function DarkSelect({ label, children, disabled, ...rest }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <select
        {...rest}
        disabled={disabled}
        className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none disabled:opacity-70"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {children}
      </select>
    </div>
  );
}

export default ClubAdminProfile;
