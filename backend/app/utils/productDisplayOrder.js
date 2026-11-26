// Client-supplied product sequence, used by the "catalog" sort in seller/admin lists.
// Keep in sync with frontend/src/modules/customer/utils/productDisplayOrder.js.
export const PRODUCT_DISPLAY_ORDER = [
  // Mutton: Sr.No from the client's price sheet. Extra spellings of the same
  // item share its slot. Items not yet in the catalogue slot in once added.
  "Meatyns Special Mutton ( Liver & Fat less )", // 1
  "Meatyns Regular ( Liver & Fat add )", // 2
  "Goat Curry Cut", // 3
  "Mutton Liver", // 4
  "Mutton Liver Chunks",
  "Premium Goat Rib Bone Pieces", // 5
  "Pure Lamb Mince (Kheema)", // 6
  "Mutton Kidney (Small Pack)", // 7
  "Mutton Kapura (Medium)", // 8
  "Sunday Family Pack", // 9
  "Mutton Chops ( Ribcage & T Bone Steak )", // 10 (Goat Chops)
  "Goat Chops",
  "Mutton Heart", // 11
  "Goat Boneless ( Full Boneless )", // 12
  "Goat Boneless",
  "Goat Biryani Cut", // 13
  "Lamb Fat", // 14
  "Mutton Power Pack", // 15
  "Lamb (1 kg) Mixed pcs", // 16
  "Mutton Spleen (Thilli)", // 17
  "Mutton Kapura (Large)", // 18
  "Mutton Ran", // 19
  "Mutton Soup Bones", // 20
  "Rakti", // 21
  "Mutton Paya ( Whole ) pack of 4", // 22
  "Mutton Paya",
  "Mutton Paya with small pieces", // 23
  "Mutton Paya (with cutting small piece)",
  "Goat Head", // 24
  "Goat Paya Mundi (Whole)", // 25
  "Mutton Brain (Bheja)", // 26
  "Goat Head Meat (cutting of small piece)", // 27
  "Goat Intestine (Vajadi)", // 28
  // Not on the sheet: stays after the sheet's mutton items
  "Premium Goat Curry Cut (Long Shoulder, Boneless & Goat Shank)",
  // Chicken sequence
  "Chicken Curry Cut",
  "Chicken Breast Boneless",
  "Chicken Legpiece",
  "Chicken Wings",
  "Chicken Lollipop",
  "Chicken Drumsticks",
  "Chicken Liver",
  "Chicken Gizzard",
  // Gavran Chicken
  "Gavran Whole Carcass",
];

const normalizeName = (name) =>
  String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ORDER_INDEX = new Map(
  PRODUCT_DISPLAY_ORDER.map((name, index) => [normalizeName(name), index])
);

const rankOf = (product) =>
  ORDER_INDEX.get(normalizeName(product?.name)) ?? Number.MAX_SAFE_INTEGER;

// Stable: listed products first in sheet order, the rest keep their incoming order.
export const sortByDisplayOrder = (products = []) =>
  [...products].sort((a, b) => rankOf(a) - rankOf(b));
