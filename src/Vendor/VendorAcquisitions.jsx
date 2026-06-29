import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Package, RefreshCcw, Truck, Store, CheckCircle2, X } from "lucide-react";

const imgSrc = (p) => (!p ? null : /^https?:\/\//.test(p) ? p : `/uploads/${String(p).replace(/^\/?uploads\/?/, "")}`);
const money = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

const TABS = [
  { key: "offer_made", label: "Offers Sent" },
  { key: "ready_for_pickup", label: "Ready for Pickup" },
  { key: "acquired", label: "In Stock" },
  { key: "listed", label: "Listed" },
  { key: "sold", label: "Sold" },
];

export default function VendorAcquisitions() {
  const [tab, setTab] = useState("ready_for_pickup");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [publishFor, setPublishFor] = useState(null); // product being published
  const [salePrice, setSalePrice] = useState("");
  const [qty, setQty] = useState("");

  const fetchItems = async (status = tab) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/vendor-store/my-products", { params: { status, limit: 50 } });
      setItems(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(tab); /* eslint-disable-next-line */ }, [tab]);

  const markPickedUp = async (p) => {
    setBusyId(p._id);
    try {
      await axios.post(`/api/vendor-store/products/${p._id}/pickup`);
      toast.success("Marked as picked up");
      fetchItems(tab);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally { setBusyId(null); }
  };

  const openPublish = (p) => { setPublishFor(p); setSalePrice(""); setQty(String(p.quantity || 1)); };
  const confirmPublish = async () => {
    if (salePrice === "" || Number(salePrice) <= 0) return toast.info("Enter a valid resale price");
    if (qty === "" || Number(qty) <= 0) return toast.info("Enter a valid quantity");
    setBusyId(publishFor._id);
    try {
      await axios.post(`/api/vendor-store/products/${publishFor._id}/publish`, {
        vendorSalePrice: Number(salePrice),
        quantity: Number(qty),
      });
      toast.success("Published to the store");
      setPublishFor(null);
      fetchItems(tab);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish");
    } finally { setBusyId(null); }
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Store className="w-5 h-5 text-green-600" /></div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">My Acquisitions</h1>
            <p className="text-sm text-gray-500">Pick up accepted products, refurbish, set a resale price, and publish to the store.</p>
          </div>
        </div>
        <button onClick={() => fetchItems(tab)} className="w-auto inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`w-auto whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 py-16 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Nothing here yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p._id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {imgSrc(p.images?.[0]) ? <img src={imgSrc(p.images[0])} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 truncate">{p.itemName}</p>
                <p className="text-xs text-gray-500">{p.sport} · {p.condition} · Qty {p.quantity || 1}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Offer {money(p.vendorOffer?.purchasePrice)}
                  {p.vendorOffer?.repairNeeded ? ` · repair ${money(p.vendorOffer?.repairCost)}` : ""}
                  {p.vendorStatus === "listed" ? ` · resale ${money(p.vendorSalePrice)}` : ""}
                </p>
              </div>
              <div className="shrink-0">
                {tab === "ready_for_pickup" && (
                  <button onClick={() => markPickedUp(p)} disabled={busyId === p._id} className="w-auto inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-60">
                    <Truck className="w-4 h-4" /> Mark Picked Up
                  </button>
                )}
                {tab === "acquired" && (
                  <button onClick={() => openPublish(p)} disabled={busyId === p._id} className="w-auto inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-60">
                    <Store className="w-4 h-4" /> Set Price & Publish
                  </button>
                )}
                {tab === "offer_made" && <span className="text-xs text-amber-600 font-medium">Awaiting seller</span>}
                {tab === "listed" && <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle2 className="w-4 h-4" /> Live</span>}
                {tab === "sold" && <span className="text-xs text-gray-500 font-medium">Sold</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish modal */}
      {publishFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="px-5 py-4 bg-green-600 text-white rounded-t-2xl flex items-center justify-between">
              <h3 className="text-lg font-semibold">Publish to Store</h3>
              <button onClick={() => setPublishFor(null)} className="w-auto text-white/90 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600 truncate">{publishFor.itemName}</p>
              <p className="text-xs text-gray-400">
                You paid {money(publishFor.vendorOffer?.purchasePrice)}{publishFor.vendorOffer?.repairNeeded ? ` + ${money(publishFor.vendorOffer?.repairCost)} repair` : ""}.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Resale Price (₹) <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Price shown to buyers" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Units available" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
                <p className="text-[11px] text-gray-400 mt-1">Seller listed {publishFor.quantity || 1} unit(s). This is shown on the product page.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setPublishFor(null)} className="w-auto flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg py-2 text-sm font-medium">Cancel</button>
                <button onClick={confirmPublish} disabled={busyId === publishFor._id} className="w-auto flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                  {busyId === publishFor._id ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />} Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
