import { describe, expect, it } from "vitest";
import { advanceAll } from "./cluster";
import { ORIGINS, originOf } from "./progress";
import { createGame } from "./star";

describe("遊んだ時間", () => {
  it("毎回の更新で、進めた時間を足す", () => {
    const game = createGame();
    expect(advanceAll(game, 2.5).state.meta.elapsed).toBeCloseTo(2.5);
  });
});

describe("元素の起源（エンディングの周期表の色分け）", () => {
  it.each([
    [1, "bigBang"],
    [2, "bigBang"],
    [3, "cosmicRay"],
    [5, "cosmicRay"],
    [6, "lowMass"],
    [7, "lowMass"],
    [8, "massive"],
    [11, "massive"],
    [22, "massive"],
    [24, "typeIa"],
    [26, "typeIa"],
    [27, "typeIa"],
    [28, "typeIa"],
    [30, "massive"],
    [38, "massive"],
    [52, "merger"],
    [66, "merger"],
    [56, "lowMass"],
    [82, "lowMass"],
    [63, "merger"],
    [79, "merger"],
  ] as const)("Z %d は %s", (z, origin) => {
    expect(originOf(z)).toBe(origin);
  });

  it("起源は6つ。それぞれに名前がある", () => {
    expect(Object.keys(ORIGINS)).toEqual([
      "bigBang",
      "cosmicRay",
      "massive",
      "lowMass",
      "typeIa",
      "merger",
    ]);
    expect(ORIGINS.merger).toBe("中性子星合体");
  });
});
