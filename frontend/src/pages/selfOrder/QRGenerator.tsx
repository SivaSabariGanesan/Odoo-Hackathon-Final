import { useEffect, useState } from "react";
import { Download, QrCode, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { fetchFloors, type Floor } from "../../api/floors";

const BASE_URL = window.location.origin;

function tableQRUrl(qrToken: string, size = 140) {
  // QR encodes the splash URL with the table's qrToken as a query param.
  // The Splash page reads ?token= and calls resolveTable(token).
  const url = `${BASE_URL}${ROUTES.SPLASH}?token=${qrToken}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

export default function QRGenerator() {
  const [floors,  setFloors]  = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchFloors()
      .then(setFloors)
      .catch(() => setError("Failed to load floors and tables"))
      .finally(() => setLoading(false));
  }, []);

  const allTables = floors.flatMap(f =>
    f.tables.map(t => ({ ...t, floorName: f.name })),
  );

  function handleDownload() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={ROUTES.SELF_ORDER_SETTINGS}
            className="p-1.5 text-gray-400 hover:text-[#714B67] hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="bg-[#714B67]/10 p-2 rounded-lg">
            <QrCode className="w-4 h-4 text-[#714B67]" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "#121B35" }}>QR Code Generator</h1>
            <p className="text-xs text-gray-400">One QR per table · unique token per scan</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-[#714B67] hover:bg-[#5d3d55] text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm">
          <Download className="w-4 h-4" />
          Download QR Code
        </button>
      </header>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <QrCode className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-700">Auto-generated per table</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Each QR encodes a unique token linked to its table.
              Scanning opens:{" "}
              <span className="font-mono font-semibold">{BASE_URL}{ROUTES.SPLASH}?token=&lt;tableToken&gt;</span>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading tables…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-500 py-10 justify-center">
            <AlertCircle className="w-5 h-5" />{error}
          </div>
        ) : allTables.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            <p className="text-sm">No active tables found.</p>
            <Link to={ROUTES.FLOOR_TABLES}
              className="text-[#714B67] text-xs font-semibold mt-2 block hover:underline">
              Set up floors and tables →
            </Link>
          </div>
        ) : (
          <>
            {floors.map(floor => (
              <div key={floor.publicId} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-sm font-bold" style={{ color: "#121B35" }}>{floor.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {floor.tables.filter(t => t.isActive).length} active tables
                  </p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                    {floor.tables.filter(t => t.isActive).map(table => (
                      <div key={table.publicId}
                        className="flex flex-col items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-[#714B67]/30 hover:shadow-sm transition">
                        <p className="text-xs font-semibold text-gray-600">
                          Table {table.tableNumber}
                        </p>
                        <div className="bg-white border border-gray-200 p-2 rounded-lg">
                          <img
                            src={tableQRUrl((table as any).qrToken ?? table.publicId, 120)}
                            alt={`QR for Table ${table.tableNumber}`}
                            className="w-28 h-28 rounded"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono text-center">
                          {floor.name} · {table.seats} seats
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
