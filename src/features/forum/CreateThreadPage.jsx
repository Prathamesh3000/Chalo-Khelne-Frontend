import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Tag, Loader2 } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useCategories, useCreateThread } from "./useThreads";

export default function CreateThreadPage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateThread();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !categoryId) return;
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        content,
        authorId: auth?._id,
        authorName: auth?.name || "User",
        authorRole: auth?.role || "Player",
        categoryId,
        tags,
      });
      navigate("/forum");
    } catch (err) {
      console.error("Failed to create thread:", err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate("/forum")} className="p-2 hover:bg-gray-100 rounded-xl transition w-auto">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-xl font-black text-gray-900">New Thread</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category *</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setCategoryId(cat._id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition w-auto flex items-center gap-1.5 ${
                  categoryId === cat._id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>
          {!categoryId && <p className="text-[10px] text-red-500 mt-1">Select a category</p>}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="title">Title *</label>
          <input id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to discuss?"
            maxLength={200}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{title.length}/200</p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="content">Content *</label>
          <textarea id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts... Use @mentions and #hashtags"
            rows={8}
            maxLength={10000}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tags (max 5)</label>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag and press Enter"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>
            <button onClick={addTag} disabled={!tagInput.trim()} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50 w-auto">
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                  #{tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-orange-500/60 hover:text-orange-500 w-auto">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button onClick={() => navigate("/forum")} className="px-5 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-xl transition w-auto">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || !categoryId || createMutation.isPending}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2 w-auto active:scale-[0.97]"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post Thread
          </button>
        </div>
      </div>
    </div>
  );
}
