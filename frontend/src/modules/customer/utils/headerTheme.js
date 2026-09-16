/** Shift hex color channels by amount (negative = darker). */
export function shiftHex(hex, amount) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return hex;

  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;

  const value = normalized.slice(1);
  if (value.length !== 6) return hex;

  const clamp = (num) => Math.max(0, Math.min(255, num + amount));
  const r = clamp(parseInt(value.slice(0, 2), 16));
  const g = clamp(parseInt(value.slice(2, 4), 16));
  const b = clamp(parseInt(value.slice(4, 6), 16));

  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

const DEFAULT_BASE = "#520e1e";

/** Search field surface: crisp white matching reference header design. */
export function buildSearchBarBackgroundColor(baseHeaderColor) {
  return "#ffffff";
}

/**
 * Rich luxury header gradient that retains the deep wine/burgundy color tone.
 */
export function buildHeaderGradient(baseHeaderColor) {
  const base = baseHeaderColor || DEFAULT_BASE;
  return `linear-gradient(180deg, ${shiftHex(base, -6)} 0%, ${base} 55%, ${shiftHex(base, -10)} 100%)`;
}

/** Solid fill for floating cart pill: header mid tone, slightly darker. */
export function buildMiniCartColor(baseHeaderColor) {
  return baseHeaderColor || DEFAULT_BASE;
}

/** Gradient for floating mini cart pill (same palette as header, horizontal). */
export function buildMiniCartGradient(baseHeaderColor) {
  const base = baseHeaderColor || DEFAULT_BASE;
  const top = shiftHex(base, -12);
  const mid = shiftHex(base, 20);
  const deep = shiftHex(mid, -32);
  return `linear-gradient(135deg, ${top} 0%, ${mid} 48%, ${deep} 100%)`;
}

