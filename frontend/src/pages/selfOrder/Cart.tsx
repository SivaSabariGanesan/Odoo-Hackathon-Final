import { useState, useEffect, useCallback } from "react";
import { Minus, Plus, X, Tag, ArrowLeft, CheckCircle, Loader2, AlertCircle, CreditCard, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import {
  getSoSession,
  clearSoSession,
  getSoCart,
  updateSoCartItem,
  removeSoCartItem,
  applySoCoupon,
  soCheckout,
  type SoCart,
} from "../../api/self-order";
import { clearAuth } from "../../api/auth";
import axios from "axios";

const BASE_API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

// Unauthenticated payment helpers (self-order flow uses order publicId directly)
async function selfOrderCreatePaymentTxn(orderId: string, paymentMethodId: string) {
  const { data } = await axios.post(`${BASE_API}/v1/orders/${orderId}/payment-order`, { paymentMethodId });
  return data.data as { transactionId: string };
}

async function selfOrderInitiateCashfree(orderId: string, transactionId: string) {
  const { data } = await axios.post(`${BASE_API}/v1/orders/${orderId}/payments/cashfree`, { transactionId });
  return data.data as { paymentSessionId: string; environment: string };
}

// Local cart fallback (used when server cart isn't available)
interface LocalItem { productId: string; name: string; price: number; qty: number }
function getLocalCart(): LocalItem[] {
  try { return JSON.parse(sessionStorage.getItem("soCart") ?? "[]"); } catch { return []; }
}
function saveLocalCart(items: LocalItem[]) {
  sessionStorage.setItem("soCart", JSON.stringify(items));
}
function clearLocalCart() { sessionStorage.removeItem("soCart"); }

export default function Cart() {
  const session  = getSoSession();
  const navigate = useNavigate();

  // Server-driven cart state
  const [serverCart,    setServerCart]    = useState<SoCart | null>(null);
  const [loadingCart,   setLoadingCart]   = useState(!!session);
  const [cartError,     setCartError]     = useState<string | null>(null);

  // Local fallback cart (used when no session)
  const [localItems,    setLocalItems]    = useState<LocalItem[]>(getLocalCart);

  // Coupon
  const [couponCode,    setCouponCode]    = useState("");
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponErr,     setCouponErr]     = useState("");
  const [applyingCoupon,setApplyingCoupon]= useState(false);

  // Checkout
  const [checkingOut,   setCheckingOut]   = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentStep,   setPaymentStep]   = useState<"idle" | "processing" | "done">("idle");

  // Load server cart on mount
  const loadCart = useCallback(async () => {
    if (!session) return;
    setLoadingCart(true);
    setCartError(null);
    try {
      const cart = await getSoCart(session.tableToken, session.sessionToken);
      setServerCart(cart);
    } catch {
      setCartError("Could not load your cart. Showing local items.");
    } finally {
      setLoadingCart(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { loadCart(); }, [loadCart]);

  // ── Server cart operations ──────────────────────────────────────
  async function handleServerQtyChange(itemId: string | number, currentQty: number, delta: number) {
    if (!session) return;
    const newQty = currentQty + delta;
    try {
      if (newQty <= 0) {
        await removeSoCartItem(session.tableToken, session.sessionToken, itemId);
      } else {
        await updateSoCartItem(session.tableToken, session.sessionToken, itemId, newQty);
      }
      await loadCart();
    } catch { /* ignore */ }
  }

  async function handleApplyCoupon() {
    if (!session || !couponCode.trim()) { setCouponErr("Enter a code"); return; }
    setApplyingCoupon(true);
    setCouponErr("");
    try {
      await applySoCoupon(session.tableToken, session.sessionToken, couponCode.trim().toUpperCase());
      setCouponApplied(couponCode.trim().toUpperCase());
      setCouponCode("");
      await loadCart();
    } catch (e: any) {
      setCouponErr(e?.response?.data?.message ?? "Invalid coupon code");
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function handleCheckout() {
    if (!session) return;
    setCheckingOut(true);
    setCheckoutError("");
    try {
      // 1. Send order to kitchen & get orderId back
      const result = await soCheckout(session.tableToken, session.sessionToken);
      const orderId: string = (result as any)?.orderId;

      if (!orderId) {
        // Order placed, no payment — go to confirmed
        clearLocalCart();
        navigate(ROUTES.ORDER_CONFIRMED, { state: { orderId: null } });
        return;
      }

      // 2. Attempt Cashfree payment directly (customer self-order flow)
      setPaymentStep("processing");
      try {
        // Create a Cashfree payment session via public self-order endpoint
        const payResp = await axios.post(
          `${import.meta.env.VITE_API_URL ?? ""}/api/v1/self-order/s/${session.tableToken}/orders/${orderId}/pay-cashfree`
        );
        const { paymentSessionId, environment } = payResp.data;

        const { load } = await import("@cashfreepayments/cashfree-js");
        const cashfree = await load({
          mode: environment === "PRODUCTION" ? "production" : "sandbox",
        });

        cashfree.checkout({
          paymentSessionId,
          redirectTarget: "_modal",
        }).then((cfResult: any) => {
          if (cfResult.error) {
            setCheckoutError(cfResult.error.message ?? "Payment failed.");
            setPaymentStep("idle");
          } else {
            clearLocalCart();
            setPaymentStep("done");
            navigate(ROUTES.ORDER_CONFIRMED, { state: { orderId } });
          }
          setCheckingOut(false);
        });
        return; // modal handles setCheckingOut
      } catch (payErr: any) {
        // Payment not available or failed — order still confirmed (pay at table)
        console.warn("[Cart] Payment initiation failed:", payErr);
        clearLocalCart();
        navigate(ROUTES.ORDER_CONFIRMED, { state: { orderId } });
      }
    } catch (e: any) {
      setCheckoutError(e?.response?.data?.message ?? "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  }

  // ── Local cart operations (no session) ─────────────────────────
  function handleLocalQty(productId: string, delta: number) {
    setLocalItems(prev => {
      const updated = prev
        .map(i => i.productId === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter(i => i.qty > 0);
      saveLocalCart(updated);
      return updated;
    });
  }

  // ── Derive display items ────────────────────────────────────────
  const useServer = !!session && !cartError;
  const displayItems = useServer
    ? (serverCart?.items ?? []).map(i => ({
        id: i.id,
        name: i.productName,
        price: parseFloat(i.unitPrice),
        qty: i.quantity,
        total: parseFloat(i.lineTotal),
      }))
    : localItems.map(i => ({ id: i.productId, name: i.name, price: i.price, qty: i.qty, total: i.price * i.qty }));

  // Totals
  // Totals — server returns { subtotal, taxAmount, discountAmount, grandTotal } as numbers in totals
  const subtotal = useServer && serverCart?.totals
    ? Number(serverCart.totals.subtotal)
    : useServer && serverCart
      ? parseFloat(serverCart.subtotal)
      : localItems.reduce((s, i) => s + i.price * i.qty, 0);

  const tax = useServer && serverCart?.totals
    ? Number(serverCart.totals.taxAmount)
    : useServer && serverCart
      ? parseFloat(serverCart.taxAmount)
      : Math.round(subtotal * 0.05);

  const discount = useServer && serverCart?.totals
    ? Number(serverCart.totals.discountAmount)
    : useServer && serverCart
      ? parseFloat(serverCart.discountAmount)
      : 0;

  const total = useServer && serverCart?.totals
    ? Number(serverCart.totals.grandTotal)
    : useServer && serverCart
      ? parseFloat(serverCart.grandTotal)
      : subtotal + tax - discount;

  const isEmpty = displayItems.length === 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ height: 700 }}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 shrink-0">
          <Link
            to={ROUTES.PRODUCT_BROWSE}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#714B67] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />Back
          </Link>
          <span className="flex-1 text-center text-sm font-bold" style={{ color: "#121B35" }}>Your Order</span>
          <button
            onClick={() => {
              clearSoSession();
              clearAuth();
              navigate(ROUTES.LOGIN);
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loadingCart ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading cart…
            </div>
          ) : cartError ? (
            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 rounded-xl px-3 py-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{cartError}
            </div>
          ) : null}

          {!loadingCart && isEmpty ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <p className="text-sm">Your cart is empty</p>
              <Link to={ROUTES.PRODUCT_BROWSE} className="text-xs text-[#714B67] mt-2 font-semibold hover:underline">
                Browse products
              </Link>
            </div>
          ) : (
            displayItems.map(item => (
              <div
                key={String(item.id)}
                className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#121B35] truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">₹{item.price.toFixed(0)} each</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() =>
                      useServer
                        ? handleServerQtyChange(item.id, item.qty, -1)
                        : handleLocalQty(String(item.id), -1)
                    }
                    className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm"
                  >
                    <Minus className="w-2.5 h-2.5 text-gray-600" />
                  </button>
                  <span className="w-4 text-center text-xs font-bold" style={{ color: "#121B35" }}>{item.qty}</span>
                  <button
                    onClick={() =>
                      useServer
                        ? handleServerQtyChange(item.id, item.qty, 1)
                        : handleLocalQty(String(item.id), 1)
                    }
                    className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm"
                  >
                    <Plus className="w-2.5 h-2.5 text-gray-600" />
                  </button>
                </div>
                <span className="text-xs font-bold text-[#121B35] w-12 text-right shrink-0">
                  ₹{item.total.toFixed(0)}
                </span>
              </div>
            ))
          )}

          {/* Coupon row — only show when session is available */}
          {session && !isEmpty && (
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponErr(""); }}
                  placeholder="Have a coupon code?"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] text-[#121B35] placeholder:text-gray-300"
                />
              </div>
              {couponApplied ? (
                <button
                  onClick={() => { setCouponApplied(null); loadCart(); }}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl"
                >
                  <CheckCircle className="w-3.5 h-3.5" />{couponApplied}
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon}
                  className="text-xs font-semibold text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 px-3 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {applyingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                </button>
              )}
            </div>
          )}
          {couponErr && <p className="text-[10px] text-red-500 pl-1">{couponErr}</p>}
        </div>

        {/* Totals + Confirm */}
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 shrink-0 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Sub Total</span>
            <span className="text-[#121B35] font-medium">₹{subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Tax</span>
            <span className="text-[#121B35] font-medium">₹{tax.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 font-medium">
              <span>Discount</span>
              <span>−₹{discount.toFixed(0)}</span>
            </div>
          )}
          <div
            className="flex justify-between text-sm font-bold pt-1 border-t border-gray-100"
            style={{ color: "#121B35" }}
          >
            <span>Total</span>
            <span>₹{total.toFixed(0)}</span>
          </div>

          {checkoutError && (
            <p className="text-[10px] text-red-500 text-center">{checkoutError}</p>
          )}

          <button
            onClick={session ? handleCheckout : () => navigate(ROUTES.ORDER_CONFIRMED)}
            disabled={isEmpty || checkingOut}
            className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-3 rounded-2xl transition shadow-md mt-1 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checkingOut && paymentStep === "idle"  && <Loader2 className="w-4 h-4 animate-spin" />}
            {checkingOut && paymentStep === "processing" && <CreditCard className="w-4 h-4" />}
            {checkingOut && paymentStep === "idle"       ? "Placing order…"
              : checkingOut && paymentStep === "processing" ? "Opening payment…"
              : "Confirm Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
