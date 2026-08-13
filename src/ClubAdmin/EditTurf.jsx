import { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import { assetUrl } from "../shared/lib/assetUrl";
import {
  MapPin, Clock, Camera, Plus, X, Star, Check,
  Dumbbell, IndianRupee, Loader2, ChevronLeft,
} from "lucide-react";
import { ClubAdminShell } from "../shared/layout";

import { getAuthToken } from "../shared/api/authToken";
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SPORTS_PRESETS = ["Football", "Cricket", "Basketball", "Tennis", "Badminton", "Volleyball", "Hockey", "Table Tennis", "Swimming", "Pickleball", "Chess", "Carrom"];
const FACILITY_PRESETS = [
  "Floodlights", "Parking", "Changing Rooms", "Restrooms", "Drinking Water",
  "WiFi", "Food Court", "Lounge Area", "First Aid Kit", "Shower",
  "Locker Rooms", "CCTV", "Security", "Covered Areas", "Artificial Turf",
];

const EditTurf = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [sportsList, setSportsList] = useState([]);
  const [sportInput, setSportInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [selectedDays, setSelectedDays] = useState([...DAYS]);
  const [images, setImages] = useState([null, null, null]);
  const [imageFiles, setImageFiles] = useState([null, null, null]);
  const [existingImages, setExistingImages] = useState([]);
  // Turf-owner payment collection (goes to the owner, not the platform).
  const [upiId, setUpiId] = useState("");
  const [payName, setPayName] = useState("");
  const [payPhone, setPayPhone] = useState("");
  const [payWhatsapp, setPayWhatsapp] = useState("");
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState("");
  const [existingQr, setExistingQr] = useState("");

  const handleQrChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setQrFile(f);
    setQrPreview(URL.createObjectURL(f));
  };

  const fileInputRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    const fetchTurf = async () => {
      try {
        const token = getAuthToken();
        const response = await axios.get(`/api/turfs/${id}?userId=${auth._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const t = response.data;
        setName(t.name || "");
        setDescription(t.description || "");
        setLocationAddress(t.address?.fullAddress || t.location?.address || "");
        setArea(t.address?.area || "");
        setCity(t.address?.city || "");
        setPincode(t.address?.pincode || "");
        setLongitude(t.location?.coordinates?.[0]?.toString() || "");
        setLatitude(t.location?.coordinates?.[1]?.toString() || "");
        setSportsList((t.sports || []).map((s) => ({ name: s.name, pricePerHour: s.pricePerHour || 0 })));
        if (Array.isArray(t.facilities)) {
          setFacilities(t.facilities);
        } else if (t.facilities && typeof t.facilities === "object") {
          setFacilities(Object.entries(t.facilities).filter(([, v]) => v).map(([k]) =>
            k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()
          ));
        }
        if (t.availableTimeSlots?.length > 0) {
          setOpenTime(t.availableTimeSlots[0].startTime || "06:00");
          setCloseTime(t.availableTimeSlots[0].endTime || "22:00");
          setSelectedDays(t.availableTimeSlots.map((s) => s.day));
        }
        setExistingImages(t.images || []);
        setUpiId(t.ownerPayment?.upiId || "");
        setExistingQr(t.ownerPayment?.qrImage || "");
        setPayName(t.contact?.name || "");
        setPayPhone(t.contact?.phone || "");
        setPayWhatsapp(t.contact?.whatsapp || "");
        setIsLoading(false);
      } catch (error) {
        toast.error("Failed to fetch turf details");
        navigate("/turf-management");
      }
    };
    fetchTurf();
  }, [id, auth._id, navigate]);

  const handleImageChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB per image"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const ni = [...images]; ni[index] = reader.result; setImages(ni);
      const nf = [...imageFiles]; nf[index] = file; setImageFiles(nf);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index) => {
    const ni = [...images]; ni[index] = null; setImages(ni);
    const nf = [...imageFiles]; nf[index] = null; setImageFiles(nf);
    if (fileInputRefs[index].current) fileInputRefs[index].current.value = "";
  };

  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addSport = (sportName) => {
    const n = (sportName || sportInput).trim();
    if (!n) return;
    if (sportsList.some((s) => s.name.toLowerCase() === n.toLowerCase())) { toast.error("Already added"); return; }
    setSportsList([...sportsList, { name: n, pricePerHour: Number(priceInput) || 0 }]);
    setSportInput(""); setPriceInput("");
  };

  const removeSport = (idx) => setSportsList(sportsList.filter((_, i) => i !== idx));
  const toggleFacility = (f) => setFacilities((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  const toggleDay = (d) => setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Turf name is required"); return; }
    if (!locationAddress.trim()) { toast.error("Address is required"); return; }
    if (sportsList.length === 0) { toast.error("Add at least one sport"); return; }
    if (existingImages.length === 0 && !imageFiles.some((f) => f !== null)) {
      toast.error("Please upload at least one turf image"); return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("ownerId", auth._id);
      fd.append("name", name.trim());
      fd.append("description", description);
      fd.append("address", locationAddress);
      fd.append("fullAddress", locationAddress);
      fd.append("area", area);
      fd.append("city", city);
      fd.append("pincode", pincode);
      fd.append("longitude", longitude || "0");
      fd.append("latitude", latitude || "0");
      fd.append("sports", JSON.stringify(sportsList.map((s) => ({ name: s.name, pricePerHour: s.pricePerHour || 0 }))));
      fd.append("facilities", JSON.stringify(facilities));
      fd.append("availableTimeSlots", JSON.stringify(selectedDays.map((d) => ({ day: d, startTime: openTime, endTime: closeTime }))));
      fd.append("existingImages", JSON.stringify(existingImages));
      imageFiles.forEach((f) => { if (f) fd.append("turfImages", f); });

      const token = getAuthToken();
      await axios.put(`/api/turfs/${id}`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      // Save turf-owner payment/contact details (separate endpoint; owner-scoped).
      const pd = new FormData();
      pd.append("upiId", upiId);
      pd.append("contactName", payName || "");
      pd.append("contactPhone", payPhone || "");
      pd.append("contactWhatsapp", payWhatsapp || "");
      if (qrFile) pd.append("qrImage", qrFile);
      try {
        await axios.patch(`/api/turfs/${id}/payment-details`, pd, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
      } catch { /* turf saved; payment details can be retried */ }
      toast.success("Turf updated successfully!");
      navigate(`/turf/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update turf");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ClubAdminShell searchPlaceholder="Edit turf…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </ClubAdminShell>
    );
  }

  return (
    <ClubAdminShell searchPlaceholder="Edit turf…">
      {/* Header */}
      <header className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate(`/turf/${id}`)}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.04] transition w-auto flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <MapPin className="w-3.5 h-3.5" />
            Turfs · Edit
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">Edit turf</h1>
          <p className="mt-1 text-[13px] text-gray-400">{name}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-5xl">
        <Section icon={Dumbbell} title="Basic information">
          <DarkInput label="Turf name *" value={name} onChange={setName} placeholder="e.g. Shivaji Sports Arena" />
          <DarkTextarea label="Description" value={description} onChange={setDescription} placeholder="Describe your facility…" rows={3} />
        </Section>

        <Section icon={Camera} title="Turf photos">
          {existingImages.length > 0 && (
            <div className="mb-3">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-2">Current images</label>
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((imagePath, index) => (
                  <div key={imagePath} className="relative rounded-md overflow-hidden" style={{ border: "1px solid rgba(249,115,22,0.4)" }}>
                    <img loading="lazy" src={assetUrl(imagePath)} alt={`Turf ${index + 1}`} className="w-full h-32 object-cover" />
                    <button type="button" onClick={() => handleRemoveExistingImage(index)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-md flex items-center justify-center transition w-auto">
                      <X className="w-3 h-3 text-red-300" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-2">Add new images</label>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((idx) => (
              <div key={idx}
                className={`relative rounded-md overflow-hidden transition ${images[idx] ? "" : "hover:bg-white/[0.04]"}`}
                style={{ border: images[idx] ? "1px solid rgba(249,115,22,0.4)" : "1px dashed rgba(255,255,255,0.12)" }}>
                {images[idx] ? (
                  <>
                    <img loading="lazy" src={images[idx]} alt="" className="w-full h-32 object-cover" />
                    <button type="button" onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-md flex items-center justify-center transition w-auto">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 cursor-pointer">
                    <Camera className="w-5 h-5 text-gray-500 mb-1.5" />
                    <span className="text-[11px] text-gray-400 font-medium">Photo {idx + 1}</span>
                    <span className="text-[10px] text-gray-600 mt-0.5">Click to upload</span>
                    <input type="file" ref={fileInputRefs[idx]} onChange={(e) => handleImageChange(e, idx)} className="hidden" accept="image/*" />
                  </label>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section icon={MapPin} title="Location">
          <DarkInput label="Full address *" value={locationAddress} onChange={setLocationAddress} placeholder="Street address, landmark" />
          <div className="grid grid-cols-3 gap-3">
            <DarkInput label="Area" value={area} onChange={setArea} placeholder="e.g. Kharadi" />
            <DarkInput label="City" value={city} onChange={setCity} placeholder="Pune" />
            <DarkInput label="Pincode" value={pincode} onChange={setPincode} placeholder="411014" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DarkInput label="Latitude" value={latitude} onChange={setLatitude} placeholder="18.5255" type="number" />
            <DarkInput label="Longitude" value={longitude} onChange={setLongitude} placeholder="73.8409" type="number" />
          </div>
        </Section>

        <Section icon={IndianRupee} title="Sports & pricing">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <DarkInput label="Sport name" value={sportInput} onChange={setSportInput} placeholder="or pick from below" />
            </div>
            <div className="w-28">
              <DarkInput label="₹/hr" value={priceInput} onChange={setPriceInput} placeholder="500" type="number" />
            </div>
            <button type="button" onClick={() => addSport()}
              className="h-9 px-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {SPORTS_PRESETS.filter((s) => !sportsList.some((sl) => sl.name === s)).map((s) => (
              <button key={s} type="button" onClick={() => setSportInput(s)}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition w-auto"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {s}
              </button>
            ))}
          </div>

          {sportsList.length > 0 && (
            <div className="space-y-1.5 mt-3">
              {sportsList.map((sport, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-md px-3 py-2"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.20)" }}>
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-[13px] font-medium text-white">{sport.name}</span>
                    {sport.pricePerHour > 0 ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 bg-orange-500/15 px-1.5 py-0.5 rounded">₹{sport.pricePerHour}/hr</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">Free</span>
                    )}
                  </div>
                  <button type="button" onClick={() => removeSport(idx)}
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section icon={Clock} title="Operating hours">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <DarkInput label="Opening time" value={openTime} onChange={setOpenTime} type="time" />
            <DarkInput label="Closing time" value={closeTime} onChange={setCloseTime} type="time" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-2">Open days</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day) => {
                const selected = selectedDays.includes(day);
                return (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold capitalize transition w-auto ${
                      selected
                        ? "bg-orange-500 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                    style={!selected ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" } : undefined}>
                    {day.slice(0, 3)}
                  </button>
                );
              })}
              <button type="button" onClick={() => setSelectedDays(selectedDays.length === DAYS.length ? [] : [...DAYS])}
                className="px-3 py-1.5 rounded-md text-[11px] font-bold text-orange-400 hover:text-orange-300 hover:bg-orange-500/15 transition w-auto"
                style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.25)" }}>
                {selectedDays.length === DAYS.length ? "Clear all" : "Select all"}
              </button>
            </div>
          </div>
        </Section>

        <Section icon={Star} title="Facilities & amenities">
          <div className="flex flex-wrap gap-1.5">
            {FACILITY_PRESETS.map((f) => {
              const selected = facilities.includes(f);
              return (
                <button key={f} type="button" onClick={() => toggleFacility(f)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition w-auto inline-flex items-center gap-1.5 ${
                    selected ? "bg-emerald-500/15 text-emerald-300" : "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                  style={!selected
                    ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }
                    : { border: "1px solid rgba(16,185,129,0.25)" }}>
                  {selected && <Check className="w-3 h-3" />}
                  {f}
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={IndianRupee} title="Payment collection">
          <p className="text-[12px] text-gray-500 -mt-1 mb-1">
            Turf payments come <span className="text-gray-300 font-semibold">directly to you</span>, not the platform. Players see your UPI / QR at booking; leave these blank and they'll see your contact instead.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DarkInput label="UPI ID" value={upiId} onChange={setUpiId} placeholder="yourname@bank" />
            <div>
              <label className="block text-[13px] font-medium text-gray-300 mb-1.5">Payment QR image</label>
              <div className="flex items-center gap-3">
                <label className="h-9 px-3 rounded-md text-[13px] text-gray-300 cursor-pointer flex items-center w-auto" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <input type="file" accept="image/*" onChange={handleQrChange} className="hidden" />
                  {qrFile ? "Change QR" : existingQr ? "Replace QR" : "Upload QR"}
                </label>
                {(qrPreview || existingQr) && <img loading="lazy" src={qrPreview || assetUrl(existingQr)} alt="QR" className="w-11 h-11 rounded-md object-cover border border-white/10" />}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DarkInput label="Contact name" value={payName} onChange={setPayName} placeholder="Owner / manager" />
            <DarkInput label="Contact phone" value={payPhone} onChange={setPayPhone} placeholder="Shown if no UPI/QR" />
            <DarkInput label="WhatsApp" value={payWhatsapp} onChange={setPayWhatsapp} placeholder="Optional" />
          </div>
        </Section>

        <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button type="button" onClick={() => navigate(`/turf/${id}`)}
            className="h-9 px-3.5 rounded-md text-[13px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="h-9 px-6 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold shadow-sm shadow-orange-500/30 transition flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98] w-auto">
            {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…</> : <><Check className="w-3.5 h-3.5" /> Update turf</>}
          </button>
        </div>
      </form>
    </ClubAdminShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-orange-400" />
        </span>
        <h3 className="text-[13px] font-medium text-white">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

function DarkInput({ label, value, onChange, type = "text", ...props }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        {...props}
      />
    </div>
  );
}

function DarkTextarea({ label, value, onChange, rows = 3, ...props }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2.5 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none resize-none"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        {...props}
      />
    </div>
  );
}

export default EditTurf;
