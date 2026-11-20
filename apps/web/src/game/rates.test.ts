import { describe, expect, it } from "vitest";
import {
  baseRateConstant,
  burnRate,
  effectiveRate,
  energyMultiplier,
  isIgnited,
  rateConstant,
  stageCost,
} from "./rates";
import { RATE_CAP } from "./balance";
import { createGame } from "./star";

function expectRelative(actual: number, expected: number) {
  expect(actual / expected).toBeCloseTo(1, 6);
}

describe("baseRateConstant（上限を掛ける前）", () => {
  it("k = 0.4 × 基本速度 × Lv。Lv0 なら燃えない", () => {
    const { meta, star } = createGame();
    expectRelative(baseRateConstant(meta, star, "H"), 0.4 * 0.004 * 1);
    star.levels.H = 7;
    expectRelative(baseRateConstant(meta, star, "H"), 0.4 * 0.004 * 7);
    expect(baseRateConstant(meta, star, "He")).toBe(0);
  });

  it("Lv10 ごとに2倍になる", () => {
    const { meta, star } = createGame();
    star.levels.C = 10;
    expectRelative(baseRateConstant(meta, star, "C"), 0.4 * 0.004 * 10 * 2);
    star.levels.C = 25;
    expectRelative(baseRateConstant(meta, star, "C"), 0.4 * 0.004 * 25 * 4);
  });

  it("反応断面積（Lv ごとに +25%）は全段階、金属量は水素燃焼だけに効く", () => {
    const { meta, star } = createGame();
    meta.shop.xs = 2;
    meta.shop.cno = 2;
    star.levels.He = 1;
    expectRelative(baseRateConstant(meta, star, "H"), 0.4 * 0.004 * 1.5 * 1.5);
    expectRelative(baseRateConstant(meta, star, "He"), 0.4 * 0.004 * 1.5);
  });

  it("炭素・ネオン・硫黄の発見で、それぞれヘリウム・炭素・酸素燃焼が2倍になる", () => {
    const { meta, star } = createGame();
    star.levels = { H: 1, He: 1, C: 1, Ne: 1, O: 1, Si: 0 };
    meta.discovered = { C: true, Ne: true, S: true };
    const k = 0.4 * 0.004;
    expectRelative(baseRateConstant(meta, star, "He"), k * 2);
    expectRelative(baseRateConstant(meta, star, "C"), k * 2);
    expectRelative(baseRateConstant(meta, star, "O"), k * 2);
    expectRelative(baseRateConstant(meta, star, "Ne"), k);
  });
});
describe("燃える速さの上限", () => {
  it("実効の速度定数は k / (1 + k / 上限)。小さい k はほぼそのまま、大きい k は上限に近づく", () => {
    expectRelative(effectiveRate(0.0016, 0.04), 0.0016 / (1 + 0.0016 / 0.04));
    expect(effectiveRate(1e6, 0.04)).toBeLessThan(0.04);
    expect(effectiveRate(1e6, 0.04)).toBeGreaterThan(0.0399);
    expect(effectiveRate(0, 0.04)).toBe(0);
  });

  it("上限は水素燃焼がいちばん低く（主系列が長い）、後の段階ほど高い", () => {
    expect(RATE_CAP.H).toBeLessThan(RATE_CAP.He);
    expect(RATE_CAP.He).toBeLessThan(RATE_CAP.C);
  });

  it("rateConstant は上限を掛けた値", () => {
    const { meta, star } = createGame();
    star.levels.H = 500;
    expectRelative(
      rateConstant(meta, star, "H"),
      effectiveRate(baseRateConstant(meta, star, "H"), RATE_CAP.H)
    );
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
