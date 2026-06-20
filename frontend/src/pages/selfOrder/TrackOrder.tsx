import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

type KDSStatus = "To Cook" | "Preparing" | "Completed" | "Draft";

interface OrderEntry {
  id: string;
  number: string;
  status: KDSStatus;
}

const ORDERS: OrderEntry[] = [
  { id: "1", number: "#1205", status: "To Cook"   },
  { id: "2", number: "#1205", status: "Preparing" },
  { id: "3", number: "#1205", status: "Completed" },
  { id: "4", number: "#1205", status: "Draft"     },
];

const STATUS_STYLES: Record<KDSStatus, string> = {
  "To Cook":   "bg-orange-100 text-orange-700 border-orange-200",
  "Preparing": "bg-blue-100 text-blue-700 border-blue-200",
  "Completed": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Draft":     "bg-gray-100 text-gray-600 border-gray-200",
};

export default function TrackOrder() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ height: 700 }}>

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 shrink-0">
          <span className="flex-1 text-center text-sm font-bold" style={{ color: "#121B35" }}>Order History</span>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {ORDERS.map(order => (
            <div key={order.id}
              className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold" style={{ color: "#121B35" }}>{order.number}</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLES[order.status]}`}>
                {order.status}
              </span>
            </div>
          ))}

          <p className="text-[10px] text-gray-400 text-center pt-2">
            Status fetched live from Kitchen Display
          </p>
        </div>

        {/* Back button */}
        <div className="px-4 pb-5 shrink-0">
          <Link to={ROUTES.ORDER_CONFIRMED}
            className="w-full flex items-center justify-center gap-2 bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-bold py-3 rounded-2xl transition shadow-md">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
