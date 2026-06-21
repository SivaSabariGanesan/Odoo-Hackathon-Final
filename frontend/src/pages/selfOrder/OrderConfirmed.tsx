import { useState, useEffect } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { getSoSession, getSoOrderDetail } from "../../api/self-order";

export default function OrderConfirmed() {
  const location = useLocation();
  const session = getSoSession();
  
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderTotal, setOrderTotal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrderDetails() {
      try {
        // Try to get orderId from navigation state (passed from Cart)
        const orderId = location.state?.orderId;
        
        if (orderId && session) {
          const order = await getSoOrderDetail(session.tableToken, session.sessionToken, orderId);
          setOrderNumber(order.orderNumber);
          setOrderTotal(order.grandTotal);
        } else {
          // Fallback: show generic confirmation
          setOrderNumber(null);
          setOrderTotal(null);
        }
      } catch (err) {
        console.error("Failed to load order details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOrderDetails();
  }, [location.state, session]);

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

        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-4" />
        ) : (
          <>
            {/* Order number */}
            <p className="text-2xl font-extrabold mb-1" style={{ color: "#121B35" }}>
              {orderNumber ? `#${orderNumber}` : "Order Confirmed"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {orderNumber ? "Order Confirmed" : "Your order has been placed"}
            </p>

            {/* Amount */}
            {orderTotal && (
              <p className="text-4xl font-extrabold text-[#714B67] mb-8">
                ₹{parseFloat(orderTotal).toFixed(0)}
              </p>
            )}
          </>
        )}

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
