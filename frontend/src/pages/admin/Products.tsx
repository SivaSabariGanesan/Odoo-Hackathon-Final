import { useState, useRef, useEffect } from "react";
import {
  Search, Plus, Trash2, Archive, X,
  User, Menu, MonitorSmartphone, ShoppingCart,
  ArrowUpFromLine, LayoutGrid, Tag, CreditCard,
  Ticket, CalendarRange, Users, ChefHat, BarChart3, LogOut,
  Pencil, Check, GripVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

interface Category { id: string; name: string; color: string }
interface Product {
  id: string; name: string; categoryId: string;
  price: number; tax: number; archived: boolean; description: string;
}

const INIT_CATEGORIES: Category[] = [
  { id: "c1", name: "Food",  color: "#4caf50" },
  { id: "c2", name: "Drink", color: "#2196f3" },
  { id: "c3", name: "Snack", color: "#ff9800" },
];

const INIT_PRODUCTS: Product[] = [
  { id: "1", name: "Masala Tea", categoryId: "c1", price: 65, tax: 5, archived: false, description: "" },
  { id: "2", name: "Coffee",     categoryId: "c2", price: 65, tax: 5, archived: false, description: "" },
  { id: "3", name: "Lassi",      categoryId: "c2", price: 65, tax: 5, archived: false, description: "" },
  { id: "4", name: "Masala Tea", categoryId: "c1", price: 65, tax: 5, archived: false, description: "" },
  { id: "5", name: "Coffee",     categoryId: "c2", price: 65, tax: 5, archived: false, description: "" },
  { id: "6", name: "Lassi",      categoryId: "c2", price: 65, tax: 5, archived: false, description: "" },
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

const COLOR_PALETTE = ["#4caf50","#2196f3","#ff9800","#e91e63","#9c27b0","#00bcd4","#714B67","#f44336"];

// ── Quick Category Create popup ──────────────────────────────────
function QuickCategoryModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (cat: Category) => void;
}) {
  const [name,  setName]  = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ id: crypto.randomUUID(), name: name.trim(), color });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>Category</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Product Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Food"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#121B35" : "transparent",
                    boxShadow: color === c ? "0 0 0 2px white, 0 0 0 3px #714B67" : "none",
                  }} />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
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

// ── Product Create / Edit Form ───────────────────────────────────
function ProductForm({
  product,
  categories,
  onClose,
  onSave,
  onCategoryCreated,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (p: Product) => void;
  onCategoryCreated: (cat: Category) => void;
}) {
  const [name,        setName]        = useState(product?.name        ?? "");
  const [categoryId,  setCategoryId]  = useState(product?.categoryId  ?? (categories[0]?.id ?? ""));
  const [price,       setPrice]       = useState(String(product?.price ?? ""));
  const [tax,         setTax]         = useState(String(product?.tax   ?? "5"));
  const [description, setDescription] = useState(product?.description ?? "");
  const [catPopup,    setCatPopup]    = useState(false);
  const [catDropdown, setCatDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setCatDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const activeCat = categories.find(c => c.id === categoryId);

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id:          product?.id ?? crypto.randomUUID(),
      name:        name.trim(),
      categoryId,
      price:       parseFloat(price) || 0,
      tax:         parseFloat(tax)   || 0,
      archived:    product?.archived ?? false,
      description: description.trim(),
    });
    onClose();
  }

  function handleCategoryCreated(cat: Category) {
    onCategoryCreated(cat);
    setCategoryId(cat.id);
    setCatPopup(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold" style={{ color: "#121B35" }}>
              {product ? "Edit Product" : "Product Form"}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Product Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Masala Tea"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300" />
            </div>

            {/* Category + Price row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Category custom dropdown */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                <div className="relative" ref={dropRef}>
                  <button onClick={() => setCatDropdown(o => !o)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-left transition hover:border-[#714B67]/40 bg-white">
                    {activeCat && (
                      <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: activeCat.color }} />
                    )}
                    <span className="flex-1 truncate text-[#121B35]">{activeCat?.name ?? "Select"}</span>
                    <X className="w-3 h-3 text-gray-400 rotate-45 shrink-0" />
                  </button>
                  {catDropdown && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-full py-1 min-w-[160px]">
                      {categories.map(cat => (
                        <button key={cat.id}
                          onClick={() => { setCategoryId(cat.id); setCatDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                          <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={() => { setCatDropdown(false); setCatPopup(true); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#714B67] font-semibold hover:bg-[#714B67]/5 transition">
                          <Plus className="w-3.5 h-3.5" />Create & Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Prices: ₹</label>
                <input value={price} onChange={e => setPrice(e.target.value)} placeholder="65" type="number"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35]" />
              </div>
            </div>

            {/* Tax */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Tax: %</label>
              <select value={tax} onChange={e => setTax(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] bg-white">
                {["0","5","12","18","28"].map(t => <option key={t} value={t}>{t}%</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Product Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Add a short description…" rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] transition text-[#121B35] placeholder:text-gray-300 resize-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
            <button onClick={onClose}
              className="py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">Discard</button>
            <button onClick={handleSave}
              className="py-3 text-sm font-semibold text-[#714B67] hover:bg-[#714B67]/5 transition flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" />Save
            </button>
          </div>
        </div>
      </div>

      {catPopup && <QuickCategoryModal onClose={() => setCatPopup(false)} onSave={handleCategoryCreated} />}
    </>
  );
}

// ── Main Products Page ───────────────────────────────────────────
export default function Products() {
  const [categories, setCategories] = useState<Category[]>(INIT_CATEGORIES);
  const [products,   setProducts]   = useState<Product[]>(INIT_PRODUCTS);
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [navOpen,    setNavOpen]    = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null | "new">(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = products.filter(p =>
    !p.archived && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (categories.find(c => c.id === p.categoryId)?.name ?? "").toLowerCase().includes(search.toLowerCase())
    )
  );

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(selected.size === filtered.length && filtered.length > 0 ? new Set() : new Set(filtered.map(p => p.id)));
  }

  function handleSave(p: Product) {
    setProducts(prev => prev.find(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">

      {/* ── TOP BAR ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 z-10">
        <div className="bg-[#714B67] text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">Logo</div>
        <h1 className="text-sm font-bold" style={{ color: "#121B35" }}>Products</h1>
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
        <Link to={ROUTES.CUSTOMERS} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-gray-50 rounded-lg transition">
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
            <button onClick={() => setEditProduct("new")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#714B67]/10 hover:bg-[#714B67]/20 text-[#714B67] text-xs font-semibold rounded-lg transition shrink-0">
              <Plus className="w-3.5 h-3.5" />New
            </button>

            {selected.size > 0 && (
              <div className="flex items-center gap-1.5 bg-[#714B67]/5 border border-[#714B67]/20 rounded-lg px-2 py-1">
                <span className="text-xs font-semibold text-[#714B67]">{selected.size} selected</span>
                <div className="w-px h-4 bg-[#714B67]/20" />
                <button onClick={() => { setProducts(p => p.map(x => selected.has(x.id) ? { ...x, archived: true } : x)); setSelected(new Set()); }}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-[#714B67] transition px-1.5 py-0.5 rounded">
                  <Archive className="w-3.5 h-3.5" />Archive
                </button>
                <button onClick={() => { setProducts(p => p.filter(x => !selected.has(x.id))); setSelected(new Set()); }}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition px-1.5 py-0.5 rounded">
                  <Trash2 className="w-3.5 h-3.5" />Delete
                </button>
                <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600 ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="relative flex-1 min-w-[140px]">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Lassi OR Drink"
                className="w-full pl-3 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] focus:bg-white transition placeholder:text-gray-300 text-[#121B35]" />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-[#714B67] w-3.5 h-3.5 cursor-pointer" />
                  </th>
                  {["Name","Category","Prices","Tax"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No products found</td></tr>
                ) : (
                  filtered.map(p => {
                    const cat = categories.find(c => c.id === p.categoryId);
                    return (
                      <tr key={p.id}
                        className={`hover:bg-gray-50/70 transition cursor-pointer ${selected.has(p.id) ? "bg-[#714B67]/5" : ""}`}
                        onClick={() => toggleSelect(p.id)}>
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                            className="accent-[#714B67] w-3.5 h-3.5 cursor-pointer" />
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium" style={{ color: "#121B35" }}>{p.name}</td>
                        <td className="px-4 py-3.5">
                          {cat && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold text-white"
                              style={{ backgroundColor: cat.color }}>
                              {cat.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">₹{p.price}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-600">{p.tax}%</td>
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setEditProduct(p)}
                            className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded-lg transition">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setEditProduct("new")}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:underline">
              <Plus className="w-3.5 h-3.5" />New Product Create
            </button>
          </div>
        </div>
      </div>

      {editProduct !== null && (
        <ProductForm
          product={editProduct === "new" ? null : editProduct}
          categories={categories}
          onClose={() => setEditProduct(null)}
          onSave={handleSave}
          onCategoryCreated={cat => setCategories(prev => [...prev, cat])}
        />
      )}
    </div>
  );
}
