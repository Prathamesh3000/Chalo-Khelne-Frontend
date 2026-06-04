import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { assetUrl } from "../shared/lib/assetUrl";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  MapPin, Clock, Camera, Plus, X, Search, Trash2, Edit2, Star, Check,
  Dumbbell, IndianRupee, Loader2, Eye, ImageOff,
} from "lucide-react";
import { ClubAdminShell } from "../shared/layout";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SPORTS_PRESETS = ["Football", "Cricket", "Basketball", "Tennis", "Badminton", "Volleyball", "Hockey", "Table Tennis", "Swimming", "Pickleball", "Chess", "Carrom"];
const FACILITY_PRESETS = [
  "Floodlights", "Parking", "Changing Rooms", "Restrooms", "Drinking Water",
  "WiFi", "Food Court", "Lounge Area", "First Aid Kit", "Shower",
  "Locker Rooms", "CCTV", "Security", "Covered Areas", "Artificial Turf",
];

const TurfManagement = () => {
  const { auth } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("add");

  // Add form state
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manage state
  const [turfs, setTurfs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fileInputRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (activeTab === "manage" && auth?._id) {
      (async () => {
        setIsLoading(true);
        try {
          const res = await axios.get(`/api/turfs/assigned/${auth._id}`);
          setTurfs(Array.isArray(res.data) ? res.data : res.data?.turfs || []);
        } catch { setTurfs([]); }
        finally { setIsLoading(false); }
      })();
    }
  }, [activeTab, auth]);

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

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("ownerId", auth._id);
      fd.append("name", name.trim());
      fd.append("description", description);
      fd.append("address", locationAddress);
      fd.append("area", area);
      fd.append("city", city);
      fd.append("pincode", pincode);
      fd.append("longitude", longitude || "0");
      fd.append("latitude", latitude || "0");
      fd.append("sports", JSON.stringify(sportsList.map((s) => ({ name: s.name, pricePerHour: s.pricePerHour || 0 }))));
      fd.append("facilities", JSON.stringify(facilities));
      fd.append("availableTimeSlots", JSON.stringify(selectedDays.map((d) => ({ day: d, startTime: openTime, endTime: closeTime }))));
      imageFiles.forEach((f) => { if (f) fd.append("turfImages", f); });

      await axios.post("/api/turfs", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Turf added successfully!");

      setName(""); setDescription(""); setLocationAddress(""); setArea(""); setCity(""); setPincode("");
      setLongitude(""); setLatitude(""); setSportsList([]); setFacilities([]);
      setSelectedDays([...DAYS]); setOpenTime("06:00"); setCloseTime("22:00");
      setImages([null, null, null]); setImageFiles([null, null, null]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add turf");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTurf = async (id) => {
    if (!confirm("Delete this turf permanently?")) return;
    try {
      await axios.delete(`/api/turfs/${id}?userId=${auth._id}`);
      setTurfs(turfs.filter((t) => t._id !== id));
      toast.success("Turf deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const filteredTurfs = turfs.filter((t) =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.address?.fullAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ClubAdminShell searchPlaceholder="Search turfs…">
      {/* Header */}
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
          <MapPin className="w-3.5 h-3.5" />
          Turfs · Management
        </p>
        <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
          Turf management
        </h1>
        <p className="mt-1 text-[13px] text-gray-400">
          Add and manage your sports facilities.
        </p>
      </header>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06] mb-5">
        {[
          { key: "add", label: "Add turf", icon: Plus },
          { key: "manage", label: `My turfs ${turfs.length > 0 ? `(${turfs.length})` : ""}`, icon: MapPin },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[12px] font-medium transition w-auto ${
                active ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ADD TAB */}
      {activeTab === "add" && (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-5xl">
          <Section icon={Dumbbell} title="Basic information">
            <DarkInput label="Turf name *" value={name} onChange={setName} placeholder="e.g. Shivaji Sports Arena" />
            <DarkTextarea label="Description" value={description} onChange={setDescription} placeholder="Describe your facility — surface type, size, environment…" rows={3} />
          </Section>

          <Section icon={Camera} title="Turf photos">
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => (
                <div key={idx}
                  className={`relative rounded-md overflow-hidden transition ${images[idx] ? "" : "hover:bg-white/[0.04]"}`}
                  style={{ border: images[idx] ? "1px solid rgba(249,115,22,0.4)" : "1px dashed rgba(255,255,255,0.12)" }}>
                  {images[idx] ? (
                    <>
                      <img src={images[idx]} alt="" className="w-full h-32 object-cover" />
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

          <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button type="button" onClick={() => setActiveTab("manage")}
              className="h-9 px-3.5 rounded-md text-[13px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="h-9 px-6 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold shadow-sm shadow-orange-500/30 transition flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98] w-auto">
              {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><Check className="w-3.5 h-3.5" /> Add turf</>}
            </button>
          </div>
        </form>
      )}

      {/* MANAGE TAB */}
      {activeTab === "manage" && (
        <div>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search turfs…"
              className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin mx-auto" />
            </div>
          ) : filteredTurfs.length === 0 ? (
            <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
              <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5 text-gray-500" />
              </div>
              <h3 className="text-[14px] font-medium text-white">No turfs yet</h3>
              <p className="text-[13px] text-gray-400 mt-1 max-w-md mx-auto">Add your first turf to get started.</p>
              <button onClick={() => setActiveTab("add")}
                className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold rounded-md transition active:scale-[0.98] w-auto">
                <Plus className="w-3.5 h-3.5" /> Add turf
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTurfs.map((turf) => (
                <TurfCard key={turf._id} turf={turf} onDelete={() => handleDeleteTurf(turf._id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </ClubAdminShell>
  );
};

function TurfCard({ turf, onDelete }) {
  return (
    <article className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden transition hover:border-white/[0.12]">
      {/* Image */}
      <div className="h-36 bg-white/[0.04] overflow-hidden relative">
        {turf.images?.[0] ? (
          <img src={assetUrl(turf.images[0])} alt={turf.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-gray-600" />
          </div>
        )}
        <span className={`absolute top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          turf.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
        }`}
          style={{ backdropFilter: "blur(8px)" }}>
          {turf.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-[14px] font-medium text-white truncate">{turf.name}</h3>
        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3" />
          {turf.address?.fullAddress || turf.address?.city || "No address"}
        </p>

        {/* Sports */}
        {turf.sports?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {turf.sports.map((s, i) => (
              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400">
                {s.name}{s.pricePerHour > 0 && <span className="ml-1 font-mono tabular-nums">₹{s.pricePerHour}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Rating */}
        {turf.ratings?.average > 0 && (
          <div className="flex items-center gap-1 mt-3">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-semibold text-gray-200 font-mono tabular-nums">{turf.ratings.average.toFixed(1)}</span>
            <span className="text-[11px] text-gray-500">(<span className="font-mono tabular-nums">{turf.ratings.count}</span>)</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/[0.06]">
          <Link to={`/turf/${turf._id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[12px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Eye className="w-3 h-3" /> View
          </Link>
          <Link to={`/turf/edit/${turf._id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[12px] font-semibold text-orange-400 hover:text-orange-300 hover:bg-orange-500/15 transition w-auto"
            style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.25)" }}>
            <Edit2 className="w-3 h-3" /> Edit
          </Link>
          <button onClick={onDelete}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

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

export default TurfManagement;
