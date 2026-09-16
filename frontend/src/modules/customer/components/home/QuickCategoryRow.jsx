import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6">
    <rect x="3" y="3" width="7" height="7" rx="2" stroke="#520e1e" strokeWidth="2.2" fill="none" />
    <rect x="14" y="3" width="7" height="7" rx="2" stroke="#520e1e" strokeWidth="2.2" fill="none" />
    <rect x="3" y="14" width="7" height="7" rx="2" stroke="#520e1e" strokeWidth="2.2" fill="none" />
    <rect x="14" y="14" width="7" height="7" rx="2" stroke="#520e1e" strokeWidth="2.2" fill="none" />
  </svg>
);

// Pure meat, poultry, seafood, eggs & marinated specialties for Meatyns
const ROW_1_ITEMS = [
  {
    id: "beef",
    label: "Beef",
    query: "beef",
    image: "/categories/beef.png",
  },
  {
    id: "mutton",
    label: "Mutton",
    query: "mutton",
    image: "/categories/mutton.png",
  },
  {
    id: "chicken",
    label: "Chicken",
    query: "chicken",
    image: "/categories/chicken.png",
  },
  {
    id: "fish",
    label: "Fish",
    query: "fish",
    image: "/categories/fish.png",
  },
  {
    id: "prawns",
    label: "Prawns",
    query: "prawns",
    image: "/categories/prawns.png",
  },
  {
    id: "steaks",
    label: "Steaks",
    query: "steak",
    image: "/categories/steaks.jpg",
  },
];

const ROW_2_ITEMS = [
  {
    id: "crab",
    label: "Crab",
    query: "crab",
    image: "/categories/crab.png",
  },
  {
    id: "seafood",
    label: "Seafood",
    query: "seafood",
    image: "/categories/other_seafood.png",
  },
  {
    id: "eggs",
    label: "Eggs",
    query: "egg",
    image: "/categories/eggs.jpg",
  },
  {
    id: "marinades",
    label: "Marinades",
    query: "marinade",
    image: "/categories/marinades.jpg",
  },
  {
    id: "coldcuts",
    label: "Cold Cuts",
    query: "cold cut",
    image: "/categories/coldcuts.jpg",
  },
  {
    id: "more",
    label: "More",
    query: "more",
    isMore: true,
  },
];

const MEAT_KEYWORDS = [
  "beef",
  "mutton",
  "goat",
  "lamb",
  "chicken",
  "poultry",
  "fish",
  "prawn",
  "shrimp",
  "crab",
  "seafood",
  "egg",
  "marinad",
  "kebab",
  "tikka",
  "steak",
  "sausage",
  "salami",
  "cold cut",
  "meat",
  "duck",
  "pork",
];

const DISALLOWED_KEYWORDS = [
  "dairy",
  "milk",
  "breakfast",
  "drink",
  "beverage",
  "snack",
  "sweet",
  "bakery",
  "grocery",
  "clean",
  "fruit",
  "vegetable",
  "household",
  "personal",
  "atta",
  "rice",
  "oil",
  "biscuit",
  "chips",
  "chocolate",
  "tea",
  "coffee",
  "ice cream",
  "paneer",
  "curd",
  "cheese",
  "butter",
];

const QuickCategoryRow = ({ categories = [], singleRow = false }) => {
  const navigate = useNavigate();

  const handleItemClick = (item) => {
    if (item.id === "more") {
      navigate("/categories");
      return;
    }

    // Try finding matching category by name
    const match = categories?.find((c) =>
      c.name?.toLowerCase().includes(item.query.toLowerCase())
    );

    if (match) {
      navigate(`/category/${match._id || match.id}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(item.label)}`);
    }
  };

  // Only allow valid meat/seafood categories from backend
  const { row1, row2 } = React.useMemo(() => {
    const existingQueries = new Set([
      ...ROW_1_ITEMS.map((c) => c.query.toLowerCase()),
      ...ROW_2_ITEMS.map((c) => c.query.toLowerCase()),
    ]);

    const isMeatCategory = (name = "") => {
      const lower = name.toLowerCase();
      const hasDisallowed = DISALLOWED_KEYWORDS.some((kw) => lower.includes(kw));
      if (hasDisallowed) return false;
      return MEAT_KEYWORDS.some((kw) => lower.includes(kw));
    };

    const extraCategories = (categories || [])
      .filter(
        (c) =>
          c.name &&
          !existingQueries.has(c.name.toLowerCase()) &&
          c._id !== "all" &&
          c.id !== "all" &&
          isMeatCategory(c.name)
      )
      .map((c) => ({
        id: c._id || c.id,
        label: c.name,
        query: c.name,
        image: c.image || c.icon || "/categories/beef.png",
      }));

    if (extraCategories.length === 0) {
      return { row1: ROW_1_ITEMS, row2: ROW_2_ITEMS };
    }

    // Distribute any extra meat categories evenly across row 1 and row 2
    const mid = Math.ceil(extraCategories.length / 2);
    const extraRow1 = extraCategories.slice(0, mid);
    const extraRow2 = extraCategories.slice(mid);

    const r2WithoutMore = ROW_2_ITEMS.filter((c) => !c.isMore);
    const moreItem = ROW_2_ITEMS.find((c) => c.isMore);

    return {
      row1: [...ROW_1_ITEMS, ...extraRow1],
      row2: [...r2WithoutMore, ...extraRow2, moreItem].filter(Boolean),
    };
  }, [categories]);

  const allItems = React.useMemo(() => {
    const combined = [...row1, ...row2];
    const withoutMore = combined.filter((c) => !c.isMore);
    const moreItem = combined.find((c) => c.isMore);
    return moreItem ? [...withoutMore, moreItem] : withoutMore;
  }, [row1, row2]);

  const renderCategoryItem = (item) => (
    <motion.div
      key={item.id}
      whileTap={{ scale: 0.93 }}
      onClick={() => handleItemClick(item)}
      className="flex flex-col items-center cursor-pointer select-none shrink-0 w-[64px] sm:w-[72px] group"
    >
      <div className="w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] rounded-full overflow-hidden shadow-xs border border-[#F0E4DA] bg-[#FAF3EE] transition-transform duration-200 group-hover:scale-105 flex items-center justify-center">
        {item.isMore ? (
          <div className="w-full h-full flex items-center justify-center text-[#520e1e]">
            <MoreIcon />
          </div>
        ) : (
          <img
            src={item.image}
            alt={item.label}
            className="w-full h-full object-cover select-none pointer-events-none"
            loading="eager"
          />
        )}
      </div>
      <span className="text-[11px] sm:text-[12px] font-semibold text-[#2A2A2A] text-center tracking-tight mt-1 leading-tight line-clamp-1 group-hover:text-[#520e1e] transition-colors">
        {item.label}
      </span>
    </motion.div>
  );

  if (singleRow) {
    return (
      <div className="relative z-10 w-full pt-1 pb-2 select-none">
        <div className="w-full overflow-x-auto no-scrollbar px-1">
          <div className="flex items-center gap-3 sm:gap-4 min-w-max pb-1">
            {allItems.map(renderCategoryItem)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full pt-2 pb-3">
      <div className="w-full overflow-x-auto no-scrollbar px-3 sm:px-4">
        <div className="flex flex-col gap-2.5 min-w-max pb-1">
          {/* Row 1 - Pure Meats */}
          <div className="flex items-center gap-3 sm:gap-4">
            {row1.map(renderCategoryItem)}
          </div>

          {/* Row 2 - Seafood & Meat Specialties */}
          <div className="flex items-center gap-3 sm:gap-4">
            {row2.map(renderCategoryItem)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickCategoryRow);
