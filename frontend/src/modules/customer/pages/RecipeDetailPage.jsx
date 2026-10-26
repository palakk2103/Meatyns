import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Clock,
  Users,
  ShoppingCart,
  Check,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  Loader2,
  Share2,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { useToast } from "@shared/components/ui/Toast";

const RecipeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const res = await customerApi.getRecipeDetails(id);
        const payload = res?.data?.result || res?.data?.data || null;
        setRecipe(payload);

        // Pre-select all available mapped ingredients
        if (Array.isArray(payload?.ingredients)) {
          const mappedIds = payload.ingredients
            .filter((i) => i.productId && i.productId.stock > 0 && i.productId.status === "active")
            .map((i) => String(i.productId._id));
          setSelectedProductIds(mappedIds);
        }
      } catch (err) {
        console.error("Failed to load recipe:", err);
        showToast("Unable to load recipe details", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const toggleProductSelection = (productId) => {
    const pIdStr = String(productId);
    setSelectedProductIds((prev) =>
      prev.includes(pIdStr)
        ? prev.filter((id) => id !== pIdStr)
        : [...prev, pIdStr]
    );
  };

  const handleAddSelectedToCart = async () => {
    if (selectedProductIds.length === 0) {
      showToast("Please select at least one ingredient to add", "warning");
      return;
    }

    setAddingToCart(true);
    try {
      const res = await customerApi.addRecipeIngredientsToCart(recipe._id, {
        selectedProductIds,
      });
      const msg = res?.data?.message || "Ingredients added to cart!";
      showToast(msg, "success");
      // Offer 1-click cart navigation
    } catch (err) {
      console.error("Failed to add recipe to cart:", err);
      showToast(err?.response?.data?.message || "Failed to add ingredients", "error");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] font-poppins">
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white shadow-sm border border-[#EBE3D5]">
          <Loader2 className="animate-spin text-[#FDCE04]" size={22} />
          <span className="text-sm font-semibold text-[#1A1A1A]">Preparing recipe…</span>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] p-6 text-center">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Recipe not found</h2>
        <button
          onClick={() => navigate("/recipes")}
          className="mt-4 px-4 py-2 bg-[#FDCE04] rounded-full text-xs font-bold"
        >
          Back to Recipes
        </button>
      </div>
    );
  }

  const mappedCount = (recipe.ingredients || []).filter((i) => i.productId).length;

  return (
    <div className="min-h-screen bg-[#FAF6F0] pb-28 font-poppins text-[#1A1A1A]">
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 h-14 flex items-center justify-between shadow-sm select-none"
        style={{ background: "#FDCE04" }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-8 h-8 flex items-center justify-center text-[#1A1A1A] active:scale-90 transition-transform rounded-full hover:bg-black/5 -ml-1"
        >
          <ChevronLeft size={24} strokeWidth={2.4} />
        </button>
        <h1 className="text-[17px] sm:text-lg font-normal font-anton tracking-wide text-[#1A1A1A] uppercase truncate max-w-[220px]">
          {recipe.title}
        </h1>
        <div className="w-8" />
      </header>

      {/* Hero Image */}
      <div className="h-64 sm:h-72 w-full bg-[#1A1A1A] relative overflow-hidden">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#CEB186]">
            <UtensilsCrossed size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <span className="px-2.5 py-0.5 rounded-md bg-[#FDCE04] text-[#1A1A1A] text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
            {recipe.category || "Specialty"}
          </span>
          <h2 className="text-xl sm:text-2xl font-black font-anton tracking-wide leading-tight">
            {recipe.title}
          </h2>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-4 space-y-4">
        {/* Quick Specs */}
        <div className="bg-white rounded-2xl p-4 border border-[#EBE3D5] shadow-sm grid grid-cols-3 gap-2 text-center">
          <div>
            <Clock size={16} className="mx-auto text-[#B45309] mb-1" />
            <span className="text-xs font-extrabold text-[#1A1A1A] block">
              {(recipe.prepTimeMinutes || 15) + (recipe.cookTimeMinutes || 30)} Mins
            </span>
            <span className="text-[10px] text-[#7A6A60] uppercase">Cook Time</span>
          </div>
          <div>
            <Users size={16} className="mx-auto text-[#047857] mb-1" />
            <span className="text-xs font-extrabold text-[#1A1A1A] block">
              {recipe.servings || 4} Portions
            </span>
            <span className="text-[10px] text-[#7A6A60] uppercase">Servings</span>
          </div>
          <div>
            <UtensilsCrossed size={16} className="mx-auto text-[#C81017] mb-1" />
            <span className="text-xs font-extrabold text-[#1A1A1A] block">
              {recipe.difficulty || "Medium"}
            </span>
            <span className="text-[10px] text-[#7A6A60] uppercase">Difficulty</span>
          </div>
        </div>

        {/* Recipe-to-Cart Ingredient Bundle Card */}
        <div className="bg-white rounded-2xl p-4 border border-[#FDE68A] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                <span>Recipe Ingredients</span>
                <span className="text-[10px] font-extrabold bg-[#FEF08A] text-[#1A1A1A] px-2 py-0.5 rounded-full">
                  {mappedCount} In Store
                </span>
              </h3>
              <p className="text-[11px] text-[#7A6A60] mt-0.5">
                Check items you need; we bundle them directly into your cart.
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#F2EDE4] border-t border-b border-[#F2EDE4]">
            {recipe.ingredients?.map((ing, idx) => {
              const product = ing.productId;
              const hasProduct = Boolean(product);
              const isAvailable = hasProduct && product.stock > 0 && product.status === "active";
              const pIdStr = product ? String(product._id) : null;
              const isChecked = pIdStr && selectedProductIds.includes(pIdStr);

              return (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {hasProduct ? (
                      <button
                        type="button"
                        onClick={() => toggleProductSelection(product._id)}
                        disabled={!isAvailable}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-[#1A1A1A] text-[#FDCE04]"
                            : isAvailable
                            ? "border border-[#CEB186] bg-white hover:border-[#1A1A1A]"
                            : "bg-slate-100 border border-slate-200 cursor-not-allowed"
                        }`}
                      >
                        {isChecked && <Check size={13} strokeWidth={3} />}
                      </button>
                    ) : (
                      <span className="w-5 h-5 rounded-md bg-[#FAF6F0] flex items-center justify-center text-[10px] font-bold text-[#CEB186]">
                        •
                      </span>
                    )}

                    <div className="min-w-0">
                      <p className={`font-semibold ${!isAvailable && hasProduct ? "line-through text-slate-400" : "text-[#1A1A1A]"}`}>
                        {ing.name}
                      </p>
                      <p className="text-[10px] text-[#7A6A60]">
                        {ing.quantity} {ing.unit || "unit"} {ing.isOptional && "(Optional)"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {hasProduct ? (
                      isAvailable ? (
                        <span className="text-xs font-black text-[#1A1A1A]">
                          ₹{product.salePrice > 0 ? product.salePrice : product.price}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          Out of Stock
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-[#A39282] italic">
                        Pantry item
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddSelectedToCart}
            disabled={addingToCart || selectedProductIds.length === 0}
            className="w-full py-3 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50"
          >
            {addingToCart ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShoppingCart size={16} />
            )}
            <span>
              Add Selected ({selectedProductIds.length}) to Cart
            </span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 border border-[#EBE3D5] shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-[#1A1A1A]">Cooking Instructions</h3>
          <div className="space-y-3">
            {recipe.instructions?.map((inst, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-[#FEF08A] text-[#1A1A1A] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {inst.step || idx + 1}
                </span>
                <div>
                  {inst.title && (
                    <p className="font-bold text-[#1A1A1A] mb-0.5">{inst.title}</p>
                  )}
                  <p className="text-[#7A6A60]">{inst.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailPage;
