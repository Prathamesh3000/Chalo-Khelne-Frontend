import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import SocialModal from "./SocialModal";
import UserRow from "./UserRow";
import followApi from "./followApi";

/**
 * Search users to follow. Debounced (400ms, min 2 chars) — mirrors mobile.
 * Props: open, onClose, onOpenProfile, dark
 */
export default function UserSearchModal({ open, onClose, onOpenProfile, dark = false }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!open) { setQ(""); setResults([]); return; }
  }, [open]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const users = await followApi.search(q.trim());
        setResults(users);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => timer.current && clearTimeout(timer.current);
  }, [q]);

  const inputCls = dark
    ? "bg-white/[0.04] border border-white/[0.08] text-gray-200 placeholder:text-gray-500"
    : "bg-gray-50 border border-gray-200 text-gray-700 placeholder:text-gray-400";

  return (
    <SocialModal open={open} onClose={onClose} title="Find people" dark={dark}>
      <div className={`flex items-center gap-2 h-10 px-3 rounded-xl mb-2 ${inputCls}`}>
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 bg-transparent text-[13px] focus:outline-none"
        />
      </div>

      {q.trim().length < 2 ? (
        <p className={`text-[12px] text-center py-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Search for people to follow.
        </p>
      ) : loading ? (
        <p className={`text-[12px] text-center py-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>Searching…</p>
      ) : results.length === 0 ? (
        <p className={`text-[12px] text-center py-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>No users found.</p>
      ) : (
        <div className="divide-y divide-gray-100/10">
          {results.map((u) => (
            <UserRow key={u._id} user={u} onOpenProfile={onOpenProfile} dark={dark} />
          ))}
        </div>
      )}
    </SocialModal>
  );
}
