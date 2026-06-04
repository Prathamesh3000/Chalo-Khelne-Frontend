import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  MessageSquare, X, CheckCircle, Loader2, Copy,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";

const EMPTY_FORM = {
  name: "", email: "", phone: "",
  companyName: "", industryType: "", companySize: "", location: "",
  designation: "Admin",
  clubName: "", sports: "", city: "", address: "",
};

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [onboardType, setOnboardType] = useState("corporate");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  useEffect(() => { fetchInquiries(); }, []);

  const fetchInquiries = async () => {
    try {
      const res = await axios.get("/api/inquiries");
      setInquiries(res.data);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (inquiry) => {
    setSelectedInquiry(inquiry);
    setFormData({
      ...EMPTY_FORM,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      companyName: inquiry.clubName || inquiry.companyName || "",
      location: inquiry.city || "",
      clubName: inquiry.clubName || (inquiry.name + " Club"),
      sports: inquiry.sports || "",
      city: inquiry.city || "",
    });
    setOnboardType(inquiry.inquiryType === "Partnership" ? "corporate" : "club");
    setGeneratedCredentials(null);
    setShowModal(true);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = onboardType === "corporate" ? "/api/corporate/onboard" : "/api/clubadminprofile/onboard";
      const res = await axios.post(endpoint, formData);
      setGeneratedCredentials(res.data.credentials);
      toast.success(`${onboardType === "corporate" ? "Corporate" : "Club"} account created successfully!`);
      if (selectedInquiry) {
        await axios.put(`/api/inquiries/${selectedInquiry._id}/status`, { status: "Resolved" });
        fetchInquiries();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCreds = () => {
    if (!generatedCredentials) return;
    navigator.clipboard.writeText(`Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`);
    toast.info("Credentials copied to clipboard");
  };

  return (
    <SuperAdminShell searchPlaceholder="Search inquiries…">
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
          <MessageSquare className="w-3.5 h-3.5" />
          Club approvals · Inquiries
        </p>
        <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
          Inquiries
        </h1>
        <p className="mt-1 text-[13px] text-gray-400">
          Onboard new corporate and club admins from inbound inquiries.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Type</Th>
                  <Th>Message</Th>
                  <Th align="center">Status</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-[13px] text-gray-500">No inquiries found.</td>
                  </tr>
                ) : inquiries.map((inquiry) => (
                  <tr key={inquiry._id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition">
                    <Td><span className="text-[13px] font-medium text-white">{inquiry.name}</span></Td>
                    <Td><span className="text-[12px] text-gray-300">{inquiry.email}</span></Td>
                    <Td><span className="text-[12px] text-gray-300 font-mono tabular-nums">{inquiry.phone}</span></Td>
                    <Td><span className="text-[12px] text-gray-300">{inquiry.inquiryType}</span></Td>
                    <Td>
                      <span className="text-[12px] text-gray-400 max-w-xs truncate inline-block" title={inquiry.message}>
                        {inquiry.message}
                      </span>
                    </Td>
                    <Td align="center"><StatusPill status={inquiry.status} /></Td>
                    <Td align="center">
                      {inquiry.status !== "Resolved" ? (
                        <button onClick={() => handleOpenModal(inquiry)}
                          className="inline-flex items-center h-7 px-3 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold transition active:scale-[0.98] w-auto">
                          Onboard
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-500 italic">Completed</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#181A22] border border-white/[0.06] rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.5)] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.06]">
              <div>
                <p className="text-[14px] font-medium text-white">Onboard admin</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Create a new account from this inquiry.</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition w-auto">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!generatedCredentials && (
                <div className="inline-flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-md border border-white/[0.06] mb-5 w-full">
                  {[
                    { key: "corporate", label: "Corporate admin" },
                    { key: "club",      label: "Normal club admin" },
                  ].map(({ key, label }) => {
                    const active = onboardType === key;
                    return (
                      <button key={key} onClick={() => setOnboardType(key)}
                        className={`flex-1 inline-flex items-center justify-center h-7 px-3 rounded-[5px] text-[12px] font-medium transition w-auto ${
                          active ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"
                        }`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {generatedCredentials ? (
                <div className="rounded-md p-4" style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-[14px] font-medium text-emerald-200">Credentials generated</h3>
                  </div>
                  <p className="text-[12px] text-emerald-200/80 mb-3">
                    Account created for {onboardType === "corporate" ? "Corporate" : "Club"} Admin.
                  </p>
                  <div className="rounded-md p-3 space-y-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[12px] text-gray-300">
                      <span className="text-gray-500">Email:</span> <span className="text-white font-mono">{generatedCredentials.email}</span>
                    </p>
                    <p className="text-[12px] text-gray-300">
                      <span className="text-gray-500">Password:</span> <span className="text-white font-mono">{generatedCredentials.password}</span>
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <DarkButton variant="ghost" className="flex-1" onClick={copyCreds}>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </DarkButton>
                    <DarkButton className="flex-1" onClick={() => setShowModal(false)}>Close</DarkButton>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <DarkInput label="Full name *"          name="name"        value={formData.name}        onChange={handleChange} required />
                    <DarkInput label="Designation"          name="designation" value={formData.designation} onChange={handleChange} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DarkInput label="Email (username) *"   name="email" type="email" value={formData.email} onChange={handleChange} required />
                    <DarkInput label="Phone *"              name="phone" value={formData.phone}             onChange={handleChange} required />
                  </div>

                  <div className="pt-2 mt-2 border-t border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mt-2 mb-3">
                      {onboardType === "corporate" ? "Company details" : "Club details"}
                    </p>
                  </div>

                  {onboardType === "corporate" ? (
                    <>
                      <DarkInput label="Company name *" name="companyName" value={formData.companyName} onChange={handleChange} required />
                      <div className="grid grid-cols-2 gap-3">
                        <DarkInput label="Industry type *" name="industryType" value={formData.industryType} onChange={handleChange} placeholder="e.g. IT, Finance" required />
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Company size *</label>
                          <select name="companySize" required value={formData.companySize} onChange={handleChange}
                            className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 focus:outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <option value=""        className="bg-[#181A22]">Select size</option>
                            <option value="1-50"    className="bg-[#181A22]">1-50</option>
                            <option value="51-200"  className="bg-[#181A22]">51-200</option>
                            <option value="201-500" className="bg-[#181A22]">201-500</option>
                            <option value="500+"    className="bg-[#181A22]">500+</option>
                          </select>
                        </div>
                      </div>
                      <DarkInput label="Location *" name="location" value={formData.location} onChange={handleChange} required />
                    </>
                  ) : (
                    <>
                      <DarkInput label="Club name *" name="clubName" value={formData.clubName} onChange={handleChange} required />
                      <div className="grid grid-cols-2 gap-3">
                        <DarkInput label="City *"   name="city"   value={formData.city}   onChange={handleChange} required />
                        <DarkInput label="Sports *" name="sports" value={formData.sports} onChange={handleChange} placeholder="Cricket, Football, etc." required />
                      </div>
                      <DarkInput label="Full address *" name="address" value={formData.address} onChange={handleChange} required />
                    </>
                  )}

                  <div className="pt-2">
                    <DarkButton type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : "Create account & send credentials"}
                    </DarkButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}

// ── Inline primitives ────────────────────────────────────────────────────────

function StatusPill({ status }) {
  let cls = "bg-white/[0.06] text-gray-400";
  if (status === "Pending")  cls = "bg-amber-500/15 text-amber-300";
  if (status === "Resolved") cls = "bg-emerald-500/15 text-emerald-300";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

function Th({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-3 px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 ${a}`}>{children}</th>;
}
function Td({ children, align }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`py-3 px-4 ${a}`}>{children}</td>;
}

function DarkInput({ label, ...rest }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">{label}</label>
      <input
        {...rest}
        className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
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
