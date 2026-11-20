import { describe, expect, it } from "vitest";
import { buyShopItem, buyStage, buyStageMax, rebirth } from "./actions";
import { createGame } from "./star";

describe("buyStage", () => {
  it("費用を払って Lv を1上げる。渡した状態は書き換えない", () => {
    const game = createGame();
    game.star.energy = 1e45;
    const before = structuredClone(game);

    const next = buyStage(game, "H");

    expect(next.star.levels.H).toBe(2);
    expect(next.star.energy).toBeCloseTo(1e45 - 2e44 * 1.55);
    expect(game).toEqual(before);
  });

  it("エネルギーが足りなければ何もしない", () => {
    const game = createGame();
    game.star.energy = 2e44 * 1.55 * 0.99;
    expect(buyStage(game, "H")).toBe(game);
  });

  it("点火していない段階、ケイ素燃焼、終わった星は強化できない", () => {
    const game = createGame();
    game.star.energy = 1e60;
    expect(buyStage(game, "He")).toBe(game);

    game.star.temperature = 2.7e9;
    expect(buyStage(game, "Si")).toBe(game);

    game.star.end = "collapse";
    expect(buyStage(game, "H")).toBe(game);
  });
});

describe("buyStageMax", () => {
  it("買えるだけ続けて買う", () => {
    const game = createGame();
    const c = (lv: number) => 2e44 * 1.55 ** lv;
    game.star.energy = c(1) + c(2) + c(3) + 1;
    const next = buyStageMax(game, "H");
    expect(next.star.levels.H).toBe(4);
    expect(next.star.energy).toBeLessThan(c(4));
  });
});

describe("rebirth（超新星から次の星へ）", () => {
  const collapsed = () => {
    const game = createGame();
    Object.assign(game.star.mass, { H: 0, He: 2, C: 3, O: 4, Fe: 1.4 });
    game.star.time = 120;
    game.star.end = "collapse" as const;
    return game;
  };

  it("外層の元素を星屑にし、中性子星を1つ残して、次の世代の星を生む", () => {
    const game = collapsed();
    const next = rebirth(game);

    expect(next.meta.dust.C).toBe(Math.floor(3 ** 1.1));
    expect(next.meta.dust.O).toBe(Math.floor(4 ** 1.1));
    expect(next.meta.supernovae).toBe(1);
    expect(next.meta.neutronStars).toBe(1);
    expect(next.meta.log[0]).toEqual({
      generation: 1,
      time: 120,
      ejected: 7,
      gain: { C: Math.floor(3 ** 1.1), O: Math.floor(4 ** 1.1), Ne: 0, Mg: 0, Si: 0, S: 0 },
      end: "collapse",
    });
    expect(next.star.generation).toBe(2);
    expect(next.star.mass.H).toBe(25);
  });

  it("燃え尽きた星は中性子星を残さない", () => {
    const game = collapsed();
    game.star.end = "fizzle";
    expect(rebirth(game).meta.neutronStars).toBe(0);
  });

  it("記録は新しい順に20件まで残す", () => {
    let game = collapsed();
    for (let i = 0; i < 21; i++)
      game = rebirth({ ...game, star: { ...collapsed().star, generation: i + 1 } });
    expect(game.meta.log).toHaveLength(20);
    expect(game.meta.log[0]?.generation).toBe(21);
  });

  it("まだ燃えている星からは生まれ変われない", () => {
    const game = createGame();
    expect(rebirth(game)).toBe(game);
  });
});

describe("buyShopItem", () => {
  it("指定の元素の星屑を払って Lv を上げる", () => {
    const game = createGame();
    game.meta.dust.O = 10;
    const next = buyShopItem(game, "mass");
    expect(next.meta.shop.mass).toBe(1);
    expect(next.meta.dust.O).toBe(7);
    expect(buyShopItem(next, "mass").meta.dust.O).toBe(7 - Math.floor(3 * 2.2));
  });

  it("星屑が足りなければ何もしない", () => {
    const game = createGame();
    game.meta.dust.C = 2;
    expect(buyShopItem(game, "cno")).toBe(game);
  });

  it("1回だけの強化は2回目を買えない", () => {
    const game = createGame();
    game.meta.dust.S = 100;
    const once = buyShopItem(game, "auto");
    expect(once.meta.shop.auto).toBe(1);
    expect(buyShopItem(once, "auto")).toBe(once);
  });
});
