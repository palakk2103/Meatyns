import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, ArrowRight, Sparkles } from "lucide-react";
import Lottie from "lottie-react";
import ProductCard from "../shared/ProductCard";
import {
  getBackgroundColorByValue,
  getBackgroundGradientByValue,
} from "@/shared/constants/offerSectionOptions";

/* ── Crisp Steak Line Icon ── */
const SteakIcon = ({ className = "w-6 h-6 text-white" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19.5 7.5c-1.5-2.5-4.5-3.5-7.5-2.5-3.5 1.2-6.5 4.5-7 8-.5 3.5 1.5 6.5 5 7 3.5.5 8-1.5 9.5-4.5 1.5-3 1.5-5.5 0-8z" />
    <path
      d="M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
      fill="currentColor"
      opacity="0.35"
    />
    <path d="M13.5 15c.6.5 1.5.5 2.2 0" />
  </svg>
);

/* ── Crisp Fish Line Icon ── */
const FishLineIcon = ({ className = "w-6 h-6 text-white" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 16s5-1 9-5 9-3 9-3-2 5-6 9-9 3-9 3l-3-4z" />
    <path d="M17 9c.5-1.5 2-2 3-2" />
    <circle cx="16" cy="11" r="1.2" fill="currentColor" />
  </svg>
);

/* ── Detect Style based on section title & category ── */
const getSectionStyle = (section, idx) => {
  const title = (section.title || "").toLowerCase();
  const cats = (
    (section.categoryIds || [])
      .map((c) => (typeof c === "object" && c?.name ? c.name : null))
      .filter(Boolean)
      .join(" ") ||
    section.categoryId?.name ||
    ""
  ).toLowerCase();

  const combined = `${title} ${cats}`;

  // Option 3: Fish & Seafood
  if (
    combined.includes("fish") ||
    combined.includes("seafood") ||
    combined.includes("salmon") ||
    combined.includes("prawn")
  ) {
    return {
      type: "fish",
      eyebrow: "FRESH & HEALTHY",
      tagline: "Best cuts • Farm fresh • Daily stock",
      boardImage:
        "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600",
      buttonStyle: "gold",
      showScript: true,
      gradient:
        "linear-gradient(135deg, #3A090F 0%, #5C1019 45%, #7A1925 100%)",
      renderIcon: () => (
        <div className="flex items-center gap-0.5">
          <SteakIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
          <FishLineIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      ),
    };
  }

  // Option 1: Trending
  if (
    combined.includes("trending") ||
    combined.includes("hot") ||
    combined.includes("popular") ||
    (idx % 3 === 0 && !combined.includes("meat"))
  ) {
    return {
      type: "trending",
      eyebrow: "TRENDING RIGHT NOW",
      tagline: "Freshly Sourced • Premium Quality",
      boardImage:
        "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600",
      buttonStyle: "gold",
      showScript: false,
      gradient:
        "linear-gradient(135deg, #4A0E17 0%, #6E1622 55%, #3D0911 100%)",
      renderIcon: () => (
        <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
      ),
    };
  }

  // Option 2: Premium Meat (Default)
  return {
    type: "meat",
    eyebrow: "PREMIUM QUALITY",
    tagline: "Fresh • Hygienic • Safe",
    boardImage:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600",
    buttonStyle: "outline",
    showScript: false,
    gradient:
      "linear-gradient(135deg, #420A10 0%, #68121D 50%, #35070D 100%)",
    renderIcon: () => (
      <SteakIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-sm" />
    ),
  };
};

const CURATED_FALLBACK_PRODUCTS = [
  {
    id: "fb-1",
    _id: "fb-1",
    name: "Premium Goat Curry Cut",
    price: 549,
    originalPrice: 620,
    weight: "500g",
    image:
      "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=600&h=600",
    deliveryTime: "15 mins",
  },
  {
    id: "fb-2",
    _id: "fb-2",
    name: "Fresh Chicken Breast Boneless",
    price: 280,
    originalPrice: 320,
    weight: "450g",
    image:
      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=600&h=600",
    deliveryTime: "12 mins",
  },
  {
    id: "fb-3",
    _id: "fb-3",
    name: "Atlantic Salmon Fillet",
    price: 699,
    originalPrice: 799,
    weight: "350g",
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600&h=600",
    deliveryTime: "18 mins",
  },
  {
    id: "fb-4",
    _id: "fb-4",
    name: "Tender Mutton Chops",
    price: 590,
    originalPrice: 650,
    weight: "500g",
    image:
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600&h=600",
    deliveryTime: "15 mins",
  },
  {
    id: "fb-5",
    _id: "fb-5",
    name: "Chicken Drumstick Skinless",
    price: 240,
    originalPrice: 270,
    weight: "500g",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600&h=600",
    deliveryTime: "12 mins",
  },
  {
    id: "fb-6",
    _id: "fb-6",
    name: "Fresh Prawns Cleaned & Deveined",
    price: 490,
    originalPrice: 560,
    weight: "400g",
    image:
      "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=600&h=600",
    deliveryTime: "15 mins",
  },
];

const OfferSections = ({ sections, noServiceData, allProducts = [] }) => {
  const navigate = useNavigate();

  if (!sections || sections.length === 0) return null;

  const handleViewAll = (section) => {
    const cat = section.categoryIds?.[0] || section.categoryId;
    const catId = typeof cat === "object" ? cat?._id : cat;
    if (catId) {
      navigate(`/category/${catId}`);
    } else {
      navigate("/category/all");
    }
  };

  return (
    <div className="w-full px-0 pt-1 pb-3 md:pb-5">
      {[...sections]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((section, idx) => {
          const styleConfig = getSectionStyle(section, idx);
          let sectionProducts = (section.productIds || [])
            .filter((p) => typeof p === "object" && p !== null)
            .map((p) => ({
              id: p._id,
              _id: p._id,
              name: p.name,
              image: p.mainImage || p.image || "",
              price: p.salePrice ?? p.price,
              originalPrice: p.price ?? p.salePrice,
              weight: p.weight,
              deliveryTime: p.deliveryTime,
            }));

          // When section has no products from API, populate with available products or curated fallback
          if (sectionProducts.length === 0) {
            const sectionCatIds = new Set(
              (section.categoryIds || [])
                .map((c) => String(typeof c === "object" ? c?._id : c))
                .filter(Boolean)
            );
            if (section.categoryId) {
              sectionCatIds.add(
                String(
                  typeof section.categoryId === "object"
                    ? section.categoryId?._id
                    : section.categoryId
                )
              );
            }

            const pool =
              allProducts && allProducts.length > 0
                ? allProducts
                : CURATED_FALLBACK_PRODUCTS;
            let matched = [];

            if (sectionCatIds.size > 0 && allProducts.length > 0) {
              matched = allProducts.filter((p) => {
                const pCat = String(p.categoryId?._id || p.categoryId || "");
                const pSub = String(
                  p.subcategoryId?._id || p.subcategoryId || ""
                );
                return sectionCatIds.has(pCat) || sectionCatIds.has(pSub);
              });
            }

            if (matched.length === 0) {
              const offset = (idx * 3) % pool.length;
              matched = pool.slice(offset, offset + 6);
              if (matched.length < 3 && pool.length >= 3) {
                matched = pool.slice(0, 6);
              }
            }

            sectionProducts = matched.map((p) => ({
              id: p._id || p.id,
              _id: p._id || p.id,
              name: p.name,
              image: p.mainImage || p.image || "",
              price: p.salePrice ?? p.price,
              originalPrice: p.price ?? p.salePrice,
              weight: p.weight || "500g",
              deliveryTime: p.deliveryTime || "12-15 mins",
            }));
          }

          return (
            <motion.div
              key={section._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.35 }}
              className="mb-5 md:mb-6"
            >
              {/* ── Header Banner Strip ── */}
              <div
                className="relative overflow-hidden mx-3 sm:mx-4 md:mx-6 rounded-2xl shadow-[0_10px_25px_rgba(40,10,15,0.16)] border border-[#7A1F2B]/20 min-h-[96px] sm:min-h-[112px] md:min-h-[120px] flex items-center justify-between px-3.5 sm:px-6 md:px-8 py-3.5 sm:py-4 text-white"
                style={{ background: styleConfig.gradient }}
              >
                {/* Background Ambient Lighting & Pattern */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -top-12 -left-12 w-44 h-44 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-8 left-1/3 w-52 h-52 bg-[#E5A83B]/10 rounded-full blur-3xl" />
                  {/* Subtle texture */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FFF9F4_1px,transparent_1px)] [background-size:14px_14px]" />
                </div>

                {/* Left: Icon Squircle + Title Stack */}
                <div className="flex items-center gap-3 sm:gap-4 relative z-10 flex-1 min-w-0 pr-2">
                  {/* Rounded ruby squircle icon */}
                  <div className="w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-2xl flex-shrink-0 flex items-center justify-center bg-[#240508]/85 border border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.15)] backdrop-blur-md transition-transform hover:scale-105">
                    {styleConfig.renderIcon()}
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-wider text-[#E5A83B] leading-none mb-1 line-clamp-1">
                      {styleConfig.eyebrow}
                    </p>
                    <h3 className="text-base sm:text-2xl md:text-3xl font-serif font-black tracking-tight leading-tight text-white drop-shadow-sm line-clamp-1">
                      {section.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs font-medium text-white/70 mt-0.5 sm:mt-1 line-clamp-1">
                      {styleConfig.tagline}
                    </p>
                  </div>
                </div>

                {/* Optional Center Flourish: Good Food Good Health (Option 3) */}
                {styleConfig.showScript && (
                  <div className="hidden lg:flex flex-col items-center justify-center text-center px-4 relative z-10 select-none">
                    <span className="font-serif italic text-amber-200/90 text-sm md:text-base tracking-wide">
                      Good Food Good Health
                    </span>
                    <svg
                      className="w-24 h-2 text-amber-300/60"
                      viewBox="0 0 100 8"
                      fill="none"
                    >
                      <path
                        d="M2 5 C 30 1, 70 9, 98 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}

                {/* Right Side: View All button & Cutting Board Image */}
                <div className="flex items-center gap-2 sm:gap-4 relative z-10 flex-shrink-0">
                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => handleViewAll(section)}
                    className="relative z-20 flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-black text-[11px] sm:text-xs transition-all active:scale-95 whitespace-nowrap cursor-pointer shadow-md"
                    style={{
                      background:
                        styleConfig.buttonStyle === "gold"
                          ? "#E5A83B"
                          : "rgba(255,255,255,0.06)",
                      color:
                        styleConfig.buttonStyle === "gold"
                          ? "#24191A"
                          : "#FFFFFF",
                      border:
                        styleConfig.buttonStyle === "gold"
                          ? "none"
                          : "1.5px solid rgba(255,255,255,0.35)",
                    }}
                  >
                    View All
                    <ArrowRight size={12} strokeWidth={3} />
                  </button>

                  {/* Cutting Board Meat / Salmon Image extending off-edge */}
                  <div className="relative w-20 sm:w-36 md:w-48 lg:w-56 h-20 sm:h-24 md:h-28 -mr-3.5 sm:-mr-6 md:-mr-8 overflow-hidden pointer-events-none flex-shrink-0 select-none">
                    <img
                      src={styleConfig.boardImage}
                      alt="Fresh Meat Cut Board"
                      loading="lazy"
                      className="w-full h-full object-cover object-left scale-110 sm:scale-125"
                    />
                    {/* Left-to-right fade gradient overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to right, #420A10 0%, rgba(66,10,16,0.5) 25%, transparent 65%)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Product Cards Directly Beneath Strip (No Enclosing White Box) ── */}
              {sectionProducts.length === 0 ? (
                <div className="mt-2.5 mb-1 px-4 text-center">
                  <p className="text-[11px] sm:text-xs text-[#7A1F2B]/60 font-medium italic">
                    Looking for the best items in this category...
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex overflow-x-auto gap-2.5 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-6 pb-2 no-scrollbar snap-x snap-mandatory">
                  {sectionProducts.map((product) => (
                    <div
                      key={product.id}
                      className="w-[134px] sm:w-[155px] md:w-[210px] flex-shrink-0 snap-start"
                    >
                      <ProductCard
                        product={product}
                        variant="homeDesktop"
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
    </div>
  );
};

export default React.memo(OfferSections);

