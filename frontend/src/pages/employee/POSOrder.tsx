import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Plus, Minus, User, Tag, Send,
  CreditCard, Smartphone, Banknote, LayoutGrid,
  LogOut, Users, Ticket, CalendarRange, ChefHat,
  BarChart3, Menu, MonitorSmartphone, ShoppingCart,
  ArrowUpFromLine, CheckCircle, Loader2,
  AlertCircle, BadgeCheck,
  Mail,
  Phone, MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ROUTES } from "../../routes/paths";
import { useNavItems } from "../../hooks/useNavItems";
import { fetchFloors, type Floor, type Table } from "../../api/floors";
import {
  listPaymentMethods,
  createPaymentOrder,
  processCashPayment,
  processCardPayment,
  initiateCashfreePayment,
  type PaymentMethod,
  type PaymentMethodType,
} from "../../api/payments";
import { listCategories, listProducts, type Category, type Product } from "../../api/products";
import {
  createOrder, addItemToOrder, updateOrderItem, removeOrderItem, getOrder,
  sendToKitchen, attachCustomer,
  applyCoupon as applyCouponApi, findOrderItemForProduct, type Order,
} from "../../api/orders";

interface CartItem {
  id: string;           // product publicId
  orderItemId?: string; // order item publicId (set once synced to backend)
  name: string;
  unitPrice: number;
  qty: number;
  productDiscount?: number;
}

const NAV_ITEMS_PLACEHOLDER = null; // replaced by useNavItems hook

type MobileTab = "products" | "cart" | "payment";

// ── Receipt Email Popup ─────────────────────────────────────────
function ReceiptEmailModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent,  setSent]  = useState(false);

  function handleSend() {
    if (!email.trim()) return;
    setSent(true);
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>Send Receipt via Email</h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {sent ? (
            <div className="flex flex-col items-center gap-2 py-3">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-600">Receipt sent!</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">Enter customer email to send the receipt.</p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input autoFocus value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="customer@email.com" type="email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
              </div>
              <button onClick={handleSend}
                className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-2.5 rounded-xl transition shadow-sm">
                Send Receipt
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Promotion Selector Popup ────────────────────────────────────
interface AutoPromo { code: string; label: string; pct: number }

function PromotionSelectorModal({
  promotions,
  onClose,
  onApply,
}: {
  promotions: AutoPromo[];
  onClose: () => void;
  onApply: (promo: AutoPromo) => void;
}) {
  const [selected, setSelected] = useState(promotions[0]?.code ?? "");

  function handleEnter() {
    const promo = promotions.find(p => p.code === selected);
    if (promo) { onApply(promo); onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>Coupon Code</h3>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 space-y-2">
          <p className="text-xs text-gray-400 mb-3">Multiple promotions qualify. Select one to apply on order:</p>
          {promotions.map(promo => (
            <label key={promo.code}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition
                ${selected === promo.code
                  ? "border-[#714B67] bg-[#714B67]/5"
                  : "border-gray-200 hover:border-gray-300"}`}>
              <input type="radio" name="promo" value={promo.code}
                checked={selected === promo.code}
                onChange={() => setSelected(promo.code)}
                className="accent-[#714B67] shrink-0" />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#121B35" }}>{promo.label}</p>
                <p className="text-xs text-gray-400">{promo.pct}% off entire order</p>
              </div>
              {selected === promo.code && (
                <span className="ml-auto text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="px-5 pb-5 pt-2">
          <button onClick={handleEnter}
            className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-2.5 rounded-xl transition shadow-sm">
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
function CouponModal({
  onClose,
  onApply,
  orderId,
}: {
  onClose: () => void;
  onApply: (code: string, discountAmount: number, order: Order) => void;
  orderId?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEnter() {
    const upper = code.trim().toUpperCase();
    if (!upper) { setError("Please enter a coupon code."); return; }
    if (!orderId) {
      setError("Add at least one item to the cart before applying a coupon.");
      return;
    }
    setLoading(true);
    try {
      const updatedOrder = await applyCouponApi(orderId, upper);
      const discount = parseFloat(updatedOrder.discountAmount ?? "0");
      onApply(upper, discount, updatedOrder);
      onClose();
    } catch (e: any) {
      const reason = e?.response?.data?.error?.code ?? "";
      const msg =
        reason === "COUPON_NOT_FOUND" ? "Coupon code not found." :
        reason === "COUPON_INACTIVE"  ? "This coupon is inactive." :
        reason === "COUPON_EXPIRED"   ? "This coupon has expired." :
        reason === "COUPON_MAX_USES_REACHED" ? "Coupon usage limit reached." :
        reason === "COUPON_NOT_ELIGIBLE" ? "Order doesn't meet the minimum amount." :
        e?.response?.data?.error?.message ?? "Invalid coupon code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
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
          <p className="text-[10px] text-gray-400">Enter a valid coupon code</p>
        </div>
        {/* CTA */}
        <div className="px-5 pb-5">
          <button
            onClick={handleEnter}
            disabled={loading}
            className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Table Selector Modal ────────────────────────────────────────
function TableSelectorModal({
  onClose,
  onSelect,
  selectedTable,
}: {
  onClose: () => void;
  onSelect: (floor: Floor | null, table: Table | null) => void;
  selectedTable: { floor: string; table: string } | null;
}) {
  const [floors, setFloors]           = useState<Floor[]>([]);
  const [activeFloor, setActiveFloor] = useState<Floor | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetchFloors()
      .then(data => {
        setFloors(data);
        if (data.length > 0) setActiveFloor(data[0]);
      })
      .catch(() => {/* swallow — show empty state */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-[#714B67]" />
            <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>Select Table</h3>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading floors…</p>
          ) : floors.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No floors configured.</p>
          ) : (
            <>
              {/* Floor tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {floors.map(floor => (
                  <button key={floor.publicId} onClick={() => setActiveFloor(floor)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition
                      ${activeFloor?.publicId === floor.publicId
                        ? "bg-[#714B67] text-white border-[#714B67]"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    <MapPin className="w-3 h-3" />
                    {floor.name}
                  </button>
                ))}
              </div>

              {/* Table grid */}
              {activeFloor && (
                <div className="grid grid-cols-4 gap-2">
                  {activeFloor.tables.map(table => {
                    const isSelected =
                      selectedTable?.floor === activeFloor.publicId &&
                      selectedTable?.table === table.publicId;
                    return (
                      <button
                        key={table.publicId}
                        onClick={() => { onSelect(activeFloor, table); onClose(); }}
                        className={`
                          aspect-square rounded-xl text-sm font-bold transition
                          flex items-center justify-center min-h-[48px] border-2
                          ${isSelected
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                            : table.isOccupied
                              ? "bg-[#714B67] text-white border-[#714B67] hover:bg-[#5d3d55]"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200 hover:border-gray-300"
                          }`}>
                        {table.tableNumber}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" />
                  <span className="text-xs text-gray-400">Free</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#714B67]" />
                  <span className="text-xs text-gray-400">Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-xs text-gray-400">Selected</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer — clear selection */}
        {selectedTable && (
          <div className="border-t border-gray-100 px-5 py-3">
            <button
              onClick={() => { onSelect(null, null); onClose(); }}
              className="text-xs text-red-400 hover:text-red-600 font-semibold transition">
              Clear table assignment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Customer Select Modal ───────────────────────────────────────
interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

function CustomerSelectModal({
  onClose,
  onSelect,
  selectedCustomer,
}: {
  onClose: () => void;
  onSelect: (c: CustomerOption | null) => void;
  selectedCustomer: CustomerOption | null;
}) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");

  function loadCustomers() {
    import("../../api/customers").then(({ fetchCustomers }) => {
      fetchCustomers({ pageSize: 200 }).then(data => {
        setCustomers(data.map(c => ({
          id: c.publicId,
          name: c.name,
          email: c.email ?? "",
          phone: c.phone ?? "",
        })));
      }).catch(() => {});
    });
  }

  useEffect(() => { loadCustomers(); }, []);

  const filtered = customers.filter(c => {
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
  });

  async function handleAddCustomer() {
    if (!newName.trim()) { setAddError("Name is required."); return; }
    setSaving(true);
    setAddError("");
    try {
      const { createCustomer } = await import("../../api/customers");
      const created = await createCustomer({
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
      });
      const opt: CustomerOption = {
        id: created.publicId,
        name: created.name,
        email: created.email ?? "",
        phone: created.phone ?? "",
      };
      setCustomers(prev => [opt, ...prev]);
      onSelect(opt);
      onClose();
    } catch (e: any) {
      setAddError(e?.response?.data?.error?.message ?? "Failed to create customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#714B67]" />
            <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>
              {adding ? "Add New Customer" : "Select Customer"}
            </h3>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {adding ? (
          /* ── Add new customer form ── */
          <div className="px-5 py-4 space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                value={newName}
                onChange={e => { setNewName(e.target.value); setAddError(""); }}
                placeholder="Full name *"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition placeholder:text-gray-300 text-[#121B35]"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="Phone number"
                type="tel"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition placeholder:text-gray-300 text-[#121B35]"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddCustomer()}
                placeholder="Email address"
                type="email"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition placeholder:text-gray-300 text-[#121B35]"
              />
            </div>
            {addError && <p className="text-xs text-red-500">{addError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setAdding(false); setAddError(""); }}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Back
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-bold bg-[#714B67] hover:bg-[#5d3d55] text-white rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save & Select
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, email, phone…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition placeholder:text-gray-300 text-[#121B35]"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 px-2 pb-2">
              {/* Add new — always visible at top when searching */}
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#714B67]/5 transition group">
                <div className="w-9 h-9 rounded-full bg-[#714B67]/10 flex items-center justify-center shrink-0 group-hover:bg-[#714B67]/20 transition">
                  <Plus className="w-4 h-4 text-[#714B67]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#714B67]">Add new customer</p>
                  {query && (
                    <p className="text-xs text-gray-400">Create "{query}"</p>
                  )}
                </div>
              </button>

              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No customers found</p>
              ) : (
                filtered.map(c => {
                  const isSelected = selectedCustomer?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { onSelect(c); onClose(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition
                        ${isSelected ? "bg-[#714B67]/5 border border-[#714B67]/20" : "hover:bg-gray-50"}`}>
                      <div className="w-9 h-9 rounded-full bg-[#714B67]/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#714B67]">{c.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#121B35] truncate">{c.name}</p>
                        {c.email && (
                          <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                            <Mail className="w-3 h-3 shrink-0" />{c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="w-3 h-3 shrink-0" />{c.phone}
                          </span>
                        )}
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-[#714B67] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
              {selectedCustomer ? (
                <button
                  onClick={() => { onSelect(null); onClose(); }}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold transition">
                  Remove customer
                </button>
              ) : (
                <span className="text-xs text-gray-400">No customer attached</span>
              )}
              <button onClick={onClose}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function POSOrder() {
  const navItems = useNavItems();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("products");

  // Active order created eagerly when first item is added
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Products & categories from API
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Coupon state — discountAmount comes from backend after successful apply
  const [couponOpen, setCouponOpen]     = useState(false);
  const [promoOpen,  setPromoOpen]      = useState(false);
  const [receiptOpen, setReceiptOpen]   = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [orderTotals, setOrderTotals] = useState<{
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  } | null>(null);
  // Table selector
  const [tableOpen, setTableOpen]       = useState(false);
  const [selectedTable, setSelectedTable] = useState<{ floor: string; floorName: string; table: string; tableNumber: string } | null>(null);
  // Customer selector
  const [customerOpen, setCustomerOpen] = useState(false);
  const [attachedCustomer, setAttachedCustomer] = useState<CustomerOption | null>(null);
    // Payment API state
  const [payMethods, setPayMethods] = useState<PaymentMethod[]>([]);
  const [payMethodsLoading, setPayMethodsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [processingPay, setProcessingPay] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [cardRef, setCardRef] = useState("");
  const [paySuccess, setPaySuccess] = useState<{ change?: number } | null>(null);
  const [cashfreeSession, setCashfreeSession] = useState<{ sessionId: string; env: string; orderId: string } | null>(null);
  const [sendingToKitchen, setSendingToKitchen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Auto promos placeholder (future: fetch from /coupons/eligible/:orderId)
  const AUTO_PROMOS: AutoPromo[] = [];

  function applyLocalCoupon(code: string, discountAmount: number, order?: Order) {
    setAppliedCoupon({ code, discountAmount });
    if (order) syncOrderFromBackend(order);
  }

  function syncOrderFromBackend(order: Order) {
    setOrderTotals({
      subtotal: parseFloat(order.subtotal),
      tax: parseFloat(order.taxAmount),
      discount: parseFloat(order.discountAmount),
      total: parseFloat(order.grandTotal),
    });
    const discount = parseFloat(order.discountAmount);
    setAppliedCoupon(prev =>
      prev && discount > 0 ? { ...prev, discountAmount: discount } : prev,
    );
    if (order.items?.length) {
      setCart(prev =>
        prev.map(cartItem => {
          const backendItem = findOrderItemForProduct(order, cartItem.id);
          if (!backendItem) return cartItem;
          return {
            ...cartItem,
            orderItemId: backendItem.publicId,
            qty: backendItem.quantity,
            unitPrice: parseFloat(backendItem.unitPrice),
            name: backendItem.productName,
          };
        }),
      );
    }
  }

  // Load enabled payment methods on mount
  const loadPayMethods = useCallback(async () => {
    try {
      const methods = await listPaymentMethods({ isEnabled: true });
      setPayMethods(methods);
      if (methods.length > 0) setSelectedMethod(methods[0]);
    } catch {
      toast.error("Failed to load payment methods");
    } finally {
      setPayMethodsLoading(false);
    }
  }, []);

  // Handle checkout — create real order from cart, then process payment
  async function handleValidate() {
    if (!selectedMethod || cart.length === 0) return;
    setProcessingPay(true);
    try {
      // Step 1: Reuse existing order if already created, otherwise create one now
      toast.loading("Preparing order…", { id: "checkout" });
      let orderId = activeOrderId;
      if (!orderId) {
        const newOrder = await createOrder({ type: "TAKEAWAY", source: "POS" });
        orderId = newOrder.publicId;
        setActiveOrderId(orderId);
        // Items are always synced eagerly in addToCart, nothing to re-add here
      }

      toast.loading("Processing payment…", { id: "checkout" });

      // Step 2: Create payment transaction
      const txn = await createPaymentOrder(orderId, selectedMethod.publicId);

      // Step 3: Process by payment type
      if (selectedMethod.type === "CASH") {
        const received = parseFloat(cashReceived);
        if (!cashReceived || isNaN(received)) {
          toast.error("Enter cash received amount");
          setProcessingPay(false);
          return;
        }
        const result = await processCashPayment(orderId, txn.transactionId, received);
        await sendToKitchen(orderId).catch(() => {});
        setPaySuccess({ change: result.change });
        toast.success(`Payment successful! Change: ₹${result.change}`, { id: "checkout" });
        setCart([]);
        setActiveOrderId(null);
        setAppliedCoupon(null);
        setOrderTotals(null);
      } else if (selectedMethod.type === "CARD") {
        if (!cardRef.trim()) {
          toast.error("Enter card transaction reference");
          setProcessingPay(false);
          return;
        }
        await processCardPayment(orderId, txn.transactionId, cardRef.trim());
        await sendToKitchen(orderId).catch(() => {});
        setPaySuccess({});
        toast.success("Card payment successful!", { id: "checkout" });
        setCart([]);
        setActiveOrderId(null);
        setAppliedCoupon(null);
        setOrderTotals(null);
      } else if (selectedMethod.type === "CASHFREE") {
        const cfResult = await initiateCashfreePayment(orderId, txn.transactionId);
        setCashfreeSession({
          sessionId: cfResult.paymentSessionId,
          env: cfResult.environment,
          orderId: orderId,
        });
        toast.dismiss("checkout");

        // Open Cashfree payment window
        const { load } = await import("@cashfreepayments/cashfree-js");
        const cashfree = await load({
          mode: cfResult.environment === "PRODUCTION" ? "production" : "sandbox",
        });

        cashfree.checkout({
          paymentSessionId: cfResult.paymentSessionId,
          redirectTarget: "_modal",
        }).then(async (result: any) => {
          if (result.error) {
            toast.error(result.error.message ?? "Payment failed");
            setCashfreeSession(null);
          } else if (result.paymentDetails) {
            await sendToKitchen(orderId!).catch(() => {});
            setPaySuccess({});
            setCashfreeSession(null);
            setCart([]);
            setActiveOrderId(null);
            setAppliedCoupon(null);
            setOrderTotals(null);
            toast.success("Cashfree payment successful!");
          }
        });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? "Payment failed";
      toast.error(msg, { id: "checkout" });
    } finally {
      setProcessingPay(false);
    }
  }

  // Icon per payment type
  function MethodIcon({ type, className }: { type: PaymentMethodType; className?: string }) {
    if (type === "CASH") return <Banknote className={className} />;
    if (type === "CARD") return <CreditCard className={className} />;
    if (type === "CASHFREE") return <Smartphone className={className} />;
    return <CreditCard className={className} />;
  }

  function applyAutoPromo(promo: AutoPromo) {
    setAppliedCoupon({ code: promo.code, discountAmount: 0 });
  }

  function handleTableSelect(floor: Floor | null, table: Table | null) {
    if (!floor?.publicId || !table?.publicId) {
      setSelectedTable(null);
      // Clear cart if table is removed
      if (activeOrderId) {
        setCart([]);
        setActiveOrderId(null);
        setAppliedCoupon(null);
        setOrderTotals(null);
      }
      return;
    }
    // If table changed while cart has items, warn and clear
    if (selectedTable && selectedTable.table !== table.publicId && cart.length > 0) {
      setCart([]);
      setActiveOrderId(null);
      setAppliedCoupon(null);
      setOrderTotals(null);
      toast.info("Cart cleared — table changed");
    }
    setSelectedTable({ floor: floor.publicId, floorName: floor.name, table: table.publicId, tableNumber: table.tableNumber });
  }

  async function handleCustomerSelect(c: CustomerOption | null) {
    setAttachedCustomer(c);
    if (activeOrderId) {
      try {
        await attachCustomer(activeOrderId, c?.id ?? null);
      } catch {
        toast.error("Failed to attach customer to order");
      }
    }
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { loadPayMethods(); }, [loadPayMethods]);

  useEffect(() => {
    async function loadProductData() {
      try {
        const [cats, prods] = await Promise.all([
          listCategories(),
          listProducts({ isAvailable: true }),
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch {
        toast.error("Failed to load products");
      } finally {
        setProductsLoading(false);
      }
    }
    loadProductData();
  }, []);

  const filtered = products.filter(p =>
    (activeCat == null || p.category?.publicId === activeCat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSendToKitchen() {
    if (!activeOrderId || cart.length === 0) return;
    setSendingToKitchen(true);
    try {
      await sendToKitchen(activeOrderId);
      toast.success("Order sent to kitchen!");
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? "Failed to send to kitchen";
      toast.error(msg);
    } finally {
      setSendingToKitchen(false);
    }
  }

  async function addToCart(p: Product) {
    // Require table selection before ordering
    if (!selectedTable) {
      toast.error("Please select a table first");
      setTableOpen(true);
      return;
    }

    // Eagerly create a real order on first item so coupon validation has an orderId
    let orderId = activeOrderId;
    if (!orderId) {
      try {
        const newOrder = await createOrder({
          type: "DINE_IN",
          source: "POS",
          tableId: selectedTable.table,
          customerId: attachedCustomer?.id,
        });
        orderId = newOrder.publicId;
        setActiveOrderId(orderId);
      } catch {
        toast.error("Failed to create order");
        return;
      }
    }

    // Check if this product already exists in the cart
    const existing = cart.find(i => i.id === p.publicId);

    if (existing) {
      try {
        const updatedOrder = existing.orderItemId
          ? await updateOrderItem(orderId, existing.orderItemId, existing.qty + 1)
          : await addItemToOrder(orderId, p.publicId, 1);
        syncOrderFromBackend(updatedOrder);
      } catch {
        toast.error("Failed to update item");
        return;
      }
    } else {
      // New item — POST to backend to get orderItemId back
      try {
        const updatedOrder = await addItemToOrder(orderId, p.publicId, 1);
        syncOrderFromBackend(updatedOrder);
        const backendItem = findOrderItemForProduct(updatedOrder, p.publicId);
        setCart(prev => [
          ...prev,
          {
            id: p.publicId,
            orderItemId: backendItem?.publicId,
            name: p.name,
            unitPrice: parseFloat(p.price),
            qty: backendItem?.quantity ?? 1,
          },
        ]);
        setSelectedItem(p.publicId);
      } catch {
        toast.error("Failed to add item");
      }
    }
  }

  async function updateQty(id: string, delta: number) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.qty + delta);
    if (newQty === item.qty) return;

    if (activeOrderId) {
      try {
        let updatedOrder: Order;
        if (item.orderItemId) {
          updatedOrder = await updateOrderItem(activeOrderId, item.orderItemId, newQty);
        } else {
          const order = await getOrder(activeOrderId);
          const backendItem = findOrderItemForProduct(order, id);
          if (backendItem) {
            updatedOrder = await updateOrderItem(activeOrderId, backendItem.publicId, newQty);
          } else {
            updatedOrder = await addItemToOrder(activeOrderId, id, newQty);
          }
        }
        syncOrderFromBackend(updatedOrder);
      } catch {
        toast.error("Failed to update quantity");
        return;
      }
    } else {
      setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i));
    }
  }

  async function removeItem(id: string) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (activeOrderId) {
      try {
        let itemId = item.orderItemId;
        if (!itemId) {
          const order = await getOrder(activeOrderId);
          itemId = findOrderItemForProduct(order, id)?.publicId;
        }
        if (itemId) {
          const updatedOrder = await removeOrderItem(activeOrderId, itemId);
          syncOrderFromBackend(updatedOrder);
        }
      } catch {
        toast.error("Failed to remove item");
        return;
      }
    }
    setCart(prev => prev.filter(i => i.id !== id));
    if (selectedItem === id) setSelectedItem(null);
  }

  const localSubtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const subtotal = orderTotals?.subtotal ?? localSubtotal;
  const tax = orderTotals?.tax ?? Math.round(localSubtotal * 0.05);
  const orderDiscount = orderTotals?.discount ?? (appliedCoupon ? appliedCoupon.discountAmount : 0);
  const total = orderTotals?.total ?? (localSubtotal + tax - orderDiscount);

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
        {categories.map(cat => (
          <button key={cat.publicId} onClick={() => setActiveCat(activeCat === cat.publicId ? null : cat.publicId)}
            className={`text-xs font-semibold py-2 rounded-lg transition
              ${activeCat === cat.publicId ? "bg-[#714B67] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {cat.name}
          </button>
        ))}
      </div>
      {/* Product grid */}
      <div className="flex-1 p-2 sm:p-3 overflow-y-auto">
        {!selectedTable ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <MonitorSmartphone className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-400">Select a table to start ordering</p>
            <button
              onClick={() => setTableOpen(true)}
              className="px-4 py-2 bg-[#714B67] text-white text-xs font-bold rounded-xl hover:bg-[#5d3d55] transition">
              Select Table
            </button>
          </div>
        ) : productsLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map(p => (
              <button key={p.publicId} onClick={() => addToCart(p)}
                className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-3 text-left hover:border-[#714B67]/50 hover:shadow-sm transition">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.category?.color ?? "#4caf50" }} />
                  <span className="text-xs font-medium text-[#121B35] truncate">{p.name}</span>
                </div>
                <span className="text-xs text-gray-500">₹{parseFloat(p.price).toFixed(0)}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-3 text-center text-sm text-gray-400 py-8">No products found</p>
            )}
          </div>
        )}
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
            const discAmt = item.productDiscount
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
        <button
          onClick={handleSendToKitchen}
          disabled={cart.length === 0 || !activeOrderId || sendingToKitchen}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
          {sendingToKitchen
            ? <Loader2 className="w-4 h-4 text-[#714B67] animate-spin" />
            : <ChefHat className="w-4 h-4 text-[#714B67]" />}
          Send to Kitchen
        </button>
      </div>

      {/* Action row */}
      <div className="flex gap-1.5 px-3 pb-2 shrink-0">
        <button
          onClick={() => setCustomerOpen(true)}
          className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-lg border transition
            ${attachedCustomer
              ? "bg-[#714B67]/5 border-[#714B67]/20 text-[#714B67]"
              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
          <User className="w-3 h-3" />
          <span className="hidden sm:inline truncate max-w-[60px]">
            {attachedCustomer ? attachedCustomer.name : "Customer"}
          </span>
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
        <button className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
          onClick={() => setReceiptOpen(true)}>
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
              Discount ({appliedCoupon.code})
              <button onClick={() => setAppliedCoupon(null)} className="text-gray-400 hover:text-red-400 ml-1">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
            <span className="text-emerald-600 font-semibold">−₹{orderDiscount.toFixed(2)}</span>
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
      {payMethodsLoading ? (
        <div className="flex items-center justify-center flex-1 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading payment methods...
        </div>
      ) : !payMethods || payMethods.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="text-sm">No payment methods available</p>
        </div>
      ) : (
        <>
          {/* Active method header */}
          {selectedMethod && (
            <div className="bg-[#714B67] px-4 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white">
                <MethodIcon type={selectedMethod.type} className="w-4 h-4" />
                <span className="text-sm font-semibold">{selectedMethod.name}</span>
              </div>
              <button className="text-white/70 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Other payment methods */}
          <div className="border-b border-gray-100 shrink-0">
            {payMethods?.filter(m => m.publicId !== selectedMethod?.publicId).map(method => (
              <button
                key={method.publicId}
                onClick={() => setSelectedMethod(method)}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition"
              >
                <MethodIcon type={method.type} className="w-4 h-4 text-gray-400" />
                {method.name}
              </button>
            ))}
          </div>
          {/* Amount */}
          <div className="flex flex-col items-center justify-center py-3 shrink-0">
            <p className="text-xs text-gray-400 mb-0.5">Amount</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#121B35] leading-none">₹{total}</p>
            {selectedMethod && (
              <p className="text-[10px] text-[#714B67] mt-1 font-semibold uppercase tracking-widest">
                {selectedMethod.name}
              </p>
            )}
          </div>
        </>
      )}

      {/* Payment type-specific inputs */}
      {selectedMethod && !paySuccess && (
        <div className="flex-1 flex flex-col px-3 pb-3 gap-3 overflow-y-auto">
          {selectedMethod.type === "CASH" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                Cash Received
              </label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="Enter amount received"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition"
              />
              {cashReceived && !isNaN(parseFloat(cashReceived)) && (
                <p className="text-xs text-gray-500 mt-1">
                  Change: ₹{Math.max(0, parseFloat(cashReceived) - total)}
                </p>
              )}
            </div>
          )}

          {selectedMethod.type === "CARD" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                Card Transaction Reference
              </label>
              <input
                type="text"
                value={cardRef}
                onChange={(e) => setCardRef(e.target.value)}
                placeholder="Enter card ref/approval code"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition"
              />
            </div>
          )}

          {selectedMethod.type === "CASHFREE" && (
            <div className="space-y-3">
              {cashfreeSession ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center space-y-3">
                  <Smartphone className="w-8 h-8 mx-auto text-blue-500" />
                  <p className="text-sm font-semibold text-blue-800">Cashfree Payment Ready</p>
                  <p className="text-xs text-blue-600">
                    Environment: <span className="font-bold">{cashfreeSession.env}</span>
                  </p>
                  <div className="bg-white rounded-lg p-2 border border-blue-100">
                    <p className="text-[10px] text-gray-400 mb-1">Payment Session ID</p>
                    <p className="text-xs font-mono text-gray-700 break-all">{cashfreeSession.sessionId}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use the Cashfree SDK or share this session ID with the customer device to complete payment.
                  </p>
                  <button
                    onClick={() => setCashfreeSession(null)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Cancel & try again
                  </button>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-4">
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-[#714B67]" />
                  <p>Click Validate to initiate Cashfree payment</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleValidate}
            disabled={processingPay || cart.length === 0 || (selectedMethod.type === "CASHFREE" && !!cashfreeSession)}
            className="mt-auto w-full bg-[#714B67] hover:bg-[#5d3d55] text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm shrink-0 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processingPay ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Validate · ₹{total}</>
            )}
          </button>
        </div>
      )}

      {/* Payment success state */}
      {paySuccess && (
        <div className="flex-1 flex flex-col items-center justify-center px-3 pb-3 text-center">
          <BadgeCheck className="w-16 h-16 text-green-500 mb-4" />
          <p className="text-lg font-bold text-[#121B35] mb-2">Payment Successful!</p>
          {paySuccess.change !== undefined && (
            <p className="text-sm text-gray-500 mb-4">Change: ₹{paySuccess.change}</p>
          )}
          <button
            onClick={() => {
              setPaySuccess(null);
              setCashReceived("");
              setCardRef("");
              setCashfreeSession(null);
            }}
            className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
          >
            New Order
          </button>
        </div>
      )}
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
          {/* Orders list */}
          <Link to={ROUTES.ORDERS} title="Orders"
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <ShoppingCart className="w-4 h-4" />
          </Link>
          {/* Table selector — opens inline popup */}
          <button
            onClick={() => setTableOpen(true)}
            title="Select Table"
            className={`p-2 rounded-lg transition ${selectedTable ? "text-[#714B67] bg-[#714B67]/10" : "text-gray-400 hover:text-[#714B67] hover:bg-gray-50"}`}>
            <MonitorSmartphone className="w-4 h-4" />
          </button>
          {/* Close session */}
          <Link to={ROUTES.POS_SESSION} title="Close Session"
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <ArrowUpFromLine className="w-4 h-4" />
          </Link>
        </div>

        {/* Session / table badge */}
        <div className="hidden md:flex bg-[#714B67]/10 text-[#714B67] text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap items-center gap-1.5">
          {selectedTable ? (
            <>
              <MonitorSmartphone className="w-3 h-3" />
              {selectedTable.floorName} · T{selectedTable.tableNumber}
            </>
          ) : (
            "Jubilant Shark · 12 V"
          )}
        </div>

        <div className="flex-1" />

        {/* Customer selector — opens inline popup */}
        <button
          onClick={() => setCustomerOpen(true)}
          title={attachedCustomer ? `Customer: ${attachedCustomer.name}` : "Attach Customer"}
          className={`p-2 rounded-lg transition ${attachedCustomer ? "text-[#714B67] bg-[#714B67]/10" : "text-gray-400 hover:text-[#714B67] hover:bg-gray-50"}`}>
          <User className="w-4 h-4" />
        </button>

        <div className="relative" ref={navRef}>
          <button onClick={() => setNavOpen(!navOpen)}
            className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
            <Menu className="w-4 h-4" />
          </button>
          {navOpen && (
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-52 py-1">
              {navItems.map(({ label, icon: Icon, to }) => (
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
          {mobileTab === "cart" && CartPane}
          {mobileTab === "payment" && PaymentPane}
        </div>
        {/* Tab bar */}
        <div className="h-12 bg-white border-t border-gray-200 flex shrink-0">
          {([
            { key: "products", icon: LayoutGrid, label: "Products" },
            { key: "cart", icon: ShoppingCart, label: `Cart${cart.length ? ` (${cart.length})` : ""}` },
            { key: "payment", icon: CreditCard, label: "Payment" },
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
        {[["38%", "PRODUCT"], ["32%", "CART"], ["30%", "PAYMENT"]].map(([w, label]) => (
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
          onApply={applyLocalCoupon}
          orderId={activeOrderId ?? undefined}
        />
      )}

      {/* ── PROMOTION SELECTOR MODAL ── */}
      {promoOpen && (
        <PromotionSelectorModal
          promotions={AUTO_PROMOS}
          onClose={() => setPromoOpen(false)}
          onApply={applyAutoPromo}
        />
      )}

      {/* ── RECEIPT EMAIL MODAL ── */}
      {receiptOpen && (
        <ReceiptEmailModal onClose={() => setReceiptOpen(false)} />
      )}

      {/* ── TABLE SELECTOR MODAL ── */}
      {tableOpen && (
        <TableSelectorModal
          selectedTable={selectedTable ? { floor: selectedTable.floor, table: selectedTable.table } : null}
          onClose={() => setTableOpen(false)}
          onSelect={handleTableSelect}
        />
      )}

      {/* ── CUSTOMER SELECT MODAL ── */}
      {customerOpen && (
        <CustomerSelectModal
          selectedCustomer={attachedCustomer}
          onClose={() => setCustomerOpen(false)}
          onSelect={handleCustomerSelect}
        />
      )}
    </div>
  );
}
