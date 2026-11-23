import { jest } from "@jest/globals";

// The controller imports Mongoose models; none of the helpers under test touch the DB.
const { __test } = await import("../app/controller/dailyStockController.js");
const { toPiecesAndKg, resolveRange, parseEntryBody, buildRow } = __test;

describe("daily stock – unit conversion", () => {
  test("kg lines count as kg, scaled by unitValue", () => {
    expect(toPiecesAndKg(2, "kg", 1)).toEqual({ pieces: 0, kg: 2 });
    expect(toPiecesAndKg(3, "kg", 0.5)).toEqual({ pieces: 0, kg: 1.5 });
  });
  test("gram lines are converted to kg", () => {
    expect(toPiecesAndKg(2, "g", 500)).toEqual({ pieces: 0, kg: 1 });
  });
  test("pc / pack / unknown units count as pieces", () => {
    expect(toPiecesAndKg(4, "pc", 1)).toEqual({ pieces: 4, kg: 0 });
    expect(toPiecesAndKg(1, "pack", 1)).toEqual({ pieces: 1, kg: 0 });
    expect(toPiecesAndKg(2, null, null)).toEqual({ pieces: 2, kg: 0 });
  });
  test("missing unitValue defaults to 1", () => {
    expect(toPiecesAndKg(2, "kg", null)).toEqual({ pieces: 0, kg: 2 });
  });
});

describe("daily stock – date range", () => {
  test("accepts a valid range", () => {
    expect(resolveRange({ from: "2026-11-01", to: "2026-11-07" })).toEqual({ from: "2026-11-01", to: "2026-11-07" });
  });
  test("defaults to a 7 day window ending today", () => {
    const r = resolveRange({});
    expect(r.error).toBeUndefined();
    const days = (new Date(r.to) - new Date(r.from)) / 86400000 + 1;
    expect(days).toBe(7);
  });
  test("rejects bad format, reversed and oversized ranges", () => {
    expect(resolveRange({ from: "11-01-2026", to: "2026-11-07" }).error).toBeTruthy();
    expect(resolveRange({ from: "2026-02-31", to: "2026-03-05" }).error).toBeTruthy();
    expect(resolveRange({ from: "2026-11-08", to: "2026-11-07" }).error).toBeTruthy();
    expect(resolveRange({ from: "2026-01-01", to: "2026-11-07" }).error).toBeTruthy();
  });
});

describe("daily stock – entry validation", () => {
  const productId = "64b7f0f0f0f0f0f0f0f0f0f0";
  test("accepts a valid entry and only returns supplied fields", () => {
    const r = parseEntryBody({ date: "2026-11-01", productId, receivedPieces: "10", receivedKg: 120.5 });
    expect(r.set).toEqual({ receivedPieces: 10, receivedKg: 120.5 });
  });
  test("rejects negatives, junk, future dates and empty bodies", () => {
    expect(parseEntryBody({ date: "2026-11-01", productId, receivedPieces: -1 }).error).toBeTruthy();
    expect(parseEntryBody({ date: "2026-11-01", productId, receivedKg: "abc" }).error).toBeTruthy();
    expect(parseEntryBody({ date: "2999-01-01", productId, receivedKg: 1 }).error).toMatch(/future/);
    expect(parseEntryBody({ date: "2026-11-01", productId }).error).toBeTruthy();
    expect(parseEntryBody({ date: "2026-11-01", productId: "nope", receivedKg: 1 }).error).toBeTruthy();
  });
});

describe("daily stock – row maths", () => {
  test("sold = online + manual, balance = received - sold - wastage", () => {
    const row = buildRow(
      { receivedPieces: 10, receivedKg: 100, manualSoldPieces: 1, manualSoldKg: 8, wastagePieces: 1, wastageKg: 2 },
      { pieces: 3, kg: 40 },
    );
    expect(row.soldPieces).toBe(4);
    expect(row.soldKg).toBe(48);
    expect(row.balancePieces).toBe(5);
    expect(row.balanceKg).toBe(50);
  });
  test("a day with only online orders still produces a row", () => {
    const row = buildRow(null, { pieces: 2, kg: 0 });
    expect(row.receivedPieces).toBe(0);
    expect(row.soldPieces).toBe(2);
    expect(row.balancePieces).toBe(-2);
  });
});
