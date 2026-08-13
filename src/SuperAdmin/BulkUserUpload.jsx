import { useRef, useState } from "react";
import { api } from "../shared/api";
import {
  Upload,
  Download,
  FileSpreadsheet,
  UserPlus,
  X,
  CheckCircle2,
  AlertTriangle,
  SkipForward,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import { SuperAdminShell } from "../shared/layout";

/**
 * Bulk user provisioning (SuperAdmin).
 *
 * The backend (/api/bulk-upload) has always existed and is guarded by
 * requireSuperAdmin. Its only UI used to live inside the old SuperAdmin
 * Sidebar component, which was orphaned when the shared shell replaced it —
 * so the feature became unreachable in the running app. This page restores it
 * as a first-class route.
 *
 * Two deliberate differences from the old sidebar modal:
 *   • Requests go through the shared api client, so the auth/refresh
 *     interceptors attach the bearer token. The old code used bare fetch with a
 *     hand-built header, and window.open() for the template download — which
 *     sends no Authorization header at all. Against a requireSuperAdmin router
 *     that download could only ever have 401'd.
 *   • The result is itemised. The old version reported "Errors: 30" with no
 *     indication of which rows failed or why.
 */

// Relative to the client's configured baseURL.
const API = "/bulk-upload";

const ACCEPTED = ".xlsx,.xls,.csv,.pdf,.docx";
const MAX_BYTES = 5 * 1024 * 1024; // mirrors the server's multer cap

// `age` is deliberately absent — the server derives it from dateOfBirth, along
// with isMinor and ageGroup, so collecting it here would let the two disagree.
const EMPTY_USER = {
  name: "",
  email: "",
  mobile: "",
  password: "",
  dateOfBirth: "",
  sex: "male",
};

// Hoisted to module scope — a component defined inside the page body is a new
// type on every render, which remounts the input and drops keyboard focus.
const FieldLabel = ({ htmlFor, children }) => (
  <label
    htmlFor={htmlFor}
    className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5"
  >
    {children}
  </label>
);

const TextField = ({ id, label, ...props }) => (
  <div>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <input
      id={id}
      className="w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
      {...props}
    />
  </div>
);

const STATUS_STYLE = {
  skipped: { icon: SkipForward, cls: "text-amber-300", label: "Skipped" },
  failed: { icon: AlertTriangle, cls: "text-red-300", label: "Failed" },
};

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BulkUserUpload() {
  const [tab, setTab] = useState("bulk");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);
  const [creating, setCreating] = useState(false);
  const [singleUser, setSingleUser] = useState(EMPTY_USER);
  const fileInputRef = useRef(null);

  const chooseFile = (picked) => {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      toast.error(`File is ${formatBytes(picked.size)} — the limit is 5 MB.`);
      return;
    }
    setFile(picked);
    setReport(null);
  };

  const handleTemplateDownload = async () => {
    try {
      // Must go through the api client: the template route sits behind
      // requireSuperAdmin, so it needs the bearer token the interceptor attaches.
      const res = await api.get(`${API}/template`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ChaloKhelne_User_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the template.");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }
    setUploading(true);
    setReport(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post(API, formData);
      setReport(res.data);
      if (res.data.created > 0) {
        toast.success(`Created ${res.data.created} user(s).`);
      } else {
        toast.info("No new users were created.");
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post(`${API}/single`, singleUser);
      toast.success("User created.");
      setSingleUser(EMPTY_USER);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create the user.");
    } finally {
      setCreating(false);
    }
  };

  const setField = (name) => (e) =>
    setSingleUser((u) => ({ ...u, [name]: e.target.value }));

  return (
    <SuperAdminShell searchPlaceholder="Search users…">
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
          <Upload className="w-3.5 h-3.5" />
          Admin · Users
        </p>
        <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
          Bulk user upload
        </h1>
        <p className="mt-1 text-[13px] text-gray-400 max-w-2xl">
          Provision player accounts from a spreadsheet, or create one at a time.
          Column names are matched loosely, so <em>Full Name</em>, <em>fullname</em>{" "}
          and <em>name</em> all resolve to the same field.
        </p>
      </header>

      <div className="flex gap-1 mb-4 border-b border-white/[0.06]">
        {[
          { key: "bulk", label: "Import from file", icon: FileSpreadsheet },
          { key: "single", label: "Single user", icon: UserPlus },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`h-9 px-3 inline-flex items-center gap-1.5 text-[12px] border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-orange-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
        <p className="text-[12px] text-gray-400">
          Imported accounts are always created as approved <strong>Players</strong>.
          Role, approval status and permissions in the file are ignored — grant a
          different role afterwards from <em>Roles &amp; Permissions</em>.
          <br />
          Required columns: <strong>name, email, mobile, password, dateOfBirth</strong>.
          Dates may be <em>YYYY-MM-DD</em> or <em>DD/MM/YYYY</em>. Age is derived
          from the date of birth, so there is no age column.
        </p>
      </div>

      {tab === "bulk" ? (
        <>
          <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-medium text-white">Import from file</h2>
              <button
                onClick={handleTemplateDownload}
                className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
              >
                <Download className="w-3.5 h-3.5" />
                Download template
              </button>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                chooseFile(e.dataTransfer.files?.[0]);
              }}
              className={`w-full border-2 border-dashed rounded-lg py-12 px-6 text-center transition-colors ${
                dragging
                  ? "border-orange-400/60 bg-orange-500/[0.04]"
                  : "border-white/[0.10] hover:border-white/[0.20]"
              }`}
            >
              <FileSpreadsheet className="w-7 h-7 text-gray-500 mx-auto mb-3" />
              <p className="text-[13px] text-gray-300">
                Drag a file here, or click to browse
              </p>
              <p className="mt-1.5 text-[11px] text-gray-500">
                .xlsx · .xls · .csv · .pdf · .docx — up to 5 MB
              </p>
            </button>
            <input
              ref={fileInputRef}
              id="bulk-file"
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />

            {file && (
              <div className="mt-4 flex items-center justify-between gap-3 bg-[#0F1117] border border-white/[0.08] rounded-md px-3 py-2">
                <span className="text-[13px] text-gray-200 truncate">
                  {file.name}{" "}
                  <span className="text-gray-500">({formatBytes(file.size)})</span>
                </span>
                <button
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  aria-label="Remove selected file"
                  className="p-1 text-gray-500 hover:text-red-300 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-4 h-9 px-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white disabled:opacity-40 disabled:hover:bg-orange-500"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Importing…" : "Import users"}
            </button>
          </div>

          {report && <ImportReport report={report} />}
        </>
      ) : (
        <form
          onSubmit={handleSingleSubmit}
          className="bg-[#181A22] border border-white/[0.06] rounded-lg p-5 max-w-xl"
        >
          <h2 className="text-[14px] font-medium text-white mb-4">Create a single user</h2>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="su-name"
              label="Name"
              value={singleUser.name}
              onChange={setField("name")}
              required
            />
            <TextField
              id="su-email"
              label="Email"
              type="email"
              value={singleUser.email}
              onChange={setField("email")}
              required
            />
            <TextField
              id="su-mobile"
              label="Mobile"
              value={singleUser.mobile}
              onChange={setField("mobile")}
              required
            />
            <TextField
              id="su-password"
              label="Password"
              type="password"
              value={singleUser.password}
              onChange={setField("password")}
              required
            />
            <TextField
              id="su-dob"
              label="Date of birth"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={singleUser.dateOfBirth}
              onChange={setField("dateOfBirth")}
              required
            />
            <div>
              <FieldLabel htmlFor="su-sex">Sex</FieldLabel>
              <select
                id="su-sex"
                value={singleUser.sex}
                onChange={setField("sex")}
                className="w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="mt-4 h-9 px-4 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white disabled:opacity-40"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>
      )}
    </SuperAdminShell>
  );
}

// ── Result of an import ──────────────────────────────────────────────────────

function ImportReport({ report }) {
  const rows = Array.isArray(report.rows) ? report.rows : [];
  return (
    <div className="mt-4 bg-[#181A22] border border-white/[0.06] rounded-lg p-5">
      <h2 className="text-[14px] font-medium text-white mb-3">Import result</h2>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat icon={CheckCircle2} cls="text-emerald-300" value={report.created} label="Created" />
        <Stat icon={SkipForward} cls="text-amber-300" value={report.skipped} label="Already existed" />
        <Stat icon={AlertTriangle} cls="text-red-300" value={report.failed} label="Failed" />
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] text-gray-400">
          Every row in the file was imported.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                  <th className="py-2 pr-3 font-medium w-16">Row</th>
                  <th className="py-2 pr-3 font-medium w-24">Status</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = STATUS_STYLE[r.status] || STATUS_STYLE.failed;
                  const Icon = s.icon;
                  return (
                    <tr key={`${r.row}-${r.email}`} className="border-b border-white/[0.04]">
                      <td className="py-2 pr-3 text-gray-400 tabular-nums">{r.row}</td>
                      <td className={`py-2 pr-3 ${s.cls}`}>
                        <span className="inline-flex items-center gap-1">
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-gray-300 truncate max-w-[220px]">
                        {r.email || "—"}
                      </td>
                      <td className="py-2 text-gray-400">{r.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {report.truncated > 0 && (
            <p className="mt-3 text-[12px] text-gray-500">
              …and {report.truncated} more not shown. The counts above are complete.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, cls, value, label }) {
  return (
    <div className="bg-[#0F1117] border border-white/[0.08] rounded-md px-3 py-2.5">
      <div className={`inline-flex items-center gap-1.5 ${cls}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[18px] font-medium tabular-nums">{value ?? 0}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
