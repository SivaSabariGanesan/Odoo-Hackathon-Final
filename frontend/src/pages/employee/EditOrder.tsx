import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Minus, Trash2, Send,
  ShoppingCart, Loader2, AlertCircle, Check, X,
  MonitorSmartphone, ArrowUpFromLine, Menu,
} from "lucide-react";
import { ROUTES } from "../../routes/paths";
import { useNavItems } from "../../hooks/useNavItems";
import {
  getOrder, addItemToOrder, updateOrderItem, removeOrderItem,
  sendToKitchen, cancelOrder, type Order, type OrderItem,
} from "../../api/orders";
import { listProducts, listCategories, type Product, type Category } from "../../api/products";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: string | number) {
  return `₹${parseFloat(String(n)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SENT_TO_KITCHEN: "In Kitchen", PREPARING: "Preparing",
  READY: "Ready", PAYMENT_PENDING: "Processing", PAID: "Paid", CANCELLED: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 border border-gray-200",
  SENT_TO_KITCHEN: "bg-blue-100 text-blue-700 border border-blue-200",
  PREPARING: "bg-amber-100 text-amber-700 border border-amber-200",
  READY: "bg-teal-100 text-teal-700 border border-teal-200",
  PAYMENT_PENDING: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  PAID: "bg-[#714B67] text-white",
  CANCELLED: "bg-red-100 text-red-600 border border-red-200",
};

function isOrderMutable(status: Order["status"]) {
  return !["PAID", "CANCELLED", "PAYMENT_PENDING"].includes(status);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
      ${STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
      px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition
      ${type === "success" ? "bg-[#714B67] text-white" : "bg-red-500 text-white"}`}>
      {type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EditOrder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const navItems = useNavItems();
  const navRef = useRef<HTMLDivElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [navOpen, setNavOpen] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null); // itemId or "send"
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // ── Toasts ─────────────────────────────────────────────────────────────────
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  }

  // ── Load order ─────────────────────────────────────────────────────────────
  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoadingOrder(true);
    setOrderError(null);
    try {
      const o = await getOrder(id);
      setOrder(o);
    } catch {
      setOrderError("Failed to load order. It may have been deleted.");
    } finally {
      setLoadingOrder(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  // ── Load products & categories ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingProducts(true);
      try {
        const [prods, cats] = await Promise.all([
          listProducts({ isAvailable: true }),
          listCategories(),
        ]);
        setProducts(prods);
        setCategories(cats.filter(c => c.isActive));
      } finally {
        setLoadingProducts(false);
      }
    }
    load();
  }, []);

  // ── Close nav on outside click ─────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Filtered products ──────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCat === "all" || p.category?.publicId === selectedCat;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleAddProduct(product: Product) {
    if (!order) return;
    setMutating(`add-${product.publicId}`);
    try {
      const updated = await addItemToOrder(order.publicId, product.publicId, 1);
      setOrder(updated);
      showToast(`${product.name} added`);
    } catch (e: any) {
      showToast(e?.response?.data?.error?.message ?? "Failed to add item", "error");
    } finally {
      setMutating(null);
    }
  }

  async function handleQtyChange(item: OrderItem, delta: number) {
    if (!order) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      handleRemoveItem(item);
      return;
    }
    setMutating(item.publicId);
    try {
      const updated = await updateOrderItem(order.publicId, item.publicId, newQty);
      setOrder(updated);
    } catch (e: any) {
      showToast(e?.response?.data?.error?.message ?? "Failed to update quantity", "error");
    } finally {
      setMutating(null);
    }
  }

  async function handleRemoveItem(item: OrderItem) {
    if (!order) return;
    setMutating(item.publicId);
    try {
      const updated = await removeOrderItem(order.publicId, item.publicId);
      setOrder(updated);
      showToast(`${item.productName} removed`);
    } catch (e: any) {
      showToast(e?.response?.data?.error?.message ?? "Failed to remove item", "error");
    } finally {
      setMutating(null);
    }
  }

  async function handleSendToKitchen() {
    if (!order) return;
    setMutating("send");
    try {
      await sendToKitchen(order.publicId);
      await loadOrder();
      showToast("Sent to kitchen!");
    } catch (e: any) {
      showToast(e?.response?.data?.error?.message ?? "Failed to send to kitchen", "error");
    } finally {
      setMutating(null);
    }
  }

  async function handleCancelOrder() {
    if (!order) return;
    setMutating("cancel");
    try {
      await cancelOrder(order.publicId, "Cancelled from Edit Order");
      showToast("Order cancelled");
      setTimeout(() => navigate(ROUTES.ORDERS), 1200);
    } catch (e: any) {
      showToast(e?.response?.data?.error?.message ?? "Failed to cancel order", "error");
    } finally {
      setMutating(null);
      setCancelConfirm(false);
    }
  }

  // ── Item count in cart ─────────────────────────────────────────────────────
  function cartQtyForProduct(productId: string): number {
    if (!order?.items) return 0;
    const item = order.items.find(i =>
      (i.product?.publicId ?? i.productId) === productId
    );
    return item?.quantity ?? 0;
  }

  const isLocked = !order || !isOrderMutable(order.status);
  const hasUnsentItems = order?.items?.some(i => i.kitchenState === "TO_COOK") ?? false;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#F5F5F7] overflow-hidden">

      {/* ── Header ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 px-3 sm:px-4 shrink-0 z-10">
        <img src="/logo.svg" alt="RestoPOS" className="h-7 shrink-0" />

        <button onClick={() => navigate(ROUTES.ORDERS)}
          className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition ml-1">
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-[#121B35] truncate">
            {order ? `Edit — ${order.orderNumber}` : "Edit Order"}
          </span>
          {order && <StatusBadge status={order.status} />}
        </div>

        <div className="flex items-center gap-0.5 ml-auto">
          <Link to={ROUTES.ORDERS} title="Orders"
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <ShoppingCart className="w-4 h-4" />
          </Link>
          <Link to={ROUTES.TABLE_VIEW} title="Tables"
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <MonitorSmartphone className="w-4 h-4" />
          </Link>
          <Link to={ROUTES.POS_SESSION} title="Close Session"
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <ArrowUpFromLine className="w-4 h-4" />
          </Link>
        </div>

        <div className="relative" ref={navRef}>
          <button onClick={() => setNavOpen(!navOpen)}
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <Menu className="w-4 h-4" />
          </button>
          {navOpen && (
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-52 py-1">
              {navItems.map(({ label, icon: Icon, to }) => (
                <Link key={label} to={to} onClick={() => setNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                  <Icon className="w-3.5 h-3.5 text-[#714B67]" />{label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Loading / Error state ── */}
      {loadingOrder ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#714B67]" />
        </div>
      ) : orderError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm">{orderError}</p>
          <button onClick={() => navigate(ROUTES.ORDERS)}
            className="text-[#714B67] text-sm font-semibold hover:underline">
            ← Back to orders
          </button>
        </div>
      ) : order ? (
        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT: Product catalog ── */}
          <div className="w-[42%] flex flex-col border-r border-gray-200 bg-white overflow-hidden">

            {/* Search bar */}
            <div className="px-3 pt-3 pb-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#714B67] focus:bg-white transition placeholder:text-gray-400 text-[#121B35]"
                />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0 border-b border-gray-100 scrollbar-hide">
              <button
                onClick={() => setSelectedCat("all")}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition
                  ${selectedCat === "all"
                    ? "bg-[#714B67] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.publicId}
                  onClick={() => setSelectedCat(cat.publicId)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition
                    ${selectedCat === cat.publicId
                      ? "text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  style={selectedCat === cat.publicId ? { backgroundColor: cat.color } : {}}>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-[#714B67]" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">No products found</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredProducts.map(product => {
                    const cartQty = cartQtyForProduct(product.publicId);
                    const isAdding = mutating === `add-${product.publicId}`;
                    return (
                      <button
                        key={product.publicId}
                        onClick={() => !isLocked && handleAddProduct(product)}
                        disabled={isLocked || isAdding}
                        className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition
                          ${isLocked
                            ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                            : "border-gray-200 bg-white hover:border-[#714B67]/50 hover:bg-[#714B67]/5 active:scale-[0.98] cursor-pointer"
                          }`}>
                        {cartQty > 0 && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-[#714B67] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {cartQty}
                          </span>
                        )}
                        {isAdding && (
                          <span className="absolute top-2 right-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#714B67]" />
                          </span>
                        )}
                        <p className="text-sm font-semibold text-[#121B35] leading-tight pr-5">{product.name}</p>
                        {product.description && (
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>
                        )}
                        <p className="mt-2 text-sm font-bold text-[#714B67]">{fmt(product.price)}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Order items + totals ── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Order info bar */}
            <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-4 shrink-0">
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-[#121B35]">{order.orderNumber}</span>
                {order.table && (
                  <span className="ml-2 text-gray-400">· Table {order.table.tableNumber}</span>
                )}
              </div>
              {order.customer && (
                <div className="text-xs text-gray-500">
                  <span className="text-gray-400">Customer: </span>
                  <span className="font-medium text-[#121B35]">{order.customer.name}</span>
                </div>
              )}
              <div className="ml-auto">
                <StatusBadge status={order.status} />
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {!order.items || order.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No items yet — add products from the left</p>
                </div>
              ) : (
                order.items.map(item => {
                  const isMutating = mutating === item.publicId;
                  const locked = item.kitchenState === "PREPARING" || item.kitchenState === "COMPLETED";
                  const lineTotal = parseFloat(item.totalPrice ?? item.unitPrice) * item.quantity;

                  return (
                    <div key={item.publicId}
                      className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm">

                      {/* Name + kitchen state */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#121B35] truncate">{item.productName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-gray-400">{fmt(item.unitPrice)} each</p>
                          {item.kitchenState && item.kitchenState !== "TO_COOK" && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                              ${item.kitchenState === "PREPARING" ? "bg-amber-100 text-amber-700"
                                : item.kitchenState === "COMPLETED" ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"}`}>
                              {item.kitchenState}
                            </span>
                          )}
                          {locked && (
                            <span className="text-[10px] text-gray-400 italic">locked</span>
                          )}
                        </div>
                      </div>

                      {/* Qty controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isMutating ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#714B67]" />
                        ) : isLocked || locked ? (
                          <span className="text-sm font-bold text-[#121B35] w-8 text-center">×{item.quantity}</span>
                        ) : (
                          <>
                            <button onClick={() => handleQtyChange(item, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-600">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-sm font-bold text-[#121B35]">{item.quantity}</span>
                            <button onClick={() => handleQtyChange(item, +1)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-600">
                              <Plus className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleRemoveItem(item)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 transition text-gray-300 hover:text-red-400 ml-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Line total */}
                      <p className="text-sm font-bold text-[#121B35] w-16 text-right shrink-0">
                        {fmt(isNaN(lineTotal) ? 0 : lineTotal)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totals + actions */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 space-y-1 shrink-0">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{fmt(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax</span>
                <span>{fmt(order.taxAmount)}</span>
              </div>
              {parseFloat(order.discountAmount) > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Discount</span>
                  <span>−{fmt(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-[#121B35] pt-1 border-t border-gray-100 mt-1">
                <span>Total</span>
                <span className="text-[#714B67]">{fmt(order.grandTotal)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                {/* Cancel order */}
                {isOrderMutable(order.status) && (
                  <button
                    onClick={() => setCancelConfirm(true)}
                    disabled={mutating === "cancel"}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition disabled:opacity-50">
                    <X className="w-3.5 h-3.5" />
                    Cancel Order
                  </button>
                )}

                {/* Send to kitchen */}
                {isOrderMutable(order.status) && hasUnsentItems && (
                  <button
                    onClick={handleSendToKitchen}
                    disabled={mutating === "send"}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold
                      bg-[#714B67] text-white hover:bg-[#5d3d55] transition disabled:opacity-60">
                    {mutating === "send"
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />}
                    Send to Kitchen
                  </button>
                )}

                {/* Back to orders */}
                {!isOrderMutable(order.status) && (
                  <button
                    onClick={() => navigate(ROUTES.ORDERS)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                    ← Back to Orders
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Cancel confirmation modal ── */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 space-y-4 border border-gray-200">
            <h3 className="text-sm font-bold text-[#121B35]">Cancel this order?</h3>
            <p className="text-xs text-gray-500">This action cannot be undone. The order will be marked as Cancelled.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelConfirm(false)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                Keep Order
              </button>
              <button onClick={handleCancelOrder} disabled={mutating === "cancel"}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">
                {mutating === "cancel"
                  ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
