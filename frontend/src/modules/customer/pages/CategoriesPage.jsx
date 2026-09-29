import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Leaf, Search, ShieldCheck } from "lucide-react";
import { customerApi } from "../services/customerApi";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import meatSeafoodBoard from "@/assets/meat_seafood_board.jpg";

// Grid icon with 4 rounded squares matching the reference screenshot
const CategoryGridIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-[#1A1A1A]"
  >
    <rect
      x="3"
      y="3"
      width="7"
      height="7"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    <rect
      x="14"
      y="3"
      width="7"
      height="7"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    <rect
      x="3"
      y="14"
      width="7"
      height="7"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.2"
    />
    <rect
      x="14"
      y="14"
      width="7"
      height="7"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.2"
    />
  </svg>
);

// Curated high-quality authentic fresh meat images
const CATEGORY_IMAGE_MAP = {
  // Chicken
  "curry cut": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=350&h=350",
  "chicken breast": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=350&h=350",
  "boneless": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=350&h=350",
  "drumstick": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=350&h=350",
  "tangdi": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=350&h=350",
  "thigh": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=350&h=350",
  "keema": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=350&h=350",
  "whole chicken": "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=350&h=350",
  "chicken": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=350&h=350",

  // Mutton
  "mutton curry": "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=350&h=350",
  "chop": "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=350&h=350",
  "biryani cut": "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=350&h=350",
  "liver": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=350&h=350",
  "mutton": "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=350&h=350",

  // Fish & Seafood
  "rohu": "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=350&h=350",
  "catla": "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=350&h=350",
  "surmai": "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=350&h=350",
  "pomfret": "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=350&h=350",
  "fish": "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=350&h=350",
  "seafood": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",

  // Prawns & Crabs
  "tiger prawn": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",
  "jumbo": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",
  "prawn": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",
  "crab": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",

  // Eggs
  "brown egg": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=350&h=350",
  "free range": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=350&h=350",
  "egg": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=350&h=350",

  // Default meat fallback
  meat: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=350&h=350",
};

const resolveCategoryImage = (cat) => {
  if (
    cat.image &&
    typeof cat.image === "string" &&
    cat.image.trim() !== "" &&
    !cat.image.includes("photo-1607623814075-e51df1bdc82f")
  ) {
    return cat.image;
  }

  const lower = (cat.name || "").toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (lower.includes(key)) {
      return url;
    }
  }

  return "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=350&h=350";
};

const isMeat = (txt) =>
  /meat|chicken|mutton|fish|seafood|prawn|crab|egg|poultry|kebab|tikka|marinade|cold cut|sausage/i.test(
    txt || ""
  );

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      let res = await customerApi.getCategories({ tree: true });
      let tree = res.data?.results || res.data?.result || [];

      // Fallback: If tree query returns empty, fetch flat categories
      if (!tree || tree.length === 0) {
        const flatRes = await customerApi.getCategories();
        const flatList = flatRes.data?.results || flatRes.data?.result || [];
        if (flatList.length > 0) {
          const headers = flatList.filter((c) => c.type === "header" && isMeat(c.name));
          if (headers.length > 0) {
            tree = headers.map((h) => ({
              ...h,
              children: flatList.filter(
                (c) => c.parentId && String(c.parentId) === String(h._id)
              ),
            }));
          } else {
            tree = flatList.filter((c) => isMeat(c.name)).map((c) => ({ ...c, children: [] }));
          }
        }
      }

      if (tree && tree.length > 0) {
        let formattedGroups = [];

        // STRICT FILTER: Keep ONLY Meat & Seafood headers or categories
        const meatHeaders = tree.filter((h) => isMeat(h.name));

        if (meatHeaders.length > 0) {
          meatHeaders.forEach((header) => {
            const children = (header.children || []).filter((c) => isMeat(c.name));

            // Check if children have deeper subcategories (e.g. Fresh Chicken -> Curry Cut, Breast, etc.)
            const hasSubChildren = children.some(
              (c) => c.children && c.children.length > 0
            );

            if (hasSubChildren) {
              children.forEach((cat) => {
                const subCats = (cat.children || []).map((sub) => ({
                  id: sub._id,
                  name: sub.name,
                  image: resolveCategoryImage(sub),
                  count: sub.productCount ? `${sub.productCount}+ Products` : "Fresh Cut",
                }));

                formattedGroups.push({
                  title: cat.name,
                  categories:
                    subCats.length > 0
                      ? subCats
                      : [
                          {
                            id: cat._id,
                            name: cat.name,
                            image: resolveCategoryImage(cat),
                            count: cat.productCount ? `${cat.productCount}+ Products` : "Fresh Cut",
                          },
                        ],
                });
              });
            } else {
              const categories = children.map((cat) => ({
                id: cat._id,
                name: cat.name,
                image: resolveCategoryImage(cat),
                count: cat.productCount ? `${cat.productCount}+ Products` : "Fresh Cut",
              }));

              if (categories.length > 0) {
                formattedGroups.push({
                  title: header.name,
                  categories,
                });
              }
            }
          });
        }

        // Fallback if no meat header was matched: look for any meat categories anywhere
        if (formattedGroups.length === 0) {
          const directMeatCats = [];
          tree.forEach((h) => {
            if (isMeat(h.name)) {
              directMeatCats.push({
                id: h._id,
                name: h.name,
                image: resolveCategoryImage(h),
                count: h.productCount ? `${h.productCount}+ Products` : "Fresh Cut",
              });
            }
            (h.children || []).forEach((c) => {
              if (isMeat(c.name)) {
                directMeatCats.push({
                  id: c._id,
                  name: c.name,
                  image: resolveCategoryImage(c),
                  count: c.productCount ? `${c.productCount}+ Products` : "Fresh Cut",
                });
              }
            });
          });

          if (directMeatCats.length > 0) {
            formattedGroups.push({
              title: "Fresh Meat & Seafood",
              categories: directMeatCats,
            });
          }
        }

        setGroups(formattedGroups);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filter categories based on search query and selected group tab
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return groups
      .filter((group) => {
        if (selectedGroup === "all") return true;
        return group.title.toLowerCase() === selectedGroup.toLowerCase();
      })
      .map((group) => {
        if (!query) return group;
        const matchingCats = group.categories.filter((cat) =>
          cat.name.toLowerCase().includes(query)
        );
        return {
          ...group,
          categories: matchingCats,
        };
      })
      .filter((group) => group.categories.length > 0);
  }, [groups, searchQuery, selectedGroup]);

  return (
    <div className="min-h-screen bg-[#FFF9F4] font-poppins text-[#1A1A1A] select-none">
      {/* ──── MAIN CONTENT CONTAINER ──── */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-20 sm:pb-24">
        {/* ──── SECTION HEADER ──── */}
        <div className="mb-4 sm:mb-6 px-0.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Back Button + Icon + Divider + Unified Title */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-amber-100 text-[#1A1A1A] active:scale-90 transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft size={18} strokeWidth={2.4} />
              </button>
              <CategoryGridIcon />
              <div className="w-[1.5px] h-5 sm:h-6 bg-[#CDB5AA]/70 rounded-full" />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-normal font-anton tracking-wide text-slate-900 leading-none uppercase">
                  Meat &amp; Seafood Categories
                </h1>
              </div>
            </div>

            {/* Right: Quick Search input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search cuts (chicken, mutton, fish...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E9DDD4] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#2A2A2A] placeholder-[#9C8D87] shadow-2xs focus:outline-none focus:border-[#C81017] transition-all"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A75]"
              />
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-[#7A6B66] font-normal leading-relaxed mt-1.5 pl-0.5">
            100% fresh, chemical-free meat — never frozen, always hygienic. Sourced daily and precision cut.
          </p>

          {/* Meat Quality Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/60 text-[#C81017] text-[11px] font-bold">
              <ShieldCheck size={13} /> 100% Fresh &amp; Chemical-Free
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-[#B45309] text-[11px] font-bold">
              ❄️ Never Frozen
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-[#047857] text-[11px] font-bold">
              ⚡ Same-Day Delivery
            </span>
          </div>

          {/* Group Filter Tabs */}
          {groups.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-3.5 pt-1 pb-1">
              <button
                onClick={() => setSelectedGroup("all")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGroup === "all"
                    ? "bg-[#C81017] text-white font-bold shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-[#FFFBEB]"
                }`}
              >
                All Meat &amp; Seafood
              </button>
              {groups.map((g, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedGroup(g.title)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedGroup === g.title
                      ? "bg-[#C81017] text-white font-bold shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-[#FFFBEB]"
                  }`}
                >
                  {g.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ──── LOADING SKELETON STATE ──── */}
        {isLoading && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-[#FFF9F5] border border-[#F3E5DC] rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between"
              >
                <div className="w-full aspect-square rounded-full bg-[#FEEAE1]/60 mb-2" />
                <div className="h-3.5 w-3/4 bg-[#EADCCF]/60 rounded-sm mb-1" />
                <div className="h-2.5 w-1/2 bg-[#EADCCF]/40 rounded-sm" />
              </div>
            ))}
          </div>
        )}

        {/* ──── EMPTY STATE ──── */}
        {!isLoading && filteredGroups.length === 0 && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto border border-[#EADBCE] shadow-xs my-10">
            <div className="w-16 h-16 rounded-full bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-2xl mx-auto mb-3 text-[#1A1A1A]">
              🍗
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              No Cuts Found
            </h3>
            <p className="text-xs text-[#7A6B66] mb-5">
              {searchQuery
                ? `No cuts matching "${searchQuery}". Try searching chicken, mutton, or fish.`
                : "Meat categories are currently loading. Please check back in a moment."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs text-white transition-all active:scale-95 shadow-sm bg-[#C81017] hover:bg-[#A00D13]"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* ──── CATEGORY GROUPS & CARDS ──── */}
        {!isLoading &&
          filteredGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-6 sm:mb-8">
              {/* Group Heading */}
              <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                <span className="w-2 h-2 rounded-full bg-[#C81017]"></span>
                <h2 className="text-[17px] sm:text-lg font-normal font-anton tracking-wide text-slate-900 uppercase">
                  {group.title}
                </h2>
                <span className="text-[11px] font-semibold text-[#8C7A75]">
                  ({group.categories.length} cuts)
                </span>
              </div>

              {/* Responsive Cards Grid (Mobile 3 cols, Tablet 4-5 cols, Desktop 5-6 cols) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
                {group.categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/category/${category.id}`}
                    className="group bg-[#FFF9F5] border border-[#F3E5DC] rounded-2xl p-2 sm:p-2.5 md:p-3 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#C81017]/50 hover:shadow-[0_6px_20px_rgba(200,16,23,0.08)] active:scale-[0.97] transition-all cursor-pointer"
                  >
                    {/* Soft Warm Circular Container for Image */}
                    <div className="relative w-full aspect-square rounded-full bg-[#FEEAE1] flex items-center justify-center overflow-hidden mb-1.5 sm:mb-2 p-1.5 transition-transform duration-300 group-hover:scale-105">
                      <img
                        src={applyCloudinaryTransform(category.image)}
                        alt={category.name}
                        loading="lazy"
                        className="w-[90%] h-[90%] object-cover drop-shadow-sm pointer-events-none select-none rounded-full"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=350&h=350";
                        }}
                      />
                    </div>

                    {/* Bottom Title, Subtitle, & Round Arrow Button */}
                    <div className="flex items-end justify-between gap-1 mt-0.5">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[#1A1A1A] text-[12px] sm:text-[13.5px] md:text-[14.5px] leading-tight line-clamp-1 group-hover:text-[#C81017] transition-colors tracking-tight">
                          {category.name}
                        </h3>
                        <p className="text-[9.5px] sm:text-[10.5px] text-[#8C7A75] font-medium leading-tight mt-0.5 truncate">
                          {category.count}
                        </p>
                      </div>

                      {/* Round Arrow Button */}
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#C81017]/10 text-[#C81017] group-hover:bg-[#C81017] group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs font-bold">
                        <ArrowRight size={11} className="stroke-[2.5]" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

        {/* ──── BOTTOM PROMOTIONAL BANNER ("100% FRESH MEAT & SEAFOOD") ──── */}
        {!isLoading && (
          <div
            className="relative w-full mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl overflow-hidden p-5 sm:p-7 shadow-md text-white select-none"
            style={{
              background:
                "linear-gradient(100deg, #2A070B 0%, #4D0E1B 45%, #1F0307 100%)",
            }}
          >
            {/* Right side meat board visual */}
            <div
              className="absolute right-0 top-0 bottom-0 w-3/5 sm:w-1/2 bg-no-repeat bg-right bg-cover pointer-events-none opacity-85"
              style={{
                backgroundImage: `url(${meatSeafoodBoard})`,
                maskImage:
                  "linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
                WebkitMaskImage:
                  "linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
              }}
            />

            {/* Content on the left */}
            <div className="relative z-10 max-w-[240px] sm:max-w-md flex flex-col items-start gap-1 sm:gap-1.5">
              {/* Leaf + Premium Quality Badge */}
              <div className="flex items-center gap-1.5 text-[#FAB82C]">
                <Leaf size={13} className="shrink-0 stroke-[2.5]" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-none">
                  MEATYNS FRESH GUARANTEE
                </span>
              </div>

              {/* Main Title */}
              <h3 className="font-bold text-white text-[18px] sm:text-[24px] lg:text-[26px] leading-tight tracking-tight mt-0.5 drop-shadow-sm">
                100% Fresh Meat &amp; Seafood
              </h3>

              {/* Subtitle */}
              <p className="text-white/80 text-xs sm:text-sm font-normal leading-relaxed mt-0.5">
                Never frozen, always hygienic. Delivered cold-chain maintained directly to your home.
              </p>

              {/* CTA Pill Button */}
              <button
                onClick={() => navigate("/category/all")}
                className="mt-3 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full bg-white text-[#4A0E17] font-bold text-xs sm:text-sm shadow-md hover:bg-[#FAB82C] hover:text-[#1A1A1A] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Order Fresh Meat</span>
                <ArrowRight size={13} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
