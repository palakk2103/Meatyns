import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  ChevronLeft,
  ShoppingCart,
  Percent,
  CheckCircle2,
  Package,
  Loader2,
  Sparkles,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { useToast } from "@shared/components/ui/Toast";

const CombosPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  const fetchCombos = async () => {
    setLoading(true);
    try {
      const res = await customerApi.getCombos();
      const payload = res?.data?.result || res?.data?.data || res?.data?.results || {};
      setCombos(payload?.items || (Array.isArray(payload) ? payload : []));
    } catch (err) {
      console.error("Failed to load combos:", err);
      setCombos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCombos();
  }, []);

  const handleAddCombo = async (combo) => {
    setAddingId(combo._id);
    try {
      const res = await customerApi.addComboToCart(combo._id, { quantity: 1 });
      showToast(res?.data?.message || `Added ${combo.name} to cart!`, "success");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to add combo to cart", "error");
    } finally {
      setAddingId(null);
    }
  };

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
            Meal Prep Packs & Combos
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-4 space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF08A]/40 rounded-2xl p-4 border border-[#FDE68A] shadow-sm flex items-start gap-3">
          <Sparkles className="text-[#B45309] shrink-0 mt-0.5" size={22} />
          <div className="text-xs text-[#7A6A60] leading-relaxed">
            <p className="font-bold text-[#1A1A1A] text-[13px] mb-0.5">
              Bundle & Save More
            </p>
            Curated meal prep bundles, family grill packs, and weekday protein essentials discounted up to 25%.
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#FDCE04]" size={26} />
          </div>
        ) : combos.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[#EBE3D5] text-center shadow-sm">
            <Boxes size={32} className="mx-auto text-[#CEB186] mb-2" />
            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">No combo packs available</h3>
            <p className="text-xs text-[#7A6A60]">
              Check back soon for freshly bundled meat packs!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {combos.map((combo) => {
              const discount = combo.originalPrice > combo.comboPrice
                ? Math.round(((combo.originalPrice - combo.comboPrice) / combo.originalPrice) * 100)
                : combo.discountPercentage || 0;

              return (
                <div
                  key={combo._id}
                  className="bg-white rounded-2xl p-4 border border-[#EBE3D5] shadow-sm space-y-3 hover:border-[#FDCE04] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#FEF08A] text-[#1A1A1A]">
                          {combo.tag || "Combo Saver"}
                        </span>
                        {discount > 0 && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Save {discount}%
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-[#1A1A1A] mt-1.5 leading-snug">
                        {combo.name}
                      </h3>
                      {combo.description && (
                        <p className="text-xs text-[#7A6A60] mt-0.5 line-clamp-2">
                          {combo.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-[#1A1A1A]">
                        ₹{combo.comboPrice}
                      </div>
                      {combo.originalPrice > combo.comboPrice && (
                        <div className="text-xs text-[#A39282] line-through font-semibold">
                          ₹{combo.originalPrice}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bundled Items Pills */}
                  <div className="bg-[#FAF6F0] rounded-xl p-3 border border-[#EBE3D5]/60 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase text-[#7A6A60] tracking-wider">
                      Included In This Pack ({combo.items?.length || 0} Items)
                    </p>
                    <div className="space-y-1">
                      {combo.items?.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-[#1A1A1A]"
                        >
                          <span className="font-medium truncate max-w-[220px]">
                            • {it.productId?.name || "Product"}
                          </span>
                          <span className="font-bold text-[#7A6A60]">
                            {it.quantity} {it.unit || "pack"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddCombo(combo)}
                    disabled={addingId === combo._id}
                    className="w-full py-2.5 rounded-xl bg-[#FDCE04] hover:bg-[#E5B800] text-[#1A1A1A] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50"
                  >
                    {addingId === combo._id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ShoppingCart size={15} />
                    )}
                    <span>Add Pack to Cart</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CombosPage;
