import { describe, expect, it } from "vitest";
import { buyAllShopItems, buyShopItem, canBuyShopItem, shopCost } from "./actions";
import { SHOP } from "./balance";
import { nextShopGoal } from "./goal";
import { funds } from "./shop";
import { createGame } from "./star";

function layer3() {
  const game = createGame();
  game.meta.sProcess = { ...game.meta.sProcess, unlocked: true };
  return game;
}

describe("重元素の星屑で買う強化", () => {
  it("¹³C ポケットと熱パルスの強さは重元素の星屑で買う", () => {
    expect(SHOP.pocket.currency).toBe("heavy");
    expect(SHOP.flash.currency).toBe("heavy");
  });

  it("手持ちは s過程の重元素の星屑", () => {
    const game = layer3();
    game.meta.sProcess.heavy = 42;
    expect(funds(game.meta, "heavy")).toBe(42);
    expect(funds(game.meta, "C")).toBe(game.meta.dust.C);
  });

  it("足りれば買えて、重元素の星屑が減る", () => {
    const game = layer3();
    const cost = shopCost(game.meta, "pocket");
    game.meta.sProcess.heavy = cost - 1;
    expect(canBuyShopItem(game.meta, "pocket")).toBe(false);
    game.meta.sProcess.heavy = cost + 1;
    const bought = buyShopItem(game, "pocket");
    expect(bought.meta.shop.pocket).toBe(1);
    expect(bought.meta.sProcess.heavy).toBe(1);
  });

  it("まとめて交換でも買う", () => {
    const game = layer3();
    game.meta.sProcess.heavy = 1e6;
    const bought = buyAllShopItems(game).meta;
    expect(bought.shop.pocket + bought.shop.flash).toBeGreaterThan(2);
  });

  it("次の目標にもなる", () => {
    const game = layer3();
    game.meta.sProcess.heavy = shopCost(game.meta, "flash");
    game.meta.shop.auto = 1;
    expect(nextShopGoal(game.meta).affordable).toBe(true);
  });
});
