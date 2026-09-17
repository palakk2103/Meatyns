// Shared between admin (Offer Sections) and customer (Offers page) for consistent section styling.

export const BACKGROUND_COLOR_OPTIONS = [
  {
    id: "golden-yellow",
    label: "Signature Golden Yellow",
    value: "#FDCE04",
    start: "#FECD04",
    end: "#F5C502",
  },
  {
    id: "charcoal",
    label: "Charcoal Black",
    value: "#1A1A1A",
    start: "#111827",
    end: "#1F2937",
  },
  {
    id: "crimson",
    label: "Crimson Red",
    value: "#EF131F",
    start: "#DC2626",
    end: "#B91C1C",
  },
  {
    id: "amber",
    label: "Warm Amber",
    value: "#F59E0B",
    start: "#D97706",
    end: "#B45309",
  },
  {
    id: "roasted",
    label: "Roasted Bronze",
    value: "#24191A",
    start: "#1F1516",
    end: "#3D2214",
  },
];

// Map legacy grocery colors (blue, yellow, etc.) to the app's luxury meat palette
const LEGACY_COLOR_MAP = {
  "#3B82F6": { start: "#5B1019", end: "#8E202C", value: "#7A1F2B" }, // legacy blue -> Signature Burgundy
  "#2563EB": { start: "#5B1019", end: "#8E202C", value: "#7A1F2B" },
  "#FCD34D": { start: "#6B1620", end: "#A93645", value: "#A93645" }, // legacy yellow -> Crimson Red
  "#FB923C": { start: "#8C4D0A", end: "#C48218", value: "#E5A83B" }, // legacy orange -> Warm Amber
  "var(--primary)": { start: "#5B1019", end: "#8E202C", value: "#7A1F2B" },
  "#EC4899": { start: "#68131E", end: "#A82B3C", value: "#942535" }, // legacy pink -> Rich Ruby
  "#8B5CF6": { start: "#1F1516", end: "#4E171E", value: "#24191A" }, // legacy purple -> Roasted Charcoal
};

export const SIDE_IMAGE_OPTIONS = [
  {
    key: "hair-care",
    label: "Hair Care",
    imageUrl:
      "https://images.unsplash.com/photo-1522338242762-594f63bcf581?w=200&h=200&fit=crop",
  },
  {
    key: "grocery",
    label: "Grocery",
    imageUrl:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop",
  },
  {
    key: "electronics",
    label: "Electronics",
    imageUrl:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop",
  },
  {
    key: "beauty",
    label: "Beauty",
    imageUrl:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop",
  },
  {
    key: "kitchen",
    label: "Kitchen",
    imageUrl:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop",
  },
  {
    key: "fashion",
    label: "Fashion",
    imageUrl:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop",
  },
];

export const getSideImageByKey = (key) =>
  SIDE_IMAGE_OPTIONS.find((o) => o.key === key)?.imageUrl ||
  SIDE_IMAGE_OPTIONS[0].imageUrl;

export const getBackgroundColorByValue = (value) => {
  if (value && LEGACY_COLOR_MAP[value]) {
    return LEGACY_COLOR_MAP[value].value;
  }
  return value || BACKGROUND_COLOR_OPTIONS[0].value;
};

export const getBackgroundGradientByValue = (value, index = 0) => {
  if (value && LEGACY_COLOR_MAP[value]) {
    const legacy = LEGACY_COLOR_MAP[value];
    return `linear-gradient(135deg, ${legacy.start}, ${legacy.end})`;
  }
  const opt = BACKGROUND_COLOR_OPTIONS.find((o) => o.value === value);
  if (opt) {
    return `linear-gradient(135deg, ${opt.start}, ${opt.end})`;
  }
  const fallback =
    BACKGROUND_COLOR_OPTIONS[index % BACKGROUND_COLOR_OPTIONS.length] ||
    BACKGROUND_COLOR_OPTIONS[0];
  return `linear-gradient(135deg, ${fallback.start}, ${fallback.end})`;
};


