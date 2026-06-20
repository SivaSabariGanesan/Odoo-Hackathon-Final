import { useState, useRef } from "react";
import {
  ToggleLeft, ToggleRight, ShoppingBag, BookOpen,
  Upload, X, Palette, Eye, QrCode, ChevronRight,
  Monitor, Settings as SettingsIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";

type Mode = "online" | "qrmenu";

interface UploadedImage {
  id: string;
  url: string;
  name: string;
}

const PRESET_COLORS = [
  "#714B67", "#1a1a2e", "#c0622a", "#2d6a4f",
  "#1d3557", "#6b4226", "#3d2b1f", "#0f4c75",
];

export default function SelfOrderSettings() {
  const [enabled, setEnabled]       = useState(true);
  const [mode, setMode]             = useState<Mode>("online");
  const [bgColor, setBgColor]       = useState("#714B67");
  const [customColor, setCustomColor] = useState("#714B67");
  const [images, setImages]         = useState<UploadedImage[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      setImages(prev => [...prev, { id: crypto.randomUUID(), url, name: file.name }]);
    });
  }

  function removeImage(id: string) {
    setImages(prev => prev.filter(img => img.id !== id));
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">

      {/* ── Page header ── */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#714B67]/10 p-2 rounded-lg">
            <SettingsIcon className="w-4 h-4 text-[#714B67]" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "#121B35" }}>Self Ordering</h1>
            <p className="text-xs text-gray-400">Configure customer-facing ordering experience</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.SPLASH}
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 px-3 py-1.5 rounded-lg transition">
            <Eye className="w-3.5 h-3.5" />Preview
          </Link>
          <Link to={ROUTES.QR_GENERATOR}
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition">
            <QrCode className="w-3.5 h-3.5" />QR Codes
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ── Card 1: Enable toggle ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#121B35" }}>Enable Self Ordering</p>
              <p className="text-xs text-gray-400 mt-0.5">Allow customers to scan QR and place orders</p>
            </div>
            <button
              onClick={() => setEnabled(e => !e)}
              className="transition-transform active:scale-95"
            >
              {enabled
                ? <ToggleRight className="w-10 h-10 text-[#714B67]" />
                : <ToggleLeft  className="w-10 h-10 text-gray-300" />}
            </button>
          </div>
        </div>

        {/* ── Gated section — only visible when enabled ── */}
        {enabled && (
          <>
            {/* ── Card 2: Mode selector ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold" style={{ color: "#121B35" }}>Ordering Mode</p>
                <p className="text-xs text-gray-400 mt-0.5">Choose what customers can do after scanning</p>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Online Ordering */}
                <button
                  onClick={() => setMode("online")}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition
                    ${mode === "online"
                      ? "border-[#714B67] bg-[#714B67]/5"
                      : "border-gray-200 hover:border-gray-300 bg-white"}`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${mode === "online" ? "bg-[#714B67]" : "bg-gray-100"}`}>
                    <ShoppingBag className={`w-4 h-4 ${mode === "online" ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${mode === "online" ? "text-[#714B67]" : "text-[#121B35]"}`}
                      style={mode !== "online" ? { color: "#121B35" } : {}}>
                      Online Ordering
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      Customers can browse products and place orders directly
                    </p>
                    {mode === "online" && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-full">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </button>

                {/* QR Menu */}
                <button
                  onClick={() => setMode("qrmenu")}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition
                    ${mode === "qrmenu"
                      ? "border-[#714B67] bg-[#714B67]/5"
                      : "border-gray-200 hover:border-gray-300 bg-white"}`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${mode === "qrmenu" ? "bg-[#714B67]" : "bg-gray-100"}`}>
                    <BookOpen className={`w-4 h-4 ${mode === "qrmenu" ? "text-white" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold"
                      style={{ color: mode === "qrmenu" ? "#714B67" : "#121B35" }}>
                      QR Menu
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      Customers can browse the digital menu only — no checkout
                    </p>
                    {mode === "qrmenu" && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded-full">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Online ordering sub-note */}
              {mode === "online" && (
                <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                  <span className="text-amber-500 text-sm mt-0.5">ℹ️</span>
                  <p className="text-xs text-amber-700">
                    Payment method is set to <strong>Pay at counter</strong> by default and cannot be changed in this version.
                  </p>
                </div>
              )}
            </div>

            {/* ── Card 3: Background ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#714B67]" />
                <p className="text-sm font-semibold" style={{ color: "#121B35" }}>Background</p>
              </div>

              <div className="p-5 space-y-5">

                {/* Color picker */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Background Color</p>
                  <div className="flex flex-wrap gap-2.5 mb-3">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => { setBgColor(color); setCustomColor(color); }}
                        className="w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: color,
                          borderColor: bgColor === color ? "#121B35" : "transparent",
                          boxShadow: bgColor === color ? "0 0 0 2px white, 0 0 0 4px #714B67" : "none",
                        }}
                      />
                    ))}
                    {/* Custom color input */}
                    <label className="w-9 h-9 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#714B67] transition overflow-hidden relative">
                      <input
                        type="color"
                        value={customColor}
                        onChange={e => { setCustomColor(e.target.value); setBgColor(e.target.value); }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: customColor }} />
                    </label>
                  </div>
                  {/* Preview swatch */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: bgColor }} />
                    <span className="text-xs text-gray-500 font-mono">{bgColor.toUpperCase()}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* Image upload */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Background Images</p>
                  <p className="text-xs text-gray-400 mb-3">Upload multiple images — they'll auto-scroll on the splash screen.</p>

                  {/* Drop zone */}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-[#714B67] rounded-xl py-6 flex flex-col items-center gap-2 transition text-gray-400 hover:text-[#714B67]"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-sm font-medium">Click to upload images</span>
                    <span className="text-xs">PNG, JPG, WEBP up to 5MB each</span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => handleFiles(e.target.files)}
                  />

                  {/* Uploaded previews */}
                  {images.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {images.map(img => (
                        <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeImage(img.id)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Live preview mini ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#714B67]" />
                <p className="text-sm font-semibold" style={{ color: "#121B35" }}>Preview</p>
              </div>
              <div className="p-4">
                <div
                  className="w-full h-36 rounded-xl flex flex-col items-center justify-between py-4 px-5 overflow-hidden"
                  style={{
                    background: images.length > 0
                      ? `url(${images[0].url}) center/cover no-repeat`
                      : bgColor,
                  }}
                >
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-1.5">
                    <span className="text-white text-xs font-bold">Odoo Cafe</span>
                  </div>
                  <div className="w-full bg-[#714B67] text-white text-xs font-bold py-2 rounded-xl text-center">
                    {mode === "online" ? "Order Here →" : "View Menu →"}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Save button ── */}
            <button className="w-full bg-[#714B67] hover:bg-[#5d3d55] text-white font-semibold py-3 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
              Save Settings
              <ChevronRight className="w-4 h-4" />
            </button>

          </>
        )}
      </div>
    </div>
  );
}
