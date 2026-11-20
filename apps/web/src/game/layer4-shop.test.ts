import { describe, expect, it } from "vitest";
import { buyShopItem, canBuyShopItem } from "./actions";
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
import { isShopItemOpen } from "./shop";
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

  it("連星の自動化：枠が空いたら、在庫の一番軽い星と一番重い星を組む", () => {
    const game = buy(buy(layer4(), "rAuto"), "slots");
    const next = autoBinary(game);
    expect(next.meta.rProcess.binaries.map(({ a, b }) => [a, b])).toEqual([
      [LIGHT, HEAVY],
      [LIGHT, HEAVY],
    ]);
    expect(autoBinary(layer4())).toEqual(layer4());
  });

  it("自動化は、在庫が1段だけなら同じ段で組み、1つしかなければ組まない", () => {
    const game = buy(layer4(), "rAuto");
    game.meta.rProcess.pool = game.meta.rProcess.pool.map(() => 0);
    game.meta.rProcess.pool[HEAVY] = 1;
    expect(autoBinary(game).meta.rProcess.binaries).toEqual([]);
    game.meta.rProcess.pool[HEAVY] = 2;
    expect(autoBinary(game).meta.rProcess.binaries).toHaveLength(1);
  });

  it("自動化は毎回の更新で働く", () => {
    const game = buy(layer4(), "rAuto");
    expect(advanceAll(game, 0.1).state.meta.rProcess.binaries).toHaveLength(1);
    expect(formBinary(game, LIGHT, HEAVY).meta.rProcess.binaries).toHaveLength(1);
  });
});
