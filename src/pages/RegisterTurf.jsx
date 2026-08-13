import { toast } from "react-toastify";
import React, { useState } from "react";
import axios from "axios";
import { MapPin, Clock, DollarSign, Camera, Phone, Star, Dumbbell, ArrowLeft, Check, Loader2, Plus, X, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const FACILITY_OPTIONS = [
  "Floodlights", "Parking", "Changing Rooms", "Restrooms", "Drinking Water",
  "WiFi", "Food Court", "Lounge Area", "First Aid Kit", "Shower",
  "Locker Rooms", "CCTV", "Security", "Covered Areas",
];

// Self-registration form for any logged-in user (NOT under a club). Posts to
// /turfs/register, which forces owner = the authenticated caller and marks the
// turf pending SuperAdmin approval (hidden from the public marketplace until then).
const RegisterTurf = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [contacts, setContacts] = useState("");
  const [sports, setSports] = useState([{ name: "", pricePerHour: "" }]);
  const [facilities, setFacilities] = useState([]);
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [selectedDays, setSelectedDays] = useState([...DAYS]);
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  // Turf-owner payment collection — money goes to the OWNER (not the platform),
  // so this is separate from the central Razorpay flow. Shown to players at
  // booking; if no UPI/QR, the contact block is shown so they can reach you.
  const [upiId, setUpiId] = useState("");
  const [payName, setPayName] = useState("");
  const [payPhone, setPayPhone] = useState("");
  const [payWhatsapp, setPayWhatsapp] = useState("");
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState("");

  const handleQrUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setQrFile(f);
    setQrPreview(URL.createObjectURL(f));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    setPhotos(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const addSport = () => setSports([...sports, { name: "", pricePerHour: "" }]);
  const removeSport = (idx) => setSports(sports.filter((_, i) => i !== idx));
  const updateSport = (idx, field, val) => {
    const next = [...sports];
    next[idx] = { ...next[idx], [field]: val };
    setSports(next);
  };

  const toggleFacility = (f) => setFacilities((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  const toggleDay = (d) => setSelectedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !address || !city) { toast.warn("Name, address, and city are required"); return; }
    const validSports = sports.filter((s) => s.name.trim());
    if (validSports.length === 0) { toast.warn("Add at least one sport"); return; }

    setLoading(true);
    // NOTE: no ownerId — the server forces owner = the authenticated caller.
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("address", `${address}, ${area}, ${city} - ${pincode}`);
    formData.append("area", area);
    formData.append("city", city);
    formData.append("pincode", pincode);
    formData.append("longitude", "0");
    formData.append("latitude", "0");
    formData.append("contacts", contacts);
    formData.append("sports", JSON.stringify(validSports.map((s) => ({ name: s.name.trim(), pricePerHour: Number(s.pricePerHour) || 0 }))));
    formData.append("facilities", JSON.stringify(facilities));
    formData.append("availableTimeSlots", JSON.stringify(selectedDays.map((day) => ({ day, startTime: openTime, endTime: closeTime }))));
    photos.forEach((photo) => formData.append("turfImages", photo));

    try {
      const res = await axios.post("/api/turfs/register", formData, { headers: { "Content-Type": "multipart/form-data" } });
      // Save the owner's payment-collection details on the freshly-created turf.
      const turfId = res?.data?.turf?._id;
      if (turfId && (upiId || payName || payPhone || payWhatsapp || qrFile)) {
        const pd = new FormData();
        pd.append("upiId", upiId);
        pd.append("contactName", payName || "");
        pd.append("contactPhone", payPhone || contacts || "");
        pd.append("contactWhatsapp", payWhatsapp || "");
        if (qrFile) pd.append("qrImage", qrFile);
        try { await axios.patch(`/api/turfs/${turfId}/payment-details`, pd, { headers: { "Content-Type": "multipart/form-data" } }); }
        catch { /* turf is registered; payment details can be added later via Edit */ }
      }
      toast.success("Turf submitted! It will appear publicly once an admin approves it.");
      navigate(-1);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition w-auto">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Register Your Turf</h1>
          <p className="text-sm text-gray-500 mt-0.5">List your sports facility on the marketplace</p>
        </div>
      </div>

      {/* Pending-approval notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-6">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Your turf will be reviewed by an admin before it becomes publicly bookable.
          You can track it under your turfs once approved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Basic Information" icon={Dumbbell}>
          <InputField label="Turf Name *" value={name} onChange={setName} placeholder="e.g. Shivaji Sports Arena" />
          <TextareaField label="Description" value={description} onChange={setDescription} placeholder="Describe your turf..." rows={3} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Address *" value={address} onChange={setAddress} placeholder="Street address" icon={MapPin} />
            <InputField label="Area" value={area} onChange={setArea} placeholder="e.g. Kharadi" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="City *" value={city} onChange={setCity} placeholder="Pune" />
            <InputField label="Pincode" value={pincode} onChange={setPincode} placeholder="411014" />
            <InputField label="Contact *" value={contacts} onChange={setContacts} placeholder="9876543210" icon={Phone} />
          </div>
        </Section>

        <Section title="Photos" icon={Camera}>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-orange-500 hover:bg-orange-50/30 transition cursor-pointer relative">
            <input type="file" multiple onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
            <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Click or drag photos here</p>
            <p className="text-xs text-gray-400 mt-1">Max 3 images</p>
          </div>
          {previews.length > 0 && (
            <div className="flex gap-3 mt-3">
              {previews.map((src, i) => <img loading="lazy" key={i} src={src} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />)}
            </div>
          )}
        </Section>

        <Section title="Sports & Pricing" icon={DollarSign}>
          <div className="space-y-3">
            {sports.map((sport, idx) => (
              <div key={idx} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1" htmlFor="sport-name">Sport Name</label>
                  <input id="sport-name" type="text" value={sport.name} onChange={(e) => updateSport(idx, "name", e.target.value)} placeholder="e.g. Cricket"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-semibold text-gray-500 mb-1" htmlFor="hr">₹/hr</label>
                  <input id="hr" type="number" value={sport.pricePerHour} onChange={(e) => updateSport(idx, "pricePerHour", e.target.value)} placeholder="500"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" />
                </div>
                {sports.length > 1 && (
                  <button type="button" onClick={() => removeSport(idx)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition w-auto">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addSport} className="mt-2 text-sm font-semibold text-orange-500 flex items-center gap-1 w-auto">
            <Plus className="w-4 h-4" /> Add sport
          </button>
        </Section>

        <Section title="Operating Hours" icon={Clock}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <InputField label="Opening Time" value={openTime} onChange={setOpenTime} type="time" icon={Clock} />
            <InputField label="Closing Time" value={closeTime} onChange={setCloseTime} type="time" icon={Clock} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Open Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition w-auto ${selectedDays.includes(day) ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Facilities" icon={Star}>
          <div className="flex flex-wrap gap-2">
            {FACILITY_OPTIONS.map((f) => (
              <button key={f} type="button" onClick={() => toggleFacility(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition w-auto ${facilities.includes(f) ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"}`}>
                {facilities.includes(f) && <Check className="w-3 h-3 inline mr-1" />}{f}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Payment Collection" icon={DollarSign}>
          <p className="text-xs text-gray-500 -mt-1 mb-1">
            Turf payments come <span className="font-semibold text-gray-700">directly to you</span> — not the platform. Players see your UPI / QR at booking. If you leave these blank, they'll see your contact details instead.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="UPI ID" value={upiId} onChange={setUpiId} placeholder="yourname@bank" icon={DollarSign} />
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Payment QR image</label>
              <div className="flex items-center gap-3">
                <label className="px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-orange-400 cursor-pointer w-auto">
                  <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                  {qrFile ? "Change QR" : "Upload QR"}
                </label>
                {qrPreview && <img loading="lazy" src={qrPreview} alt="QR" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Contact name" value={payName} onChange={setPayName} placeholder="Owner / manager" />
            <InputField label="Contact phone" value={payPhone} onChange={setPayPhone} placeholder="Defaults to the contact above" icon={Phone} />
            <InputField label="WhatsApp" value={payWhatsapp} onChange={setPayWhatsapp} placeholder="Optional" />
          </div>
        </Section>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition w-auto">Cancel</button>
          <button type="submit" disabled={loading}
            className="flex-1 md:flex-none md:px-10 py-3 rounded-xl bg-orange-500 hover:bg-orange-700 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4" /> Submit for Approval</>}
          </button>
        </div>
      </form>
    </div>
  );
};

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-orange-500" /></div>
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function InputField({ label, value, onChange, icon: Icon, type = "text", ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition`} {...props} />
      </div>
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3, ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-none" {...props} />
    </div>
  );
}

export default RegisterTurf;
