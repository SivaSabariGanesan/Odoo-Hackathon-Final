import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorSmartphone } from "lucide-react";
import { ROUTES } from "../../routes/paths";

interface TableItem { id: number; occupied: boolean }
interface Floor { id: number; name: string; tables: TableItem[] }

const FLOORS: Floor[] = [
  {
    id: 1, name: "12 V",
    tables: Array.from({ length: 16 }, (_, i) => ({ id: i + 1, occupied: i === 11 })),
  },
  {
    id: 2, name: "Ground",
    tables: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, occupied: i === 2 || i === 7 })),
  },
];

export default function TableView() {
  const navigate = useNavigate();
  const [activeFloor, setActiveFloor] = useState(FLOORS[0]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-4 py-8 sm:py-10">

      <div className="w-full max-w-xl">
        <h1 className="text-xl sm:text-2xl font-bold mb-5" style={{ color: "#121B35" }}>
          Table View
        </h1>

        {/* Floor selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {FLOORS.map(floor => (
            <button key={floor.id} onClick={() => setActiveFloor(floor)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold border transition
                ${activeFloor.id === floor.id
                  ? "bg-white border-[#714B67] text-[#714B67] shadow-sm"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
              <MonitorSmartphone className="w-4 h-4 shrink-0" />
              {floor.name}
            </button>
          ))}
        </div>

        {/* Table grid */}
        <div className="bg-white border-2 border-[#714B67]/30 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
            {activeFloor.tables.map(table => (
              <button key={table.id} onClick={() => navigate(ROUTES.POS_ORDER)}
                className={`
                  aspect-square rounded-xl text-sm sm:text-base font-bold transition
                  flex items-center justify-center min-h-[48px]
                  ${table.occupied
                    ? "bg-[#714B67] text-white shadow-md shadow-[#714B67]/30 hover:bg-[#5d3d55]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}>
                {table.id}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4 px-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300 shrink-0" />
            <span className="text-xs text-gray-500">Free</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-[#714B67] shrink-0" />
            <span className="text-xs text-gray-500">Occupied</span>
          </div>
        </div>
      </div>
    </div>
  );
}
