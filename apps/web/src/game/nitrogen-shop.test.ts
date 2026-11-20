import { describe, expect, it } from "vitest";
import { buyShopItem, canBuyShopItem } from "./actions";
import { LAYER2_AFTER } from "./balance";
import { dustPreview } from "./dust";
import { isShopItemOpen } from "./shop";
import { baseRateConstant } from "./rates";
import { createGame, createMeta, createStar } from "./star";
import type { GameState, Meta } from "./types";

function layer2(overrides: Partial<Meta> = {}): GameState {
  const meta = { ...createMeta(), supernovae: LAYER2_AFTER, ...overrides };
  return { meta, star: createStar(meta) };
}

describe("窒素で買う第2層の強化", () => {
  it("第2層が解放されるまでは出さず、買えない", () => {
    const game = createGame();
    game.meta.dust.N = 1000;
    expect(isShopItemOpen(game.meta, "recycle")).toBe(false);
    expect(canBuyShopItem(game.meta, "recycle")).toBe(false);
  });

  it("第2層が解放されたら窒素で買える", () => {
    const game = layer2();
    game.meta.dust.N = 10;
    expect(isShopItemOpen(game.meta, "recycle")).toBe(true);
    const next = buyShopItem(game, "recycle");
    expect(next.meta.shop.recycle).toBe(1);
    expect(next.meta.dust.N).toBe(0);
  });

  it("星間ガスの再利用：すべての星屑 +25%（Lv ごと、足し算）", () => {
    const game = layer2();
    game.star.mass.C = 4;
    const before = dustPreview(game.meta, game.star).C;
    game.meta.shop.recycle = 2;
    expect(before).toBe(Math.floor(4 ** 1.1));
    expect(dustPreview(game.meta, game.star).C).toBe(Math.floor(4 ** 1.1 * 1.5));
  });

  it("惑星状星雲の濃縮：白色矮星の星屑 +50%（Lv ごと、足し算）。超新星には効かない", () => {
    const game = layer2();
    game.meta.shop.nebula = 2;
    game.star.mass.C = 4;
    game.star.end = "collapse";
    expect(dustPreview(game.meta, game.star).C).toBe(Math.floor(4 ** 1.1));
    game.star.end = "whiteDwarf";
    expect(dustPreview(game.meta, game.star).C).toBe(Math.floor(4 ** 1.1 * 2 * 2));
  });

  it("熱パルス：軽い星のヘリウム燃焼 ×2（Lv ごと）。重い星には効かない", () => {
    const heavy = layer2({ shop: { ...createMeta().shop, pulse: 1 } });
    heavy.star.levels.He = 1;
    const light = layer2({ shop: { ...createMeta().shop, pulse: 1 }, nextMass: 3 });
    light.star.levels.He = 1;
    const base = layer2({ nextMass: 3 });
    base.star.levels.He = 1;
    const k = baseRateConstant(base.meta, base.star, "He");
    expect(baseRateConstant(light.meta, light.star, "He") / k).toBeCloseTo(2);
    expect(baseRateConstant(heavy.meta, heavy.star, "He") / k).toBeCloseTo(1);
  });
});
