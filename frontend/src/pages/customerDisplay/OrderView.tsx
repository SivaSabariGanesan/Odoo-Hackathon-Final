import { useState } from "react";
import { Coffee, Star, CheckCircle, Smartphone, ShoppingBag, X } from "lucide-react";

type DisplayState = "order" | "payment" | "complete";

const MOCK_ITEMS = [
  { id: 1, name: "1 x Burger", price: 115 },
  { id: 2, name: "2 x Pizza",  price: 115 },
  { id: 3, name: "2 x Coffee", price: 115 },
];

const UPI_ID  = "odoo.cafe@upi";
const subtotal = MOCK_ITEMS.reduce((s, i) => s + i.price, 0);
const tax      = Math.round(subtotal * 0.05);
const discount = Math.round(subtotal * 0.05);
const total    = subtotal + tax - discount;
const QR_URL   = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&am=${total}&cu=INR`)}`;

export default function CustomerDisplay() {
  const [state, setState] = useState<DisplayState>("order");

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">

      {/* ── Top bar ── */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-[#714B67] p-1.5 rounded-lg">
            <Coffee className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold" style={{ color: "#121B35" }}>Odoo Cafe</span>
          <span className="text-xs text-gray-400 ml-2 hidden sm:block">Customer Display</span>
        </div>

        {/* Demo state switcher */}
        <div className="flex gap-1">
          {(["order", "payment", "complete"] as DisplayState[]).map(s => (
            <button key={s} onClick={() => setState(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition capitalize
                ${state === s
                  ? "bg-[#714B67] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              {s}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main: 2-column layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Fixed store branding */}
        <div className="w-52 sm:w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col px-6 py-8">
          {/* Logo top */}
          <div>
            <img src="/logo.svg" alt="RestoPOS" className="h-8" />
          </div>

          {/* Welcome message — vertically centered */}
          <div className="flex-1 flex items-center">
            <div>
              <p className="text-base text-gray-600 leading-relaxed">
                Welcome to<br />
                <span className="font-semibold" style={{ color: "#121B35" }}>'Store Name'</span>
              </p>
            </div>
          </div>

          {/* Powered by bottom */}
          <div>
            <p className="text-xs text-gray-400">Powered by Odoo</p>
          </div>
        </div>

        {/* Right: Dynamic state panel */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#F5F5F7]">

          {/* ── ORDER STATE ── */}
          {state === "order" && (
            <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#714B67]" />
                <p className="text-sm font-bold" style={{ color: "#121B35" }}>Current Order</p>
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-600 font-medium">Live</span>
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {MOCK_ITEMS.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-[#714B67]/10 rounded-lg flex items-center justify-center shrink-0">
                        <Coffee className="w-3.5 h-3.5 text-[#714B67]" />
                      </div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "#121B35" }}>₹{item.price}</span>
                  </div>
                ))}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 space-y-1.5 bg-gray-50/50">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Sub Total</span><span className="text-gray-600">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Tax (GST 5%)</span><span className="text-gray-600">₹{tax}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>−₹{discount} ({Math.round(discount / subtotal * 100)}%)</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-gray-200"
                  style={{ color: "#121B35" }}>
                  <span>Total</span>
                  <span className="text-[#714B67]">₹{total}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── PAYMENT / UPI QR STATE ── */}
          {state === "payment" && (
            <div className="w-full flex flex-col items-center">
              <h2 className="text-xl font-bold mb-6 tracking-wide" style={{ color: "#121B35" }}>
                UPI QR
              </h2>

              {/* QR card — matches the wireframe modal style */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden w-full max-w-xs relative">
                {/* X button */}
                <button
                  onClick={() => setState("order")}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="px-5 pt-5 pb-2 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Smartphone className="w-4 h-4 text-[#714B67]" />
                    <p className="text-sm font-bold" style={{ color: "#121B35" }}>UPI QR</p>
                  </div>

                  {/* Large QR */}
                  <div className="bg-black p-3 rounded-xl inline-block mb-4">
                    <img
                      src={QR_URL}
                      alt="UPI QR Code"
                      className="w-44 h-44 rounded-lg"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>

                  {/* Amount */}
                  <div className="pb-4">
                    <p className="text-sm text-gray-500 font-medium">Amount: ₹{total}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">Scan with any UPI app · {UPI_ID}</p>
            </div>
          )}

          {/* ── COMPLETION STATE ── */}
          {state === "complete" && (
            <div className="w-full max-w-xs text-center">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                <div className="flex justify-center mb-5">
                  <div className="bg-emerald-50 border-2 border-emerald-100 rounded-full p-4">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                </div>

                <h2 className="text-xl font-extrabold mb-1" style={{ color: "#121B35" }}>
                  Thank you for
                </h2>
                <h2 className="text-xl font-extrabold text-[#714B67] mb-3">
                  shopping with us
                </h2>
                <p className="text-gray-400 text-sm mb-6">See you again</p>

                <div className="flex justify-center gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <p className="text-emerald-600 text-sm font-bold">₹{total} Paid ✓</p>
                </div>
              </div>
              <p className="text-gray-300 text-[10px] mt-4">Powered by Odoo</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
