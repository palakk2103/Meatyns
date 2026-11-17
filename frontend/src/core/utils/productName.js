// Strips "1 pack" / "2 packs" style text from a product name for display only.
export const cleanProductName = (n) =>
  String(n ?? "").replace(/[\s(\-–,]*\b\d+\s*packs?\b[\s)]*/gi, " ").replace(/\s{2,}/g, " ").trim() || String(n ?? "");
