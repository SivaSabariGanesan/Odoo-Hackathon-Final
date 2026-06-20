import { useState, useEffect, useCallback } from "react";
import { Search, ShoppingCart, ArrowLeft, Plus, Minus, X, ChevronRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import {
  getSoSession,
  fetchSoCategories,
  fetchSoProducts,
  addSoCartItem,
  type SoCategory,
  type SoProduct,
} from "../../api/self-order";

// ── Local cart item (managed in sessionStorage) ──────────────────
interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

function getLocalCart(): CartItem[] {
  try { return JSON.parse(sessionStorage.getItem("soCart") ?? "[]"); } catch { return []; }
}
function saveLocalCart(cart: CartItem[]) {
  sessionStorage.setItem("soCart", JSON.stringify(cart));
}

// ── Product Detail Sheet ─────────────────────────────────────────
function ProductSheet({
  product,
  onClose,
  onAdd,
}: {
  product: SoProduct;
  onClose: () => void;
  onAdd: (productId: string, qty: number, notes?: string) => void;
}) {
  const [qty,   setQty]   = useState(1);
  const [notes, setNotes] = useState("");
  const price = parseFloat(product.price);

  return (
    <div
      className="absolute inset-0 bg-black/40 z-20 flex flex-col justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-3xl overflow-hidden">
        {/* Image */}
        <div className="w-full h-36 bg-[#714B67]/20 flex items-center justify-center">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            : <span className="text-3xl">🍽️</span>
          }
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold" style={{ color: "#121B35" }}>{product.name}</h3>
              {product.description && (
                <p className="text-xs text-gray-400 mt-0.5">{product.description}</p>
              )}
              <p className="text-sm text-[#714B67] font-semibold mt-1">₹{price.toFixed(2)}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Special instructions</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. No onions, extra sauce…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#714B67] text-[#121B35] placeholder:text-gray-300"
            />
          </div>

          {/* Qty + Add */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm"
              >
                <Minus className="w-3 h-3 text-gray-600" />
              </button>
              <span className="text-sm font-bold w-4 text-center" style={{ color: "#121B35" }}>{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm"
              >
                <Plus className="w-3 h-3 text-gray-600" />
              </button>
            </div>
            <button
              onClick={() => { onAdd(product.publicId, qty, notes || undefined); onClose(); }}
              className="flex-1 bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-2.5 rounded-xl transition"
            >
              Add · ₹{(price * qty).toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function ProductBrowse() {
  const [categories,  setCategories]  = useState<SoCategory[]>([]);
  const [products,    setProducts]    = useState<SoProduct[]>([]);
  const [activeCat,   setActiveCat]   = useState<string | null>(null);
  const [search,      setSearch]      = useState("");
  const [cart,        setCart]        = useState<CartItem[]>(getLocalCart);
  const [selected,    setSelected]    = useState<SoProduct | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [addingId,    setAddingId]    = useState<string | null>(null);
  const navigate = useNavigate();

  const session = getSoSession();

  const loadMenu = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        fetchSoCategories(session.tableToken, session.sessionToken),
        fetchSoProducts(session.tableToken, session.sessionToken),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch { /* fail silently */ }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const filtered = products.filter(p =>
    (activeCat == null || p.categoryId === activeCat) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  async function addToCart(productId: string, qty: number, notes?: string) {
    const product = products.find(p => p.publicId === productId);
    if (!product) return;

    // Optimistically update local cart
    setCart(prev => {
      const updated = (() => {
        const ex = prev.find(i => i.productId === productId);
        if (ex) return prev.map(i => i.productId === productId ? { ...i, qty: i.qty + qty } : i);
        return [...prev, { productId, name: product.name, price: parseFloat(product.price), qty }];
      })();
      saveLocalCart(updated);
      return updated;
    });

    // Sync to server if session available
    if (session) {
      setAddingId(productId);
      try {
        await addSoCartItem(session.tableToken, session.sessionToken, { productId, quantity: qty, notes });
      } catch { /* ignore — local cart still works */ }
      finally { setAddingId(null); }
    }
  }

  // No session yet — show fallback with static data
  const noSession = !session;

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ height: 700 }}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <Link
              to={ROUTES.SPLASH}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#714B67] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />Back
            </Link>
            <span className="text-sm font-bold" style={{ color: "#121B35" }}>Browse Products</span>
            <div className="w-10" />
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] text-[#121B35] placeholder:text-gray-300"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCat(null)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition
                ${activeCat === null ? "bg-[#714B67] text-white" : "bg-gray-100 text-gray-600"}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.publicId}
                onClick={() => setActiveCat(activeCat === cat.publicId ? null : cat.publicId)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition"
                style={
                  activeCat === cat.publicId
                    ? { backgroundColor: cat.color || "#714B67", color: "white" }
                    : { backgroundColor: "#f3f4f6", color: "#4b5563" }
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading menu…
            </div>
          ) : noSession ? (
            <div className="text-center text-gray-400 text-sm py-12">
              <p>Please scan a QR code to start ordering.</p>
              <Link to={ROUTES.SPLASH} className="text-[#714B67] text-xs font-semibold mt-2 block hover:underline">
                Go to splash
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-300 text-sm py-12">No products found</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map(p => {
                const inCart = cart.find(i => i.productId === p.publicId);
                const isAdding = addingId === p.publicId;
                return (
                  <button
                    key={p.publicId}
                    onClick={() => setSelected(p)}
                    className="bg-white border border-gray-200 rounded-xl p-2.5 text-left hover:border-[#714B67]/40 hover:shadow-sm transition relative"
                  >
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#714B67] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {inCart.qty}
                      </span>
                    )}
                    {isAdding && (
                      <span className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-[#714B67]" />
                      </span>
                    )}
                    <div className="w-full h-12 bg-[#714B67]/10 rounded-lg mb-1.5 flex items-center justify-center text-lg overflow-hidden">
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        : "🍽️"
                      }
                    </div>
                    <p className="text-[11px] font-medium text-[#121B35] truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-400">₹{parseFloat(p.price).toFixed(0)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart bar */}
        {cartCount > 0 && (
          <div className="px-3 pb-4 shrink-0">
            <button
              onClick={() => navigate(ROUTES.CART)}
              className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white flex items-center justify-between px-4 py-3 rounded-2xl transition shadow-md"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-bold">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
              </div>
              <span className="text-sm font-bold">₹{cartTotal.toFixed(0)}</span>
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
