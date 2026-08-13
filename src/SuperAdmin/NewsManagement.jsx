import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Send,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Filter,
} from "lucide-react";
import axios from "axios";

import { getAuthToken } from "../shared/api/authToken";
const API = import.meta.env.VITE_API_BASE_URL;

const NEWS_TYPES = [
  "Tournament Announcement",
  "Sports News",
  "Club Updates",
  "Training Announcement",
];

const STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-600 border-gray-200",
  Published: "bg-green-50 text-green-700 border-green-200",
  Expired: "bg-amber-50 text-amber-700 border-amber-200",
  Archived: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_ICONS = {
  Draft: Clock,
  Published: CheckCircle,
  Expired: AlertCircle,
  Archived: Archive,
};

const TYPE_COLORS = {
  "Tournament Announcement": "bg-blue-50 text-blue-700 border-blue-200",
  "Sports News": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Club Updates": "bg-purple-50 text-purple-700 border-purple-200",
  "Training Announcement": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const SPORTS_LIST = [
  "Badminton", "Table Tennis", "Tennis", "Cricket", "Football",
  "Basketball", "Volleyball", "Chess", "Carrom", "Pickleball",
  "Snooker", "Hockey", "Kabaddi", "Turf Games", "Cricket Nets",
];

const emptyForm = {
  title: "",
  body: "",
  type: "Sports News",
  sports: [],
  region: "",
  area: "",
  thumbnail: "",
  publishDate: "",
  expiryDate: "",
};

export default function NewsManagement() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: "", type: "", search: "" });
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit | view
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const token = getAuthToken();
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch news
  const fetchNews = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (filters.status) params.append("status", filters.status);
      if (filters.type) params.append("type", filters.type);
      if (filters.search) params.append("search", filters.search);

      const res = await axios.get(`${API}/news?${params}`, { headers });
      setNewsList(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error("Failed to fetch news:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [filters.status, filters.type]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchNews(1);
  };

  // Open modal
  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEdit = (news) => {
    setForm({
      title: news.title || "",
      body: news.body || "",
      type: news.type || "Sports News",
      sports: news.sports || [],
      region: news.region || "",
      area: news.area || "",
      thumbnail: news.thumbnail || "",
      publishDate: news.publishDate
        ? new Date(news.publishDate).toISOString().slice(0, 16)
        : "",
      expiryDate: news.expiryDate
        ? new Date(news.expiryDate).toISOString().slice(0, 16)
        : "",
    });
    setEditingId(news._id);
    setModalMode("edit");
    setShowModal(true);
  };

  const openView = (news) => {
    setForm({
      title: news.title,
      body: news.body,
      type: news.type,
      sports: news.sports || [],
      region: news.region || "",
      area: news.area || "",
      thumbnail: news.thumbnail || "",
      publishDate: news.publishDate || "",
      expiryDate: news.expiryDate || "",
    });
    setEditingId(news._id);
    setModalMode("view");
    setShowModal(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        createdByModel: "User",
        createdByName: "SuperAdmin",
      };

      if (modalMode === "create") {
        await axios.post(`${API}/news/create`, payload, { headers });
      } else {
        await axios.put(`${API}/news/update/${editingId}`, payload, { headers });
      }

      setShowModal(false);
      fetchNews(pagination.page);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async (id) => {
    setActionLoading(id);
    try {
      await axios.post(`${API}/news/publish/${id}`, {}, { headers });
      fetchNews(pagination.page);
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete (archive)
  const handleDelete = async (id) => {
    if (!confirm("Archive this news article?")) return;
    setActionLoading(id);
    try {
      await axios.delete(`${API}/news/delete/${id}`, { headers });
      fetchNews(pagination.page);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Sport toggle
  const toggleSport = (sport) => {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter((s) => s !== sport)
        : [...prev.sports, sport],
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900">
            News Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, publish, and manage sports news articles
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Create News
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search news by title..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all active:scale-95"
            >
              Search
            </button>
          </form>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
              showFilters
                ? "bg-blue-50 text-blue-600 border-blue-200"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100 mt-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Status
                  </span>
                  <div className="flex gap-2">
                    {["", "Draft", "Published", "Expired", "Archived"].map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() =>
                            setFilters((p) => ({ ...p, status: s }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filters.status === s
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {s || "All"}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Type
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {["", ...NEWS_TYPES].map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          setFilters((p) => ({ ...p, type: t }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          filters.type === t
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {t || "All"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total",
            value: pagination.total,
            color: "bg-gray-50 border-gray-200 text-gray-700",
          },
          {
            label: "Published",
            value: newsList.filter((n) => n.status === "Published").length,
            color: "bg-green-50 border-green-200 text-green-700",
          },
          {
            label: "Drafts",
            value: newsList.filter((n) => n.status === "Draft").length,
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
          {
            label: "Archived",
            value: newsList.filter((n) => n.status === "Archived").length,
            color: "bg-red-50 border-red-200 text-red-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`p-4 rounded-2xl border ${stat.color}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              {stat.label}
            </p>
            <p className="text-2xl font-black italic mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* News Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : newsList.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold">No news articles found</p>
          <p className="text-gray-400 text-sm mt-1">
            Create your first news article to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {newsList.map((news) => {
            const StatusIcon = STATUS_ICONS[news.status] || Clock;
            return (
              <motion.div
                key={news._id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
              >
                {/* Thumbnail */}
                {news.thumbnail && (
                  <div className="h-40 overflow-hidden">
                    <img loading="lazy"
                      src={news.thumbnail}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <div className="p-5 space-y-4">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                        STATUS_COLORS[news.status]
                      }`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {news.status}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                        TYPE_COLORS[news.type] || "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {news.type}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-black italic tracking-tight text-gray-900 line-clamp-2 leading-tight">
                    {news.title}
                  </h3>

                  {/* Body preview */}
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {news.body}
                  </p>

                  {/* Sports tags */}
                  {news.sports?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {news.sports.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-100"
                        >
                          {s}
                        </span>
                      ))}
                      {news.sports.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold">
                          +{news.sports.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {news.viewCount || 0} views
                    </span>
                    <span>
                      {new Date(news.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => openView(news)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all active:scale-95"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEdit(news)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all active:scale-95"
                    >
                      Edit
                    </button>
                    {news.status === "Draft" && (
                      <button
                        onClick={() => handlePublish(news._id)}
                        disabled={actionLoading === news._id}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading === news._id ? "..." : "Publish"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(news._id)}
                      disabled={actionLoading === news._id}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => fetchNews(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => fetchNews(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Create / Edit / View Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gray-50 border-b border-gray-100 px-8 py-5 flex items-center justify-between">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">
                  {modalMode === "create"
                    ? "Create News"
                    : modalMode === "edit"
                    ? "Edit News"
                    : "View News"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto max-h-[calc(85vh-140px)] space-y-6 custom-scrollbar">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Title
                  </label>
                  {modalMode === "view" ? (
                    <p className="text-lg font-black italic text-gray-900">
                      {form.title}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="Enter news title..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                      maxLength={200}
                    />
                  )}
                </div>

                {/* Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    News Type
                  </label>
                  {modalMode === "view" ? (
                    <span
                      className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        TYPE_COLORS[form.type] || ""
                      }`}
                    >
                      {form.type}
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {NEWS_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, type: t }))}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                            form.type === t
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Content
                  </label>
                  {modalMode === "view" ? (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {form.body}
                    </div>
                  ) : (
                    <textarea
                      value={form.body}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, body: e.target.value }))
                      }
                      placeholder="Write the news article content..."
                      rows={6}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    />
                  )}
                </div>

                {/* Sports */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Related Sports
                  </label>
                  {modalMode === "view" ? (
                    <div className="flex flex-wrap gap-2">
                      {form.sports.length > 0 ? (
                        form.sports.map((s) => (
                          <span
                            key={s}
                            className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">None</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {SPORTS_LIST.map((sport) => (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            form.sports.includes(sport)
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                          }`}
                        >
                          {sport}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Region + Area */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                      Region
                    </label>
                    {modalMode === "view" ? (
                      <p className="text-sm font-bold text-gray-700">
                        {form.region || "—"}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={form.region}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, region: e.target.value }))
                        }
                        placeholder="e.g. Maharashtra"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                      Area
                    </label>
                    {modalMode === "view" ? (
                      <p className="text-sm font-bold text-gray-700">
                        {form.area || "—"}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={form.area}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, area: e.target.value }))
                        }
                        placeholder="e.g. Pune"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Thumbnail URL
                  </label>
                  {modalMode === "view" ? (
                    form.thumbnail ? (
                      <img loading="lazy"
                        src={form.thumbnail}
                        alt="Thumbnail"
                        className="w-full h-40 object-cover rounded-xl"
                      />
                    ) : (
                      <p className="text-sm text-gray-400">No thumbnail</p>
                    )
                  ) : (
                    <input
                      type="text"
                      value={form.thumbnail}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, thumbnail: e.target.value }))
                      }
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                      Publish Date
                    </label>
                    {modalMode === "view" ? (
                      <p className="text-sm font-bold text-gray-700">
                        {form.publishDate
                          ? new Date(form.publishDate).toLocaleString("en-IN")
                          : "Not set"}
                      </p>
                    ) : (
                      <input
                        type="datetime-local"
                        value={form.publishDate}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            publishDate: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                      Expiry Date
                    </label>
                    {modalMode === "view" ? (
                      <p className="text-sm font-bold text-gray-700">
                        {form.expiryDate
                          ? new Date(form.expiryDate).toLocaleString("en-IN")
                          : "No expiry"}
                      </p>
                    ) : (
                      <input
                        type="datetime-local"
                        value={form.expiryDate}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            expiryDate: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              {modalMode !== "view" && (
                <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.title.trim() || !form.body.trim()}
                    className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : modalMode === "create" ? (
                      "Create News"
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
