import { toast } from "react-toastify";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ExternalLink,
  Link2,
  Search,
  Plus,
  Trash2,
  RefreshCcw,
  ShoppingBag,
  MousePointerClick,
  X,
  Check,
  Package,
} from "lucide-react";
import { SuperAdminShell } from "../shared/layout";
import { Pagination } from "../shared/ui";
import VendorsListTab from "./vendors/VendorsListTab";
import CreateVendorTab from "./vendors/CreateVendorTab";

const PAGE_SIZE = 15;

const CATEGORIES = [
  "Racket",
  "Bat",
  "Shoes",
  "Jersey",
  "Ball",
  "Net",
  "Protective Gear",
  "Accessories",
  "Other",
];
const SPORTS = [
  "Badminton",
  "Table Tennis",
  "Cricket",
  "Football",
  "Tennis",
  "Basketball",
  "Volleyball",
  "Hockey",
  "Chess",
  "Carrom",
  "Kabaddi",
  "Boxing",
  "Swimming",
];

const CONDITION_COLORS = {
  "Like New": "bg-emerald-500/15 text-emerald-300",
  Good: "bg-blue-500/15 text-blue-300",
  Fair: "bg-amber-500/15 text-amber-300",
  Used: "bg-gray-500/15 text-gray-400",
};

// Hoisted helpers (module scope — avoid keyboard focus drop on re-render)
const FieldLabel = ({ children, required }) => (
  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
    {children}
    {required && <span className="text-red-400 ml-1">*</span>}
  </label>
);

const DarkInput = (props) => (
  <input
    {...props}
    className={
      "w-full h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40 transition " +
      (props.className || "")
    }
  />
);

export default function VendorMarketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [vendorForm, setVendorForm] = useState({
    vendor_link: "",
    vendor_name: "",
    price: "",
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("vendors"); // "vendors" | "create" | "links"

  // Debounce the search box; reset to page 1 whenever the term changes.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (sportFilter) params.sport = sportFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (vendorFilter) params.hasVendor = vendorFilter;
      if (debounced) params.search = debounced;

      const res = await axios.get("/api/equipment", { params });
      setListings(res.data.listings || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
      setStats(res.data.stats || {});
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, sportFilter, categoryFilter, vendorFilter, debounced]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchListings();
  };

  const openAddModal = (item) => {
    setSelectedItem(item);
    setVendorForm({
      vendor_link: item.vendorLink || "",
      vendor_name: item.vendorName || "",
      price: item.vendorPrice || "",
    });
    setShowModal(true);
  };

  const handleSaveVendorLink = async (e) => {
    e.preventDefault();
    if (!vendorForm.vendor_link) {
      toast.info("Vendor URL is required");
      return;
    }
    setSaving(true);
    try {
      await axios.post("/api/equipment/vendor-link", {
        equipment_id: selectedItem._id,
        vendor_link: vendorForm.vendor_link,
        vendor_name: vendorForm.vendor_name,
        price: vendorForm.price || null,
      });
      setShowModal(false);
      setSelectedItem(null);
      fetchListings();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveVendorLink = async (id) => {
    if (!confirm("Remove vendor link from this equipment?")) return;
    try {
      await axios.delete(`/api/equipment/vendor-link/${id}`);
      // If this was the last row on a non-first page, step back a page.
      if (listings.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchListings();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <SuperAdminShell searchPlaceholder="Search vendors or equipment…">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/[0.08]">
        {[
          { key: "vendors", label: "Vendors" },
          { key: "create", label: "Create Vendor" },
          { key: "links", label: "Equipment Links" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 h-9 text-[13px] font-medium border-b-2 -mb-px transition ${
              activeTab === t.key
                ? "border-orange-400 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "vendors" && <VendorsListTab />}
      {activeTab === "create" && <CreateVendorTab onCreated={() => setActiveTab("vendors")} />}

      {activeTab === "links" && (
        <>
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] text-gray-400">
            <ShoppingBag className="w-3.5 h-3.5" />
            Admin · Vendor marketplace
          </p>
          <h1 className="mt-2 text-[26px] font-medium text-white leading-tight">
            Vendor Marketplace
          </h1>
          <p className="mt-1 text-[13px] text-gray-400">
            Attach vendor purchase links to player equipment listings.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchListings}
            className="h-9 px-3 inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-blue-500/15 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <p className="text-[22px] font-medium text-white">
              {stats.totalEquipment || 0}
            </p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500">
              Total equipment
            </p>
          </div>
        </div>
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-emerald-500/15 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-[22px] font-medium text-white">
              {stats.withVendorLinks || 0}
            </p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500">
              With vendor links
            </p>
          </div>
        </div>
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-orange-500/15 flex items-center justify-center">
            <MousePointerClick className="w-5 h-5 text-orange-300" />
          </div>
          <div>
            <p className="text-[22px] font-medium text-white">
              {stats.totalClicks || 0}
            </p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500">
              Total clicks
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#181A22] border border-white/[0.06] rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search equipment or vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400/40"
          />
        </form>

        <select
          value={sportFilter}
          onChange={(e) => {
            setSportFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
        >
          <option value="">All sports</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={vendorFilter}
          onChange={(e) => {
            setVendorFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 bg-[#0F1117] border border-white/[0.08] rounded-md text-[13px] text-white focus:outline-none focus:border-orange-400/40 appearance-none"
        >
          <option value="">All</option>
          <option value="true">With vendor link</option>
          <option value="false">No vendor link</option>
        </select>
      </div>

      {/* Equipment Table */}
      {loading ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <RefreshCcw className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-2">Loading equipment…</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg px-6 py-16 text-center">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] inline-flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-[14px] font-medium text-white">
            No equipment found
          </h3>
          <p className="text-[13px] text-gray-400 mt-1">
            Players need to list equipment first.
          </p>
        </div>
      ) : (
        <div className="bg-[#181A22] border border-white/[0.06] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Equipment
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Sport / Category
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Seller
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Price
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Vendor link
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Clicks
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {item.images?.[0] ? (
                          <img loading="lazy"
                            src={item.images[0]}
                            alt=""
                            className="w-9 h-9 rounded-md object-cover border border-white/[0.06]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-white/[0.04] flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-white truncate">
                            {item.itemName}
                          </p>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                              CONDITION_COLORS[item.condition] ||
                              "bg-gray-500/15 text-gray-400"
                            }`}
                          >
                            {item.condition}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-gray-200">{item.sport}</p>
                      <p className="text-[11px] text-gray-500">
                        {item.category}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-gray-200">
                        {item.sellerName}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">
                        {item.sellerLevel}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {item.isDonation ? (
                        <span className="text-emerald-300 font-bold text-[12px] uppercase tracking-wider">
                          Free
                        </span>
                      ) : (
                        <span className="text-[13px] font-medium text-white tabular-nums">
                          ₹{item.askingPrice}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.vendorLink ? (
                        <div className="flex flex-col gap-0.5">
                          <a
                            href={item.vendorLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-300 hover:text-orange-200 text-[12px] inline-flex items-center gap-1 max-w-[220px] truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {item.vendorName || "View"}
                          </a>
                          {item.vendorPrice && (
                            <span className="text-[10px] text-emerald-300 font-bold">
                              ₹{item.vendorPrice} (new)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-[12px]">
                          No link
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.vendorLink ? (
                        <span className="text-[13px] font-medium text-orange-300 tabular-nums">
                          {item.vendorClickCount || 0}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAddModal(item)}
                          className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-md transition"
                          title={
                            item.vendorLink
                              ? "Edit vendor link"
                              : "Add vendor link"
                          }
                        >
                          {item.vendorLink ? (
                            <Link2 className="w-3.5 h-3.5" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {item.vendorLink && (
                          <button
                            onClick={() => handleRemoveVendorLink(item._id)}
                            className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
                            title="Remove vendor link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={PAGE_SIZE}
                onPage={setPage}
                loading={loading}
              />
            </div>
          )}
        </div>
      )}

      {/* Vendor link modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveVendorLink}
            className="bg-[#181A22] border border-white/[0.08] rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-orange-300" />
                  {selectedItem.vendorLink ? "Edit" : "Add"} vendor link
                </h3>
                <p className="text-[12px] text-gray-400 mt-0.5 truncate">
                  {selectedItem.itemName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#0F1117] border border-white/[0.06] rounded-md p-3 flex items-center gap-3">
                {selectedItem.images?.[0] ? (
                  <img loading="lazy"
                    src={selectedItem.images[0]}
                    alt=""
                    className="w-11 h-11 rounded-md object-cover border border-white/[0.06]"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-md bg-white/[0.04] flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">
                    {selectedItem.itemName}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {selectedItem.sport} • {selectedItem.category} •{" "}
                    {selectedItem.condition}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    by {selectedItem.sellerName}
                  </p>
                </div>
              </div>

              <div>
                <FieldLabel required>Vendor URL</FieldLabel>
                <DarkInput
                  type="url"
                  required
                  value={vendorForm.vendor_link}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      vendor_link: e.target.value,
                    })
                  }
                  placeholder="https://www.amazon.in/dp/B0…"
                />
              </div>

              <div>
                <FieldLabel>Vendor name</FieldLabel>
                <DarkInput
                  type="text"
                  value={vendorForm.vendor_name}
                  onChange={(e) =>
                    setVendorForm({
                      ...vendorForm,
                      vendor_name: e.target.value,
                    })
                  }
                  placeholder="Amazon, Decathlon, Sports365…"
                />
              </div>

              <div>
                <FieldLabel>New price (₹)</FieldLabel>
                <DarkInput
                  type="number"
                  min="0"
                  value={vendorForm.price}
                  onChange={(e) =>
                    setVendorForm({ ...vendorForm, price: e.target.value })
                  }
                  placeholder="Price for buying new from vendor"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-9 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[12px] text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 rounded-md text-[12px] font-medium text-white disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {saving ? (
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
        </>
      )}
    </SuperAdminShell>
  );
}
