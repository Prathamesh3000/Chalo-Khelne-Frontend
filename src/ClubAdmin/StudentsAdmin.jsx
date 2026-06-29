import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Upload, Trash2, Users, Loader2, Plus, ChevronDown, ChevronRight, Download } from "lucide-react";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", colorScheme: "dark" };
const field = "h-9 px-3 rounded-md text-[13px] text-gray-200 placeholder:text-gray-500 focus:outline-none";

/**
 * Students (school / organization admins). Upload a roster per standard from an
 * Excel sheet (a "Name" column, optional "Roll No"). Trainers assigned to that
 * standard then mark attendance against this list.
 */
export default function StudentsAdmin() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadStd, setUploadStd] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualStd, setManualStd] = useState("");
  const [expanded, setExpanded] = useState(null);
  const fileRef = useRef(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/students");
      setStudents(res.data?.students || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchStudents(); }, []);

  const upload = async () => {
    if (!uploadStd.trim()) { toast.error("Enter the standard (e.g. V)."); return; }
    if (!file) { toast.error("Choose an Excel file."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("standard", uploadStd.trim());
      const res = await axios.post("/api/students/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Uploaded ${res.data?.count ?? 0} students to Std ${res.data?.standard}.`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setExpanded(uploadStd.trim());
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await axios.get("/api/students/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "Student_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download template");
    }
  };

  const addManual = async () => {
    if (!manualName.trim() || !manualStd.trim()) { toast.error("Name and standard are required."); return; }
    try {
      await axios.post("/api/students", { name: manualName.trim(), standard: manualStd.trim() });
      setManualName("");
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add student");
    }
  };

  const removeStudent = async (id) => {
    try {
      await axios.delete(`/api/students/${id}`);
      setStudents((p) => p.filter((s) => s._id !== id));
    } catch {
      toast.error("Failed to remove student");
    }
  };

  const clearStandard = async (std) => {
    if (!window.confirm(`Remove ALL students from Std ${std}?`)) return;
    try {
      await axios.delete(`/api/students`, { params: { standard: std } });
      setStudents((p) => p.filter((s) => s.standard !== std));
    } catch {
      toast.error("Failed to clear standard");
    }
  };

  // Group by standard.
  const groups = [];
  const idx = {};
  students.forEach((s) => {
    if (idx[s.standard] === undefined) { idx[s.standard] = groups.length; groups.push({ standard: s.standard, items: [] }); }
    groups[idx[s.standard]].items.push(s);
  });

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-[14px] font-semibold text-white inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-400" /> Upload students (Excel)
          </h3>
          <button onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-[12px] font-semibold transition w-auto flex-shrink-0">
            <Download className="w-3.5 h-3.5" /> Download template
          </button>
        </div>
        <p className="text-[12px] text-gray-500 mb-3">
          One standard at a time. The sheet needs a <span className="text-gray-300">Name</span> column header (optional <span className="text-gray-300">Roll No</span>). Re-uploading replaces that standard's list.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Standard</label>
            <input value={uploadStd} onChange={(e) => setUploadStd(e.target.value)} placeholder="e.g. V" className={`w-28 ${field}`} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 mb-1.5">Excel file</label>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-[12px] text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[12px] file:font-semibold file:bg-white/[0.08] file:text-gray-200 hover:file:bg-white/[0.12]" />
          </div>
          <button onClick={upload} disabled={uploading}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-[13px] font-semibold transition disabled:opacity-50 w-auto">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload
          </button>
        </div>

        {/* Manual add */}
        <div className="flex flex-wrap items-end gap-2 mt-4 pt-4 border-t border-white/[0.06]">
          <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Add one student name" className={`${field} flex-1 min-w-[180px]`} style={inputStyle} />
          <input value={manualStd} onChange={(e) => setManualStd(e.target.value)} placeholder="Standard" className={`w-28 ${field}`} style={inputStyle} />
          <button onClick={addManual}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-gray-200 text-[12px] font-semibold transition w-auto">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {/* Roster by standard */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl bg-[#181A22] border border-white/[0.06] p-8 text-center">
          <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-[13px] text-gray-400">No students yet. Upload a standard's sheet above.</p>
        </div>
      ) : (
        groups.map((g) => {
          const open = expanded === g.standard;
          return (
            <div key={g.standard} className="rounded-xl bg-[#181A22] border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <button onClick={() => setExpanded(open ? null : g.standard)} className="inline-flex items-center gap-2 text-left w-auto">
                  {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <span className="text-[14px] font-semibold text-white">Standard {g.standard}</span>
                  <span className="text-[11px] font-semibold text-orange-300 bg-orange-500/15 rounded px-1.5 py-0.5">{g.items.length}</span>
                </button>
                <button onClick={() => clearStandard(g.standard)} title="Clear standard"
                  className="text-[11px] text-gray-500 hover:text-red-400 transition w-auto">Clear</button>
              </div>
              {open && (
                <div className="border-t border-white/[0.06]">
                  {g.items.map((s, i) => (
                    <div key={s._id} className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] last:border-b-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] text-gray-600 w-6">{i + 1}</span>
                        <span className="text-[13px] text-gray-200 truncate">{s.name}</span>
                        {s.rollNo ? <span className="text-[11px] text-gray-500">#{s.rollNo}</span> : null}
                      </div>
                      <button onClick={() => removeStudent(s._id)} className="h-6 w-6 inline-flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition w-auto">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
