import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  QrCode, Plus, Trash2, User, Phone, Tag, Save, CreditCard, Upload, X,
  CheckCircle2, AlertCircle, Smartphone, Loader2,
} from "lucide-react";
import { assetUrl } from "../shared/lib/assetUrl";
import { ManagerShell } from "../shared/layout";

const MPayments = ({ tournamentId }) => {
  const manager = JSON.parse(localStorage.getItem("user"));
  const managerId = manager?._id;

  const [existingSetup, setExistingSetup] = useState({ qrCodes: [], upiIds: [], offlinePayments: [] });
  const [newUpi, setNewUpi] = useState("");
  const [qrFiles, setQrFiles] = useState([]);
  const [newOfflinePayment, setNewOfflinePayment] = useState({ receiverName: "", receiverContact: "", label: "" });
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchSetup = async () => {
    if (!managerId) return;
    try {
      const res = await axios.get(`/api/payments/setup/${managerId}/${tournamentId || ""}`);
      if (res.data.success) setExistingSetup(res.data.data);
    } catch (err) {
      console.error("Fetch setup error:", err);
      toast.error("Failed to fetch payment setup");
    }
  };

  useEffect(() => { fetchSetup(); }, [managerId, tournamentId]);

  const handleAddUpi = () => {
    if (!newUpi.trim()) return;
    setExistingSetup((prev) => ({
      ...prev,
      upiIds: [...prev.upiIds, { _id: `temp-${Date.now()}`, upi: newUpi.trim() }],
    }));
    setNewUpi("");
    toast.info("UPI ID added to pending list");
  };

  const handleAddOfflinePayment = () => {
    if (!newOfflinePayment.receiverName.trim() || !newOfflinePayment.receiverContact.trim()) {
      toast.warning("Please fill required fields");
      return;
    }
    setExistingSetup((prev) => ({
      ...prev,
      offlinePayments: [...prev.offlinePayments, { _id: `temp-${Date.now()}`, ...newOfflinePayment }],
    }));
    setNewOfflinePayment({ receiverName: "", receiverContact: "", label: "" });
    toast.info("Offline receiver added to pending list");
  };

  const handleOfflinePaymentChange = (field, value) => {
    setNewOfflinePayment((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setQrFiles((prev) => [...prev, ...files]);
  };

  const handleSubmit = async () => {
    if (!managerId) return toast.error("Manager ID is required");
    try {
      const formData = new FormData();
      qrFiles.forEach((file) => formData.append("qrCodes", file));
      formData.append("managerId", managerId);
      if (tournamentId) formData.append("tournamentId", tournamentId);

      const newUpis = existingSetup.upiIds.filter((u) => u._id?.startsWith("temp-")).map((u) => u.upi);
      const newOffline = existingSetup.offlinePayments.filter((o) => o._id?.startsWith("temp-"));

      formData.append("upiIds", JSON.stringify(newUpis));
      formData.append("offlinePayments", JSON.stringify(newOffline));

      setLoading(true);
      setUploadProgress(0);

      const res = await axios.post(`/api/payments/setup`, formData, {
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });

      if (res.data.success) {
        toast.success("Payment setup saved successfully!");
        setQrFiles([]);
        fetchSetup();
      } else {
        toast.error(res.data.message || "Failed to save payment setup");
      }
    } catch (err) {
      console.error("Error submitting payment setup:", err);
      toast.error("Error saving setup. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (optionId, type) => {
    if (!managerId) return;
    if (typeof optionId === "string" && optionId.startsWith("temp-")) {
      setExistingSetup((prev) => ({
        ...prev,
        upiIds: prev.upiIds.filter((u) => u._id !== optionId),
        offlinePayments: prev.offlinePayments.filter((o) => o._id !== optionId),
      }));
      return;
    }
    try {
      const res = await axios.delete(`/api/payments/setup/delete`, {
        data: { managerId, optionId, type },
      });
      if (res.data.success) {
        setExistingSetup((prev) => ({
          ...prev,
          qrCodes: prev.qrCodes.filter((q) => q._id !== optionId),
          upiIds: prev.upiIds.filter((u) => u._id !== optionId),
          offlinePayments: prev.offlinePayments.filter((o) => o._id !== optionId),
        }));
        toast.success("Item deleted successfully");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting item");
    }
  };

  return (
    <ManagerShell searchPlaceholder="Search payment setup…">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <CreditCard className="w-3.5 h-3.5" />
            Finance · Payment setup
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Payment setup
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Configure how you'd like to receive payments for your tournaments.
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold shadow-sm shadow-orange-500/30 transition active:scale-[0.98] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving… {uploadProgress}%
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save configuration
            </>
          )}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* QR Codes */}
        <Section icon={QrCode} title="QR codes">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <label className="relative flex flex-col items-center justify-center aspect-square rounded-md cursor-pointer hover:bg-white/[0.04] transition group"
              style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
              <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
              <Upload className="w-5 h-5 text-gray-500 group-hover:text-orange-400 mb-1.5 transition-colors" />
              <span className="text-[11px] font-medium text-gray-500 group-hover:text-orange-400">Upload</span>
            </label>

            <AnimatePresence>
              {qrFiles.map((file, i) => (
                <motion.div
                  key={`new-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square group rounded-md overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <img loading="lazy"
                    src={URL.createObjectURL(file)}
                    alt="qr preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setQrFiles(qrFiles.filter((_, idx) => idx !== i))}
                      className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition w-auto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-white">
                    Preview
                  </span>
                </motion.div>
              ))}

              {existingSetup.qrCodes?.map((qr) => (
                <motion.div
                  key={qr._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square group rounded-md overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <img loading="lazy"
                    src={assetUrl(qr.imageUrl)}
                    alt="uploaded qr"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(qr._id, "qr")}
                      className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition w-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white">
                    Saved
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Section>

        {/* UPI IDs */}
        <Section icon={Smartphone} title="UPI identifiers">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={newUpi}
                onChange={(e) => setNewUpi(e.target.value)}
                placeholder="yourname@upi"
                className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              />
            </div>
            <DarkButton onClick={handleAddUpi} variant="ghost">
              <Plus className="w-3.5 h-3.5" /> Add
            </DarkButton>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto mt-3 pr-1">
            <AnimatePresence>
              {existingSetup.upiIds?.map((u) => (
                <motion.div
                  key={u._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between px-3 py-2 rounded-md group"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                    </span>
                    <span className="text-[13px] font-medium text-gray-200 truncate">{u.upi}</span>
                  </div>
                  <IconBtn onClick={() => handleDelete(u._id, "upi")} title="Delete" danger>
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconBtn>
                </motion.div>
              ))}
            </AnimatePresence>
            {(!existingSetup.upiIds || existingSetup.upiIds.length === 0) && (
              <p className="text-center py-4 text-[12px] text-gray-500">No UPI IDs added yet</p>
            )}
          </div>
        </Section>
      </div>

      {/* Offline payments */}
      <Section icon={User} title="Physical payment receivers" subtitle="Contact persons for on-site / manual payments">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
          <div className="md:col-span-4 relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={newOfflinePayment.receiverName}
              onChange={(e) => handleOfflinePaymentChange("receiverName", e.target.value)}
              placeholder="Full name"
              className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            />
          </div>
          <div className="md:col-span-4 relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={newOfflinePayment.receiverContact}
              onChange={(e) => handleOfflinePaymentChange("receiverContact", e.target.value)}
              placeholder="Contact number"
              className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            />
          </div>
          <div className="md:col-span-3 relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={newOfflinePayment.label}
              onChange={(e) => handleOfflinePaymentChange("label", e.target.value)}
              placeholder="Label (e.g. Venue desk)"
              className="w-full h-9 pl-9 pr-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            />
          </div>
          <div className="md:col-span-1">
            <button
              onClick={handleAddOfflinePayment}
              className="w-full h-9 inline-flex items-center justify-center bg-orange-500 text-white rounded-md hover:bg-orange-600 transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence>
            {existingSetup.offlinePayments?.map((o) => (
              <motion.div
                key={o._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-4 rounded-md group transition hover:border-white/[0.12]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-medium text-white truncate">{o.receiverName}</h3>
                    <p className="text-orange-400 text-[12px] font-medium flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      <span className="font-mono tabular-nums">{o.receiverContact}</span>
                    </p>
                  </div>
                  <IconBtn onClick={() => handleDelete(o._id, "offline")} title="Delete" danger>
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconBtn>
                </div>
                {o.label && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 mt-2">
                    {o.label}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {(!existingSetup.offlinePayments || existingSetup.offlinePayments.length === 0) && (
          <div className="text-center py-10">
            <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-2.5">
              <AlertCircle className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-[13px] font-medium text-white">No physical receivers configured</p>
            <p className="text-[12px] text-gray-400 mt-1">Add contact persons for on-field payments.</p>
          </div>
        )}
      </Section>
    </ManagerShell>
  );
};

// ── Dark inline primitives ───────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-orange-400" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-medium text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
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

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition w-auto ${
        danger ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-500 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

export default MPayments;
