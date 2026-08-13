import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Package, RefreshCcw, X, Check, Ban, Inbox } from "lucide-react";

// Tolerant image src: full URL as-is, else served via /uploads proxy.
const imgSrc = (p) => (!p ? null : /^https?:\/\//.test(p) ? p : `/uploads/${String(p).replace(/^\/?uploads\/?/, "")}`);
const money = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

export default function VendorIncoming() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sel, setSel] = useState(null);     // selected product
  const [mode, setMode] = useState("view"); // "view" | "accept" | "reject"
  const [busy, setBusy] = useState(false);

  // Accept-form state
  const [offer, setOffer] = useState({ purchasePrice: "", repairNeeded: false, repairCost: "", repairDescription: "", pickupDate: "" });
  const [reason, setReason] = useState("");

  const fetchIncoming = async (p = page) => {
    setLoading(true);
    try {
      const res = await axios.get("/api/vendor-store/incoming", { params: { page: p, limit: 12 } });
      setItems(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load incoming products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncoming(page); /* eslint-disable-next-line */ }, [page]);

  const open = (p) => {
    setSel(p);
    setMode("view");
    setOffer({ purchasePrice: "", repairNeeded: false, repairCost: "", repairDescription: "", pickupDate: "" });
    setReason("");
  };
  const close = () => { setSel(null); setMode("view"); };

  const confirmAccept = async () => {
    if (offer.purchasePrice === "" || Number(offer.purchasePrice) < 0) return toast.info("Enter a valid purchase price");
    if (!offer.pickupDate) return toast.info("Pick a collection date");
    const id = sel._id;
    setBusy(true);
    try {
      await axios.post(`/api/vendor-store/products/${id}/accept`, {
        purchasePrice: Number(offer.purchasePrice),
        repairNeeded: offer.repairNeeded,
        repairCost: offer.repairCost === "" ? 0 : Number(offer.repairCost),
        repairDescription: offer.repairDescription,
        pickupDate: offer.pickupDate,
      });
      toast.success("Offer sent to the seller");
      // Drop it from the incoming list immediately (it's no longer pending_review).
      setItems((prev) => prev.filter((it) => it._id !== id));
      close();
      fetchIncoming(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept");
    } finally { setBusy(false); }
  };

  const confirmReject = async () => {
    const id = sel._id;
    setBusy(true);
    try {
      await axios.post(`/api/vendor-store/products/${id}/reject`, { reason });
      toast.success("Product rejected — seller notified");
      // Drop it from the incoming list immediately (it's no longer pending_review).
      setItems((prev) => prev.filter((it) => it._id !== id));
      close();
      fetchIncoming(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Inbox className="w-5 h-5 text-green-600" /></div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Incoming Products</h1>
            <p className="text-sm text-gray-500">Review products players want to sell — accept with an offer, or reject.</p>
          </div>
        </div>
        <button onClick={() => fetchIncoming(page)} className="w-auto inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 py-16 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">No products waiting for review</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <button key={p._id} onClick={() => open(p)} className="w-auto text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition">
              <div className="h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
                {imgSrc(p.images?.[0]) ? (
                  <img loading="lazy" src={imgSrc(p.images[0])} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : <Package className="w-8 h-8 text-gray-300" />}
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-800 truncate">{p.itemName}</p>
                <p className="text-xs text-gray-500">{p.sport} · {p.category} · {p.condition} · Qty {p.quantity || 1}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-gray-800">{p.isDonation ? "Free" : money(p.askingPrice)}</span>
                  <span className="text-[11px] text-gray-400">by {p.sellerName || p.seller?.name || "Seller"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5 text-sm">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="w-auto px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Prev</button>
          <span className="text-gray-500">Page {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="w-auto px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Next</button>
        </div>
      )}

      {/* ── Detail / Accept / Reject modal ── */}
      {sel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            {/* header */}
            <div className={`px-5 py-4 text-white ${mode === "reject" ? "bg-red-600" : "bg-green-600"} rounded-t-2xl flex items-start justify-between`}>
              <div>
                <h3 className="text-lg font-semibold">
                  {mode === "view" ? "Product Details" : mode === "accept" ? "Accept Product" : "Reject Product"}
                </h3>
                <p className="text-white/80 text-xs mt-0.5">
                  {mode === "accept" ? "Set pricing and collection details" : mode === "reject" ? "Notify the seller" : sel.itemName}
                </p>
              </div>
              <button onClick={close} className="w-auto text-white/90 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5">
              {/* VIEW */}
              {mode === "view" && (
                <>
                  <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden mb-3">
                    {imgSrc(sel.images?.[0]) ? <img loading="lazy" src={imgSrc(sel.images[0])} alt="" className="w-full h-full object-cover" /> : <Package className="w-10 h-10 text-gray-300" />}
                  </div>
                  <dl className="text-sm space-y-1.5">
                    <Row label="Item" value={sel.itemName} />
                    <Row label="Sport / Category" value={`${sel.sport} · ${sel.category}`} />
                    <Row label="Brand / Size" value={[sel.brand, sel.size].filter(Boolean).join(" · ") || "—"} />
                    <Row label="Condition" value={sel.condition} />
                    <Row label="Quantity" value={String(sel.quantity || 1)} />
                    <Row label="Seller's asking" value={sel.isDonation ? "Free / Donation" : money(sel.askingPrice)} />
                    <Row label="Original price" value={money(sel.originalPrice)} />
                    <Row label="Seller" value={sel.sellerName || sel.seller?.name || "—"} />
                  </dl>
                  {sel.description && <p className="text-sm text-gray-600 mt-3 border-t border-gray-100 pt-3">{sel.description}</p>}
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setMode("reject")} className="w-auto flex-1 inline-flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg py-2 text-sm font-medium">
                      <Ban className="w-4 h-4" /> Reject
                    </button>
                    <button onClick={() => setMode("accept")} className="w-auto flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium">
                      <Check className="w-4 h-4" /> Accept Product
                    </button>
                  </div>
                </>
              )}

              {/* ACCEPT (offer form) */}
              {mode === "accept" && (
                <div className="space-y-4">
                  <div>
                    <Lbl required>Suggested Purchase Price (₹)</Lbl>
                    <Inp type="number" min="0" value={offer.purchasePrice} onChange={(e) => setOffer({ ...offer, purchasePrice: e.target.value })} placeholder="Enter amount to offer seller" />
                    <p className="text-xs text-gray-400 mt-1">Seller's asking price: {sel.isDonation ? "Free" : money(sel.askingPrice)}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={offer.repairNeeded} onChange={(e) => setOffer({ ...offer, repairNeeded: e.target.checked })} className="accent-green-600 w-4 h-4" />
                    Repair / Refurbishment Needed
                  </label>
                  {offer.repairNeeded && (
                    <>
                      <div><Lbl>Estimated Repair Cost (₹)</Lbl><Inp type="number" min="0" value={offer.repairCost} onChange={(e) => setOffer({ ...offer, repairCost: e.target.value })} placeholder="Enter repair cost" /></div>
                      <div>
                        <Lbl>Repair Description</Lbl>
                        <textarea value={offer.repairDescription} onChange={(e) => setOffer({ ...offer, repairDescription: e.target.value })} rows={3} placeholder="Describe repairs needed…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
                      </div>
                    </>
                  )}
                  <div><Lbl required>Pickup / Collection Date</Lbl><Inp type="date" value={offer.pickupDate} onChange={(e) => setOffer({ ...offer, pickupDate: e.target.value })} /></div>
                  <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-xs rounded p-2.5">
                    📌 After accepting, the seller will be notified with your offer and collection details.
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setMode("view")} className="w-auto flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg py-2 text-sm font-medium">Cancel</button>
                    <button onClick={confirmAccept} disabled={busy} className="w-auto flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                      {busy ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirm Accept
                    </button>
                  </div>
                </div>
              )}

              {/* REJECT */}
              {mode === "reject" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Reject <span className="font-medium">{sel.itemName}</span>? The seller will be notified.</p>
                  <div><Lbl>Reason (optional)</Lbl><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. item too damaged, not a sports product…" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200" /></div>
                  <div className="flex gap-2">
                    <button onClick={() => setMode("view")} className="w-auto flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg py-2 text-sm font-medium">Cancel</button>
                    <button onClick={confirmReject} disabled={busy} className="w-auto flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                      {busy ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Confirm Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-1">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-800 font-medium text-right">{value}</dd>
    </div>
  );
}
function Lbl({ children, required }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1">{children}{required && <span className="text-red-500 ml-0.5">*</span>}</label>;
}
function Inp(props) {
  return <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />;
}
