import { useRef } from "react";
import { Download, QrCode, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

// Mock tables — in real app pulled from floor/table store
const TABLES = [
  { id: 1, name: "Table 1", token: "asdfghhjkl" },
  { id: 2, name: "Table 2", token: "zxcvbnmqwe" },
  { id: 3, name: "Table 3", token: "poiuytrewq" },
  { id: 4, name: "Table 4", token: "lkjhgfdsaz" },
  { id: 5, name: "Table 5", token: "mnbvcxzasd" },
];

const BASE_URL = window.location.origin;

function tableQRUrl(token: string, size = 140) {
  const url = `${BASE_URL}/s/${token}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

export default function QRGenerator() {
  const printRef = useRef<HTMLDivElement>(null);

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
              e.g. <span className="font-mono font-semibold">{BASE_URL}/s/asdfghhjkl</span> → Table 1
            </p>
          </div>
        </div>

        {/* QR grid card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold" style={{ color: "#121B35" }}>All Tables</p>
            <p className="text-xs text-gray-400 mt-0.5">{TABLES.length} tables · scan to open mobile order page</p>
          </div>

          {/* Print target */}
          <div ref={printRef} className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {TABLES.map(table => (
                <div key={table.id}
                  className="flex flex-col items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-[#714B67]/30 hover:shadow-sm transition">
                  {/* Table name */}
                  <p className="text-xs font-semibold text-gray-600">{table.name}</p>

                  {/* QR image */}
                  <div className="bg-white border border-gray-200 p-2 rounded-lg">
                    <img
                      src={tableQRUrl(table.token, 120)}
                      alt={`QR for ${table.name}`}
                      className="w-28 h-28 rounded"
                    />
                  </div>

                  {/* Token */}
                  <p className="text-[10px] text-gray-400 font-mono text-center break-all">
                    /s/{table.token.slice(0, 8)}…
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Single QR preview */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold" style={{ color: "#121B35" }}>Scan Preview</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Scanning opens: <span className="font-mono text-[#714B67]">{BASE_URL}/s/{TABLES[0].token}</span>
            </p>
          </div>
          <div className="p-5 flex items-start gap-6 flex-wrap">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-semibold text-gray-600">Table 1</p>
              <div className="bg-white border-2 border-[#714B67]/20 p-3 rounded-xl shadow-sm">
                <img
                  src={tableQRUrl(TABLES[0].token, 160)}
                  alt="Table 1 QR"
                  className="w-36 h-36 rounded-lg"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px] pt-1">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">URL Format</p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-[#714B67] break-all">
                {BASE_URL}/s/{TABLES[0].token}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  Domain
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  /s/ Self-order prefix
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#714B67] inline-block" />
                  Unique token
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-print, #qr-print * { visibility: visible; }
          #qr-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
