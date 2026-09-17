import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Leaf, Search } from "lucide-react";
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

// Curated high quality authentic category images
const CATEGORY_IMAGE_MAP = {
  // Atta, Rice & Dal / Grains
  atta: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1786026719/categories/xvlmz7gfmfl6tq9uewae.jpg",
  rice: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1786026752/categories/dxpl0zhbhvmagxjptvgo.jpg",
  toor: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1786272240/categories/e2ooo5rg2ikimiedetuh.jpg",
  besan: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=350&h=350",
  sooji: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=350&h=350",
  maida: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=350&h=350",
  poha: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&q=80&w=350&h=350",
  daliya: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=350&h=350",
  rajma: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=350&h=350",
  chhole: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=350&h=350",
  chana: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=350&h=350",
  moong: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=350&h=350",
  masoor: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=350&h=350",
  millet: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=350&h=350",
  flour: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=350&h=350",
  grain: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=350&h=350",

  // Cold Drinks & Beverages
  beverage: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=350&h=350",
  "soft drink": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=350&h=350",
  "fruit juice": "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&q=80&w=350&h=350",
  "mango drink": "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&q=80&w=350&h=350",
  "pure juice": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&q=80&w=350&h=350",
  juice: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&q=80&w=350&h=350",
  concentrate: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=350&h=350",
  syrup: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=350&h=350",
  herbal: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=350&h=350",
  "energy drink": "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&q=80&w=350&h=350",
  "coconut water": "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&q=80&w=350&h=350",
  lassi: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=350&h=350",
  shake: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=350&h=350",
  water: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&q=80&w=350&h=350",
  "ice cube": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&q=80&w=350&h=350",
  "cold coffee": "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&q=80&w=350&h=350",
  soda: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=350&h=350",
  imported: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=350&h=350",

  // Dairy & Bakery
  milk: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1784638469/categories/qrrkonprsbmvvisigg1m.jpg",
  bread: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1784642632/categories/cp6hspizvxqtujqq2qft.jpg",
  egg: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1784644023/categories/c76piij06a4jbol9g4mq.jpg",
  cheese: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1785389727/categories/kvymupdkkeyrlppc7rv3.jpg",
  butter: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1785389935/categories/ja7va56uvwospqnwbrff.jpg",
  paneer: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1784791126/categories/ymckdg4owknyrsyuc27k.jpg",
  biscuit: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=350&h=350",
  snack: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&q=80&w=350&h=350",
  vegetable: "https://res.cloudinary.com/deqlwzqcf/image/upload/v1785415815/categories/mfu3kkotppnj4ks2zdzb.jpg",
  fruit: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=350&h=350",

  // Fresh Meat & Seafood
  chicken: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=350&h=350",
  mutton: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=350&h=350",
  meat: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=350&h=350",
  fish: "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&q=80&w=350&h=350",
  seafood: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",
  prawn: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",
  prawns: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&q=80&w=350&h=350",
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

  return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=350&h=350";
};

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await customerApi.getCategories({ tree: true });
      if (res.data.success) {
        const tree = res.data.results || res.data.result || [];
        let formattedGroups = [];
        const hasChildren = tree.some(
          (header) => header.children && header.children.length > 0
        );
        if (hasChildren) {
          formattedGroups = tree
            .filter(
              (header) => (header.name || "").trim().toLowerCase() !== "all"
            )
            .map((header) => {
              const categories = (header.children || []).map((cat) => ({
                id: cat._id,
                name: cat.name,
                image: resolveCategoryImage(cat),
                count: cat.productCount ? `${cat.productCount}+ Products` : "10+ Products",
              }));

              return {
                title: header.name,
                categories,
              };
            })
            .filter((group) => group.categories.length > 0);
        } else {
          const categories = tree
            .filter(
              (header) => (header.name || "").trim().toLowerCase() !== "all"
            )
            .map((header) => ({
              id: header._id,
              name: header.name,
              image: resolveCategoryImage(header),
              count: header.productCount ? `${header.productCount}+ Products` : "10+ Products",
            }));
          formattedGroups = [
            {
              title: "All Categories",
              categories,
            },
          ];
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
    <div className="min-h-screen bg-[#FFF9F4] font-outfit text-[#1A1A1A] select-none">
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-none">
                Explore Categories
              </h1>
            </div>

            {/* Right: Quick Search input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E9DDD4] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#2A2A2A] placeholder-[#9C8D87] shadow-2xs focus:outline-none focus:border-[#FDCE04] transition-all"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A75]"
              />
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-[#7A6B66] font-normal leading-relaxed mt-1.5 pl-0.5">
            Find your daily essentials, fresh produce, premium meats and more —
            all in one place.
          </p>

          {/* Group Filter Tabs (if multiple groups exist) */}
          {groups.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-3 pt-1 pb-1">
              <button
                onClick={() => setSelectedGroup("all")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGroup === "all"
                    ? "bg-[#FDCE04] text-[#1A1A1A] font-bold shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-[#FFFBEB]"
                }`}
              >
                All
              </button>
              {groups.map((g, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedGroup(g.title)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedGroup === g.title
                      ? "bg-[#FDCE04] text-[#1A1A1A] font-bold shadow-xs"
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
            {Array.from({ length: 15 }).map((_, i) => (
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
              🔍
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              No Categories Found
            </h3>
            <p className="text-xs text-[#7A6B66] mb-5">
              {searchQuery
                ? `No categories matching "${searchQuery}". Try a different keyword.`
                : "Categories are currently being updated. Check back shortly!"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs text-[#1A1A1A] transition-all active:scale-95 shadow-sm bg-[#FDCE04] hover:bg-[#E5B800]"
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
              {/* Group Heading (if more than 1 group and showing all) */}
              {filteredGroups.length > 1 && (
                <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                  <h2 className="text-[16px] sm:text-lg font-bold text-slate-900 tracking-tight">
                    {group.title}
                  </h2>
                  <span className="text-[11px] font-semibold text-[#8C7A75]">
                    ({group.categories.length})
                  </span>
                </div>
              )}

              {/* Responsive Cards Grid (Mobile 3 cols, Tablet 4-5 cols, Desktop 5-6 cols) */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
                {group.categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/category/${category.id}`}
                    className="group bg-[#FFF9F5] border border-[#F3E5DC] rounded-2xl p-2 sm:p-2.5 md:p-3 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#FDCE04]/60 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] active:scale-[0.97] transition-all cursor-pointer"
                  >
                    {/* Soft Peach Circular Container for Image */}
                    <div className="relative w-full aspect-square rounded-full bg-[#FEEAE1] flex items-center justify-center overflow-hidden mb-1.5 sm:mb-2 p-1.5 transition-transform duration-300 group-hover:scale-105">
                      <img
                        src={applyCloudinaryTransform(category.image)}
                        alt={category.name}
                        loading="lazy"
                        className="w-[88%] h-[88%] object-contain drop-shadow-sm pointer-events-none select-none rounded-full"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=350&h=350";
                        }}
                      />
                    </div>

                    {/* Bottom Title, Subtitle, & Round Arrow Button */}
                    <div className="flex items-end justify-between gap-1 mt-0.5">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[#1A1A1A] text-[12px] sm:text-[13.5px] md:text-[14.5px] leading-tight line-clamp-1 group-hover:text-amber-600 transition-colors tracking-tight">
                          {category.name}
                        </h3>
                        <p className="text-[9.5px] sm:text-[10.5px] text-[#8C7A75] font-medium leading-tight mt-0.5 truncate">
                          {category.count}
                        </p>
                      </div>

                      {/* Round Arrow Button */}
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FDCE04]/20 text-[#1A1A1A] group-hover:bg-[#FDCE04] group-hover:text-[#1A1A1A] transition-colors flex items-center justify-center shrink-0 shadow-2xs font-bold">
                        <ArrowRight size={11} className="stroke-[2.5]" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

        {/* ──── BOTTOM PROMOTIONAL BANNER ("FRESHNESS IN EVERY CATEGORY") ──── */}
        {!isLoading && (
          <div
            className="relative w-full mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl overflow-hidden p-5 sm:p-7 shadow-md text-white select-none"
            style={{
              background:
                "linear-gradient(100deg, #380811 0%, #4D0E1B 45%, #25040B 100%)",
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
              <div className="flex items-center gap-1.5 text-[#E6B37E]">
                <Leaf size={13} className="shrink-0 stroke-[2.5]" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-none">
                  - PREMIUM QUALITY
                </span>
              </div>

              {/* Main Title */}
              <h3 className="font-bold text-white text-[18px] sm:text-[24px] lg:text-[26px] leading-tight tracking-tight mt-0.5 drop-shadow-sm">
                Freshness in Every Category
              </h3>

              {/* Subtitle */}
              <p className="text-white/80 text-xs sm:text-sm font-normal leading-relaxed mt-0.5">
                From farm to your doorstep — fresh, safe and trusted.
              </p>

              {/* CTA Pill Button */}
              <button
                onClick={() => navigate("/category/all")}
                className="mt-3 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full bg-white text-[#4A0E17] font-bold text-xs sm:text-sm shadow-md hover:bg-white/90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Shop Now</span>
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
