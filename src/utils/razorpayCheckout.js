import axios from "axios";

/**
 * Reusable web Razorpay checkout. Used by every paid flow (turf / tournament /
 * store). Opens a real Razorpay order, launches the checkout modal, and posts
 * the signed result to the server for verification. The booking is marked paid
 * server-side ONLY after /verify confirms the signature — the client never
 * asserts "paid" on its own.
 *
 *   await payWithRazorpay({ purpose:"turf", refId: booking._id, amountRupees: 500,
 *                           name, email, phone, description });
 *
 * Resolves with { paymentId } on verified success; rejects on dismissal/failure.
 */
const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load payment gateway"));
    document.body.appendChild(s);
  });
}

export async function payWithRazorpay({ purpose, refId, amountRupees, amountPaise, name = "", email = "", phone = "", description = "" }) {
  await loadRazorpayScript();

  // 1. Create the order server-side (amount + gateway order are authoritative there).
  const { data } = await axios.post("/api/razorpay/order", { purpose, refId, amountRupees, amountPaise, name, email, phone });
  if (!data?.success) throw new Error(data?.message || "Could not start payment");
  const { key, order, paymentId } = data;

  // 2. Open the Razorpay checkout modal and verify the signed callback.
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      name: "Chalo Khelne",
      description: description || "Payment",
      prefill: { name, email, contact: phone },
      theme: { color: "#15A765" },
      handler: async (resp) => {
        try {
          const v = await axios.post("/api/razorpay/verify", {
            paymentId,
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          if (v.data?.success) resolve({ paymentId, ...v.data });
          else reject(new Error(v.data?.message || "Payment verification failed"));
        } catch (e) {
          reject(new Error(e?.response?.data?.message || "Payment verification failed"));
        }
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.on("payment.failed", (r) => reject(new Error(r?.error?.description || "Payment failed")));
    rzp.open();
  });
}

export default payWithRazorpay;
