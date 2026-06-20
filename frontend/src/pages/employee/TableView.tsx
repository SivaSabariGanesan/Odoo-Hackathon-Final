import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorSmartphone } from "lucide-react";
import { ROUTES } from "../../routes/paths";
import { fetchFloors, type Floor } from "../../api/floors";

export default function TableView() {
  const navigate = useNavigate();
  const [floors, setFloors]           = useState<Floor[]>([]);
  const [activeFloor, setActiveFloor] = useState<Floor | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetchFloors()
      .then(data => {
        setFloors(data);
        if (data.length > 0) setActiveFloor(data[0]);
      })
      .catch(err => console.error("Failed to load floors", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-4 py-8 sm:py-10">

      <div className="w-full max-w-xl">
        <h1 className="text-xl sm:text-2xl font-bold mb-5" style={{ color: "#121B35" }}>
          Table View
        </h1>

        {loading ? (
          <p className="text-sm text-gray-400">Loading floors…</p>
        ) : floors.length === 0 ? (
          <p className="text-sm text-gray-400">No floors configured.</p>
        ) : (
          <>
            {/* Floor selector */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {floors.map(floor => (
                <button key={floor.publicId} onClick={() => setActiveFloor(floor)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold border transition
                    ${activeFloor?.publicId === floor.publicId
                      ? "bg-white border-[#714B67] text-[#714B67] shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <MonitorSmartphone className="w-4 h-4 shrink-0" />
                  {floor.name}
                </button>
              ))}
            </div>

            {/* Table grid */}
            {activeFloor && (
              <div className="bg-white border-2 border-[#714B67]/30 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
                  {activeFloor.tables.map(table => (
                    <button key={table.publicId} onClick={() => navigate(ROUTES.POS_ORDER)}
                      className={`
                        aspect-square rounded-xl text-sm sm:text-base font-bold transition
                        flex items-center justify-center min-h-[48px]
                        ${table.isOccupied
                          ? "bg-[#714B67] text-white shadow-md shadow-[#714B67]/30 hover:bg-[#5d3d55]"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}>
                      {table.tableNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
}
