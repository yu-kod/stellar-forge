import { describe, expect, it } from "vitest";
import { buyShopItem, canBuyShopItem, setSeedTarget, triggerIa } from "./actions";
import { LAYER2_AFTER } from "./balance";
import { advanceAll } from "./cluster";
import { isShopItemOpen } from "./shop";
import { heavyMultiplier, neutronMultiplier, seedsPerIa } from "./sprocess";
import { createMeta, createStar } from "./star";
import type { GameState } from "./types";

function layer3(): GameState {
  const meta = { ...createMeta(), supernovae: LAYER2_AFTER, whiteDwarfs: 10 };
  meta.sProcess = { ...meta.sProcess, unlocked: true };
  return { meta, star: createStar(meta) };
}

describe("第3層の強化", () => {
  it("第3層が解放されるまでは出さず、買えない", () => {
    const game = layer3();
    game.meta.sProcess.unlocked = false;
    game.meta.dust.C = 1e9;
    expect(isShopItemOpen(game.meta, "pocket")).toBe(false);
    expect(canBuyShopItem(game.meta, "pocket")).toBe(false);
  });

  it("¹³C ポケット（重元素の星屑）で、中性子が Lv ごとに ×1.5（掛け算）", () => {
    const game = layer3();
    game.meta.sProcess.heavy = 1e9;
    const bought = buyShopItem(buyShopItem(game, "pocket"), "pocket");
    expect(neutronMultiplier(bought.meta)).toBeCloseTo(2.25);
  });

  it("第3ドレッジアップ（重元素の星屑）で、恒星風で出る s元素の価値が Lv ごとに +50%（足し算）", () => {
    const game = layer3();
    game.meta.sProcess.heavy = 1e9;
    const bought = buyShopItem(buyShopItem(game, "flash"), "flash");
    expect(neutronMultiplier(bought.meta)).toBe(1);
    expect(heavyMultiplier(bought.meta)).toBe(2);
    bought.meta.sProcess.heavy = 0;
    bought.meta.sProcess.amounts[0] = 1;
    const plain = layer3();
    plain.meta.sProcess.amounts[0] = 1;
    const earned = (g: GameState) => advanceAll(g, 10).state.meta.sProcess.heavy;
    expect(earned(bought) / earned(plain)).toBeCloseTo(2, 5);
  });

  it("連星の質量移動（酸素）で、Ia型超新星1回の鉄の種が Lv ごとに +1", () => {
    const game = layer3();
    game.meta.dust.O = 1e9;
    const bought = buyShopItem(game, "binary");
    expect(seedsPerIa(bought.meta)).toBe(2);
    expect(triggerIa(bought).meta.sProcess.amounts[0]).toBe(2);
  });
});

describe("自動の Ia型超新星", () => {
  it("持っていれば、道の上の原子核が目標の量になるまで白色矮星を使って補う", () => {
    let game = layer3();
    game.meta.dust.S = 1e9;
    game = setSeedTarget(buyShopItem(game, "autoIa"), 3);
    const { state } = advanceAll(game, 0.1, 0.05);
    expect(state.meta.sProcess.amounts[0]).toBe(3);
    expect(state.meta.whiteDwarfs).toBe(7);
  });

  it("持っていなければ補わない", () => {
    const { state } = advanceAll(setSeedTarget(layer3(), 3), 0.1, 0.05);
    expect(state.meta.whiteDwarfs).toBe(10);
  });

  it("白色矮星が足りなければ、ある分だけ使う", () => {
    let game = layer3();
    game.meta.dust.S = 1e9;
    game.meta.whiteDwarfs = 2;
    game = setSeedTarget(buyShopItem(game, "autoIa"), 5);
    const { state } = advanceAll(game, 0.1, 0.05);
    expect(state.meta.whiteDwarfs).toBe(0);
    expect(state.meta.sProcess.amounts[0]).toBe(2);
  });

  it("目標の量は1以上の整数", () => {
    expect(setSeedTarget(layer3(), 0).meta.sProcess.seedTarget).toBe(1);
    expect(setSeedTarget(layer3(), 4.7).meta.sProcess.seedTarget).toBe(4);
  });
});
