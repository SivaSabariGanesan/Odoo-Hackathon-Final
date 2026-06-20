import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/paths";
import { ChevronRight, Coffee } from "lucide-react";

const SLIDES = [
  {
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80",
    label: "Freshly Brewed",
    sub: "Artisan coffee, every morning",
  },
  {
    img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80",
    label: "Delicious Meals",
    sub: "Chef-crafted dishes, made fresh",
  },
  {
    img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80",
    label: "Cold & Refreshing",
    sub: "Chilled drinks to cool you down",
  },
  {
    img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80",
    label: "Sweet Treats",
    sub: "Desserts worth every bite",
  },
];

export default function Splash() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % SLIDES.length);
        setAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[current];

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      {/* Phone frame */}
      <div
        className="relative w-full max-w-[360px] rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{ height: "780px" }}
      >
        {/* Background image */}
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}
          >
            <img
              src={s.img}
              alt={s.label}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 z-10" />

        {/* Content layer */}
        <div className="absolute inset-0 z-20 flex flex-col">

          {/* ── Top: Logo ── */}
          <div className="flex justify-center pt-12">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-5 py-2.5">
              <Coffee className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-base tracking-wide">Odoo Cafe</span>
            </div>
          </div>

          {/* ── Middle: spacer ── */}
          <div className="flex-1" />

          {/* ── Bottom content ── */}
          <div className="px-6 pb-10">
            {/* Slide text */}
            <div
              className="mb-6 transition-all duration-300"
              style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(8px)" : "translateY(0)" }}
            >
              <h1 className="text-white text-3xl font-extrabold leading-tight tracking-tight drop-shadow-lg">
                {slide.label}
              </h1>
              <p className="text-white/70 text-sm mt-1.5">{slide.sub}</p>
            </div>

            {/* Dot indicators */}
            <div className="flex gap-2 mb-6">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all duration-300
                    ${i === current ? "w-8 bg-white" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>

            {/* CTA */}
            <Link
              to={ROUTES.PRODUCT_BROWSE}
              className="w-full flex items-center justify-center gap-2 bg-[#714B67] hover:bg-[#5d3d55] active:scale-95 text-white font-bold text-base py-4 rounded-2xl transition-all shadow-xl shadow-black/40"
            >
              Order Here
              <ChevronRight className="w-5 h-5" />
            </Link>

            <p className="text-white/40 text-xs text-center mt-3">
              No account needed · Scan & order
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
