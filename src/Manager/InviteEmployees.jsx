import { useState, useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import * as XLSX from "xlsx";
import {
  QrCode, FileSpreadsheet, UserPlus, Trophy, Download, Upload, User,
  CheckCircle, Trash2, ChevronLeft, Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { ManagerShell } from "../shared/layout";

const InviteEmployees = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("tournamentId");
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("qr");

  const [manualEmployees, setManualEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({ employeeId: "", name: "", mobile: "" });

  const [excelData, setExcelData] = useState([]);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!user?.isCorporate) { navigate("/mdashboard"); return; }
    if (!tournamentId)      { navigate("/mtournament-management"); return; }
    fetchTournament();
  }, [tournamentId, user]);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      setTournament(response.data.tournament);
      if (response.data.tournament.whitelist) {
        setManualEmployees(response.data.tournament.whitelist.map((emp) => ({ ...emp, id: emp._id || Math.random() })));
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      toast.error("Failed to load tournament details");
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("invite-qr-canvas");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `tournament_invite_qr_${tournamentId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const templateData = [{ EmployeeId: "", Name: "", "Mobile no.": "" }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Tournament_Employee_Template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const formattedData = data.map((item) => ({
        employeeId: item.EmployeeId || item.employeeId || "",
        name:       item.Name       || item.name       || "",
        mobile:     item["Mobile no."] || item.mobile  || "",
      })).filter((item) => item.name || item.employeeId);

      const uniqueData = [];
      const seenIds = new Set();
      const seenMobiles = new Set();
      formattedData.forEach((item) => {
        const id = item.employeeId?.toString().trim();
        const mob = item.mobile?.toString().trim();
        if ((id && seenIds.has(id)) || (mob && seenMobiles.has(mob))) return;
        if (id) seenIds.add(id);
        if (mob) seenMobiles.add(mob);
        uniqueData.push(item);
      });

      if (uniqueData.length < formattedData.length) {
        toast.info(`Filtered out ${formattedData.length - uniqueData.length} duplicate entries from Excel.`);
      }
      setExcelData(uniqueData);
    };
    reader.readAsBinaryString(file);
  };

  const handleInviteExcel = async () => {
    if (excelData.length === 0) { toast.warning("No data found in the uploaded file"); return; }
    try {
      const response = await axios.put(`/api/tournaments/${tournamentId}/whitelist`, { whitelist: excelData });
      if (response.data.success) {
        toast.success("Employee list uploaded and saved successfully!");
        setManualEmployees(response.data.tournament.whitelist.map((emp) => ({ ...emp, id: emp._id || Math.random() })));
        setExcelData([]);
        setFileName("");
      }
    } catch (error) {
      console.error("Error saving whitelist:", error);
      toast.error("Failed to save employee list");
    }
  };

  const handleAddManual = () => {
    if (!newEmployee.name || !newEmployee.employeeId) { toast.error("Employee Id and Name are required"); return; }
    const mobileRegex = /^[0-9]{10}$/;
    if (newEmployee.mobile && !mobileRegex.test(newEmployee.mobile)) {
      toast.error("Mobile number must be exactly 10 digits");
      return;
    }
    const isDuplicateId = manualEmployees.some((emp) => emp.employeeId === newEmployee.employeeId);
    const isDuplicateMobile = newEmployee.mobile && manualEmployees.some((emp) => emp.mobile === newEmployee.mobile);
    if (isDuplicateId) { toast.error(`Employee ID ${newEmployee.employeeId} is already in the list`); return; }
    if (isDuplicateMobile) { toast.error(`Mobile number ${newEmployee.mobile} is already in the list`); return; }
    setManualEmployees([...manualEmployees, { ...newEmployee, id: Date.now() }]);
    setNewEmployee({ employeeId: "", name: "", mobile: "" });
  };

  const handleRemoveManual = (id) => {
    setManualEmployees(manualEmployees.filter((emp) => emp.id !== id));
  };

  const handleInviteManual = async () => {
    if (manualEmployees.length === 0) { toast.warning("Please add at least one employee"); return; }
    try {
      const response = await axios.put(`/api/tournaments/${tournamentId}/whitelist`, {
        whitelist: manualEmployees.map(({ employeeId, name, mobile }) => ({ employeeId, name, mobile })),
      });
      if (response.data.success) {
        toast.success("Employee list updated successfully!");
        setManualEmployees(response.data.tournament.whitelist.map((emp) => ({ ...emp, id: emp._id || Math.random() })));
      }
    } catch (error) {
      console.error("Error saving whitelist:", error);
      toast.error("Failed to save employee list");
    }
  };

  if (loading) {
    return (
      <ManagerShell searchPlaceholder="Invite employees…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </ManagerShell>
    );
  }

  return (
    <ManagerShell searchPlaceholder="Invite employees…">
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
            <UserPlus className="w-3.5 h-3.5" />
            Tournament · Invite employees
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Invite employees
          </h1>
          <p className="mt-1 text-[13px] text-gray-400 inline-flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-orange-400" />
            {tournament?.title || "Tournament"}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 bg-white/[0.04] p-1 rounded-md border border-white/[0.06] mb-5">
        {[
          { key: "qr",     label: "QR code",      icon: QrCode },
          { key: "excel",  label: "Excel upload", icon: FileSpreadsheet },
          { key: "manual", label: "Manual add",   icon: UserPlus },
        ].map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] text-[12px] font-medium transition w-auto ${
                active ? "bg-[#181A22] text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)]" : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          );
        })}
      </div>

      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-6">
        {/* Tab: QR */}
        {activeTab === "qr" && (
          <div className="flex flex-col items-center text-center max-w-sm mx-auto py-4">
            <div className="bg-white p-5 rounded-md mb-5">
              <QRCodeCanvas
                id="invite-qr-canvas"
                value={`chalokhelne://tournament/details/${tournamentId}`}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>
            <h3 className="text-[15px] font-medium text-white mb-1.5">Tournament QR code</h3>
            <p className="text-[13px] text-gray-400 mb-6">
              Employees can scan this QR code to join the tournament directly from their mobile app.
            </p>
            <button
              onClick={downloadQRCode}
              className="w-full h-9 inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
            >
              <Download className="w-3.5 h-3.5" /> Download QR code
            </button>
          </div>
        )}

        {/* Tab: Excel */}
        {activeTab === "excel" && (
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Upload filled sheet</span>
              <button
                onClick={downloadTemplate}
                className="text-[12px] font-semibold text-orange-400 hover:text-orange-300 transition inline-flex items-center gap-1 w-auto"
              >
                <Download className="w-3 h-3" /> Download empty template
              </button>
            </div>
            <div className="rounded-md p-10 text-center hover:bg-white/[0.04] transition cursor-pointer relative group"
              style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 bg-orange-500/15 rounded-md flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition">
                <Upload className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-[14px] font-medium text-white mb-1">
                {fileName || "Click to upload Excel"}
              </h3>
              <p className="text-[12px] text-gray-500">Supports .xlsx and .xls formats</p>
            </div>

            {excelData.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="px-3 py-2 rounded-md flex items-center gap-2.5"
                  style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-[13px] font-semibold text-emerald-300">
                    <span className="font-mono tabular-nums">{excelData.length}</span> employees found
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-md text-[12px]"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-white/[0.06]">
                        <th className="p-2 text-[10px] font-bold uppercase tracking-wider">ID</th>
                        <th className="p-2 text-[10px] font-bold uppercase tracking-wider">Name</th>
                        <th className="p-2 text-[10px] font-bold uppercase tracking-wider">Mobile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-white/[0.04] last:border-0 text-gray-300">
                          <td className="p-2 font-mono tabular-nums">{row.employeeId}</td>
                          <td className="p-2">{row.name}</td>
                          <td className="p-2 font-mono tabular-nums">{row.mobile}</td>
                        </tr>
                      ))}
                      {excelData.length > 10 && (
                        <tr><td colSpan="3" className="p-2 text-center text-gray-500">…and {excelData.length - 10} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleInviteExcel}
                  className="w-full h-9 inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
                >
                  Upload & whitelist employees
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Manual */}
        {activeTab === "manual" && (
          <div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddManual(); }}
              className="grid grid-cols-1 md:grid-cols-4 gap-2.5 mb-5 p-4 rounded-md"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <Label>Employee ID</Label>
                <input
                  type="text"
                  value={newEmployee.employeeId}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                  placeholder="EMP001"
                  className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                />
              </div>
              <div>
                <Label>Full name</Label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                />
              </div>
              <div>
                <Label>Mobile no.</Label>
                <input
                  type="text"
                  maxLength={10}
                  value={newEmployee.mobile}
                  onChange={(e) => setNewEmployee({ ...newEmployee, mobile: e.target.value.replace(/\D/g, "") })}
                  placeholder="1234567890"
                  className="w-full h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none font-mono"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full h-9 inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md transition active:scale-[0.98] w-auto"
                >
                  Add to list
                </button>
              </div>
            </form>

            <h3 className="text-[14px] font-medium text-white flex items-center gap-2 mb-3">
              <User className="w-3.5 h-3.5 text-orange-400" />
              Whitelisted employees (<span className="font-mono tabular-nums">{manualEmployees.length}</span>)
            </h3>

            {manualEmployees.length === 0 ? (
              <div className="text-center py-10 rounded-md"
                style={{ border: "1px dashed rgba(255,255,255,0.12)" }}>
                <UserPlus className="w-8 h-8 text-gray-600 mx-auto mb-2.5" />
                <p className="text-[13px] text-gray-500">No employees whitelisted yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {manualEmployees.map((emp) => (
                  <div key={emp.id}
                    className="px-4 py-2.5 rounded-md flex items-center justify-between group transition hover:border-white/[0.12]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-orange-500/15 text-orange-400 grid place-items-center text-[12px] font-semibold flex-shrink-0">
                        {emp.name?.charAt(0)?.toUpperCase() || "E"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">{emp.name}</p>
                        <p className="text-[11px] text-gray-500">ID: <span className="font-mono">{emp.employeeId}</span> · Mob: <span className="font-mono tabular-nums">{emp.mobile}</span></p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveManual(emp.id)}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition w-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {manualEmployees.length > 0 && (
              <button
                onClick={handleInviteManual}
                className="w-full h-9 inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold rounded-md mt-5 transition active:scale-[0.98] shadow-sm shadow-orange-500/30 w-auto"
              >
                Update whitelist (<span className="font-mono tabular-nums">{manualEmployees.length}</span> employees)
              </button>
            )}
          </div>
        )}
      </div>
    </ManagerShell>
  );
};

function Label({ children }) {
  return <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>;
}

export default InviteEmployees;
