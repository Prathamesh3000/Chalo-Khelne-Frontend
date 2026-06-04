import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Store, Check, RefreshCcw, ChevronLeft, ChevronRight, CheckCircle2, Upload, Lock,
} from "lucide-react";

const BUSINESS_TYPES = [
  "Sports Equipment Store", "Sports Apparel Store", "Nutrition Store",
  "Trophy & Awards Store", "Turf Equipment Supplier", "Multi-Sports Store", "Other",
];
const SPORTS_CATEGORIES = [
  "Cricket", "Football", "Tennis", "Badminton", "Table Tennis",
  "Basketball", "Volleyball", "Swimming", "Athletics",
];
const PRODUCT_CATEGORIES = [
  "Equipment", "Apparel", "Shoes", "Accessories", "Nutrition",
  "Training Gear", "Trophies & Medals",
];
const DELIVERY_OPTIONS = ["Store Pickup", "Local Delivery", "Nationwide Delivery"];
const PERMISSION_GROUPS = [
  { group: "Product Management", keys: [["addProducts", "Add Products"], ["editProducts", "Edit Products"], ["deleteProducts", "Delete Products"]] },
  { group: "Order Management", keys: [["viewOrders", "View Orders"], ["manageOrders", "Manage Orders"], ["cancelOrders", "Cancel Orders"]] },
  { group: "Customer Management", keys: [["viewCustomers", "View Customers"], ["contactCustomers", "Contact Customers"]] },
  { group: "Financial Access", keys: [["viewEarnings", "View Earnings"], ["downloadInvoices", "Download Invoices"]] },
  { group: "Marketing Access", keys: [["createOffers", "Create Offers"], ["createCoupons", "Create Coupons"]] },
];

const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.keys.map(([k]) => k));
const INITIAL = {
  businessName: "", businessType: "Sports Equipment Store", ownerName: "", phone: "", email: "",
  address: { line: "", city: "", state: "", country: "", postalCode: "" },
  location: { mapUrl: "", lat: "", lng: "" },
  gstNumber: "", panNumber: "", businessRegNumber: "", licenseNumber: "",
  sportsCategories: [], productCategories: [],
  businessModel: "Retail", deliveryOptions: [], paymentSettlement: "Monthly", commissionPercent: "",
  username: "", credentialDelivery: "email",
  permissions: Object.fromEntries(ALL_PERMS.map((k) => [k, false])),
  description: "", storeHighlights: "", workingHours: "",
  inventory: { productCategories: [], skuPrefix: "", stockAlerts: false },
};

const STEPS = [
  "Basic Information", "Business Address", "Business Information", "Category Selection",
  "Vendor Settings", "Account Credentials", "Permissions", "Branding", "Inventory Setup", "Review & Create",
];

// ── compact dark UI atoms ──
const Label = ({ children, required }) => (
  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
    {children}{required && <span className="text-red-400 ml-1">*</span>}
  </label>
);
const Inp = (props) => (
  <input {...props} className={"w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40 " + (props.className || "")} />
);
const Sel = ({ value, onChange, options }) => (
  <select value={value} onChange={onChange} className="w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none">
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);
const Chips = ({ options, selected, onToggle }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => {
      const active = selected.includes(o);
      return (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-2.5 h-7 w-auto rounded-md text-[11px] font-medium border transition ${active ? "bg-orange-500/15 border-orange-400/40 text-orange-200" : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:border-white/[0.16]"}`}>
          {o}
        </button>
      );
    })}
  </div>
);
const UploadStub = ({ label }) => (
  <div className="flex items-center gap-2 px-3 h-9 bg-[#0F1117] border border-dashed border-white/[0.12] rounded-md text-[12px] text-gray-500">
    <Upload className="w-3.5 h-3.5" /> {label}
    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-gray-600"><Lock className="w-3 h-3" /> soon</span>
  </div>
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const Err = ({ msg }) => (msg ? <p className="text-[11px] text-red-400 mt-1">{msg}</p> : null);

export default function CreateVendorTab({ onCreated }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [errors, setErrors] = useState({});
  const [maxReached, setMaxReached] = useState(0); // furthest validated step (controls stepper jumps)

  const clearErr = (key) =>
    setErrors((e) => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n; });

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); clearErr(k); };
  const setIn = (group, k, v) => { setForm((f) => ({ ...f, [group]: { ...f[group], [k]: v } })); clearErr(`${group}.${k}`); };
  const toggleArr = (k, v) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  const togglePerm = (k) => setForm((f) => ({ ...f, permissions: { ...f.permissions, [k]: !f.permissions[k] } }));

  // Required-field validation per step. Only steps that have starred fields
  // gate "Next" (Step 1 Basic, Step 2 Address); the rest have no required fields.
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.businessName.trim()) e.businessName = "Required";
      if (!form.ownerName.trim()) e.ownerName = "Required";
      if (!form.phone.trim()) e.phone = "Required";
      if (!form.email.trim()) e.email = "Required";
      else if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email";
    } else if (s === 1) {
      if (!form.address.line.trim()) e["address.line"] = "Required";
      if (!form.address.city.trim()) e["address.city"] = "Required";
      if (!form.address.state.trim()) e["address.state"] = "Required";
      if (!form.address.country.trim()) e["address.country"] = "Required";
      if (!form.address.postalCode.trim()) e["address.postalCode"] = "Required";
    }
    return e;
  };

  const goNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    const next = Math.min(STEPS.length - 1, step + 1);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  };

  const submit = async (asDraft) => {
    if (asDraft) {
      // A draft only needs the server's hard minimum (name/owner/email).
      if (!form.businessName.trim() || !form.ownerName.trim() || !form.email.trim()) {
        setErrors(validateStep(0));
        setStep(0);
        toast.info("Business name, owner name and email are required to save");
        return;
      }
    } else {
      // Create: every required step must pass — jump to the first invalid one.
      for (const s of [0, 1]) {
        const e = validateStep(s);
        if (Object.keys(e).length) { setErrors(e); setStep(s); return; }
      }
    }
    setSaving(true);
    try {
      const payload = { ...form, draft: asDraft };
      if (payload.commissionPercent === "") delete payload.commissionPercent;
      const res = await axios.post("/api/vendors", payload);
      if (asDraft) {
        toast.success("Draft saved");
        onCreated?.();
      } else {
        setSuccess(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setForm(INITIAL); setStep(0); setSuccess(null); setMaxReached(0); setErrors({}); };

  // ── Success popup ──
  if (success) {
    return (
      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-10 max-w-lg mx-auto text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-300" />
        </div>
        <h3 className="text-[18px] font-medium text-white">Vendor Account Created</h3>
        <p className="text-[13px] text-gray-400 mt-1">
          <span className="text-gray-200 font-medium">{success.businessName}</span> has been created successfully.
        </p>
        <p className="text-[12px] text-gray-500 mt-2">
          A set-password invite was sent to {success.email}. The vendor can set their password and log in.
        </p>
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => onCreated?.()} className="h-9 px-4 w-auto bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md text-[12px] text-gray-200">View Vendors</button>
          <button onClick={reset} className="h-9 px-4 w-auto bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white">Create Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-md bg-orange-500/15 flex items-center justify-center"><Store className="w-4 h-4 text-orange-300" /></div>
        <div>
          <h3 className="text-[15px] font-medium text-white">Create Vendor Account</h3>
          <p className="text-[12px] text-gray-400">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[210px_1fr] gap-6 mt-5">
        {/* Left: vertical stepper */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-1 px-1 pb-1 md:pb-0">
          {STEPS.map((label, i) => {
            const current = i === step;
            const done = i < step && Object.keys(validateStep(i)).length === 0;
            const reachable = i <= maxReached;
            return (
              <button
                key={label}
                type="button"
                disabled={!reachable}
                onClick={() => reachable && setStep(i)}
                className={`flex items-center gap-2.5 shrink-0 w-auto md:w-full text-left px-2.5 py-2 rounded-md text-[12px] transition ${
                  current
                    ? "bg-orange-500/15 text-orange-200"
                    : reachable
                    ? "text-gray-300 hover:bg-white/[0.04]"
                    : "text-gray-600 cursor-not-allowed"
                }`}
              >
                <span
                  className={`w-5 h-5 shrink-0 rounded-full grid place-items-center text-[10px] font-bold border ${
                    current
                      ? "border-orange-400 text-orange-300"
                      : done
                      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                      : "border-white/[0.15] text-gray-500"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: step content */}
        <div className="min-w-0">
      {step === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label required>Vendor / Shop Name</Label><Inp value={form.businessName} onChange={(e) => set("businessName", e.target.value)} className={errors.businessName ? "border-red-400/60" : ""} /><Err msg={errors.businessName} /></div>
          <div><Label required>Business Type</Label><Sel value={form.businessType} onChange={(e) => set("businessType", e.target.value)} options={BUSINESS_TYPES} /></div>
          <div><Label required>Owner Name</Label><Inp value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} className={errors.ownerName ? "border-red-400/60" : ""} /><Err msg={errors.ownerName} /></div>
          <div><Label required>Mobile Number</Label><Inp value={form.phone} onChange={(e) => set("phone", e.target.value)} className={errors.phone ? "border-red-400/60" : ""} /><Err msg={errors.phone} /></div>
          <div className="sm:col-span-2"><Label required>Email Address</Label><Inp type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={errors.email ? "border-red-400/60" : ""} /><Err msg={errors.email} /></div>
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label required>Shop Address</Label><Inp value={form.address.line} onChange={(e) => setIn("address", "line", e.target.value)} className={errors["address.line"] ? "border-red-400/60" : ""} /><Err msg={errors["address.line"]} /></div>
          <div><Label required>City</Label><Inp value={form.address.city} onChange={(e) => setIn("address", "city", e.target.value)} className={errors["address.city"] ? "border-red-400/60" : ""} /><Err msg={errors["address.city"]} /></div>
          <div><Label required>State</Label><Inp value={form.address.state} onChange={(e) => setIn("address", "state", e.target.value)} className={errors["address.state"] ? "border-red-400/60" : ""} /><Err msg={errors["address.state"]} /></div>
          <div><Label required>Country</Label><Inp value={form.address.country} onChange={(e) => setIn("address", "country", e.target.value)} className={errors["address.country"] ? "border-red-400/60" : ""} /><Err msg={errors["address.country"]} /></div>
          <div><Label required>Postal Code</Label><Inp value={form.address.postalCode} onChange={(e) => setIn("address", "postalCode", e.target.value)} className={errors["address.postalCode"] ? "border-red-400/60" : ""} /><Err msg={errors["address.postalCode"]} /></div>
          <div className="sm:col-span-2"><Label>Google Map Location (URL)</Label><Inp value={form.location.mapUrl} onChange={(e) => setIn("location", "mapUrl", e.target.value)} /></div>
          <div><Label>Latitude</Label><Inp value={form.location.lat} onChange={(e) => setIn("location", "lat", e.target.value)} /></div>
          <div><Label>Longitude</Label><Inp value={form.location.lng} onChange={(e) => setIn("location", "lng", e.target.value)} /></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>GST Number</Label><Inp value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} /></div>
            <div><Label>PAN Number</Label><Inp value={form.panNumber} onChange={(e) => set("panNumber", e.target.value)} /></div>
            <div><Label>Business Registration Number</Label><Inp value={form.businessRegNumber} onChange={(e) => set("businessRegNumber", e.target.value)} /></div>
            <div><Label>License Number (Optional)</Label><Inp value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} /></div>
          </div>
          <div>
            <Label>Upload Documents</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <UploadStub label="GST Certificate" /><UploadStub label="Business Reg. Certificate" />
              <UploadStub label="PAN Card" /><UploadStub label="Shop License" />
            </div>
            <p className="text-[11px] text-gray-600 mt-1.5">Document uploads arrive in the next pass.</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div><Label>Sports Categories</Label><Chips options={SPORTS_CATEGORIES} selected={form.sportsCategories} onToggle={(v) => toggleArr("sportsCategories", v)} /></div>
          <div><Label>Product Categories</Label><Chips options={PRODUCT_CATEGORIES} selected={form.productCategories} onToggle={(v) => toggleArr("productCategories", v)} /></div>
        </div>
      )}

      {step === 4 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Business Model</Label><Sel value={form.businessModel} onChange={(e) => set("businessModel", e.target.value)} options={["Retail", "Wholesale", "Retail + Wholesale"]} /></div>
          <div><Label>Payment Settlement</Label><Sel value={form.paymentSettlement} onChange={(e) => set("paymentSettlement", e.target.value)} options={["Weekly", "Bi-Weekly", "Monthly"]} /></div>
          <div><Label>Commission %</Label><Inp type="number" min="0" max="100" value={form.commissionPercent} onChange={(e) => set("commissionPercent", e.target.value)} placeholder="Admin configurable" /></div>
          <div className="sm:col-span-2"><Label>Delivery Options</Label><Chips options={DELIVERY_OPTIONS} selected={form.deliveryOptions} onToggle={(v) => toggleArr("deliveryOptions", v)} /></div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Username</Label><Inp value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="Optional login username" /></div>
            <div><Label>Email (login)</Label><Inp value={form.email} disabled className="opacity-60" /></div>
          </div>
          <div className="bg-[#0F1117] border border-white/[0.06] rounded-md p-3">
            <p className="text-[12px] text-gray-300">Password: <span className="text-gray-400">the vendor sets their own via a "Forgot Password" email link (no password is emailed).</span></p>
          </div>
          <div>
            <Label>Send Login Invite Via</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => set("credentialDelivery", "email")} className={`px-3 h-8 w-auto rounded-md text-[12px] border ${form.credentialDelivery === "email" ? "bg-orange-500/15 border-orange-400/40 text-orange-200" : "bg-white/[0.04] border-white/[0.08] text-gray-400"}`}>Email</button>
              <button type="button" disabled title="SMS provider not configured yet" className="px-3 h-8 w-auto rounded-md text-[12px] border bg-white/[0.02] border-white/[0.06] text-gray-600 cursor-not-allowed inline-flex items-center gap-1"><Lock className="w-3 h-3" /> SMS (soon)</button>
              <button type="button" disabled className="px-3 h-8 w-auto rounded-md text-[12px] border bg-white/[0.02] border-white/[0.06] text-gray-600 cursor-not-allowed inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Both (soon)</button>
            </div>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.group}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{g.group}</p>
              <div className="flex flex-wrap gap-2">
                {g.keys.map(([k, label]) => (
                  <label key={k} className="inline-flex items-center gap-2 px-2.5 h-8 bg-[#0F1117] border border-white/[0.08] rounded-md text-[12px] text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.permissions[k]} onChange={() => togglePerm(k)} className="accent-orange-500" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 7 && (
        <div className="space-y-4">
          <div>
            <Label>Branding Uploads</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <UploadStub label="Shop Logo" /><UploadStub label="Shop Banner" /><UploadStub label="Gallery Images" />
            </div>
          </div>
          <div><Label>About Shop / Description</Label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={2000}
              className="w-full px-3 py-2 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Store Highlights</Label><Inp value={form.storeHighlights} onChange={(e) => set("storeHighlights", e.target.value)} /></div>
            <div><Label>Working Hours</Label><Inp value={form.workingHours} onChange={(e) => set("workingHours", e.target.value)} placeholder="e.g. Mon–Sat 10am–8pm" /></div>
          </div>
        </div>
      )}

      {step === 8 && (
        <div className="space-y-4">
          <div><Label>Initial Product Categories</Label><Chips options={PRODUCT_CATEGORIES} selected={form.inventory.productCategories} onToggle={(v) => setIn("inventory", "productCategories", form.inventory.productCategories.includes(v) ? form.inventory.productCategories.filter((x) => x !== v) : [...form.inventory.productCategories, v])} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>SKU Prefix</Label><Inp value={form.inventory.skuPrefix} onChange={(e) => setIn("inventory", "skuPrefix", e.target.value)} placeholder="e.g. SP-" /></div>
            <label className="flex items-center gap-2 mt-6 text-[13px] text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.inventory.stockAlerts} onChange={(e) => setIn("inventory", "stockAlerts", e.target.checked)} className="accent-orange-500" />
              Enable low-stock alerts
            </label>
          </div>
          <p className="text-[11px] text-gray-600">Inventory is optional and used once products are connected.</p>
        </div>
      )}

      {step === 9 && (
        <div className="space-y-3 text-[13px]">
          <Summary label="Business" value={`${form.businessName || "—"} · ${form.businessType}`} />
          <Summary label="Owner" value={`${form.ownerName || "—"} · ${form.email || "—"} · ${form.phone || "—"}`} />
          <Summary label="Address" value={[form.address.line, form.address.city, form.address.state, form.address.country, form.address.postalCode].filter(Boolean).join(", ") || "—"} />
          <Summary label="Categories" value={[...form.sportsCategories, ...form.productCategories].join(", ") || "—"} />
          <Summary label="Model / Settlement" value={`${form.businessModel} · ${form.paymentSettlement} · ${form.commissionPercent || 0}% commission`} />
          <Summary label="Permissions" value={ALL_PERMS.filter((k) => form.permissions[k]).length + " granted"} />
          {(!form.businessName.trim() || !form.ownerName.trim() || !form.email.trim()) && (
            <p className="text-[12px] text-red-400">Business name, owner name and email are required (Step 1).</p>
          )}
        </div>
      )}

        </div>{/* end step content */}
      </div>{/* end grid */}

      {/* ── Nav ── */}
      <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/[0.06]">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="h-9 px-3 w-auto inline-flex items-center gap-1 whitespace-nowrap bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200 disabled:opacity-40">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex gap-2">
          {/* Draft is available on every step (does not require completing all steps). */}
          <button type="button" disabled={saving} onClick={() => submit(true)}
            className="h-9 px-4 w-auto whitespace-nowrap bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-md text-[12px] text-gray-200 disabled:opacity-60">
            Save as Draft
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext}
              className="h-9 px-4 w-auto inline-flex items-center gap-1 whitespace-nowrap bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button type="button" disabled={saving} onClick={() => submit(false)}
              className="h-9 px-4 w-auto whitespace-nowrap bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white disabled:opacity-60 inline-flex items-center gap-1.5">
              {saving ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? "Creating…" : "Create Vendor Account"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 text-right">{value}</span>
    </div>
  );
}
