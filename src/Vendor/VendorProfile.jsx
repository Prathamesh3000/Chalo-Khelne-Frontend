import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Store, Save } from "lucide-react";

const EMPTY = {
  businessName: "", ownerName: "", phone: "", category: "", description: "", website: "", gstNumber: "",
  address: { line: "", city: "", state: "", pincode: "" },
};

export default function VendorProfile() {
  const [form, setForm] = useState(EMPTY);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/vendors/me");
        const d = res.data.data || {};
        setForm({
          businessName: d.businessName || "",
          ownerName: d.ownerName || "",
          phone: d.phone || "",
          category: d.category || "",
          description: d.description || "",
          website: d.website || "",
          gstNumber: d.gstNumber || "",
          address: {
            line: d.address?.line || "",
            city: d.address?.city || "",
            state: d.address?.state || "",
            pincode: d.address?.pincode || "",
          },
        });
        setEmail(d.email || "");
        setStatus(d.status || "active");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.ownerName.trim()) {
      toast.info("Business name and owner name are required");
      return;
    }
    setSaving(true);
    try {
      await axios.patch("/api/vendors/me", form);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading profile…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <Store className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Store Profile</h1>
          <p className="text-sm text-gray-500">{email} · {status === "suspended" ? "Suspended" : "Active"}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business name" required value={form.businessName} onChange={(v) => set("businessName", v)} />
          <Field label="Owner name" required value={form.ownerName} onChange={(v) => set("ownerName", v)} />
          <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="Category" value={form.category} onChange={(v) => set("category", v)} placeholder="Rackets, Apparel, General…" />
          <Field label="Website" value={form.website} onChange={(v) => set("website", v)} placeholder="https://…" />
          <Field label="GST number" value={form.gstNumber} onChange={(v) => set("gstNumber", v)} />
        </div>

        <div>
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            placeholder="Tell players about your store…"
          />
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Address line" value={form.address.line} onChange={(v) => setAddr("line", v)} />
            <Field label="City" value={form.address.city} onChange={(v) => setAddr("city", v)} />
            <Field label="State" value={form.address.state} onChange={(v) => setAddr("state", v)} />
            <Field label="Pincode" value={form.address.pincode} onChange={(v) => setAddr("pincode", v)} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 w-auto bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Field({ label, value, onChange, required, placeholder }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
      />
    </div>
  );
}
