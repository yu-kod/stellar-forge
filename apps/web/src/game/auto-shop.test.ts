import { describe, expect, it } from "vitest";
import { setAutoShop } from "./actions";
import { advanceAll } from "./cluster";
import { createGame } from "./star";

describe("星屑の自動交換", () => {
  it("はじめは OFF。燃焼の自動制御を持っていれば切り替えられる", () => {
    const game = createGame();
    expect(game.meta.autoShop).toBe(false);
    expect(setAutoShop(game, true)).toBe(game);
    game.meta.shop.auto = 1;
    expect(setAutoShop(game, true).meta.autoShop).toBe(true);
  });

  it("ON なら毎回の更新の後に、まとめて交換と同じく買えるものを買う", () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    game.meta.dust.O = 1000;
    const on = setAutoShop(game, true);
    expect(advanceAll(on, 0.1).state.meta.shop.mass).toBeGreaterThan(0);
    expect(advanceAll(game, 0.1).state.meta.shop.mass).toBe(0);
  });
});
