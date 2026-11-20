import { describe, expect, it } from "vitest";
import { createGame } from "./star";
import { coreWeight, temperatureFromWeight } from "./temperature";

describe("temperatureFromWeight", () => {
  it.each([
    [0, 4e7],
    [3, 2e8],
    [10, 6e8],
    [20, 1.2e9],
    [26, 1.5e9],
    [36, 2.7e9],
  ])("灰の重さ %d で %d K（点火温度の節目）", (w, t) => {
    expect(temperatureFromWeight(w) / t).toBeCloseTo(1, 10);
  });

  it("節目の間は温度の対数を線形に補間する", () => {
    expect(Math.log10(temperatureFromWeight(1.5))).toBeCloseTo(
      (Math.log10(4e7) + Math.log10(2e8)) / 2
    );
  });

  it("最後の節目を超えたら最後の区間の傾きで延ばす", () => {
    const slope = (Math.log10(2.7e9) - Math.log10(1.5e9)) / 10;
    expect(Math.log10(temperatureFromWeight(46))).toBeCloseTo(Math.log10(2.7e9) + slope * 10);
  });
});

describe("coreWeight", () => {
  it("水素以外を質量数 / 4 で重みづけして足し、25 M☉ の星に換算する", () => {
    const { star } = createGame();
    star.initialMass = 50;
    star.mass.H = 10;
    star.mass.He = 4; // 4 × 1
    star.mass.C = 1; // 1 × 3
    star.mass.Fe = 1; // 1 × 14
    expect(coreWeight(star)).toBeCloseTo((4 + 3 + 14) * (25 / 50));
  });
});
