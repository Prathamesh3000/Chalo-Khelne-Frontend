import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet, Upload, Download, CheckCircle, AlertCircle, Trash2,
  ChevronLeft, Users, UserPlus, X, Trophy, Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { ManagerShell } from "../shared/layout";

const BulkBookingUpload = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("tournamentId");
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    if (tournamentId) fetchTournament();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/tournaments/${tournamentId}`);
      setTournament(res.data.tournament || res.data);
    } catch (err) {
      toast.error("Failed to load tournament details");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { Name: "John Doe", Email: "john@company.com", Phone: "9876543210", EmployeeId: "EMP001", Category: "" },
      { Name: "Jane Smith", Email: "", Phone: "", EmployeeId: "EMP002", Category: "" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Players");
    ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    XLSX.writeFile(wb, "Bulk_Booking_Template.xlsx");
    toast.success("Template downloaded!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          setFileError("Excel file is empty or has no data rows.");
          return;
        }

        const mapped = data.map((row) => {
          const get = (keys) => {
            for (const k of keys) {
              const val = row[k] || row[k.toLowerCase()] || row[k.toUpperCase()];
              if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
            }
            return "";
          };
          return {
            name:       get(["Name", "name", "Player Name", "PlayerName", "FullName"]),
            email:      get(["Email", "email", "E-mail", "EmailId"]),
            phone:      get(["Phone", "phone", "Mobile", "mobile", "Phone Number", "PhoneNumber", "Contact"]),
            employeeId: get(["EmployeeId", "employeeId", "Employee ID", "EmpId", "ID", "Emp_Id"]),
            category:   get(["Category", "category", "Cat"]),
          };
        }).filter((p) => p.name);

        if (mapped.length === 0) {
          setFileError("No valid player rows found. Make sure the 'Name' column exists and has data.");
          return;
        }

        setPlayers(mapped);
        toast.success(`${mapped.length} players loaded from Excel`);
      } catch (err) {
        setFileError("Failed to parse Excel file. Please check the format.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const removePlayer = (index) => setPlayers((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (players.length === 0) { toast.error("No players to upload"); return; }
    setUploading(true);
    setResult(null);
    try {
      const res = await axios.post("/api/tournaments/bookings/bulk-create", { tournamentId, players });
      setResult(res.data);
      if (res.data.created?.length > 0) toast.success(`${res.data.created.length} bookings created successfully!`);
      if (res.data.skipped?.length > 0) toast.warn(`${res.data.skipped.length} players skipped (duplicates or missing data)`);
      setPlayers([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create bookings");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <ManagerShell searchPlaceholder="Bulk register players…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </ManagerShell>
    );
  }

  return (
    <ManagerShell searchPlaceholder="Bulk register players…">
      {/* Header */}
      <header className="flex items-start gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/[0.04] transition w-auto flex-shrink-0"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <Users className="w-3.5 h-3.5" />
            Tournament · Bulk register
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Bulk player registration
          </h1>
          <p className="mt-1 text-[13px] text-gray-400 inline-flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-orange-400" />
            {tournament?.title || "Tournament"}
          </p>
        </div>
      </header>

      {/* Info banner */}
      <div className="px-4 py-3 rounded-md flex items-start gap-3 mb-5"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
        <span className="w-7 h-7 rounded-md bg-amber-500/15 grid place-items-center flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        </span>
        <div>
          <p className="text-[13px] font-medium text-amber-200">Private tournament — manager upload</p>
          <p className="text-[12px] text-amber-200/80 mt-0.5">
            Upload an Excel sheet with player details to register them directly. No player accounts required.
            Email will be auto-generated for players who don't have one.
          </p>
        </div>
      </div>

      {/* Upload section */}
      <Section
        icon={FileSpreadsheet}
        title="Upload Excel"
        rightSlot={
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold text-gray-200 hover:text-white hover:bg-white/[0.06] transition w-auto"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Download className="w-3.5 h-3.5" /> Download template
          </button>
        }
      >
        <div className="rounded-md p-8 text-center transition relative cursor-pointer group hover:bg-white/[0.04]"
          style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <Upload className="w-9 h-9 text-gray-500 group-hover:text-orange-400 mx-auto mb-2.5 transition" />
          <p className="text-[13px] font-medium text-gray-200">Drop your Excel file here or click to browse</p>
          <p className="text-[12px] text-gray-500 mt-1">Supports .xlsx and .xls formats</p>
        </div>

        {fileError && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-red-300">
            <AlertCircle className="w-3.5 h-3.5" />
            {fileError}
          </div>
        )}
      </Section>

      {/* Preview table */}
      {players.length > 0 && (
        <div className="mt-4">
          <Section
            icon={Users}
            title={`Preview (${players.length} players)`}
            rightSlot={
              <button
                onClick={() => setPlayers([])}
                className="text-[12px] font-semibold text-red-400 hover:text-red-300 transition inline-flex items-center gap-1 w-auto"
              >
                <X className="w-3.5 h-3.5" /> Clear all
              </button>
            }
          >
            <div className="overflow-x-auto -mx-5 -mb-4">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <Th>#</Th>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Emp ID</Th>
                    <Th>Category</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition">
                      <Td><span className="text-gray-500 font-mono tabular-nums">{i + 1}</span></Td>
                      <Td><span className="font-medium text-white">{p.name}</span></Td>
                      <Td><span className="text-gray-300">{p.email || <span className="text-gray-500 italic">Auto-generate</span>}</span></Td>
                      <Td><span className="text-gray-300 font-mono tabular-nums">{p.phone || <span className="text-gray-500">—</span>}</span></Td>
                      <Td><span className="text-gray-300 font-mono">{p.employeeId || <span className="text-gray-500">—</span>}</span></Td>
                      <Td><span className="text-gray-300">{p.category || <span className="text-gray-500">Default</span>}</span></Td>
                      <Td>
                        <button
                          onClick={() => removePlayer(i)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition active:scale-[0.98] shadow-sm shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating bookings…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Register {players.length} players
                  </>
                )}
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-4">
          <Section icon={CheckCircle} title="Upload results">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-md p-4 text-center"
                style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <p className="text-[22px] font-semibold text-emerald-300 tabular-nums leading-none">{result.created?.length || 0}</p>
                <p className="text-[12px] text-emerald-300/80 font-medium mt-1.5">Created</p>
              </div>
              <div className="rounded-md p-4 text-center"
                style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <p className="text-[22px] font-semibold text-amber-300 tabular-nums leading-none">{result.skipped?.length || 0}</p>
                <p className="text-[12px] text-amber-300/80 font-medium mt-1.5">Skipped</p>
              </div>
            </div>

            {result.skipped?.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Skipped players</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {result.skipped.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-md"
                      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)" }}>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="font-medium text-gray-200">{s.name || "Unknown"}</span>
                      <span className="text-gray-500">—</span>
                      <span className="text-amber-300">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>
      )}
    </ManagerShell>
  );
};

function Section({ icon: Icon, title, rightSlot, children }) {
  return (
    <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-md bg-orange-500/15 grid place-items-center flex-shrink-0">
            <Icon className="w-3.5 h-3.5 text-orange-400" />
          </span>
          <h3 className="text-[13px] font-medium text-white truncate">{title}</h3>
        </div>
        {rightSlot}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="py-3 px-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">{children}</th>;
}
function Td({ children }) {
  return <td className="py-3 px-3">{children}</td>;
}

export default BulkBookingUpload;
