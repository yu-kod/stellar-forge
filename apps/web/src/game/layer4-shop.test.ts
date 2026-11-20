import { describe, expect, it } from "vitest";
import { buyAllShopItems, buyShopItem, canBuyShopItem } from "./actions";
import { SHOP } from "./balance";
import { advanceAll } from "./cluster";
import {
  MERGER_SECONDS,
  autoBinary,
  binarySlots,
  formBinary,
  mergerSeconds,
  predictMerger,
} from "./merger";
import { nextShopGoal } from "./goal";
import { isShopItemOpen, isShopItemUseful } from "./shop";
import { S_DISCOVERABLE_ELEMENTS } from "./sprocess";
import { createGame } from "./star";
import type { GameState } from "./types";

const LIGHT = 0;
const HEAVY = 8;

function layer4(): GameState {
  const game = createGame();
  game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, looped: true };
  game.meta.rProcess = { ...game.meta.rProcess, unlocked: true };
  game.meta.rProcess.pool[LIGHT] = 4;
  game.meta.rProcess.pool[HEAVY] = 6;
  game.meta.dust = { C: 1e12, N: 1e12, O: 1e12, Ne: 1e12, Mg: 1e12, Si: 1e12, S: 1e12 };
  game.meta.sProcess.heavy = 1e12;
  return game;
}

const buy = (game: GameState, item: Parameters<typeof buyShopItem>[1], times = 1) => {
  let next = game;
  for (let i = 0; i < times; i++) next = buyShopItem(next, item);
  return next;
};

describe("第4層の強化", () => {
  it("第4層の前は出さず、買えない", () => {
    const game = layer4();
    game.meta.rProcess.unlocked = false;
    for (const item of ["envelope", "slots", "tail", "shield", "rAuto"] as const) {
      expect(isShopItemOpen(game.meta, item)).toBe(false);
      expect(canBuyShopItem(game.meta, item)).toBe(false);
    }
  });

  it("共通外層：合体までの時間 ×0.6（3回まで）", () => {
    const game = buy(layer4(), "envelope", 2);
    expect(mergerSeconds(game.meta)).toBeCloseTo(MERGER_SECONDS * 0.36);
    expect(SHOP.envelope.maxLevel).toBe(3);
  });

  it("連星の枠：同時に持てる連星 +1（3回まで）", () => {
    const game = buy(layer4(), "slots", 2);
    expect(binarySlots(game.meta)).toBe(3);
    expect(SHOP.slots.maxLevel).toBe(3);
  });

  it("潮汐の尾：放出物 +50%（足し算）", () => {
    const game = layer4();
    const before = predictMerger(game.meta, LIGHT, HEAVY).ejecta;
    expect(predictMerger(buy(game, "tail", 2).meta, LIGHT, HEAVY).ejecta).toBeCloseTo(before * 2);
  });

  it("ニュートリノの遮蔽：Ye −0.025（4回まで）", () => {
    const game = layer4();
    const before = predictMerger(game.meta, LIGHT, HEAVY).ye;
    expect(predictMerger(buy(game, "shield", 2).meta, LIGHT, HEAVY).ye).toBeCloseTo(before - 0.05);
    expect(SHOP.shield.maxLevel).toBe(4);
  });

  it("連星の自動化：枠が空いたら、いま作りたい元素を時間あたりで一番多く作る組を組む", () => {
    const game = buy(buy(layer4(), "rAuto"), "slots");
    const next = autoBinary(game);
    // テルル（第2ピーク）が目標：合計の軽い 1.2 + 1.2 M☉（円盤風）
    expect(next.meta.rProcess.binaries.map(({ a, b }) => [a, b])).toEqual([
      [LIGHT, LIGHT],
      [LIGHT, LIGHT],
    ]);
    expect(autoBinary(layer4())).toEqual(layer4());
  });

  it("自動化は、いま作りたい元素に届かない組（ブラックホールなど）は作らない", () => {
    const game = buy(layer4(), "rAuto");
    game.meta.rProcess.discovered = [52, 53, 54];
    game.meta.rProcess.pool = game.meta.rProcess.pool.map(() => 0);
    game.meta.rProcess.pool[HEAVY] = 4;
    expect(autoBinary(game).meta.rProcess.binaries).toEqual([]);
    game.meta.rProcess.pool[LIGHT] = 2;
    expect(autoBinary(game).meta.rProcess.binaries).toHaveLength(1);
  });

  it("ニュートリノの遮蔽は、まとめて交換でいつでも買う（買えしだい買うほうが速い）", () => {
    const game = layer4();
    expect(isShopItemUseful(game.meta, "shield")).toBe(true);
    expect(buyAllShopItems(game).meta.shop.shield).toBeGreaterThan(0);
  });

  it("自動化は毎回の更新で働く", () => {
    const game = buy(layer4(), "rAuto");
    expect(advanceAll(game, 0.1).state.meta.rProcess.binaries).toHaveLength(1);
    expect(formBinary(game, LIGHT, HEAVY).meta.rProcess.binaries).toHaveLength(1);
  });
});

describe("重元素の星屑の第4層での使い道", () => {
  it("s過程を終えたら、まとめて交換でも s過程の強化は買わない", () => {
    const game = layer4();
    game.meta.sProcess.discovered = [...S_DISCOVERABLE_ELEMENTS];
    const bought = buyAllShopItems(game).meta.shop;
    expect(bought.pocket + bought.flash + bought.binary).toBe(0);
    expect(bought.envelope).toBeGreaterThan(0);
  });

  it("共通外層と潮汐の尾は重元素の星屑で買う", () => {
    expect(SHOP.envelope.currency).toBe("heavy");
    expect(SHOP.tail.currency).toBe("heavy");
  });

  it("s過程を終えたら（循環を見て元素がそろったら）、s過程の強化は次の目標に勧めない", () => {
    const game = layer4();
    game.meta.sProcess.discovered = [...S_DISCOVERABLE_ELEMENTS];
    game.meta.dust = { C: 0, N: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 0 };
    game.meta.sProcess.heavy = 0;
    game.meta.sProcess.amounts[0] = 30;
    game.meta.shop.auto = 1;
    const goal = nextShopGoal(game.meta).item;
    expect(["pocket", "flash", "binary"]).not.toContain(goal);
  });
});
