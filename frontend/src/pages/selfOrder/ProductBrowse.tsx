import { useState } from "react";
import { Search, ShoppingCart, ArrowLeft, Plus, Minus, X, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

interface Product { id: number; name: string; price: number; categoryId: number; img?: string }
interface CartItem { id: number; name: string; price: number; qty: number }

const CATEGORIES = [
  { id: 1, name: "Quick Bites", color: "#e07b54" },
  { id: 2, name: "Drinks",      color: "#2196f3" },
  { id: 3, name: "Dessert",     color: "#9c27b0" },
];

const PRODUCTS: Product[] = [
  { id: 1,  name: "Burger",   price: 115, categoryId: 1 },
  { id: 2,  name: "Pizza",    price: 190, categoryId: 1 },
  { id: 3,  name: "Fries",    price: 80,  categoryId: 1 },
  { id: 4,  name: "Nuggets",  price: 120, categoryId: 1 },
  { id: 5,  name: "Burger",   price: 115, categoryId: 1 },
  { id: 6,  name: "Pizza",    price: 190, categoryId: 1 },
  { id: 7,  name: "Coffee",   price: 80,  categoryId: 2 },
  { id: 8,  name: "Lassi",    price: 60,  categoryId: 2 },
  { id: 9,  name: "Water",    price: 20,  categoryId: 2 },
  { id: 10, name: "Brownie",  price: 90,  categoryId: 3 },
];

// ── Product Detail Sheet ─────────────────────────────────────────
function ProductSheet({
  product, onClose, onAdd,
}: { product: Product; onClose: () => void; onAdd: (item: CartItem) => void }) {
  const [variant,  setVariant]  = useState("Chicken Burger");
  const [addons,   setAddons]   = useState<string[]>([]);
  const [qty,      setQty]      = useState(1);

  const VARIANTS = ["Chicken Burger", "Veg Burger"];
  const ADDONS   = ["Extra Cheese", "Extra Sauce", "Whole bun"];

  function toggleAddon(a: string) {
    setAddons(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  }

  function handleAdd() {
    onAdd({ id: product.id, name: variant, price: product.price, qty });
    onClose();
  }

  const total = product.price * qty;

  return (
    <div className="absolute inset-0 bg-black/40 z-20 flex flex-col justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-3xl overflow-hidden">
        {/* Product image placeholder */}
        <div className="w-full h-36 bg-[#714B67]/20 flex items-center justify-center">
          <span className="text-3xl">🍔</span>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold" style={{ color: "#121B35" }}>{product.name}</h3>
              <p className="text-sm text-[#714B67] font-semibold">₹{product.price}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Variants */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Choose variant</p>
            <div className="space-y-2">
              {VARIANTS.map(v => (
                <label key={v} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="variant" checked={variant === v} onChange={() => setVariant(v)}
                    className="accent-[#714B67]" />
                  <span className="text-sm text-gray-700">{v}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Addons */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Add-ons</p>
            <div className="space-y-2">
              {ADDONS.map(a => (
                <label key={a} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={addons.includes(a)} onChange={() => toggleAddon(a)}
                    className="accent-[#714B67]" />
                  <span className="text-sm text-gray-700">{a}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Qty + Add */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Minus className="w-3 h-3 text-gray-600" />
              </button>
              <span className="text-sm font-bold w-4 text-center" style={{ color: "#121B35" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Plus className="w-3 h-3 text-gray-600" />
              </button>
            </div>
            <button onClick={handleAdd}
              className="flex-1 bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-2.5 rounded-xl transition">
              Add · ₹{total}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function ProductBrowse() {
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [search,    setSearch]    = useState("");
  const [cart,      setCart]      = useState<CartItem[]>([]);
  const [selected,  setSelected]  = useState<Product | null>(null);
  const navigate = useNavigate();

  const filtered = PRODUCTS.filter(p =>
    (activeCat == null || p.categoryId === activeCat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  function addToCart(item: CartItem) {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i);
      return [...prev, item];
    });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ height: 700 }}>

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <Link to={ROUTES.SPLASH}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#714B67] transition">
              <ArrowLeft className="w-3.5 h-3.5" />Back
            </Link>
            <span className="text-sm font-bold" style={{ color: "#121B35" }}>Browse Products</span>
            <div className="w-10" />
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] text-[#121B35] placeholder:text-gray-300" />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button onClick={() => setActiveCat(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition
                ${activeCat === null ? "bg-[#714B67] text-white" : "bg-gray-100 text-gray-600"}`}>
              All
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id === activeCat ? null : cat.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition`}
                style={activeCat === cat.id
                  ? { backgroundColor: cat.color, color: "white" }
                  : { backgroundColor: "#f3f4f6", color: "#4b5563" }}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(p => {
              const inCart = cart.find(i => i.id === p.id);
              return (
                <button key={p.id} onClick={() => setSelected(p)}
                  className="bg-white border border-gray-200 rounded-xl p-2.5 text-left hover:border-[#714B67]/40 hover:shadow-sm transition relative">
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#714B67] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {inCart.qty}
                    </span>
                  )}
                  <div className="w-full h-12 bg-[#714B67]/10 rounded-lg mb-1.5 flex items-center justify-center text-lg">
                    🍔
                  </div>
                  <p className="text-[11px] font-medium text-[#121B35] truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-400">₹{p.price}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart bar */}
        {cart.length > 0 && (
          <div className="px-3 pb-4 shrink-0">
            <button onClick={() => navigate(ROUTES.CART)}
              className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white flex items-center justify-between px-4 py-3 rounded-2xl transition shadow-md">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-bold">{cartCount} QTY</span>
              </div>
              <span className="text-sm font-bold">Total ₹{cartTotal}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Product detail sheet */}
        {selected && (
          <ProductSheet
            product={selected}
            onClose={() => setSelected(null)}
            onAdd={addToCart}
          />
        )}
      </div>
    </div>
  );
}
