import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  ClockIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  BookOpenIcon,
  NewspaperIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  DocumentArrowUpIcon,
  PaperClipIcon,
  InformationCircleIcon,
  UserPlusIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  TagIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Sidebar() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("bulk"); // "bulk" or "single"
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Single User State
  const [singleUser, setSingleUser] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "Player",
    age: "",
    sex: "male",
  });

  const navigation = [
    { name: "Home", href: "/home", icon: HomeIcon },
    { name: "Pending", href: "/pending", icon: ClockIcon },
    { name: "Approved", href: "/approved", icon: CheckCircleIcon },
    { name: "Inquiries", href: "/inquiries", icon: ChatBubbleLeftRightIcon },
    { name: "Sports", href: "/sports", icon: TrophyIcon },
    { name: "Rule Books", href: "/rule-books", icon: BookOpenIcon },
    { name: "Category Templates", href: "/category-templates", icon: TagIcon },
    { name: "News", href: "/news", icon: NewspaperIcon },
    { name: "Roles & Permissions", href: "/rbac", icon: ShieldCheckIcon },
    { name: "Vendor Marketplace", href: "/vendor-marketplace", icon: ArrowUpTrayIcon },
    { name: "Turf Approvals", href: "/turf-approvals", icon: MapPinIcon },
    { name: "Group Chats", href: "/group-chat", icon: ChatBubbleLeftRightIcon },
  ];

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    setFile(e.dataTransfer.files[0]);
  };

  const handleTemplateDownload = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL}/bulk-upload/template`, "_blank");
    toast.info("Downloading template...");
  };

  const handleBulkUpload = async () => {
    if (!file) {
      toast.error("Please select a file first.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bulk-upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        toast.success(result.message || "Bulk upload successful!");
        setFile(null);
        setShowModal(false);
      } else {
        toast.error(result.message || "Upload failed. Check format.");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Network error during bulk upload.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleUserChange = (e) => {
    setSingleUser({ ...singleUser, [e.target.name]: e.target.value });
  };

  const handleSingleUserSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bulk-upload/single`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(singleUser),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("User created successfully!");
        setSingleUser({
          name: "",
          email: "",
          mobile: "",
          password: "",
          role: "Player",
          age: "",
          sex: "male",
        });
        setShowModal(false);
      } else {
        toast.error(result.message || "Failed to create user.");
      }
    } catch (error) {
      console.error("Creation failed:", error);
      toast.error("Network error during user creation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg flex flex-col justify-between z-40">
        <div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-blue-600">Chalo Khelne</h1>
          </div>
          <nav className="mt-6">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 rounded-md transition-colors duration-200 ${isActive
                    ? "bg-blue-100 text-blue-600 font-medium"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200 space-y-3">
          <button
            onClick={() => {
              setActiveTab("bulk");
              setShowModal(true);
            }}
            className="flex justify-center items-center px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 w-full gap-2 transition-all shadow-md active:scale-95"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Bulk Upload
          </button>
          <button
            onClick={() => {
              setActiveTab("single");
              setShowModal(true);
            }}
            className="flex justify-center items-center px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 w-full gap-2 transition-all active:scale-95"
          >
            <UserPlusIcon className="h-5 w-5" />
            Create User
          </button>
        </div>
      </div>

      {/* Unified Action Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg relative shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="bg-gray-50 border-b border-gray-100 p-6 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("bulk")}
                  className={`px-4 py-2 text-sm font-black uppercase tracking-widest italic transition-all ${activeTab === "bulk" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"
                    }`}
                >
                  Bulk Data
                </button>
                <button
                  onClick={() => setActiveTab("single")}
                  className={`px-4 py-2 text-sm font-black uppercase tracking-widest italic transition-all ${activeTab === "single" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"
                    }`}
                >
                  Single User
                </button>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8">
              {activeTab === "bulk" ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">
                      Transmission Grid
                    </h3>
                    <button
                      onClick={handleTemplateDownload}
                      className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase tracking-widest italic px-3 py-1 bg-blue-50 rounded-lg transition-all"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" /> Template
                    </button>
                  </div>

                  <div
                    className="border-2 border-dashed border-gray-200 p-10 rounded-[1.5rem] text-center text-gray-400 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("fileInput").click()}
                  >
                    {!file ? (
                      <div className="flex flex-col items-center">
                        <DocumentArrowUpIcon className="h-12 w-12 mb-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        <p className="text-sm font-bold italic">Drag & Drop Excel/CSV or Browse</p>
                        <p className="text-[10px] mt-2 uppercase tracking-widest text-gray-400 font-black">
                          Supported: .xlsx, .csv, .pdf
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-blue-600 animate-bounce">
                        <PaperClipIcon className="h-10 w-10 mb-2" />
                        <span className="font-bold italic text-sm">{file.name}</span>
                      </div>
                    )}
                    <input
                      id="fileInput"
                      type="file"
                      accept=".csv,.xlsx,.xls,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  <button
                    onClick={handleBulkUpload}
                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-black italic uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    disabled={!file || isLoading}
                  >
                    {isLoading ? (
                      "Processing Transmission..."
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="h-5 w-5" /> Initiative Deployment
                      </>
                    )}
                  </button>

                  <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <InformationCircleIcon className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight leading-relaxed italic">
                      Disclaimer: Use the official template to prevent data corruption.
                      Improper field mapping may lead to failed user initialization.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSingleUserSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-gray-900 mb-6">
                    Manual Assignment
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 italic">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={singleUser.name}
                        onChange={handleSingleUserChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold italic focus:border-blue-300 outline-none transition-all"
                        placeholder="Operator Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 italic">Role</label>
                      <select
                        name="role"
                        value={singleUser.role}
                        onChange={handleSingleUserChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold italic focus:border-blue-300 outline-none transition-all appearance-none"
                      >
                        <option value="Player">Player</option>
                        <option value="Manager">Manager</option>
                        <option value="ClubAdmin">Club Admin</option>
                        <option value="Superadmin">Super Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 italic">Email Channel</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={singleUser.email}
                      onChange={handleSingleUserChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold italic focus:border-blue-300 outline-none transition-all"
                      placeholder="email@orbital.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 italic">Comms (Mobile)</label>
                      <input
                        type="text"
                        name="mobile"
                        required
                        value={singleUser.mobile}
                        onChange={handleSingleUserChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold italic focus:border-blue-300 outline-none transition-all"
                        placeholder="9876543210"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 italic">Access Key (Password)</label>
                      <input
                        type="password"
                        name="password"
                        required
                        value={singleUser.password}
                        onChange={handleSingleUserChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold italic focus:border-blue-300 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 italic">Age</label>
                      <input
                        type="number"
                        name="age"
                        value={singleUser.age}
                        onChange={handleSingleUserChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold italic focus:border-blue-300 outline-none transition-all"
                        placeholder="22"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2 italic">Biological Gender</label>
                      <select
                        name="sex"
                        value={singleUser.sex}
                        onChange={handleSingleUserChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold italic focus:border-blue-300 outline-none transition-all appearance-none"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-black italic uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isLoading ? "Saving Assignments..." : <><UserPlusIcon className="h-5 w-5" /> Create User</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
