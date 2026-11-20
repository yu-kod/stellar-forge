import { describe, expect, it } from "vitest";
import { advanceAll } from "./cluster";
import {
  BLACK_HOLE_EJECTA,
  MERGER_SECONDS,
  R_PATH_START,
  advanceBinaries,
  binarySlots,
  createRProcess,
  formBinary,
  bestPair,
  mergerSeconds,
  nextRDiscovery,
  rThreshold,
  reachName,
  predictMerger,
  rWeight,
  R_ELEMENTS,
  yieldOf,
} from "./merger";
import { NEUTRON_STAR_MASSES } from "./rprocess";
import { createMeta } from "./star";
import type { GameState, Meta } from "./types";
import { createGame } from "./star";

const LIGHT = 0; // 1.2 M☉
const HEAVY = 8; // 2.0 M☉

function layer4(pool: Record<number, number> = { [LIGHT]: 5, [HEAVY]: 5 }): Meta {
  const meta = createMeta();
  meta.rProcess = { ...createRProcess(), unlocked: true };
  for (const [bin, n] of Object.entries(pool)) meta.rProcess.pool[Number(bin)] = n;
  return meta;
}

const rAmount = (meta: Meta, z: number) => meta.rProcess.amounts[z - R_PATH_START]!;

describe("合体の見込み（質量比と合計 → 放出物と Ye → 届くところ）", () => {
  it("軽い同士（1.2 + 1.2）は、合体後の星が長く残って放出物が多いが、Ye 0.40 で第1ピークまで", () => {
    const p = predictMerger(createMeta(), LIGHT, LIGHT);
    expect(p).toMatchObject({ q: 1, reach: 50, blackHole: false });
    expect(p.ye).toBeCloseTo(0.4);
    expect(p.ejecta).toBeCloseTo(1.25);
  });

  it("非対称なほど Ye が下がって重い元素まで届く。合計が重いほど放出物は減る", () => {
    const gold = predictMerger(createMeta(), LIGHT, 6); // 1.2 + 1.8
    expect(gold.ye).toBeCloseTo(0.4 - 0.55 * (1 - 1.2 / 1.8));
    expect(gold.reach).toBe(83);
    expect(gold.ejecta).toBeCloseTo((1 + 3 * (1 - 1.2 / 1.8)) * 0.5);
    const heavier = predictMerger(createMeta(), LIGHT, HEAVY); // 1.2 + 2.0
    expect(heavier.reach).toBe(83);
    expect(heavier.ejecta).toBeLessThan(gold.ejecta);
  });

  it("q ≤ 0.82 くらいで第2ピーク（Z 72 まで）", () => {
    expect(predictMerger(createMeta(), 1, 4).reach).toBe(72); // 1.3 と 1.6
  });

  it("合計が 3.4 M☉ を超えるとすぐブラックホールになり、放出物は 4分の1", () => {
    const p = predictMerger(createMeta(), HEAVY, HEAVY);
    expect(p.blackHole).toBe(true);
    expect(p.ejecta).toBeCloseTo(BLACK_HOLE_EJECTA);
    expect(predictMerger(createMeta(), 2, HEAVY).blackHole).toBe(false); // 1.4 + 2.0 = 3.4
  });

  it("並べる順は関係ない", () => {
    expect(predictMerger(createMeta(), HEAVY, LIGHT)).toEqual(
      predictMerger(createMeta(), LIGHT, HEAVY)
    );
  });
});

describe("一番よい組は、作りたい元素で変わる（一番軽い×一番重いが常に最良ではない）", () => {
  const full = () => layer4(Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8].map((b) => [b, 5])));

  it("金なら 1.2 + 1.8（それより重い相手は放出物が減る）", () => {
    expect(bestPair(full(), 79)).toEqual([LIGHT, 6]);
  });

  it("テルル（第2ピーク）なら、もっと対称で放出物の多い組", () => {
    const [a, b] = bestPair(full(), 52)!;
    expect(predictMerger(full(), a, b).reach).toBeLessThan(83);
    expect([a, b]).not.toEqual([LIGHT, 6]);
  });

  it("ニュートリノの遮蔽で Ye を下げると、金にもっと対称な組が使える", () => {
    const meta = full();
    meta.shop.shield = 2;
    const [a, b] = bestPair(meta, 79)!;
    expect(NEUTRON_STAR_MASSES[b]! - NEUTRON_STAR_MASSES[a]!).toBeLessThan(0.6);
  });

  it("在庫でその元素に届く組がなければ null", () => {
    expect(bestPair(layer4({ [LIGHT]: 4 }), 79)).toBeNull();
  });

  it("1回の合体で作るその元素の量（届かなければ 0）", () => {
    const meta = full();
    expect(yieldOf(meta, LIGHT, 6, 79)).toBeCloseTo(
      predictMerger(meta, LIGHT, 6).ejecta * rWeight(79)
    );
    expect(yieldOf(meta, LIGHT, LIGHT, 79)).toBe(0);
  });
});

describe("連星を組む", () => {
  it("在庫から2つを取り、合体までの時間を持った連星にする", () => {
    const game: GameState = { ...createGame(), meta: layer4() };
    const next = formBinary(game, LIGHT, HEAVY);
    expect(next.meta.rProcess.pool[LIGHT]).toBe(4);
    expect(next.meta.rProcess.pool[HEAVY]).toBe(4);
    expect(next.meta.rProcess.binaries).toEqual([
      { a: LIGHT, b: HEAVY, remaining: MERGER_SECONDS },
    ]);
  });

  it("同じ段で組むには2つ要る", () => {
    const game: GameState = { ...createGame(), meta: layer4({ [HEAVY]: 1 }) };
    expect(formBinary(game, HEAVY, HEAVY)).toBe(game);
  });

  it("連星の枠（初期値 1）が埋まっていたら組めない", () => {
    const game: GameState = { ...createGame(), meta: layer4() };
    const once = formBinary(game, LIGHT, HEAVY);
    expect(binarySlots(once.meta)).toBe(1);
    expect(formBinary(once, LIGHT, HEAVY)).toBe(once);
  });

  it("第4層の前は組めない", () => {
    const game: GameState = { ...createGame(), meta: layer4() };
    game.meta.rProcess.unlocked = false;
    expect(formBinary(game, LIGHT, HEAVY)).toBe(game);
  });
});

describe("合体と r過程", () => {
  function merged(a: number, b: number) {
    const meta = layer4({ [LIGHT]: 5, [HEAVY]: 5, 3: 5 });
    const game = formBinary({ ...createGame(), meta }, a, b);
    return advanceBinaries(game.meta, MERGER_SECONDS);
  }

  it("時間が来たら合体し、連星の枠が空き、合体の回数を数える", () => {
    const game = formBinary({ ...createGame(), meta: layer4() }, LIGHT, HEAVY);
    const before = advanceBinaries(game.meta, MERGER_SECONDS - 1);
    expect(before.meta.rProcess.binaries[0]?.remaining).toBeCloseTo(1);
    expect(before.events).toEqual([]);
    const { meta, events } = advanceBinaries(before.meta, 1);
    expect(meta.rProcess.binaries).toEqual([]);
    expect(meta.rProcess.mergers).toBe(1);
    expect(events[0]).toMatchObject({ type: "merger", reach: 83, blackHole: false });
  });

  it("届くところまでの元素に、放出物 × 重み を配る（届かない先には配らない）", () => {
    const first = merged(3, 3).meta;
    const ejecta = predictMerger(createMeta(), 3, 3).ejecta;
    expect(rAmount(first, 34)).toBeCloseTo(ejecta * rWeight(34));
    expect(rAmount(first, 52)).toBe(0);
    const third = merged(LIGHT, HEAVY).meta;
    const thirdEjecta = predictMerger(createMeta(), LIGHT, HEAVY).ejecta;
    expect(rAmount(third, 78)).toBeCloseTo(thirdEjecta * rWeight(78));
  });

  it("寿命の短い元素（Z 84〜89・91）には貯めない", () => {
    expect(rWeight(86)).toBe(0);
    expect(rWeight(91)).toBe(0);
    expect(rWeight(90)).toBeGreaterThan(0);
  });

  it("r過程が主な元素15個を、作った量が発見の量を超えたら発見する（金が最後）", () => {
    expect(R_ELEMENTS).toEqual([52, 53, 54, 63, 64, 65, 66, 67, 68, 69, 75, 76, 77, 78, 79]);
    // 発見に要る放出物（発見の量 ÷ 重み）は、並びの順に増える
    const ejectaNeeded = R_ELEMENTS.map((z) => rThreshold(z) / rWeight(z));
    expect([...ejectaNeeded].sort((a, b) => a - b)).toEqual(ejectaNeeded);
    let meta = layer4({ [LIGHT]: 20, [6]: 20 });
    meta.rProcess.amounts[78 - R_PATH_START] = rThreshold(78) - 0.01;
    meta.rProcess.amounts[79 - R_PATH_START] = rThreshold(79) - 1;
    const game = formBinary({ ...createGame(), meta }, LIGHT, 6);
    const result = advanceBinaries(game.meta, MERGER_SECONDS);
    meta = result.meta;
    expect(meta.rProcess.discovered).toContain(78);
    expect(meta.rProcess.discovered).not.toContain(79);
    expect(result.events).toContainEqual({ type: "rDiscover", z: 78 });
  });

  it("毎回の更新で連星を進める（留守の間も）", () => {
    const game = formBinary({ ...createGame(), meta: layer4() }, LIGHT, HEAVY);
    const { state } = advanceAll(game, MERGER_SECONDS + 1, 1);
    expect(state.meta.rProcess.mergers).toBe(1);
  });
});

describe("r過程の発見の効果", () => {
  it("r過程の元素1つにつき放出物 +5%（ユウロピウムなど特別な効果のものを除く）", () => {
    const meta = layer4();
    const before = predictMerger(meta, LIGHT, HEAVY).ejecta;
    meta.rProcess.discovered = [52, 53];
    expect(predictMerger(meta, LIGHT, HEAVY).ejecta).toBeCloseTo(before * 1.1);
  });

  it("ユウロピウム：放出物 ×2", () => {
    const meta = layer4();
    const before = predictMerger(meta, LIGHT, HEAVY).ejecta;
    meta.rProcess.discovered = [63];
    expect(predictMerger(meta, LIGHT, HEAVY).ejecta).toBeCloseTo(before * 2);
  });

  it("オスミウム：合体までの時間 ×0.5", () => {
    const meta = layer4();
    meta.rProcess.discovered = [76];
    expect(mergerSeconds(meta)).toBe(MERGER_SECONDS / 2);
  });

  it("イリジウム：連星の枠 +1", () => {
    const meta = layer4();
    meta.rProcess.discovered = [77];
    expect(binarySlots(meta)).toBe(2);
  });

  it("白金：Ye −0.025", () => {
    const meta = layer4();
    const before = predictMerger(meta, LIGHT, HEAVY).ye;
    meta.rProcess.discovered = [78];
    expect(predictMerger(meta, LIGHT, HEAVY).ye).toBeCloseTo(before - 0.025);
  });
});

describe("届くところの名前と、次に作る元素", () => {
  it.each([
    [92, "アクチノイド（ウランまで）"],
    [83, "第3ピーク（金まで）"],
    [72, "第2ピーク（ユウロピウムまで）"],
    [50, "第1ピーク（スズまで）"],
  ])("Z %d まで：%s", (z, name) => {
    expect(reachName(z)).toBe(name);
  });

  it("まだの r過程の元素のうち一番近いもの。全部見つけていれば null", () => {
    const meta = layer4();
    meta.rProcess.amounts[78 - R_PATH_START] = rThreshold(78) / 2;
    expect(nextRDiscovery(meta.rProcess)).toEqual({ z: 78, progress: 0.5 });
    meta.rProcess.discovered = [...R_ELEMENTS];
    expect(nextRDiscovery(meta.rProcess)).toBeNull();
  });
});
