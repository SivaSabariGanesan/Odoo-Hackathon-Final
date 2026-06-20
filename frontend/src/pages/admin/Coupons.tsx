import { useState, useRef, useEffect } from "react";
import {
  Plus, Trash2, User, Menu, MonitorSmartphone,
  ShoppingCart, ArrowUpFromLine, LayoutGrid, Tag,
  CreditCard, Ticket, CalendarRange, Users, ChefHat,
  BarChart3, LogOut, X, GripVertical, Check,
  Percent, Hash,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

type PromoType   = "Coupon" | "Promotion";
type DiscountOn  = "%" | "Fixed";
type ApplyOn     = "Product" | "Order";

interface Promo {
  id: string;
  name: string;
  promoType: PromoType;
  active: boolean;
  activeProgrammes: number;
  // coupon-specific
  couponCode: string;
  discountOn: DiscountOn;
  discountValue: number;
  // promotion-specific
  applyOn: ApplyOn;
  minQty: number;
  minOrderAmount: number;
  productDescription: string;
}

const INIT: Promo[] = [
  { id: "1", name: "Summer Sale",  promoType: "Coupon",    active: false, activeProgrammes: 2, couponCode: "Summer20", discountOn: "%",     discountValue: 20, applyOn: "Order",   minQty: 0, minOrderAmount: 0,   productDescription: "" },
  { id: "2", name: "Promotions",   promoType: "Promotion", active: false, activeProgrammes: 2, couponCode: "",         discountOn: "%",     discountValue: 30, applyOn: "Product", minQty: 6, minOrderAmount: 0,   productDescription: "e.g Burger with others" },
  { id: "3", name: "New user",     promoType: "Coupon",    active: false, activeProgrammes: 2, couponCode: "NEWUSER",  discountOn: "Fixed", discountValue: 50, applyOn: "Order",   minQty: 0, minOrderAmount: 0,   productDescription: "" },
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

// ── Promo Form Modal ─────────────────────────────────────────────
function PromoForm({
  promo,
  onClose,
  onSave,
}: {
  promo: Promo | null;
  onClose: () => void;
  onSave: (p: Promo) => void;
}) {
  const isCoupon = !promo || promo.promoType === "Coupon";
  const [name,               setName]               = useState(promo?.name               ?? "");
  const [promoType,          setPromoType]           = useState<PromoType>(promo?.promoType ?? "Coupon");
  const [couponCode,         setCouponCode]          = useState(promo?.couponCode         ?? "");
  const [discountOn,         setDiscountOn]          = useState<DiscountOn>(promo?.discountOn ?? "%");
  const [discountValue,      setDiscountValue]       = useState(String(promo?.discountValue ?? ""));
  const [applyOn,            setApplyOn]             = useState<ApplyOn>(promo?.applyOn     ?? "Product");
  const [minQty,             setMinQty]              = useState(String(promo?.minQty        ?? ""));
  const [minOrderAmount,     setMinOrderAmount]      = useState(String(promo?.minOrderAmount ?? ""));
  const [productDescription, setProductDescription]  = useState(promo?.productDescription  ?? "");
  const [active,             setActive]              = useState(promo?.active              ?? false);

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: promo?.id ?? crypto.randomUUID(),
      name: name.trim(), promoType, active,
      activeProgrammes: promo?.activeProgrammes ?? 0,
      couponCode, discountOn,
      discountValue: parseFloat(discountValue) || 0,
      applyOn,
      minQty: parseInt(minQty) || 0,
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      productDescription,
    });
    onClose();
  }

  const isPromotion = promoType === "Promotion";
  const isOrderBased = isPromotion && applyOn === "Order";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>
            {promo ? "Edit" : "New"} {promoType === "Coupon" ? "Coupon" : "Automated Promotion"}
          </h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Row 1: Name + (Coupon Code if coupon) */}
          <div className={`grid gap-3 ${promoType === "Coupon" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Promotion Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Masala Tea"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
            </div>
            {promoType === "Coupon" && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center justify-between">
                  <span>Coupon Code</span>
                  <span className="text-[10px] text-[#714B67] font-normal">Text field, create any coupon</span>
                </label>
                <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Summer20"
                  className="w-full px-3 py-2 text-sm border border-[#714B67]/40 bg-[#714B67]/5 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
              </div>
            )}
          </div>

          {/* Row 2: Type + Discount */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
              <select value={promoType} onChange={e => setPromoType(e.target.value as PromoType)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white text-[#121B35]">
                <option>Coupon</option>
                <option>Promotion</option>
              </select>
            </div>
            {promoType === "Coupon" && (
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Discount On</label>
                  <select value={discountOn} onChange={e => setDiscountOn(e.target.value as DiscountOn)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white text-[#121B35]">
                    <option value="%">%</option>
                    <option value="Fixed">Fixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {discountOn === "%" ? "%" : "₹"}
                    </span>
                    <input value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                      placeholder="20" type="number"
                      className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35]" />
                  </div>
                </div>
              </div>
            )}
            {isPromotion && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Apply</label>
                  <select value={applyOn} onChange={e => setApplyOn(e.target.value as ApplyOn)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white text-[#121B35]">
                    <option>Product</option>
                    <option>Order</option>
                  </select>
                </div>
                {/* Min Qty (product-based) or Min Order Amount (order-based) */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">
                    {isOrderBased ? "Order ≥ ₹" : "Min Qty"}
                  </label>
                  <input
                    value={isOrderBased ? minOrderAmount : minQty}
                    onChange={e => isOrderBased ? setMinOrderAmount(e.target.value) : setMinQty(e.target.value)}
                    placeholder={isOrderBased ? "620" : "6"} type="number"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35]" />
                </div>
              </>
            )}
          </div>

          {/* Promotion: Discount */}
          {isPromotion && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Reduce Discount</label>
                <div className="flex items-center gap-2">
                  <input value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                    placeholder="30" type="number"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35]" />
                  <select value={discountOn} onChange={e => setDiscountOn(e.target.value as DiscountOn)}
                    className="px-2 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white text-[#121B35]">
                    <option value="%">%</option>
                    <option value="Fixed">₹</option>
                  </select>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Apply On</label>
                <div className="flex gap-2">
                  {(["Product","Order"] as ApplyOn[]).map(opt => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={applyOn === opt} onChange={() => setApplyOn(opt)}
                        className="accent-[#714B67]" />
                      <span className="text-xs text-gray-600">{opt}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Both should apply on whole order</p>
              </div>
            </div>
          )}

          {/* Coupon type selector (for Coupon form) */}
          {promoType === "Coupon" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Coupon Promotion</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 border-2 border-[#714B67] bg-[#714B67]/5 rounded-xl text-center cursor-pointer">
                  <Percent className="w-4 h-4 text-[#714B67] mx-auto mb-1" />
                  <p className="text-xs font-semibold text-[#714B67]">% Discount</p>
                </div>
                <div className="p-2.5 border border-gray-200 rounded-xl text-center cursor-pointer hover:border-[#714B67]/40">
                  <Hash className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Fixed Amount</p>
                </div>
              </div>
            </div>
          )}

          {/* Product Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Product Description</label>
            <textarea value={productDescription} onChange={e => setProductDescription(e.target.value)}
              placeholder="e.g Burger with others" rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300 resize-none" />
          </div>

          {/* Activate */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-500">Activate</label>
            <button onClick={() => setActive(a => !a)}
              className={`relative inline-flex items-center rounded-full transition-colors shrink-0`}
              style={{ width: 34, height: 18, backgroundColor: active ? "#714B67" : "#d1d5db" }}>
              <span className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all`}
                style={{ left: active ? 16 : 2 }} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">Discard</button>
          <button onClick={handleSave}
            className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" />Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function Coupons() {
  const [promos,  setPromos]  = useState<Promo[]>(INIT);
  const [navOpen, setNavOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null | "new">(null);
  const [search,  setSearch]  = useState("");
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = promos.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleActive(id: string) {
    setPromos(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }

  function handleSave(p: Promo) {
    setPromos(prev => prev.find(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <span className="text-sm font-bold" style={{ color: "#121B35" }}>Coupon & Promotion</span>

        <div className="flex items-center gap-0.5 ml-auto">
          {[
            { icon: ShoppingCart,      to: ROUTES.ORDERS,      title: "Orders" },
            { icon: MonitorSmartphone, to: ROUTES.TABLE_VIEW,  title: "Tables" },
            { icon: ArrowUpFromLine,   to: ROUTES.POS_SESSION, title: "Close" },
          ].map(({ icon: Icon, to, title }) => (
            <Link key={title} to={to} title={title}
              className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>
        <Link to={ROUTES.CUSTOMERS}
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
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                  <Icon className="w-3.5 h-3.5 text-[#714B67]" />{label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div className="flex-1 p-3 sm:p-6">
        <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100 flex-wrap">
            <button onClick={() => setEditing("new")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition shrink-0">
              <Plus className="w-3.5 h-3.5" />New
            </button>
            <div className="relative flex-1 min-w-[140px]">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search promotions…"
                className="w-full pl-3 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] focus:bg-white transition placeholder:text-gray-300 text-[#121B35]" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-8 pl-3" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Promotions Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Active programmes</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Activate</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No promotions found</td></tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition group">
                      <td className="pl-3 pr-1 py-3.5">
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 cursor-grab" />
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setEditing(p)}
                          className="text-sm font-medium text-[#714B67] hover:underline">
                          {p.name}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${p.promoType === "Coupon"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"}`}>
                          {p.promoType === "Coupon" ? "Coupon" : "Automated Promo"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm text-gray-500">
                        {p.activeProgrammes}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => toggleActive(p.id)}
                          className="relative inline-flex items-center rounded-full transition-colors"
                          style={{ width: 34, height: 18, backgroundColor: p.active ? "#714B67" : "#d1d5db" }}>
                          <span className="absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all"
                            style={{ left: p.active ? 16 : 2 }} />
                        </button>
                      </td>
                      <td className="pr-3 py-3.5 text-right">
                        <button onClick={() => setPromos(prev => prev.filter(x => x.id !== p.id))}
                          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{filtered.length} promotion{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {editing !== null && (
        <PromoForm
          promo={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
