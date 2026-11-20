import { describe, expect, it } from "vitest";
import { formatMass, formatNumber } from "./format";

describe("formatNumber：大きな数は仮数2桁と上付きの指数で書く", () => {
  it.each([
    [1.234e45, "J", "1.23×10⁴⁵ J"],
    [2.7e9, "K", "2.70×10⁹ K"],
    [10000, "J", "1.00×10⁴ J"],
    [9.999e45, "J", "1.00×10⁴⁶ J"],
    [0.001, "M☉/s", "1.00×10⁻³ M☉/s"],
  ])("%d %s → %s", (value, unit, expected) => {
    expect(formatNumber(value, unit)).toBe(expected);
  });

  it.each([
    [9999, "9,999 J"],
    [12.345, "12.35 J"],
    [0.01, "0.01 J"],
    [0, "0 J"],
  ])("1万未満・0.01以上はそのまま書く：%d → %s", (value, expected) => {
    expect(formatNumber(value, "J")).toBe(expected);
  });

  it("単位を省略できる", () => {
    expect(formatNumber(3e20)).toBe("3.00×10²⁰");
  });

  it("無限大は ∞ と書く", () => {
    expect(formatNumber(Infinity, "J")).toBe("∞");
  });
});

describe("formatMass：質量は M☉ で書く", () => {
  it.each([
    [1.4, "1.40 M☉"],
    [9.994, "9.99 M☉"],
    [25, "25.0 M☉"],
  ])("%d → %s", (value, expected) => {
    expect(formatMass(value)).toBe(expected);
  });
});
