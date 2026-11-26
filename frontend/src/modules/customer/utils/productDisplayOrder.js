// Front-page product sequence supplied by the client (Google Sheet "Product Name" column).
// Products are matched by normalized name (case/spacing/punctuation-insensitive),
// so small spelling differences like "T-Bone" vs "T Bone" still match.
// Products not in this list keep their original relative order and come after.
const CHICKEN_ORDER = [
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

export const PRODUCT_DISPLAY_ORDER = [
  // Mutton: Sr.No from the client's price sheet. Extra spellings of the same
  // item share its slot. Items not yet in the catalogue slot in once added.
  "Meatyns Special Mutton ( Liver & Fat less )", // 1
  "Meatyns Regular ( Liver & Fat add )", // 2
  "Goat Curry Cut", // 3
  "Mutton Liver", // 4
  "Mutton Liver Chunks",
  "Premium Goat Rib Bone Pieces", // 5
  "Pure Mince (Kheema)", // 6
  "Pure Lamb Mince (Kheema)",
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
  "Premium Goat Shoulder Curry Cut",
  ...CHICKEN_ORDER,
];

// Pune outlet(s) only: Sr.No from the Pune price sheet (sequence only).
// Every other seller keeps PRODUCT_DISPLAY_ORDER. Add new Pune seller ids here.
const PUNE_SELLER_IDS = new Set([
  "6afab055ec0941919e8d7a75", // Meatyns Pune (Baner)
]);

const PUNE_MUTTON_ORDER = [
  "Meatyns Special Mutton ( Liver & Fat less )", // 1
  "Meatyns Regular ( Liver & Fat add )", // 2
  "Goat Curry Cut", // 3
  "Goat Biryani Cut", // 4
  "Premium Goat Curry Cut (Long Shoulder, Boneless & Goat Shank)", // 5
  "Premium Goat Shoulder Curry Cut",
  "Mutton Chops ( Ribcage & T Bone Steak )", // 6 (Goat Chops)
  "Goat Chops",
  "Sunday Family Pack", // 7
  "Mutton Ran", // 8
  "Goat Boneless ( Full Boneless )", // 9
  "Goat Boneless",
  "Pure Mince (Kheema)", // 10
  "Pure Lamb Mince (Kheema)",
  "Pure Meat Kheema (Mince)",
  "Premium Goat Rib Bone Pieces", // 11
  "Premium Goat - Ribs Bone Pieces",
  "Mutton Power Pack", // 12
  "Mutton Soup Bones", // 13
  "Mutton Liver", // 14
  "Mutton Liver Chunks",
  "Mutton Kidney (Small Pack)", // 15
  "Mutton Kidney",
  "Mutton Kapura (Medium)", // 16
  "Mutton Kapura",
  "Mutton Kapura (Large)", // 17
  "Mutton Kapura Large",
  "Mutton Spleen (Thilli)", // 18
  "Mutton Heart", // 19
  "Lamb Fat", // 20
  "Fat",
  "Goat Paya Mundi (Whole)", // 21
  "Goat Paya Mundi",
  "Goat Head", // 22
  "Mutton Paya ( Whole ) pack of 4", // 23
  "Mutton Paya",
  "Mutton Paya with small pieces", // 24
  "Mutton Paya (with cutting small piece)",
  "Mutton Brain (Bheja)", // 25
  "Goat Head Meat (cutting of small piece)", // 26
  "Goat Intestine (Vajadi)", // 27
  "Rakti", // 28
];

const normalizeName = (name) =>
  String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const buildOrderIndex = (names) =>
  new Map(names.map((name, index) => [normalizeName(name), index]));

const ORDER_INDEX = buildOrderIndex(PRODUCT_DISPLAY_ORDER);
const PUNE_ORDER_INDEX = buildOrderIndex([...PUNE_MUTTON_ORDER, ...CHICKEN_ORDER]);

const sellerIdOf = (product) =>
  String(product?.sellerId?._id || product?.sellerId || "");

// The Pune sequence applies only when every product belongs to a Pune seller,
// so Kolhapur and mixed (all-seller) lists keep the default sequence.
const orderIndexFor = (products) =>
  products.length && products.every((p) => PUNE_SELLER_IDS.has(sellerIdOf(p)))
    ? PUNE_ORDER_INDEX
    : ORDER_INDEX;

export const getProductDisplayRank = (product, index = ORDER_INDEX) => {
  const rank = index.get(normalizeName(product?.name));
  return rank === undefined ? Number.MAX_SAFE_INTEGER : rank;
};

// Stable sort: listed products first in sheet order, the rest in original order.
export const sortByDisplayOrder = (products = []) => {
  const list = products || [];
  const orderIndex = orderIndexFor(list);
  return list
    .map((product, index) => ({ product, index, rank: getProductDisplayRank(product, orderIndex) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ product }) => product);
};
