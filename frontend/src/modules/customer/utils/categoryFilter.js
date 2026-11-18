/**
 * Category filtering utility for Customer App (iOS Store Submission)
 * Restricts customer visible categories strictly to Chicken and Mutton (and their subcategories).
 */

const CHICKEN_MUTTON_REGEX = /chicken|poultry|murga|mutton|goat|lamb|gosht|bakra/i;
const EXCLUDED_REGEX = /fish|seafood|prawn|shrimp|crab|egg|anda|machli|cold cut|cold-cut|salami|sausage|ready-to-cook|ready to cook|spread|ready-to-eat|grocery|dairy|fruit|vegetable/i;

const MUTTON_REGEX = /mutton|goat|lamb|gosht|bakra/i;
const CHICKEN_REGEX = /chicken|poultry|murga/i;

const meatText = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  const cat = item.category;
  const catName = typeof cat === "string" ? "" : cat?.name || "";
  return `${item.name || ""} ${catName}`;
};

// Returns "mutton" | "chicken" | "other" for a category or product
export const getMeatType = (item) => {
  const text = meatText(item);
  if (MUTTON_REGEX.test(text)) return "mutton";
  if (CHICKEN_REGEX.test(text)) return "chicken";
  return "other";
};

const EGG_REGEX = /\beggs?\b|\banda\b/i;

// True for egg products (they have their own "Fresh Eggs" home section).
export const isEggProduct = (item) => {
  if (!item) return false;
  const header = item.headerId;
  const headerName = typeof header === "object" && header ? header.name || "" : "";
  return EGG_REGEX.test(`${meatText(item)} ${headerName}`);
};

// Stable sort: items of `first` type come first, then the other meat, then the rest.
export const sortMeatFirst = (list = [], first = "mutton") => {
  const second = first === "mutton" ? "chicken" : "mutton";
  const rank = (item) => {
    const t = getMeatType(item);
    return t === first ? 0 : t === second ? 1 : 2;
  };
  return [...(list || [])]
    .map((item, i) => ({ item, i, r: rank(item) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.item);
};

export const isChickenOrMutton = (categoryOrName) => {
  return true; // show every category created from the admin panel
  // eslint-disable-next-line no-unreachable
  if (!categoryOrName) return false;
  
  if (typeof categoryOrName === 'string') {
    const text = categoryOrName.trim().toLowerCase();
    if (text === 'all') return true;
    if (EXCLUDED_REGEX.test(text) && !CHICKEN_MUTTON_REGEX.test(text)) return false;
    return true; // allow-by-default so newly created categories render
  }

  const name = String(categoryOrName.name || '').toLowerCase();
  const slug = String(categoryOrName.slug || '').toLowerCase();
  const desc = String(categoryOrName.description || '').toLowerCase();
  const id = String(categoryOrName._id || categoryOrName.id || '').toLowerCase();

  if (name === 'all' || slug === 'all' || id === 'all') return true;

  const combined = `${name} ${slug} ${desc}`;
  if (EXCLUDED_REGEX.test(combined) && !CHICKEN_MUTTON_REGEX.test(combined)) {
    return false;
  }

  return true; // allow-by-default: only the excluded list above is hidden
};

export const filterChickenAndMuttonTree = (tree = []) => {
  if (!Array.isArray(tree)) return [];
  return tree;
  // eslint-disable-next-line no-unreachable

  return tree
    .filter((header) => {
      if (!header) return false;
      const isAll = header.slug === 'all' || header.name?.toLowerCase() === 'all';
      if (isAll) return true;
      return isChickenOrMutton(header);
    })
    .map((header) => {
      // If header is chicken or mutton, retain its children (subcategories), excluding any accidental non-chicken/mutton
      const children = Array.isArray(header.children)
        ? header.children.filter((child) => {
            const childName = String(child.name || '').toLowerCase();
            if (EXCLUDED_REGEX.test(childName) && !CHICKEN_MUTTON_REGEX.test(childName)) {
              return false;
            }
            return true;
          })
        : [];

      return {
        ...header,
        children,
      };
    });
};

export const filterChickenAndMuttonFlat = (list = []) => {
  if (!Array.isArray(list)) return [];
  return list;
  // eslint-disable-next-line no-unreachable

  // Identify chicken and mutton headers/parents
  const allowedHeaderIds = new Set();
  list.forEach((item) => {
    if ((item.type === 'header' || item.type === 'category' || !item.parentId) && isChickenOrMutton(item)) {
      if (item._id) allowedHeaderIds.add(String(item._id));
      if (item.id) allowedHeaderIds.add(String(item.id));
    }
  });

  return list.filter((item) => {
    if (!item) return false;
    const isAll = item.slug === 'all' || item.name?.toLowerCase() === 'all';
    if (isAll) return true;

    // Check direct chicken/mutton match
    if (isChickenOrMutton(item)) return true;

    // Check if child of allowed chicken/mutton header
    const pId = String(item.parentId?._id || item.parentId || '');
    if (pId && allowedHeaderIds.has(pId)) {
      const name = String(item.name || '').toLowerCase();
      // Ensure child itself is not fish/egg/etc.
      if (EXCLUDED_REGEX.test(name) && !CHICKEN_MUTTON_REGEX.test(name)) {
        return false;
      }
      return true;
    }

    return false;
  });
};
