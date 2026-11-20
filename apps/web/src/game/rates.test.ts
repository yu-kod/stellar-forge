import { describe, expect, it } from "vitest";
import { burnRate, energyMultiplier, isIgnited, rateConstant, stageCost } from "./rates";
import { createGame } from "./star";

describe("rateConstant", () => {
  it("k = 0.4 × 基本速度 × Lv。Lv0 なら燃えない", () => {
    const { meta, star } = createGame();
    expect(rateConstant(meta, star, "H")).toBeCloseTo(0.4 * 0.004 * 1);
    star.levels.H = 7;
    expect(rateConstant(meta, star, "H")).toBeCloseTo(0.4 * 0.004 * 7);
    expect(rateConstant(meta, star, "He")).toBe(0);
  });

  it("Lv10 ごとに2倍になる", () => {
    const { meta, star } = createGame();
    star.levels.C = 10;
    expect(rateConstant(meta, star, "C")).toBeCloseTo(0.4 * 0.004 * 10 * 2);
    star.levels.C = 25;
    expect(rateConstant(meta, star, "C")).toBeCloseTo(0.4 * 0.004 * 25 * 4);
  });

  it("反応断面積は全段階、金属量は水素燃焼だけに効く", () => {
    const { meta, star } = createGame();
    meta.shop.xs = 2;
    meta.shop.cno = 2;
    star.levels.He = 1;
    expect(rateConstant(meta, star, "H")).toBeCloseTo(0.4 * 0.004 * 1.25 ** 2 * 1.5);
    expect(rateConstant(meta, star, "He")).toBeCloseTo(0.4 * 0.004 * 1.25 ** 2);
  });

  it("炭素・ネオン・硫黄の発見で、それぞれヘリウム・炭素・酸素燃焼が2倍になる", () => {
    const { meta, star } = createGame();
    star.levels = { H: 1, He: 1, C: 1, Ne: 1, O: 1, Si: 0 };
    meta.discovered = { C: true, Ne: true, S: true };
    const k = 0.4 * 0.004;
    expect(rateConstant(meta, star, "He")).toBeCloseTo(k * 2);
    expect(rateConstant(meta, star, "C")).toBeCloseTo(k * 2);
    expect(rateConstant(meta, star, "O")).toBeCloseTo(k * 2);
    expect(rateConstant(meta, star, "Ne")).toBeCloseTo(k);
  });
});

describe("isIgnited", () => {
  it("コア温度が点火温度以上なら点火済み", () => {
    const { star } = createGame();
    expect(isIgnited(star, "H")).toBe(true);
    expect(isIgnited(star, "He")).toBe(false);
    star.temperature = 2e8;
    expect(isIgnited(star, "He")).toBe(true);
  });
});

describe("burnRate", () => {
  it("燃焼量は k × 燃料。点火していなければ 0", () => {
    const { meta, star } = createGame();
    expect(burnRate(meta, star, "H")).toBeCloseTo(0.4 * 0.004 * 25);
    star.levels.He = 1;
    star.mass.He = 5;
    expect(burnRate(meta, star, "He")).toBe(0);
  });

  it("燃料が2種類ある段階は合計を燃料にする", () => {
    const { meta, star } = createGame();
    star.temperature = 1.5e9;
    star.levels.O = 1;
    star.mass.O = 2;
    expect(burnRate(meta, star, "O")).toBeCloseTo(0.4 * 0.004 * 2);
  });
});

describe("stageCost", () => {
  it("初期費用 × 成長率^Lv。マグネシウムを発見すると15%安い", () => {
    const { meta, star } = createGame();
    expect(stageCost(meta, star, "H")).toBeCloseTo(2e44 * 1.55);
    star.levels.He = 3;
    expect(stageCost(meta, star, "He")).toBeCloseTo(8e44 * 1.6 ** 3);
    meta.discovered.Mg = true;
    expect(stageCost(meta, star, "He")).toBeCloseTo(8e44 * 1.6 ** 3 * 0.85);
  });
});

describe("energyMultiplier", () => {
  it("質量欠損の回収で Lv ごとに2倍、ヘリウムの発見でさらに2倍", () => {
    const { meta } = createGame();
    expect(energyMultiplier(meta)).toBe(1);
    meta.shop.yield = 3;
    meta.discovered.He = true;
    expect(energyMultiplier(meta)).toBe(16);
  });
});
