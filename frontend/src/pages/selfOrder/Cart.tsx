import { useState } from "react";
import { Minus, Plus, X, Tag, ArrowLeft, CheckCircle, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

const MOCK_CART = [
  { id: 1, name: "Burger (Veg Burger)", price: 15, qty: 2 },
  { id: 2, name: "Pizza",               price: 15, qty: 1 },
  { id: 3, name: "Coffee",              price: 15, qty: 1 },
  { id: 4, name: "Water",               price: 15, qty: 1 },
];

const VALID_COUPONS: Record<string, number> = { "SAVE20": 20, "OFFER30": 30 };

export default function Cart() {
  const [items,    setItems]    = useState(MOCK_CART);
  const [coupon,   setCoupon]   = useState("");
  const [applied,  setApplied]  = useState<{ code: string; pct: number } | null>(null);
  const [couponErr,setCouponErr]= useState("");
  const navigate = useNavigate();

  function updateQty(id: number, delta: number) {
    setItems(prev => prev
      .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    );
  }

  function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) { setCouponErr("Enter a code"); return; }
    const pct = VALID_COUPONS[code];
    if (!pct) { setCouponErr("Invalid code"); return; }
    setApplied({ code, pct });
    setCouponErr("");
  }

  const subtotal  = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax       = Math.round(subtotal * 0.05);
  const discount  = applied ? Math.round(subtotal * applied.pct / 100) : 0;
  const total     = subtotal + tax - discount;

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ height: 700 }}>

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 shrink-0">
          <Link to={ROUTES.PRODUCT_BROWSE}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#714B67] transition">
            <ArrowLeft className="w-3.5 h-3.5" />Back
          </Link>
          <span className="flex-1 text-center text-sm font-bold" style={{ color: "#121B35" }}>Payment</span>
          <div className="w-10" />
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.map(item => (
            <div key={item.id}
              className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#121B35] truncate">{item.name}</p>
                <p className="text-xs text-gray-400">₹{item.price} each</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => updateQty(item.id, -1)}
                  className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <Minus className="w-2.5 h-2.5 text-gray-600" />
                </button>
                <span className="w-4 text-center text-xs font-bold" style={{ color: "#121B35" }}>{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)}
                  className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <Plus className="w-2.5 h-2.5 text-gray-600" />
                </button>
              </div>
              <span className="text-xs font-bold text-[#121B35] w-10 text-right shrink-0">₹{item.price * item.qty}</span>
            </div>
          ))}

          {/* Coupon row */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={coupon} onChange={e => { setCoupon(e.target.value); setCouponErr(""); }}
                placeholder="Have a coupon code?"
                className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#714B67] text-[#121B35] placeholder:text-gray-300" />
            </div>
            {applied ? (
              <button onClick={() => { setApplied(null); setCoupon(""); }}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-2 rounded-xl">
                <CheckCircle className="w-3.5 h-3.5" />{applied.code}
                <X className="w-3 h-3" />
              </button>
            ) : (
              <button onClick={applyCoupon}
                className="text-xs font-semibold text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 px-3 py-2 rounded-xl transition">
                Apply
              </button>
            )}
          </div>
          {couponErr && <p className="text-[10px] text-red-500 pl-1">{couponErr}</p>}
        </div>

        {/* Totals + Confirm */}
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 shrink-0 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Sub Total</span><span className="text-[#121B35] font-medium">₹{subtotal}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Tax (GST 5%)</span><span className="text-[#121B35] font-medium">₹{tax}</span>
          </div>
          {applied && (
            <div className="flex justify-between text-xs text-emerald-600 font-medium">
              <span>Discount</span><span>−₹{discount}({applied.pct}%)</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-100"
            style={{ color: "#121B35" }}>
            <span>Total ₹{total}</span>
          </div>
          <button onClick={() => navigate(ROUTES.ORDER_CONFIRMED)}
            className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-3 rounded-2xl transition shadow-md mt-1">
            Confirmed
          </button>
        </div>
      </div>
    </div>
  );
}
