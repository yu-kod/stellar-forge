import { describe, expect, it } from "vitest";
import { dustPreview, ejectedMetals } from "./dust";
import { createGame } from "./star";

const withOnion = () => {
  const game = createGame();
  Object.assign(game.star.mass, {
    H: 3,
    He: 4,
    C: 2,
    O: 5,
    Ne: 1,
    Mg: 0.5,
    Si: 0.2,
    S: 0.04,
    Fe: 1.4,
  });
  return game;
};

describe("ejectedMetals", () => {
  it("炭素〜硫黄の質量の合計。水素・ヘリウム・鉄は含めない", () => {
    expect(ejectedMetals(withOnion().star)).toBeCloseTo(2 + 5 + 1 + 0.5 + 0.2 + 0.04);
  });
});

describe("dustPreview", () => {
  it("元素ごとに floor(質量^1.1)", () => {
    const { meta, star } = withOnion();
    expect(dustPreview(meta, star)).toEqual({
      C: Math.floor(2 ** 1.1),
      N: 0,
      O: Math.floor(5 ** 1.1),
      Ne: 1,
      Mg: 0,
      Si: 0,
      S: 0,
    });
  });

  it("爆発エネルギーで Lv ごとに ×1.5、酸素の発見で ×1.25", () => {
    const { meta, star } = withOnion();
    meta.shop.boom = 2;
    meta.discovered.O = true;
    expect(dustPreview(meta, star).O).toBe(Math.floor(5 ** 1.1 * 1.5 ** 2 * 1.25));
  });

  it("燃え尽きた星は ×0.3", () => {
    const { meta, star } = withOnion();
    star.end = "fizzle";
    expect(dustPreview(meta, star).O).toBe(Math.floor(5 ** 1.1 * 0.3));
  });
});
