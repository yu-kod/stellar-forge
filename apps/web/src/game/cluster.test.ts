import { describe, expect, it } from "vitest";
import { buyShopItem } from "./actions";
import { LAYER2_AFTER } from "./balance";
import { advanceAll, createSlot, setSlotMass, setSlotTarget } from "./cluster";
import { createGame, createMeta, createStar } from "./star";
import type { GameState } from "./types";

function layer2(): GameState {
  const meta = { ...createMeta(), supernovae: LAYER2_AFTER };
  meta.shop.auto = 1;
  return { meta, star: createStar(meta) };
}

function withSlot(): GameState {
  const game = layer2();
  game.meta.dust.N = 30;
  return buyShopItem(game, "cluster");
}

describe("星団", () => {
  it("星団を買うと、同時に燃やす星が1つ増える（はじめは 7 M☉・炭素狙い）", () => {
    const game = withSlot();
    expect(game.meta.shop.cluster).toBe(1);
    expect(game.meta.cluster).toHaveLength(1);
    expect(game.meta.cluster[0]).toMatchObject({ nextMass: 7, target: "C" });
    expect(game.meta.cluster[0]?.star.initialMass).toBe(7);
  });

  it("星団は2回まで（星は全部で3つ）", () => {
    let game = withSlot();
    game.meta.dust.N = 1e6;
    game = buyShopItem(game, "cluster");
    game = buyShopItem(game, "cluster");
    expect(game.meta.cluster).toHaveLength(2);
  });

  it("時間を進めると、星団の星もいっしょに燃える", () => {
    const { state } = advanceAll(withSlot(), 1, 0.05);
    expect(state.star.time).toBeCloseTo(1);
    expect(state.meta.cluster[0]?.star.time).toBeCloseTo(1);
  });

  it("星団の星は、終わったら自動で次の星を生み、星屑と白色矮星を数える", () => {
    const game = withSlot();
    const slot = game.meta.cluster[0]!;
    slot.star.mass.H = 0.69;
    slot.star.mass.He = 6.31;
    const { state } = advanceAll(game, 1, 0.05);
    expect(state.meta.whiteDwarfs).toBe(1);
    expect(state.meta.cluster[0]?.star.time).toBeGreaterThan(0.5);
    expect(state.meta.cluster[0]?.star.end).toBeNull();
  });

  it("星団の星の狙いと質量は、主星の設定を変えない", () => {
    const game = withSlot();
    game.meta.cluster[0]!.star.mass.H = 0.69;
    game.meta.cluster[0]!.star.mass.He = 6.31;
    const { state } = advanceAll(game, 1, 0.05);
    expect(state.meta.target).toBe("Si");
    expect(state.meta.nextMass).toBeNull();
    expect(state.meta.autoOn.O).toBe(true);
    expect(state.meta.cluster[0]?.star.initialMass).toBe(7);
  });

  it("星団の星の質量と狙いを変えられる。質量は次に生む星から効く", () => {
    let game = withSlot();
    game = setSlotMass(game, 0, 3);
    game = setSlotTarget(game, 0, "Ne");
    expect(game.meta.cluster[0]).toMatchObject({ nextMass: 3, target: "Ne" });
    expect(game.meta.cluster[0]?.star.initialMass).toBe(7);
  });

  it("存在しない星団の番号は何もしない", () => {
    const game = withSlot();
    expect(setSlotMass(game, 5, 3)).toBe(game);
    expect(setSlotTarget(game, 5, "Ne")).toBe(game);
  });

  it("星団の星が2つあれば、それぞれを別々に進め、変えるのは指定した星だけ", () => {
    let game = withSlot();
    game.meta.dust.N = 300;
    game = buyShopItem(game, "cluster");
    game = setSlotTarget(game, 1, "Si");
    game.meta.cluster[0]!.star.mass.H = 0.69;
    game.meta.cluster[0]!.star.mass.He = 6.31;
    const { state } = advanceAll(game, 1, 0.05);
    expect(state.meta.cluster.map((s) => s.target)).toEqual(["C", "Si"]);
    expect(state.meta.cluster[0]?.star.generation).not.toBe(game.meta.cluster[0]?.star.generation);
    expect(state.meta.cluster[1]?.star.time).toBeCloseTo(1);
  });

  it("星団がなければ、主星だけを進める", () => {
    const { state } = advanceAll(createGame(), 1, 0.05);
    expect(state.meta.cluster).toEqual([]);
  });

  it("createSlot は今の強化を反映した星を作る", () => {
    const meta = layer2().meta;
    meta.shop.cno = 2;
    expect(createSlot(meta).star.mass.C).toBeCloseTo(0.4 * (7 / 25));
  });
});
