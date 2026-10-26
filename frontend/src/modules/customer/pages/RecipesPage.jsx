import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UtensilsCrossed,
  ChevronLeft,
  Clock,
  Users,
  Search,
  Sparkles,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { customerApi } from "../services/customerApi";

const CATEGORIES = ["All", "Mutton", "Chicken", "Fish", "Curries", "Biryani"];

const RecipesPage = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedCategory !== "All") params.category = selectedCategory;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await customerApi.getRecipes(params);
        const payload = res?.data?.result || res?.data?.data || res?.data?.results || {};
        setRecipes(payload?.items || (Array.isArray(payload) ? payload : []));
      } catch (err) {
        console.error("Failed to fetch recipes:", err);
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FAF6F0] pb-24 font-poppins text-[#1A1A1A]">
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 h-14 flex items-center justify-between shadow-sm select-none"
        style={{ background: "#FDCE04" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform rounded-full hover:bg-black/5 -ml-1"
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <h1 className="text-[17px] sm:text-lg font-normal font-anton tracking-wide text-[#1A1A1A] uppercase">
            Culinary Recipes
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A6A60]" />
          <input
            type="text"
            placeholder="Search recipes (e.g. Korma, Biryani, Tikka)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl border border-[#EBE3D5] text-xs font-medium placeholder-[#A39282] focus:outline-none focus:border-[#FDCE04] shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat
                  ? "bg-[#1A1A1A] text-[#FDCE04] shadow-sm"
                  : "bg-white text-[#7A6A60] border border-[#EBE3D5] hover:border-[#FDCE04]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading / List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#FDCE04]" size={26} />
          </div>
        ) : recipes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[#EBE3D5] text-center shadow-sm">
            <UtensilsCrossed size={32} className="mx-auto text-[#CEB186] mb-2" />
            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">No recipes found</h3>
            <p className="text-xs text-[#7A6A60]">
              Try a different keyword or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {recipes.map((recipe) => (
              <Link
                key={recipe._id}
                to={`/recipes/${recipe.slug || recipe._id}`}
                className="bg-white rounded-2xl overflow-hidden border border-[#EBE3D5] shadow-sm hover:border-[#FDCE04] transition-all flex flex-col group"
              >
                <div className="h-40 bg-[#FAF6F0] relative overflow-hidden">
                  {recipe.image ? (
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#CEB186]">
                      <UtensilsCrossed size={36} />
                    </div>
                  )}
                  {recipe.difficulty && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#1A1A1A]/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                      {recipe.difficulty}
                    </span>
                  )}
                </div>

                <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-[#1A1A1A] leading-snug line-clamp-1">
                      {recipe.title}
                    </h3>
                    <p className="text-xs text-[#7A6A60] line-clamp-2 mt-1 leading-relaxed">
                      {recipe.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#7A6A60] pt-2 border-t border-[#F2EDE4]">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-[#B45309]" />
                      <span>{(recipe.prepTimeMinutes || 15) + (recipe.cookTimeMinutes || 30)} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={12} className="text-[#047857]" />
                      <span>{recipe.servings || 4} serves</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#1A1A1A] flex items-center">
                      Recipe-to-Cart <ChevronRight size={13} className="text-[#B45309]" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipesPage;
