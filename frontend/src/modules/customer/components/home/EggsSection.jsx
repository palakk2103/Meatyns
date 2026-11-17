import React, { useEffect, useState } from "react";
import { customerApi } from "../../services/customerApi";
import TopPicksSection from "./TopPicksSection";

// Home section listing products of the "Eggs" header category.
const EggsSection = ({ categories = [] }) => {
  const [products, setProducts] = useState([]);
  const eggsHeader = (categories || []).find(
    (c) => String(c?.name || "").trim().toLowerCase() === "eggs" && c?.type !== "category"
  );
  const headerId = eggsHeader?._id || eggsHeader?.id;

  useEffect(() => {
    if (!headerId) return undefined;
    let cancelled = false;
    customerApi
      .getProducts({ headerId, limit: 20 })
      .then((res) => {
        const raw = res?.data?.result;
        const list = Array.isArray(res?.data?.results)
          ? res.data.results
          : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw)
              ? raw
              : [];
        if (!cancelled) setProducts(list.map((p) => ({ ...p, id: p._id })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [headerId]);

  if (!headerId || products.length === 0) return null;

  return (
    <TopPicksSection
      products={products}
      curated
      title="Fresh Eggs"
      icon="🥚"
      viewAllPath={`/category/${headerId}`}
    />
  );
};

export default React.memo(EggsSection);
