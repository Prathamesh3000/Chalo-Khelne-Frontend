import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Search, RefreshCcw, Store, X, CheckCircle2, Mail, Phone, Globe } from "lucide-react";

const STATUSES = ["draft", "pending_verification", "active", "suspended", "rejected", "deactivated"];
const STATUS_BADGE = {
  draft: "bg-gray-500/15 text-gray-400",
  pending_verification: "bg-amber-500/15 text-amber-300",
  active: "bg-emerald-500/15 text-emerald-300",
  suspended: "bg-red-500/15 text-red-300",
  rejected: "bg-red-500/15 text-red-300",
  deactivated: "bg-gray-500/15 text-gray-400",
};
const fmtStatus = (s) => String(s || "").replace(/_/g, " ");

export default function VendorsListTab() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  // Editable admin fields in the detail modal
  const [editStatus, setEditStatus] = useState("active");
  const [editCommission, setEditCommission] = useState("");
  const [editVerified, setEditVerified] = useState(false);
  const [editPlatform, setEditPlatform] = useState(false); // is the platform vendor
  const [creds, setCreds] = useState(null); // { email, tempPassword } shown once after reset

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await axios.get("/api/vendors", { params });
      setVendors(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const openDetail = async (id) => {
    try {
      const res = await axios.get(`/api/vendors/${id}`);
      const v = res.data.data;
      setSelected(v);
      setEditStatus(v.status || "active");
      setEditCommission(v.commissionPercent != null ? String(v.commissionPercent) : "");
      setEditVerified(!!v.documentsVerified);
      setEditPlatform(!!v.isPlatformVendor);
      setCreds(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load vendor");
    }
  };

  const resetPassword = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await axios.post(`/api/vendors/${selected._id}/reset-password`);
      setCreds(res.data.data); // { email, tempPassword }
      toast.success("Temporary password generated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const body = {
        status: editStatus,
        documentsVerified: editVerified,
        isPlatformVendor: editPlatform,
      };
      if (editCommission !== "") body.commissionPercent = Number(editCommission);
      const res = await axios.patch(`/api/vendors/${selected._id}`, body);
      toast.success("Vendor updated");
      setSelected(res.data.data);
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update vendor");
    } finally {
      setBusy(false);
    }
  };

  // Promote a DRAFT into a live account: sets status active → backend creates
  // the login User + sends the set-password email.
  const createAccount = async () => {
    if (!selected) return;
    if (!confirm(`Create a login account for "${selected.businessName}"? A set-password email will be sent to ${selected.email}.`)) return;
    setBusy(true);
    try {
      const body = { status: "active", documentsVerified: editVerified };
      if (editCommission !== "") body.commissionPercent = Number(editCommission);
      const res = await axios.patch(`/api/vendors/${selected._id}`, body);
      toast.success("Vendor account created — a set-password email was sent.");
      setSelected(res.data.data);
      setEditStatus(res.data.data.status || "active");
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); fetchVendors(); }}
          className="flex-1 min-w-[220px] relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search vendors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          onClick={fetchVendors}
          className="h-9 px-3 w-auto inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
        >
          <RefreshCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <RefreshCcw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">Loading vendors…</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Store className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">No vendors yet</h3>
          <p className="text-[13px] text-gray-400 mt-1">Create one from the "Create Vendor" tab.</p>
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Business", "Owner", "Email", "Status", ""].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500 ${i === 4 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer" onClick={() => openDetail(v._id)}>
                    <td className="px-4 py-3 text-[13px] font-medium text-white">{v.businessName}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-200">{v.ownerName}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-400">{v.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[v.status] || "bg-gray-500/15 text-gray-400"}`}>
                        {fmtStatus(v.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetail(v._id); }}
                        className="w-auto text-[12px] text-orange-300 hover:text-orange-200"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[12px] text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 px-3 w-auto bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200 disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 px-3 w-auto bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-300" /> {selected.businessName}
              </h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-2.5 text-[13px]">
              <DetailRow label="Owner" value={selected.ownerName} />
              <DetailRow label="Email" value={selected.email} icon={Mail} />
              <DetailRow label="Phone" value={selected.phone || "—"} icon={Phone} />
              <DetailRow label="Category" value={selected.category || "—"} />
              <DetailRow label="Website" value={selected.website || "—"} icon={Globe} />
              <DetailRow label="GST" value={selected.gstNumber || "—"} />
              <DetailRow label="Address" value={[selected.address?.line, selected.address?.city, selected.address?.state, selected.address?.country, selected.address?.postalCode].filter(Boolean).join(", ") || "—"} />
              <DetailRow label="Business type" value={selected.businessType || "—"} />
              <DetailRow label="Status" value={fmtStatus(selected.status)} />
              <DetailRow label="Commission" value={`${selected.commissionPercent || 0}%`} />
              <DetailRow label="Documents" value={selected.documentsVerified ? "Verified" : "Not verified"} />
              <DetailRow label="Platform vendor" value={selected.isPlatformVendor ? "Yes — receives product uploads" : "No"} />
              {selected.description && <p className="text-gray-400 pt-2 border-t border-white/[0.06]">{selected.description}</p>}
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full h-9 px-2 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white capitalize">
                    {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Commission %</label>
                  <input type="number" min="0" max="100" value={editCommission} onChange={(e) => setEditCommission(e.target.value)} className="w-full h-9 px-2 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-gray-300 cursor-pointer">
                <input type="checkbox" checked={editVerified} onChange={(e) => setEditVerified(e.target.checked)} className="accent-orange-500" />
                Documents verified
              </label>
              <label className="flex items-center gap-2 text-[12px] text-gray-300 cursor-pointer">
                <input type="checkbox" checked={editPlatform} onChange={(e) => setEditPlatform(e.target.checked)} className="accent-orange-500" />
                Platform vendor <span className="text-gray-500">(receives all product uploads — only one)</span>
              </label>
              {(selected.status === "draft" || !selected.userId) && (
                <p className="text-[11px] text-amber-300/90">
                  This is a draft — no login account exists yet. Click <span className="font-semibold">Create Account</span> to create the login and send the set-password email.
                </p>
              )}
              {creds && (
                <div className="bg-[#0F1117] border border-emerald-500/30 rounded-md p-3 text-[12px]">
                  <p className="text-emerald-300 font-semibold mb-1">Temporary login credentials</p>
                  <p className="text-gray-300">Email: <span className="text-white font-mono select-all">{creds.email}</span></p>
                  <p className="text-gray-300">Password: <span className="text-white font-mono select-all">{creds.tempPassword}</span></p>
                  <p className="text-gray-500 mt-1">Share with the vendor — they can change it after logging in. (Shown once.)</p>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div>
                  {selected.userId && (
                    <button onClick={resetPassword} disabled={busy} className="h-9 px-3 w-auto bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200 disabled:opacity-60 inline-flex items-center gap-1.5">
                      <RefreshCcw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> Get / Reset Password
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {(selected.status === "draft" || !selected.userId) && (
                    <button onClick={createAccount} disabled={busy} className="h-9 px-4 w-auto bg-emerald-600 hover:bg-emerald-700 rounded-md text-[12px] font-medium text-white disabled:opacity-60 inline-flex items-center gap-1.5">
                      {busy ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Create Account
                    </button>
                  )}
                  <button onClick={saveChanges} disabled={busy} className="h-9 px-4 w-auto bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white disabled:opacity-60 inline-flex items-center gap-1.5">
                    {busy ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500 inline-flex items-center gap-1.5">{Icon && <Icon className="w-3.5 h-3.5" />}{label}</span>
      <span className="text-gray-200 text-right break-all">{value}</span>
    </div>
  );
}
