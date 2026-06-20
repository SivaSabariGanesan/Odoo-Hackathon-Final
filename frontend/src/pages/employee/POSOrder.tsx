import { useState, useRef, useEffect } from "react";
import {
  Search, X, Plus, Minus, User, Tag, Send,
  CreditCard, Smartphone, Banknote, LayoutGrid,
  LogOut, Users, Ticket, CalendarRange, ChefHat,
  BarChart3, Menu, MonitorSmartphone, ShoppingCart,
  ArrowUpFromLine, Delete, CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

interface CartItem {
  id: number; name: string; unitPrice: number; qty: number;
  productDiscount?: number; // percentage, e.g. 30
}
interface Category  { id: number; name: string }
interface Product   { id: number; name: string; price: number; categoryId: number; dot: string }

const CATEGORIES: Category[] = [
  { id: 1, name: "Chaat" },
  { id: 2, name: "Desert" },
  { id: 3, name: "Meal" },
  { id: 4, name: "Beverages" },
];

const PRODUCTS: Product[] = [
  { id: 1,  name: "Masala Tea", price: 540, categoryId: 1, dot: "#4caf50" },
  { id: 2,  name: "Coffee",     price: 540, categoryId: 1, dot: "#4caf50" },
  { id: 3,  name: "Lassi",      price: 540, categoryId: 1, dot: "#4caf50" },
  { id: 4,  name: "Masala Tea", price: 540, categoryId: 2, dot: "#4caf50" },
  { id: 5,  name: "Coffee",     price: 540, categoryId: 2, dot: "#4caf50" },
  { id: 6,  name: "Lassi",      price: 540, categoryId: 2, dot: "#ef5350" },
  { id: 7,  name: "Masala Tea", price: 540, categoryId: 3, dot: "#4caf50" },
  { id: 8,  name: "Coffee",     price: 540, categoryId: 3, dot: "#4caf50" },
  { id: 9,  name: "Lassi",      price: 540, categoryId: 3, dot: "#ef5350" },
  { id: 10, name: "Masala Tea", price: 540, categoryId: 4, dot: "#4caf50" },
  { id: 11, name: "Coffee",     price: 540, categoryId: 4, dot: "#ef5350" },
  { id: 12, name: "Lassi",      price: 540, categoryId: 4, dot: "#4caf50" },
];

const NAV_ITEMS = [
  { label: "Products",           icon: LayoutGrid,    to: ROUTES.PRODUCTS },
  { label: "Category",           icon: Tag,           to: ROUTES.CATEGORIES },
  { label: "Payment Method",     icon: CreditCard,    to: ROUTES.PAYMENTS },
  { label: "Coupon & Promotion", icon: Ticket,        to: ROUTES.COUPONS },
  { label: "Booking",            icon: CalendarRange, to: ROUTES.FLOOR_TABLES },
  { label: "User/Employee",      icon: Users,         to: ROUTES.EMPLOYEES },
  { label: "KDS",                icon: ChefHat,       to: ROUTES.KDS },
  { label: "Reports",            icon: BarChart3,     to: ROUTES.REPORTS },
  { label: "Log Out",            icon: LogOut,        to: ROUTES.LOGIN },
];

type PayMethod  = "cash" | "upi" | "card";
type NumpadMode = "price" | "disc" | "qty";
type MobileTab  = "products" | "cart" | "payment";

// ── Coupon Popup ────────────────────────────────────────────────
function CouponModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Mock valid codes
  const VALID: Record<string, number> = { "SAVE20": 20, "OFFER30": 30, "FLAT10": 10 };

  function handleEnter() {
    const upper = code.trim().toUpperCase();
    if (!upper) { setError("Please enter a coupon code."); return; }
    if (!VALID[upper]) { setError("Invalid coupon code."); return; }
    onApply(upper);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>Coupon Code</h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Input */}
        <div className="px-5 py-4 space-y-3">
          <input
            autoFocus
            value={code}
            onChange={e => { setCode(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleEnter()}
            placeholder="Enter Coupon Code"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-[10px] text-gray-400">Try: SAVE20 · OFFER30 · FLAT10</p>
        </div>
        {/* CTA */}
        <div className="px-5 pb-5">
          <button
            onClick={handleEnter}
            className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-2.5 rounded-xl transition shadow-sm"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSOrder() {
  const [activeCat, setActiveCat]       = useState<number | null>(null);
  const [search, setSearch]             = useState("");
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [payMethod, setPayMethod]       = useState<PayMethod>("cash");
  const [numpadMode, setNumpadMode]     = useState<NumpadMode>("qty");
  const [navOpen, setNavOpen]           = useState(false);
  const [mobileTab, setMobileTab]       = useState<MobileTab>("products");
  // Coupon state
  const [couponOpen, setCouponOpen]     = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; pct: number } | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const VALID_COUPONS: Record<string, number> = { "SAVE20": 20, "OFFER30": 30, "FLAT10": 10 };

  function applyCoupon(code: string) {
    const pct = VALID_COUPONS[code];
    if (pct) setAppliedCoupon({ code, pct });
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = PRODUCTS.filter(p =>
    (activeCat == null || p.categoryId === activeCat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(p: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      setSelectedItem(p.id);
      return [...prev, { id: p.id, name: p.name, unitPrice: p.price, qty: 1 }];
    });
  }

  function updateQty(id: number, delta: number) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  }

  function removeItem(id: number) {
    setCart(prev => prev.filter(i => i.id !== id));
    if (selectedItem === id) setSelectedItem(null);
  }

  const subtotal      = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const tax           = Math.round(subtotal * 0.05);
  const orderDiscount = appliedCoupon ? Math.round(subtotal * appliedCoupon.pct / 100) : 0;
  const total         = subtotal + tax - orderDiscount;

  const PAY_METHODS: { key: PayMethod; label: string; icon: React.ElementType }[] = [
    { key: "cash", label: "Cash", icon: Banknote },
    { key: "upi",  label: "UPI",  icon: Smartphone },
    { key: "card", label: "Card", icon: CreditCard },
  ];

  const NUMPAD_KEYS = ["1","2","3","4","5","6","7","8","9","0","+/-","⌫"];

  // ── Shared pane contents ──────────────────────────────────────

  const ProductsPane = (
    <div className="flex h-full overflow-hidden bg-white">
      {/* Category sidebar */}
      <div className="w-20 sm:w-24 shrink-0 border-r border-gray-100 flex flex-col gap-1.5 p-2 overflow-y-auto">
        <button onClick={() => setActiveCat(null)}
          className={`text-xs font-semibold py-2 rounded-lg transition
            ${activeCat === null ? "bg-[#714B67] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          All
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
            className={`text-xs font-semibold py-2 rounded-lg transition
              ${activeCat === cat.id ? "bg-[#714B67] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {cat.name}
          </button>
        ))}
      </div>
      {/* Product grid */}
      <div className="flex-1 p-2 sm:p-3 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map(p => (
            <button key={p.id} onClick={() => addToCart(p)}
              className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-3 text-left hover:border-[#714B67]/50 hover:shadow-sm transition">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.dot }} />
                <span className="text-xs font-medium text-[#121B35] truncate">{p.name}</span>
              </div>
              <span className="text-xs text-gray-500">₹{p.price}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const CartPane = (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <ShoppingCart className="w-8 h-8 mb-2" />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          cart.map(item => {
            const lineTotal = item.unitPrice * item.qty;
            const discAmt   = item.productDiscount
              ? Math.round(lineTotal * item.productDiscount / 100)
              : 0;
            return (
              <div key={item.id} onClick={() => setSelectedItem(item.id)}
                className={`px-2 sm:px-3 py-2 rounded-xl cursor-pointer transition border
                  ${selectedItem === item.id ? "border-[#714B67]/30 bg-[#714B67]/5" : "border-transparent hover:bg-gray-50"}`}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#121B35] truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">₹{item.unitPrice} each</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); updateQty(item.id, -1); }}
                      className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                      <Minus className="w-2.5 h-2.5 text-gray-600" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-[#121B35]">{item.qty}</span>
                    <button onClick={e => { e.stopPropagation(); updateQty(item.id, 1); }}
                      className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                      <Plus className="w-2.5 h-2.5 text-gray-600" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-[#121B35] w-12 text-right shrink-0">
                    ₹{lineTotal}
                  </span>
                  <button onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                    className="text-gray-300 hover:text-red-400 transition shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Product-level discount badge */}
                {item.productDiscount && (
                  <div className="mt-1.5 ml-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {item.productDiscount}% off on ₹{lineTotal} − ₹{discAmt}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Send to Kitchen */}
      <div className="px-3 pt-1 pb-2 shrink-0">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          <ChefHat className="w-4 h-4 text-[#714B67]" />
          Send to Kitchen
        </button>
      </div>

      {/* Action row */}
      <div className="flex gap-1.5 px-3 pb-2 shrink-0">
        <button className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
          <User className="w-3 h-3" /><span className="hidden sm:inline">Customer</span>
        </button>
        <button
          onClick={() => setCouponOpen(true)}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-lg border transition
            ${appliedCoupon
              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}
        >
          {appliedCoupon
            ? <><CheckCircle className="w-3 h-3" /><span className="hidden sm:inline">{appliedCoupon.code}</span></>
            : <><Tag className="w-3 h-3" /><span className="hidden sm:inline">Discount</span></>
          }
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
          <Send className="w-3 h-3" /><span className="hidden sm:inline">Send</span>
        </button>
      </div>

      {/* Totals */}
      <div className="px-4 pb-3 pt-2 border-t border-gray-100 space-y-1 shrink-0">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Sub total</span>
          <span className="text-[#121B35] font-medium">₹{subtotal}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Tax (GST 5%)</span>
          <span className="text-[#121B35] font-medium">₹{tax}</span>
        </div>
        {/* Order-level discount line */}
        {appliedCoupon && (
          <div className="flex justify-between text-xs">
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Discount ({appliedCoupon.code} · {appliedCoupon.pct}%)
              <button onClick={() => setAppliedCoupon(null)} className="text-gray-400 hover:text-red-400 ml-1">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
            <span className="text-emerald-600 font-semibold">−₹{orderDiscount}({appliedCoupon.pct}%)</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold text-[#121B35] pt-1.5 border-t border-gray-200">
          <span>Total</span>
          <span>₹{total}</span>
        </div>
      </div>
    </div>
  );

  const PaymentPane = (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Active method header */}
      <div className="bg-[#714B67] px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-white">
          {payMethod === "cash" && <Banknote className="w-4 h-4" />}
          {payMethod === "upi"  && <Smartphone className="w-4 h-4" />}
          {payMethod === "card" && <CreditCard className="w-4 h-4" />}
          <span className="text-sm font-semibold capitalize">{payMethod}</span>
        </div>
        <button className="text-white/70 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Inactive methods */}
      <div className="border-b border-gray-100 shrink-0">
        {PAY_METHODS.filter(m => m.key !== payMethod).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setPayMethod(key)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition">
            <Icon className="w-4 h-4 text-gray-400" />
            {label}
          </button>
        ))}
      </div>
      {/* Amount */}
      <div className="flex flex-col items-center justify-center py-3 shrink-0">
        <p className="text-xs text-gray-400 mb-0.5">Amount</p>
        <p className="text-2xl sm:text-3xl font-bold text-[#121B35] leading-none">₹{total}</p>
        <p className="text-[10px] text-[#714B67] mt-1 font-semibold uppercase tracking-widest">{payMethod}</p>
      </div>
      {/* Mode switcher */}
      <div className="flex gap-1 px-3 mb-1.5 shrink-0">
        {(["price","disc","qty"] as NumpadMode[]).map(mode => (
          <button key={mode} onClick={() => setNumpadMode(mode)}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition
              ${numpadMode === mode ? "bg-[#714B67] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            {mode === "price" ? "Prices" : mode === "disc" ? "Disc." : "Qty"}
          </button>
        ))}
      </div>
      {/* Numpad */}
      <div className="flex-1 flex flex-col px-3 pb-3 min-h-0">
        <div className="grid grid-cols-4 gap-1 flex-1">
          {NUMPAD_KEYS.map((k, i) => {
            const isBack = k === "⌫";
            const isPM   = k === "+/-";
            return (
              <button key={i}
                className={`text-sm font-semibold rounded-xl transition min-h-[2.5rem]
                  ${isBack ? "bg-red-50 text-red-400 hover:bg-red-100"
                  : isPM   ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  :           "bg-gray-50 border border-gray-200 text-[#121B35] hover:bg-gray-100"}`}>
                {isBack ? <Delete className="w-4 h-4 mx-auto" /> : k}
              </button>
            );
          })}
        </div>
        <button className="mt-1.5 w-full bg-[#714B67] hover:bg-[#5d3d55] text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm shrink-0">
          Validate · ₹{total}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>

        {/* Search — hidden on very small screens */}
        <div className="relative hidden sm:block sm:w-40 md:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#714B67] focus:bg-white transition text-[#121B35] placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-0.5">
          {[
            { icon: ShoppingCart,      to: ROUTES.ORDERS,      title: "Orders" },
            { icon: MonitorSmartphone, to: ROUTES.TABLE_VIEW,  title: "Tables" },
            { icon: ArrowUpFromLine,   to: ROUTES.POS_SESSION, title: "Close Session" },
          ].map(({ icon: Icon, to, title }) => (
            <Link key={title} to={to} title={title}
              className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>

        {/* Session badge — truncated on small screens */}
        <div className="hidden md:flex bg-[#714B67]/10 text-[#714B67] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
          Jubilant Shark · 12 V
        </div>

        <div className="flex-1" />

        <Link to={ROUTES.CUSTOMERS} title="Customer"
          className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
          <User className="w-4 h-4" />
        </Link>

        <div className="relative" ref={navRef}>
          <button onClick={() => setNavOpen(!navOpen)}
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <Menu className="w-4 h-4" />
          </button>
          {navOpen && (
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-52 py-1">
              {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
                <Link key={label} to={to} onClick={() => setNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#121B35] transition">
                  <Icon className="w-3.5 h-3.5 text-[#714B67]" />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── DESKTOP: 3-PANE SIDE BY SIDE (md+) ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Products pane */}
        <div className="flex overflow-hidden border-r border-gray-200 w-[38%] lg:w-[40%]">
          {ProductsPane}
        </div>
        {/* Cart pane */}
        <div className="flex flex-col overflow-hidden border-r border-gray-200 w-[32%] lg:w-[30%]">
          {CartPane}
        </div>
        {/* Payment pane */}
        <div className="flex flex-col overflow-hidden flex-1">
          {PaymentPane}
        </div>
      </div>

      {/* ── MOBILE: TAB SWITCHER (< md) ── */}
      <div className="flex md:hidden flex-1 overflow-hidden flex-col">
        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === "products" && ProductsPane}
          {mobileTab === "cart"     && CartPane}
          {mobileTab === "payment"  && PaymentPane}
        </div>
        {/* Tab bar */}
        <div className="h-12 bg-white border-t border-gray-200 flex shrink-0">
          {([
            { key: "products", icon: LayoutGrid,  label: "Products" },
            { key: "cart",     icon: ShoppingCart, label: `Cart${cart.length ? ` (${cart.length})` : ""}` },
            { key: "payment",  icon: CreditCard,   label: "Payment" },
          ] as { key: MobileTab; icon: React.ElementType; label: string }[]).map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setMobileTab(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition
                ${mobileTab === key ? "text-[#714B67] border-t-2 border-[#714B67]" : "text-gray-400 border-t-2 border-transparent"}`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BOTTOM LABELS (desktop only) ── */}
      <div className="hidden md:flex h-7 bg-white border-t border-gray-200 shrink-0">
        {[["38%","PRODUCT"],["32%","CART"],["30%","PAYMENT"]].map(([w, label]) => (
          <div key={label} className="flex items-center justify-center border-r border-gray-100 last:border-r-0"
            style={{ width: w }}>
            <span className="text-[10px] font-semibold tracking-widest text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* ── COUPON MODAL ── */}
      {couponOpen && (
        <CouponModal
          onClose={() => setCouponOpen(false)}
          onApply={applyCoupon}
        />
      )}
    </div>
  );
}
