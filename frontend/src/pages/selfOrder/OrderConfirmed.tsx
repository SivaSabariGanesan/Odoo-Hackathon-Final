import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

export default function OrderConfirmed() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col items-center justify-center text-center px-6"
        style={{ height: 700 }}>

        {/* Check circle */}
        <div className="mb-6">
          <div className="w-24 h-24 rounded-full border-4 border-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-500" strokeWidth={1.5} />
          </div>
        </div>

        {/* Order number */}
        <p className="text-2xl font-extrabold mb-1" style={{ color: "#121B35" }}>#2205</p>
        <p className="text-sm text-gray-500 mb-4">Order Confirmed</p>

        {/* Amount */}
        <p className="text-4xl font-extrabold text-[#714B67] mb-8">₹350</p>

        {/* Track button */}
        <Link to={ROUTES.TRACK_ORDER}
          className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-3.5 rounded-2xl transition shadow-md mb-3">
          Track My Order
        </Link>

        <Link to={ROUTES.PRODUCT_BROWSE}
          className="text-xs text-gray-400 hover:text-[#714B67] transition">
          ← Back to menu
        </Link>
      </div>
    </div>
  );
}
