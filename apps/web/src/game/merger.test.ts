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
  mergerSeconds,
  nextRDiscovery,
  rThreshold,
  reachName,
  predictMerger,
  rWeight,
} from "./merger";
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

describe("合体の見込み（質量比 → 放出物の量と Ye → 届くところ）", () => {
  it("同じ質量（q = 1）は放出物 1、Ye 0.40 で第1ピークまで", () => {
    expect(predictMerger(createMeta(), 3, 3)).toMatchObject({
      q: 1,
      ejecta: 1,
      reach: 50,
      blackHole: false,
    });
    expect(predictMerger(createMeta(), 3, 3).ye).toBeCloseTo(0.4);
  });

  it("非対称なほど放出物が多く、Ye が下がって重い元素まで届く（1.2 と 2.0 で第3ピーク）", () => {
    const p = predictMerger(createMeta(), LIGHT, HEAVY);
    expect(p.q).toBeCloseTo(0.6);
    expect(p.ejecta).toBeCloseTo(1 + 3 * 0.4);
    expect(p.ye).toBeCloseTo(0.4 - 0.55 * 0.4);
    expect(p.reach).toBe(83);
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
    expect(rAmount(first, 34)).toBeCloseTo(1 * rWeight(34));
    expect(rAmount(first, 52)).toBe(0);
    const third = merged(LIGHT, HEAVY).meta;
    expect(rAmount(third, 78)).toBeCloseTo(2.2 * rWeight(78));
    expect(rAmount(third, 79)).toBeCloseTo(2.2 * rWeight(79));
  });

  it("寿命の短い元素（Z 84〜89・91）には貯めない", () => {
    expect(rWeight(86)).toBe(0);
    expect(rWeight(91)).toBe(0);
    expect(rWeight(90)).toBeGreaterThan(0);
  });

  it("r過程だけで作る元素は、その元素の発見の量を超えたら発見する（金が一番多い）", () => {
    expect([63, 76, 77, 78, 79].map(rThreshold)).toEqual([5, 8, 20, 40, 200]);
    let meta = layer4({ [LIGHT]: 20, [HEAVY]: 20 });
    meta.rProcess.amounts[78 - R_PATH_START] = rThreshold(78) - 0.1;
    meta.rProcess.amounts[79 - R_PATH_START] = rThreshold(79) - 1;
    const game = formBinary({ ...createGame(), meta }, LIGHT, HEAVY);
    const result = advanceBinaries(game.meta, MERGER_SECONDS);
    meta = result.meta;
    expect(meta.rProcess.discovered).toContain(78);
    expect(meta.rProcess.discovered).not.toContain(79);
    expect(result.events).toContainEqual({ type: "rDiscover", z: 78 });
  });

  it("s過程で作れる元素は、r過程で作っても数えない（すでに見つけているので）", () => {
    const { meta } = merged(LIGHT, HEAVY);
    expect(meta.rProcess.discovered.every((z) => [63, 76, 77, 78, 79, 90, 92].includes(z))).toBe(
      true
    );
  });

  it("毎回の更新で連星を進める（留守の間も）", () => {
    const game = formBinary({ ...createGame(), meta: layer4() }, LIGHT, HEAVY);
    const { state } = advanceAll(game, MERGER_SECONDS + 1, 1);
    expect(state.meta.rProcess.mergers).toBe(1);
  });
});

describe("r過程の発見の効果", () => {
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
    meta.rProcess.discovered = [63, 76, 77, 78, 79];
    expect(nextRDiscovery(meta.rProcess)).toBeNull();
  });
});
