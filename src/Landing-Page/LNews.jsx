import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Eye,
  Calendar,
  Tag,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  ArrowRight,
  Clock,
  X,
} from "lucide-react";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL;

const NEWS_TYPES = [
  { label: "All", value: "" },
  { label: "Tournament", value: "Tournament Announcement" },
  { label: "Sports News", value: "Sports News" },
  { label: "Club Updates", value: "Club Updates" },
  { label: "Training", value: "Training Announcement" },
];

const TYPE_COLORS = {
  "Tournament Announcement": "bg-blue-50 text-orange-600 border-blue-200",
  "Sports News": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Club Updates": "bg-purple-50 text-purple-700 border-purple-200",
  "Training Announcement": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const TYPE_GRADIENTS = {
  "Tournament Announcement": "from-orange-500 to-orange-600",
  "Sports News": "from-indigo-500 to-purple-600",
  "Club Updates": "from-purple-500 to-pink-600",
  "Training Announcement": "from-emerald-500 to-teal-600",
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

export default function LNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [activeType, setActiveType] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);

  const fetchNews = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (activeType) params.append("type", activeType);

      const res = await axios.get(`${API}/news/active?${params}`);
      setNews(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error("Failed to fetch news:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(1);
  }, [activeType]);

  const openArticle = async (article) => {
    setArticleLoading(true);
    setSelectedArticle(article);
    try {
      const res = await axios.get(`${API}/news/${article._id}`);
      setSelectedArticle(res.data.data);
    } catch (err) {
      console.error("Failed to load article:", err);
    } finally {
      setArticleLoading(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
  };

  // pt-12, not pt-28: LandingLayout now supplies the 64px offset for the
  // fixed header, which this page used to carry on its own.
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gray-50 border-b border-gray-200">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-orange-100/40 blur-[100px] rounded-full" />
          <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-amber-100/30 blur-[80px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-2xl"
          >
            <span className="inline-block px-4 py-1.5 bg-blue-50 text-orange-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100 mb-4">
              Latest Updates
            </span>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
              Sports <span className="text-orange-500">News</span>
            </h1>
            <p className="text-gray-500 mt-4 text-lg max-w-lg">
              Stay updated with tournament announcements, club updates, and the
              latest in sports.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-10">
        {/* Type Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {NEWS_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setActiveType(type.value)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeType === type.value
                  ? "bg-gray-900 text-white shadow-lg"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-32">
            <FileText className="w-20 h-20 text-gray-200 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-400">
              No news articles yet
            </h3>
            <p className="text-gray-400 mt-2">
              Check back soon for the latest updates
            </p>
          </div>
        ) : (
          <>
            {/* Featured (first article) */}
            {news.length > 0 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="mb-10"
              >
                <div
                  onClick={() => openArticle(news[0])}
                  className="group cursor-pointer bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col md:flex-row"
                >
                  {/* Featured Image */}
                  <div className="md:w-1/2 h-64 md:h-auto relative overflow-hidden">
                    {news[0].thumbnail ? (
                      <img loading="lazy"
                        src={news[0].thumbnail}
                        alt={news[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${
                          TYPE_GRADIENTS[news[0].type] ||
                          "from-gray-400 to-gray-600"
                        } flex items-center justify-center`}
                      >
                        <FileText className="w-20 h-20 text-white/30" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-700 border border-white/50 shadow-sm">
                        Featured
                      </span>
                    </div>
                  </div>

                  {/* Featured Content */}
                  <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center space-y-5">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                          TYPE_COLORS[news[0].type] || ""
                        }`}
                      >
                        {news[0].type}
                      </span>
                      <span className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-gray-200">
                        <Clock className="w-3 h-3" />
                        {timeAgo(news[0].publishDate || news[0].createdAt)}
                      </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-gray-900 leading-tight group-hover:text-orange-500 transition-colors">
                      {news[0].title}
                    </h2>

                    <p className="text-gray-500 line-clamp-3 leading-relaxed">
                      {news[0].body}
                    </p>

                    {news[0].sports?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {news[0].sports.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 bg-blue-50 text-orange-500 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-100"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-orange-500 font-bold text-sm group-hover:gap-3 transition-all">
                      Read Full Article
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Grid (remaining articles) */}
            {news.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.slice(1).map((article, idx) => (
                  <motion.div
                    key={article._id}
                    custom={idx}
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                    onClick={() => openArticle(article)}
                    className="group cursor-pointer bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Card Image */}
                    <div className="h-48 overflow-hidden relative">
                      {article.thumbnail ? (
                        <img loading="lazy"
                          src={article.thumbnail}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${
                            TYPE_GRADIENTS[article.type] ||
                            "from-gray-400 to-gray-600"
                          } flex items-center justify-center`}
                        >
                          <FileText className="w-12 h-12 text-white/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border backdrop-blur-md ${
                            TYPE_COLORS[article.type] || ""
                          }`}
                        >
                          {article.type}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <h3 className="text-lg font-black italic tracking-tight text-gray-900 line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">
                        {article.title}
                      </h3>

                      <p className="text-sm text-gray-500 line-clamp-2">
                        {article.body}
                      </p>

                      {article.sports?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {article.sports.slice(0, 2).map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 bg-blue-50 text-orange-500 rounded text-[10px] font-bold border border-blue-100"
                            >
                              {s}
                            </span>
                          ))}
                          {article.sports.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px] font-bold">
                              +{article.sports.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          {timeAgo(article.publishDate || article.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Eye className="w-3 h-3" /> {article.viewCount || 0}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-14">
            <button
              onClick={() => fetchNews(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm font-bold text-gray-400">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => fetchNews(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 disabled:opacity-30 transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center overflow-y-auto p-4 md:p-8"
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30, opacity: 0 }}
              className="bg-white rounded-[2rem] max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Article Hero */}
              <div className="relative h-64 overflow-hidden">
                {selectedArticle.thumbnail ? (
                  <img loading="lazy"
                    src={selectedArticle.thumbnail}
                    alt={selectedArticle.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${
                      TYPE_GRADIENTS[selectedArticle.type] ||
                      "from-gray-400 to-gray-600"
                    } flex items-center justify-center`}
                  >
                    <FileText className="w-24 h-24 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <button
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all border border-white/20"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border backdrop-blur-md bg-white/90 ${
                        TYPE_COLORS[selectedArticle.type] || ""
                      }`}
                    >
                      {selectedArticle.type}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white leading-tight">
                    {selectedArticle.title}
                  </h1>
                </div>
              </div>

              {/* Article Content */}
              <div className="p-8 overflow-y-auto max-h-[calc(85vh-256px)] space-y-6">
                {/* Meta Row */}
                <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-100">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(
                      selectedArticle.publishDate || selectedArticle.createdAt
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                    <Eye className="w-4 h-4 text-gray-400" />
                    {selectedArticle.viewCount || 0} views
                  </span>
                  {selectedArticle.region && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {selectedArticle.area
                        ? `${selectedArticle.area}, `
                        : ""}
                      {selectedArticle.region}
                    </span>
                  )}
                </div>

                {/* Sports tags */}
                {selectedArticle.sports?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.sports.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 bg-blue-50 text-orange-500 rounded-lg text-xs font-bold border border-blue-100"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Body */}
                {articleLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  </div>
                ) : (
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                    {selectedArticle.body}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
