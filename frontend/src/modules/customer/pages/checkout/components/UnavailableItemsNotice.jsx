import React from "react";
import { AlertTriangle } from "lucide-react";
import { cleanProductName } from "@/core/utils/productName";

/**
 * UnavailableItemsNotice
 *
 * Shown when some cart items can't be delivered to the selected address
 * (one location is served by one seller). Names each item and its seller and
 * lets the customer remove just that item instead of clearing the whole cart.
 *
 * Props:
 *   items            – [{ productId, variantSku, name, sellerName }]
 *   onRemove         – (productId, variantSku) => void
 *   onRemoveAll      – () => void (removes only the listed items)
 */
const UnavailableItemsNotice = React.memo(function UnavailableItemsNotice({
  items = [],
  onRemove,
  onRemoveAll,
}) {
  if (!items.length) return null;
  return (
    <div
      data-testid="unavailable-items-notice"
      className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-700">
            {items.length === 1
              ? "1 item can't be delivered to this address"
              : `${items.length} items can't be delivered to this address`}
          </p>
          <p className="text-xs text-red-600">
            Remove {items.length === 1 ? "it" : "them"} to continue with the rest of your cart.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={`${item.productId}::${item.variantSku || ""}`}
            data-testid="unavailable-item"
            className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2 border border-red-100">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{cleanProductName(item.name)}</p>
              <p className="text-[11px] text-slate-500 truncate">Sold by {item.sellerName}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.productId, item.variantSku)}
              className="text-xs font-bold text-red-600 border border-red-200 rounded-lg px-3 py-1 hover:bg-red-50 flex-shrink-0">
              Remove
            </button>
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <button
          type="button"
          onClick={onRemoveAll}
          className="text-xs font-bold text-red-600 underline">
          Remove all unavailable items
        </button>
      )}
    </div>
  );
});

export default UnavailableItemsNotice;
