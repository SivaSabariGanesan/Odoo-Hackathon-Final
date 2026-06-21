import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { Coffee, Loader2, AlertCircle } from "lucide-react";
import { resolveTable } from "../../api/self-order";

const SLIDES = [
  {
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80",
    label: "Freshly Brewed",
  },
  {
    img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80",
    label: "Delicious Meals",
  },
  {
    img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80",
    label: "Cold & Refreshing",
  },
  {
    img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80",
    label: "Sweet Treats",
  },
];

export default function Splash() {
  const [current,      setCurrent]      = useState(0);
  const [resolving,    setResolving]    = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  // Validate token then redirect to login carrying the tableToken
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setResolveError("No table token found. Please scan the QR code again.");
      return;
    }
    setResolving(true);
    const minDelay = new Promise(res => setTimeout(res, 1500)); // show splash for at least 1.5s
    Promise.all([resolveTable(token), minDelay])
      .then(() => {
        // Store token in sessionStorage so Login can read it reliably
        sessionStorage.setItem("pendingTableToken", token);
        navigate(ROUTES.LOGIN, { replace: true });
      })
      .catch(() => {
        setResolveError("Invalid or expired QR code. Please scan again.");
        setResolving(false);
      });
  }, [searchParams]);


  // Auto-scroll slides every 3s
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % SLIDES.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
      <div
        className="relative overflow-hidden rounded-3xl shadow-2xl border-2 border-gray-300"
        style={{ width: 340, height: 700 }}
      >
        {/* Background slides */}
        {SLIDES.map((s, i) => (
          <div key={i} className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}>
            <img src={s.img} alt={s.label} className="w-full h-full object-cover" />
          </div>
        ))}

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

        <div className="absolute inset-0 flex flex-col">
          {/* Logo */}
          <div className="flex justify-center pt-10">
            <div className="flex items-center gap-2 bg-[#714B67] px-5 py-2 rounded-xl shadow-lg">
              <Coffee className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm tracking-wide">Odoo Cafe</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Error state */}
          {resolveError && (
            <div className="mx-5 mb-4 bg-red-500/90 backdrop-blur-sm text-white rounded-2xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-xs font-medium">{resolveError}</p>
            </div>
          )}

          {/* Slide dots */}
          <div className="flex justify-center gap-2 mb-4">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300
                  ${i === current ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`} />
            ))}
          </div>

          {/* CTA — spinner while validating token, error message otherwise */}
          <div className="px-5 pb-10">
            {resolving ? (
              <div className="w-full flex items-center justify-center bg-[#714B67]/80 text-white font-bold text-base py-4 rounded-2xl gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Validating your table…
              </div>
            ) : resolveError ? (
              <div className="w-full flex items-center justify-center bg-red-500/80 text-white font-bold text-sm py-4 rounded-2xl">
                Please scan a valid table QR code
              </div>
            ) : (
              <div className="w-full flex items-center justify-center bg-[#714B67]/80 text-white font-bold text-base py-4 rounded-2xl gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirecting to login…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
