// Front-page product sequence supplied by the client (Google Sheet "Product Name" column).
// Products are matched by normalized name (case/spacing/punctuation-insensitive),
// so small spelling differences like "T-Bone" vs "T Bone" still match.
// Products not in this list keep their original relative order and come after.
export const PRODUCT_DISPLAY_ORDER = [
  "Meatyns Special Mutton ( Liver & Fat less )",
  "Meatyns Regular ( Liver & Fat add )",
  "Goat Curry Cut",
  "Mutton Liver",
  "Premium Goat Curry Cut (Long Shoulder, Boneless & Goat Shank)",
  "Mutton Paya ( Whole ) pack of 4",
  "Mutton Paya with small pieces",
  "Goat Head [ Full Head ]",
  "Goat Paya Mundi (4 Legs + Whole Mundi)",
  "Goat Head Meat ( Cutting of small pieces )",
  "Pure Lamb Mince (Boneless Mince)",
  "Mutton Kidney (Small Pack, Whole Kidney)",
  "Mutton Brain ( Full Piece )",
  "Mutton Kapura (Full One Piece - Internal Organs)",
  "Sunday Family Feast (Goat Curry Cut)",
  "Mutton Chops ( Ribcage & T Bone Steak )",
  "Mutton Heart (Full Piece)",
  "Goat Boneless ( Full Boneless )",
  "Goat Biryani Cut (Boneless, Small Pieces)",
  "Lamb Fat (Fully Loaded Fat)",
  "Mutton Energy Combo (Heart, Liver & Bone)",
  "Mutton Chest (Only Sinha Single Piece)",
  "Mutton Spleen (Special Body Part Near Liver)",
  "Special Chops & Curry Cut",
  "Mutton Soup Bones (Shank & Bone)",
  "Premium Goat Cuts (Ribs & Bone Pieces)",
  "Rakhti (Goat Blood)",
  "Vajadi ( Goat Intestine )",
  "Goat Lower Body Cut (Kosha Mangosha)",
  "Mutton Paya (Small Pieces)",
  "Lamb (Mixed Pieces)",
];

const normalizeName = (name) =>
  String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ORDER_INDEX = new Map(
  PRODUCT_DISPLAY_ORDER.map((name, index) => [normalizeName(name), index])
);

export const getProductDisplayRank = (product) => {
  const rank = ORDER_INDEX.get(normalizeName(product?.name));
  return rank === undefined ? Number.MAX_SAFE_INTEGER : rank;
};

// Stable sort: listed products first in sheet order, the rest in original order.
export const sortByDisplayOrder = (products = []) =>
  (products || [])
    .map((product, index) => ({ product, index, rank: getProductDisplayRank(product) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ product }) => product);
