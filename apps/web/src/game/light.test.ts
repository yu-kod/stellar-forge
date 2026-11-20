import { describe, expect, it } from "vitest";
import { rebirth, triggerIa } from "./actions";
import { LAYER2_AFTER } from "./balance";
import { dustPreview } from "./dust";
import { LIGHT_ELEMENTS, findLightElements } from "./light";
import { createMeta, createStar } from "./star";
import type { GameState, Meta, Star } from "./types";

function collapsedStar(mass: Partial<Star["mass"]>, meta: Meta = createMeta()): GameState {
  const star = createStar(meta);
  star.mass = { ...star.mass, ...mass };
  star.end = "collapse";
  return { meta, star };
}

const found = (meta: Meta) => [...meta.lightFound].sort((a, b) => a - b);

describe("軽い元素の一覧", () => {
  it("リチウム〜マンガンのうち、燃焼で作らない16元素", () => {
    expect(LIGHT_ELEMENTS.map((e) => e.z)).toEqual([
      3, 4, 5, 9, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    ]);
  });
});

describe("超新星で見つける軽い元素", () => {
  it("外層にネオンを 1 M☉ 以上残して崩壊すると、ナトリウム（炭素燃焼）", () => {
    const next = rebirth(collapsedStar({ Ne: 1.2 }));
    expect(found(next.meta)).toEqual([11]);
  });

  it("外層にマグネシウムを 1 M☉ 以上残すと、アルミニウム（Mg-Al サイクル）", () => {
    expect(found(rebirth(collapsedStar({ Mg: 1 })).meta)).toEqual([13]);
  });

  it("爆発的酸素燃焼：酸素を残し、爆発エネルギーが足りればリン・塩素", () => {
    const meta = createMeta();
    meta.shop.boom = 3;
    expect(found(rebirth(collapsedStar({ O: 5 }, meta)).meta)).toEqual([15, 17]);
    meta.shop.boom = 0;
    expect(found(rebirth(collapsedStar({ O: 5 }, meta)).meta)).toEqual([]);
  });

  it("爆発的ケイ素燃焼：ケイ素と硫黄を残し、爆発エネルギーが足りればアルゴン〜チタン", () => {
    const meta = createMeta();
    meta.shop.boom = 8;
    expect(found(rebirth(collapsedStar({ Si: 4, S: 2 }, meta)).meta)).toEqual([18, 19, 20, 21, 22]);
  });

  it("燃え尽きや白色矮星では、爆発的元素合成は起きない", () => {
    const game = collapsedStar({ Ne: 2, Mg: 2 });
    game.star.end = "fizzle";
    expect(found(rebirth(game).meta)).toEqual([]);
  });

  it("超新星の回数で、宇宙線の核破砕からリチウム・ベリリウム・ホウ素", () => {
    const meta = createMeta();
    meta.supernovae = 99;
    expect(found(rebirth(collapsedStar({}, meta)).meta)).toEqual([3, 4]);
  });
});

describe("白色矮星と Ia型超新星で見つける軽い元素", () => {
  function layer3(): GameState {
    const meta = { ...createMeta(), supernovae: LAYER2_AFTER, nextMass: 3, whiteDwarfs: 60 };
    meta.sProcess = { ...meta.sProcess, unlocked: true };
    return { meta, star: createStar(meta) };
  }

  it("第3層の解放後、炭素星が白色矮星になるとフッ素", () => {
    const game = layer3();
    game.star.end = "whiteDwarf";
    expect(found(rebirth(game).meta)).toEqual([9]);
  });

  it("Ia型超新星の回数でバナジウム・クロム・マンガン", () => {
    let game = layer3();
    for (let i = 0; i < 49; i++) game = triggerIa(game);
    expect(found(game.meta)).toEqual([23, 24]);
    game = triggerIa(game);
    expect(found(game.meta)).toEqual([23, 24, 25]);
    expect(game.meta.iaSupernovae).toBe(50);
  });
});

describe("発見の効果", () => {
  it("軽い元素1つにつき、すべての星屑 +5%（足し算）", () => {
    const meta = createMeta();
    const star = createStar(meta);
    star.mass.C = 4;
    meta.lightFound = [3, 11];
    expect(dustPreview(meta, star).C).toBe(Math.floor(4 ** 1.1 * 1.1));
  });

  it("findLightElements は、まだ見つけていないものだけを返す", () => {
    const meta = createMeta();
    meta.supernovae = 100;
    meta.lightFound = [3];
    expect(findLightElements(meta, null)).toEqual([4]);
  });
});
