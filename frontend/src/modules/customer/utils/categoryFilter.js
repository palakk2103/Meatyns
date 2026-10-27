/**
 * Category filtering utility for Customer App (iOS Store Submission)
 * Restricts customer visible categories strictly to Chicken and Mutton (and their subcategories).
 */

const CHICKEN_MUTTON_REGEX = /chicken|poultry|murga|mutton|goat|lamb|gosht|bakra/i;
const EXCLUDED_REGEX = /fish|seafood|prawn|shrimp|crab|egg|anda|machli|cold cut|cold-cut|salami|sausage|ready-to-cook|ready to cook|spread|ready-to-eat|grocery|dairy|fruit|vegetable/i;

export const isChickenOrMutton = (categoryOrName) => {
  if (!categoryOrName) return false;
  
  if (typeof categoryOrName === 'string') {
    const text = categoryOrName.trim().toLowerCase();
    if (text === 'all') return true;
    if (EXCLUDED_REGEX.test(text) && !CHICKEN_MUTTON_REGEX.test(text)) return false;
    return CHICKEN_MUTTON_REGEX.test(text);
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

  return CHICKEN_MUTTON_REGEX.test(combined);
};

export const filterChickenAndMuttonTree = (tree = []) => {
  if (!Array.isArray(tree)) return [];

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
