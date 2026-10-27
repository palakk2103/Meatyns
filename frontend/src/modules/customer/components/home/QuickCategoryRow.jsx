import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { isChickenOrMutton } from "../../utils/categoryFilter";

const DEFAULT_CATEGORIES = [
  {
    id: "chicken",
    label: "Chicken",
    query: "chicken",
    image: "/categories/chicken.png",
  },
  {
    id: "mutton",
    label: "Mutton",
    query: "mutton",
    image: "/categories/mutton.png",
  },
];

const QuickCategoryRow = ({ categories = [], singleRow = false }) => {
  const navigate = useNavigate();

  const displayCategories = React.useMemo(() => {
    // Filter dynamic categories strictly to top-level Chicken and Mutton categories
    const valid = (categories || []).filter(
      (c) =>
        c &&
        c.name &&
        c.id !== "all" &&
        c._id !== "all" &&
        c.slug !== "all" &&
        (c.type === "header" || (c.type === "category" && !c.parentId)) &&
        isChickenOrMutton(c)
    );

    if (valid.length > 0) {
      return valid.map((cat) => ({
        id: cat._id || cat.id,
        label: cat.name,
        query: cat.name,
        targetId: cat._id || cat.id,
        image:
          cat.image ||
          (String(cat.name).toLowerCase().includes("mutton") ||
          String(cat.name).toLowerCase().includes("goat")
            ? "/categories/mutton.png"
            : "/categories/chicken.png"),
      }));
    }

    return DEFAULT_CATEGORIES;
  }, [categories]);

  const handleItemClick = (item) => {
    const target = item.targetId || item.id || item.query;
    navigate(`/category/${target}`, {
      state: { categoryName: item.label, isHeaderCategory: true },
    });
  };

  const renderCategoryItem = (item) => (
    <motion.div
      key={item.id}
      whileTap={{ scale: 0.93 }}
      onClick={() => handleItemClick(item)}
      className="flex flex-col items-center cursor-pointer select-none shrink-0 w-[64px] sm:w-[72px] group"
    >
      <div className="w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] rounded-full overflow-hidden shadow-xs border border-[#F0E4DA] bg-[#FAF3EE] transition-transform duration-200 group-hover:scale-105 flex items-center justify-center">
        <img
          src={item.image}
          alt={item.label}
          className="w-full h-full object-cover select-none pointer-events-none"
          loading="eager"
        />
      </div>
      <span className="text-[11px] sm:text-[12px] font-semibold text-[#2A2A2A] text-center tracking-tight mt-1 leading-tight line-clamp-1 group-hover:text-amber-800 transition-colors">
        {item.label}
      </span>
    </motion.div>
  );

  return (
    <div className={`relative z-10 w-full ${singleRow ? "pt-1 pb-2" : "pt-2 pb-3"} select-none`}>
      <div className={`w-full overflow-x-auto no-scrollbar ${singleRow ? "px-1" : "px-3 sm:px-4"}`}>
        <div className="flex items-center gap-4 sm:gap-6 min-w-max pb-1">
          {displayCategories.map(renderCategoryItem)}
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickCategoryRow);
