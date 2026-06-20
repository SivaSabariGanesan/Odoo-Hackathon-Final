import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { Coffee } from "lucide-react";

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
  const [current, setCurrent] = useState(0);

  // Auto-scroll every 3s
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % SLIDES.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    /* outer page bg — matches the wireframe dark surround */
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">

      {/* ── Phone frame ── */}
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

        {/* Dark overlay — heavier at top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col">

          {/* Logo — top center */}
          <div className="flex justify-center pt-10">
            <div className="flex items-center gap-2 bg-[#714B67] px-5 py-2 rounded-xl shadow-lg">
              <Coffee className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm tracking-wide">Logo</span>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Slide dots */}
          <div className="flex justify-center gap-2 mb-4">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300
                  ${i === current ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`} />
            ))}
          </div>

          {/* Order Here CTA — bottom, matches wireframe orange-red button with outline */}
          <div className="px-5 pb-10">
            <Link
              to={ROUTES.PRODUCT_BROWSE}
              className="w-full flex items-center justify-center bg-[#714B67] hover:bg-[#5d3d55] active:scale-95 text-white font-bold text-base py-4 rounded-2xl transition-all shadow-xl border-2 border-white/20"
            >
              Order Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
