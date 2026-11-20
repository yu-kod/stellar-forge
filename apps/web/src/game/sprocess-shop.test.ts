import { describe, expect, it } from "vitest";
import { buyShopItem, canBuyShopItem, setSeedTarget, triggerIa } from "./actions";
import { LAYER2_AFTER, SHOP } from "./balance";
import { advanceAll } from "./cluster";
import { isShopItemOpen } from "./shop";
import { S_PATH_START, heavyMultiplier, neutronMultiplier, seedsPerIa } from "./sprocess";
import { createMeta, createStar } from "./star";
import { SHOP_IDS, type GameState } from "./types";

const index = (z: number) => z - S_PATH_START;

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

  it("バリウム星（重元素の星屑）：恒星風で出た原子核の一部を連星の相手が受け取り、道に戻す（Lv ごとに 10%、5回まで）", () => {
    const game = layer3();
    game.meta.sProcess.heavy = 1e9;
    game.meta.whiteDwarfs = 0;
    game.meta.sProcess.amounts[index(40)] = 10;
    const bought = buyShopItem(buyShopItem(game, "binary"), "binary");
    expect(SHOP.binary.maxLevel).toBe(5);
    const kept = (g: GameState) => advanceAll(g, 100).state.meta.sProcess.amounts[index(40)]!;
    const lost = (g: GameState) => 10 - kept(g);
    expect(lost(bought) / lost(game)).toBeCloseTo(0.8, 2);
    const heavy = (g: GameState) =>
      advanceAll(g, 100).state.meta.sProcess.heavy - g.meta.sProcess.heavy;
    expect(heavy(bought) / heavy(game)).toBeCloseTo(1, 5);
  });

  it("Ia型超新星1回の鉄の種は 1（ストロンチウムで 2）。目標の量を大きく超えない", () => {
    const game = layer3();
    expect(seedsPerIa(game.meta)).toBe(1);
    expect(triggerIa(game).meta.sProcess.amounts[0]).toBe(1);
  });
});

describe("自動の Ia型超新星", () => {
  it("第3層が解放されたら最初から、道の上の原子核が目標の量になるまで白色矮星を使って補う", () => {
    const game = setSeedTarget(layer3(), 3);
    const { state } = advanceAll(game, 0.1, 0.05);
    expect(state.meta.sProcess.amounts[0]).toBe(3);
    expect(state.meta.whiteDwarfs).toBe(7);
  });

  it("第3層の前は補わない", () => {
    const game = setSeedTarget(layer3(), 3);
    game.meta.sProcess.unlocked = false;
    const { state } = advanceAll(game, 0.1, 0.05);
    expect(state.meta.whiteDwarfs).toBe(10);
  });

  it("買う強化ではない（星屑タブに出ない）", () => {
    expect(SHOP_IDS).not.toContain("autoIa");
  });

  it("白色矮星が足りなければ、ある分だけ使う", () => {
    let game = layer3();
    game.meta.whiteDwarfs = 2;
    game = setSeedTarget(game, 5);
    const { state } = advanceAll(game, 0.1, 0.05);
    expect(state.meta.whiteDwarfs).toBe(0);
    expect(state.meta.sProcess.amounts[0]).toBe(2);
  });

  it("目標の量は1以上の整数", () => {
    expect(setSeedTarget(layer3(), 0).meta.sProcess.seedTarget).toBe(1);
    expect(setSeedTarget(layer3(), 4.7).meta.sProcess.seedTarget).toBe(4);
  });
});
