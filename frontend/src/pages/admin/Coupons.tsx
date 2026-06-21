import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Trash2, User, Menu, MonitorSmartphone,
  ShoppingCart, ArrowUpFromLine, LayoutGrid, Tag,
  CreditCard, Ticket, CalendarRange, Users, ChefHat,
  BarChart3, LogOut, X, GripVertical, Check,
  Percent, Hash, Loader2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { useNavItems } from "../../hooks/useNavItems";
import {
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotion,
  type Promotion,
  type PromotionType,
} from "../../api/promotions";

const NAV_ITEMS_PLACEHOLDER = null; // replaced by useNavItems hook

type UIType     = "Coupon" | "Promotion";
type DiscountOn = "%" | "Fixed";
type ApplyOn    = "Product" | "Order";

function mapTypeToUI(type: PromotionType): UIType {
  return type === "COUPON_PERCENTAGE" || type === "COUPON_FIXED" ? "Coupon" : "Promotion";
}

function mapToApiType(uiType: UIType, discountOn: DiscountOn, applyOn: ApplyOn): PromotionType {
  if (uiType === "Coupon") return discountOn === "%" ? "COUPON_PERCENTAGE" : "COUPON_FIXED";
  return applyOn === "Order" ? "AUTO_ORDER_AMOUNT" : "AUTO_PRODUCT_QTY";
}

function PromoForm({
  promo,
  onClose,
  onSave,
}: {
  promo: Promotion | null;
  onClose: () => void;
  onSave: (p: Promotion) => void;
}) {
  const uiType0: UIType     = promo ? mapTypeToUI(promo.type) : "Coupon";
  const discountOn0: DiscountOn = promo?.type === "COUPON_FIXED" || promo?.type === "AUTO_ORDER_AMOUNT" ? "Fixed" : "%";
  const applyOn0: ApplyOn   = promo?.type === "AUTO_ORDER_AMOUNT" ? "Order" : "Product";

  const [promoType,      setPromoType]      = useState<UIType>(uiType0);
  const [name,           setName]           = useState(promo?.name               ?? "");
  const [couponCode,     setCouponCode]     = useState(promo?.couponCode         ?? "");
  const [discountOn,     setDiscountOn]     = useState<DiscountOn>(discountOn0);
  const [discountValue,  setDiscountValue]  = useState(promo ? String(parseFloat(promo.discountValue)) : "");
  const [applyOn,        setApplyOn]        = useState<ApplyOn>(applyOn0);
  const [minQty,         setMinQty]         = useState(promo?.triggerQty ? String(promo.triggerQty) : "");
  const [minOrderAmount, setMinOrderAmount] = useState(promo?.minOrderAmount ? String(parseFloat(promo.minOrderAmount)) : "");
  const [active,         setActive]         = useState(promo?.status === "ACTIVE" ? true : false);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");

  const isPromotion = promoType === "Promotion";
  const isOrderBased = isPromotion && applyOn === "Order";

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const apiType = mapToApiType(promoType, discountOn, applyOn);
      const payload = {
        name: name.trim(),
        type: apiType,
        status: active ? "ACTIVE" as const : "INACTIVE" as const,
        discountValue: parseFloat(discountValue) || 0,
        couponCode: promoType === "Coupon" ? couponCode.trim() || undefined : undefined,
        minOrderAmount: isOrderBased ? (parseFloat(minOrderAmount) || undefined) : undefined,
        triggerQty: (!isOrderBased && isPromotion) ? (parseInt(minQty) || undefined) : undefined,
      };

      let saved: Promotion;
      if (promo) {
        const { type: _, ...patch } = payload as any;
        saved = await updatePromotion(promo.publicId, patch);
      } else {
        saved = await createPromotion(payload);
      }
      onSave(saved);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

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
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className={`grid gap-3 ${promoType === "Coupon" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Promotion Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Sale"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
            </div>
            {promoType === "Coupon" && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Coupon Code</label>
                <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="SUMMER20"
                  className="w-full px-3 py-2 text-sm border border-[#714B67]/40 bg-[#714B67]/5 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
              <select value={promoType} onChange={e => setPromoType(e.target.value as UIType)}
                disabled={!!promo}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] bg-white text-[#121B35] disabled:opacity-60">
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
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">
                    {isOrderBased ? "Order ≥ ₹" : "Min Qty"}
                  </label>
                  <input value={isOrderBased ? minOrderAmount : minQty}
                    onChange={e => isOrderBased ? setMinOrderAmount(e.target.value) : setMinQty(e.target.value)}
                    placeholder={isOrderBased ? "500" : "3"} type="number"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Discount %</label>
                  <input value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                    placeholder="30" type="number"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35]" />
                </div>
              </>
            )}
          </div>

          {promoType === "Coupon" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Coupon Promotion</label>
              <div className="grid grid-cols-2 gap-2">
                <div onClick={() => setDiscountOn("%")}
                  className={`p-2.5 border-2 rounded-xl text-center cursor-pointer transition
                    ${discountOn === "%" ? "border-[#714B67] bg-[#714B67]/5" : "border-gray-200 hover:border-[#714B67]/40"}`}>
                  <Percent className="w-4 h-4 text-[#714B67] mx-auto mb-1" />
                  <p className="text-xs font-semibold text-[#714B67]">% Discount</p>
                </div>
                <div onClick={() => setDiscountOn("Fixed")}
                  className={`p-2.5 border-2 rounded-xl text-center cursor-pointer transition
                    ${discountOn === "Fixed" ? "border-[#714B67] bg-[#714B67]/5" : "border-gray-200 hover:border-[#714B67]/40"}`}>
                  <Hash className="w-4 h-4 text-[#714B67] mx-auto mb-1" />
                  <p className="text-xs font-semibold text-[#714B67]">Fixed Amount</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-500">Activate</label>
            <button onClick={() => setActive(a => !a)}
              className="relative inline-flex items-center rounded-full transition-colors shrink-0"
              style={{ width: 34, height: 18, backgroundColor: active ? "#714B67" : "#d1d5db" }}>
              <span className="absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all"
                style={{ left: active ? 16 : 2 }} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">Discard</button>
          <button onClick={handleSave} disabled={saving}
            className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Coupons() {
  const navItems = useNavItems();
  const [promos,  setPromos]  = useState<Promotion[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null | "new">(null);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const loadPromos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPromotions({ pageSize: 200 });
      setPromos(data);
    } catch {
      setError("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPromos(); }, [loadPromos]);

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

  async function handleToggle(promo: Promotion) {
    try {
      const updated = await togglePromotion(promo.publicId);
      setPromos(prev => prev.map(p => p.publicId === updated.publicId ? updated : p));
    } catch { /* ignore */ }
  }

  async function handleDelete(publicId: string) {
    try {
      await deletePromotion(publicId);
      setPromos(prev => prev.filter(p => p.publicId !== publicId));
    } catch { /* ignore */ }
  }

  function handleSave(saved: Promotion) {
    setPromos(prev => {
      const exists = prev.find(p => p.publicId === saved.publicId);
      return exists ? prev.map(p => p.publicId === saved.publicId ? saved : p) : [...prev, saved];
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <img src="/logo.svg" alt="RestoPOS" className="h-7 shrink-0" />
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

      <div className="flex-1 p-3 sm:p-6">
        <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-gray-100 flex-wrap">
            <button onClick={() => setEditing("new")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition shrink-0">
              <Plus className="w-3.5 h-3.5" />New
            </button>
            <div className="relative flex-1 min-w-[140px]">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search promotions…"
                className="w-full pl-3 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] focus:bg-white transition placeholder:text-gray-300 text-[#121B35]" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-8 pl-3" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Discount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…
                  </td></tr>
                ) : error ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-red-400">
                    <AlertCircle className="w-5 h-5 mx-auto mb-2" />{error}
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No promotions found</td></tr>
                ) : (
                  filtered.map(p => {
                    const isActive = p.status === "ACTIVE";
                    const isCoupon = p.type === "COUPON_PERCENTAGE" || p.type === "COUPON_FIXED";
                    return (
                      <tr key={p.publicId} className="hover:bg-gray-50/70 transition group">
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
                            ${isCoupon ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {isCoupon ? "Coupon" : "Auto Promo"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 font-mono">
                          {p.couponCode ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-gray-700">
                          {p.type === "COUPON_PERCENTAGE" || p.type === "AUTO_PRODUCT_QTY" || p.type === "AUTO_ORDER_AMOUNT"
                            ? `${parseFloat(p.discountValue)}%`
                            : `₹${parseFloat(p.discountValue)}`}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button onClick={() => handleToggle(p)}
                            className="relative inline-flex items-center rounded-full transition-colors"
                            style={{ width: 34, height: 18, backgroundColor: isActive ? "#714B67" : "#d1d5db" }}>
                            <span className="absolute w-3.5 h-3.5 bg-white rounded-full shadow transition-all"
                              style={{ left: isActive ? 16 : 2 }} />
                          </button>
                        </td>
                        <td className="pr-3 py-3.5 text-right">
                          <button onClick={() => handleDelete(p.publicId)}
                            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
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
