import { jest } from "@jest/globals";

// The controller imports Mongoose models; none of the helpers under test touch the DB.
const { __test } = await import("../app/controller/dailyStockController.js");
const { toPiecesAndKg, resolveRange, parseEntryBody, buildRow, walkStock, stockAtEnd, stockAtStart } = __test;

const E = (obj) => new Map(Object.entries(obj));
const sale = (pieces, kg = 0) => ({ pieces, kg });

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

describe("daily stock – opening stock carries forward", () => {
  test("the client's example: Mon 10 in / 7 sold, Tue 2 sold -> Tue closes at 1", () => {
    const records = walkStock({
      entries: E({ "2026-11-02": { receivedPieces: 10, manualSoldPieces: 7 } }),
      sales: E({ "2026-11-03": sale(2) }),
      to: "2026-11-10",
    });
    const mon = records.find((r) => r.date === "2026-11-02");
    const tue = records.find((r) => r.date === "2026-11-03");
    expect(mon.row.balancePieces).toBe(3);
    expect(tue.row.openingPieces).toBe(3);
    expect(tue.row.balancePieces).toBe(1);
  });

  test("quiet days keep the stock (carry over)", () => {
    const records = walkStock({
      entries: E({ "2026-11-02": { receivedPieces: 10, receivedKg: 100 } }),
      sales: new Map(),
      to: "2026-11-10",
    });
    expect(stockAtEnd(records, "2026-11-08")).toEqual({ p: 10, k: 100 });
    expect(stockAtStart(records, "2026-11-08")).toEqual({ p: 10, k: 100 });
  });

  test("a starting stock sets the first day's opening", () => {
    const records = walkStock({
      entries: E({ "2026-11-02": { startStockPieces: 5, startStockKg: 60, receivedPieces: 2 } }),
      sales: new Map(),
      to: "2026-11-02",
    });
    expect(records[0].row.openingPieces).toBe(5);
    expect(records[0].row.balancePieces).toBe(7);
    expect(records[0].row.balanceKg).toBe(60);
  });

  test("a starting stock mid-way corrects the running figure", () => {
    const records = walkStock({
      entries: E({
        "2026-11-02": { receivedPieces: 10 },
        "2026-11-04": { startStockPieces: 4 }, // physical count says 4
      }),
      sales: E({ "2026-11-03": sale(1) }),
      to: "2026-11-05",
    });
    expect(stockAtEnd(records, "2026-11-03")).toEqual({ p: 9, k: 0 });
    expect(stockAtStart(records, "2026-11-04")).toEqual({ p: 4, k: 0 });
    expect(stockAtEnd(records, "2026-11-05")).toEqual({ p: 4, k: 0 });
  });

  test("sales before the first entry never push stock negative", () => {
    const records = walkStock({
      entries: E({ "2026-11-05": { receivedPieces: 6 } }),
      sales: E({ "2026-11-01": sale(3) }),
      to: "2026-11-06",
    });
    const early = records.find((r) => r.date === "2026-11-01");
    expect(early.tracked).toBe(false);
    expect(early.row.soldPieces).toBe(3); // still shown as sold
    expect(early.row.balancePieces).toBe(0);
    expect(stockAtEnd(records, "2026-11-06")).toEqual({ p: 6, k: 0 });
  });

  test("a product with only sales (never entered) holds no stock", () => {
    const records = walkStock({ entries: new Map(), sales: E({ "2026-11-01": sale(2) }), to: "2026-11-02" });
    expect(stockAtEnd(records, "2026-11-02")).toEqual({ p: 0, k: 0 });
  });

  test("selling more than the recorded stock goes negative (visible data gap)", () => {
    const records = walkStock({
      entries: E({ "2026-11-02": { receivedPieces: 2 } }),
      sales: E({ "2026-11-03": sale(5) }),
      to: "2026-11-03",
    });
    expect(stockAtEnd(records, "2026-11-03")).toEqual({ p: -3, k: 0 });
  });

  test("starting stock can be cleared with null and is validated", () => {
    const productId = "64b7f0f0f0f0f0f0f0f0f0f0";
    expect(parseEntryBody({ date: "2026-11-01", productId, startStockPieces: null }).set).toEqual({ startStockPieces: null });
    expect(parseEntryBody({ date: "2026-11-01", productId, startStockKg: "" }).set).toEqual({ startStockKg: null });
    expect(parseEntryBody({ date: "2026-11-01", productId, startStockPieces: 5 }).set).toEqual({ startStockPieces: 5 });
    expect(parseEntryBody({ date: "2026-11-01", productId, startStockPieces: -1 }).error).toBeTruthy();
  });
});

describe("daily stock – reconciliation figures", () => {
  test("starting stock is reported as an adjustment, carry-forward is not", () => {
    const records = walkStock({
      entries: E({
        "2026-11-02": { startStockPieces: 10, receivedPieces: 5 },
        "2026-11-03": { manualSoldPieces: 3 },
        "2026-11-04": { startStockPieces: 9 }, // physical count: expected 12, found 9
      }),
      sales: new Map(),
      to: "2026-11-04",
    });
    const by = Object.fromEntries(records.map((r) => [r.date, r.row]));
    expect(by["2026-11-02"].adjustPieces).toBe(10);
    expect(by["2026-11-03"].adjustPieces).toBe(0);
    expect(by["2026-11-04"].adjustPieces).toBe(-3);
    // opening + received - sold - wastage + adjustment... is already inside opening; closing matches
    expect(by["2026-11-04"].balancePieces).toBe(9);
  });

  test("sales of a product with no stock entry are flagged as untracked, not deducted", () => {
    const records = walkStock({
      entries: E({ "2026-11-05": { receivedPieces: 6 } }),
      sales: E({ "2026-11-01": sale(3), "2026-11-05": sale(1) }),
      to: "2026-11-05",
    });
    const early = records.find((r) => r.date === "2026-11-01").row;
    const first = records.find((r) => r.date === "2026-11-05").row;
    expect(early.untrackedSoldPieces).toBe(3);
    expect(first.untrackedSoldPieces).toBe(0);
    expect(first.balancePieces).toBe(5); // tracked from day one: 6 received - 1 sold
  });
});
