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
  rGoal,
  rThreshold,
  reachName,
  predictMerger,
  rWeight,
  R_ELEMENTS,
  yieldOf,
  bandOf,
  pairHint,
  pairAdvice,
  usefulPair,
  DISK_YE,
  DYNAMICAL_BASE,
  DYNAMICAL_ASYMMETRY,
} from "./merger";
import { NEUTRON_STAR_MASSES, neutronStarBin } from "./rprocess";
import { createMeta } from "./star";
import type { ClusterSlot, GameState, Meta } from "./types";
import { createSlot } from "./cluster";
import { SHOP } from "./balance";
import { createGame } from "./star";

const LIGHT = 0; // 1.2 M☉
const HEAVY = 8; // 2.0 M☉

function layer4(pool: Record<number, number> = { [LIGHT]: 5, [HEAVY]: 5 }): Meta {
  const meta = createMeta();
  meta.rProcess = { ...createRProcess(), unlocked: true };
  for (const [bin, n] of Object.entries(pool)) meta.rProcess.pool[Number(bin)] = n;
  return meta;
}

/** 次に生む質量を決めた星団の星 */
function slotOf(meta: Meta, mass: number): ClusterSlot {
  return { ...createSlot(meta), nextMass: mass };
}

const rAmount = (meta: Meta, z: number) => meta.rProcess.amounts[z - R_PATH_START]!;

describe("合体の見込み：潮汐の放出物（赤）と円盤風（青）", () => {
  it("軽い同士（1.2 + 1.2）は、合体後の星が長く残って円盤風が多い。どちらも Ye が高く第2ピークまで", () => {
    const p = predictMerger(createMeta(), LIGHT, LIGHT);
    expect(p).toMatchObject({ q: 1, blackHole: false, reach: 56 });
    expect(p.dynamical).toMatchObject({ from: 31, to: 56 });
    expect(p.dynamical.amount).toBeCloseTo(DYNAMICAL_BASE);
    expect(p.dynamical.ye).toBeCloseTo(0.4);
    expect(p.disk).toMatchObject({ ye: DISK_YE, from: 31, to: 56 });
    expect(p.disk.amount).toBeCloseTo(2.5);
    expect(p.ejecta).toBeCloseTo(DYNAMICAL_BASE + 2.5);
  });

  it("質量比が偏るほど潮汐の放出物が多く Ye が低い。合計が重いほど円盤風は減る", () => {
    const p = predictMerger(createMeta(), LIGHT, 5); // 1.2 + 1.7
    const q = 1.2 / 1.7;
    expect(p.ye).toBeCloseTo(0.4 - 0.55 * (1 - q));
    expect(p.dynamical.amount).toBeCloseTo(DYNAMICAL_BASE + DYNAMICAL_ASYMMETRY * (1 - q));
    expect(p.disk.amount).toBeCloseTo(2 * ((3.4 - 2.9) / 0.8));
    expect(predictMerger(createMeta(), 2, 2).disk.amount).toBeLessThan(
      predictMerger(createMeta(), LIGHT, LIGHT).disk.amount
    );
  });

  it.each([
    [0.4, 31, 56],
    [0.3, 56, 72],
    [0.22, 72, 83],
    [0.14, 72, 92],
  ])("Ye %f 以下（の帯）で作るのは Z %d〜%d", (ye, from, to) => {
    expect(bandOf(ye)).toEqual({ from, to });
  });

  it("1.2 + 1.7 はランタノイド。ニュートリノの遮蔽で Ye が下がると第3ピーク、もっと下げるとウランまで", () => {
    const meta = createMeta();
    expect(predictMerger(meta, LIGHT, 5).dynamical).toMatchObject({ from: 56, to: 72 });
    meta.shop.shield = 1;
    expect(predictMerger(meta, LIGHT, 5).dynamical).toMatchObject({ from: 72, to: 83 });
    meta.shop.shield = 4;
    expect(predictMerger(meta, LIGHT, 5)).toMatchObject({ reach: 92 });
  });

  it("合計が 3.4 M☉ を超えるとすぐブラックホールになり、円盤風はなく潮汐の放出物もわずか", () => {
    const p = predictMerger(createMeta(), HEAVY, HEAVY);
    expect(p.blackHole).toBe(true);
    expect(p.disk.amount).toBe(0);
    expect(p.ejecta).toBeCloseTo(BLACK_HOLE_EJECTA);
    expect(p.reach).toBe(56);
    expect(predictMerger(createMeta(), 2, HEAVY).blackHole).toBe(false); // 1.4 + 2.0 = 3.4
  });

  it("並べる順は関係ない", () => {
    expect(predictMerger(createMeta(), HEAVY, LIGHT)).toEqual(
      predictMerger(createMeta(), LIGHT, HEAVY)
    );
  });
});

describe("合体までの時間（重力波）", () => {
  it("1.4 + 1.4 M☉ を基準に、m1·m2·(m1+m2) に反比例する（重い組ほど早い）", () => {
    const meta = createMeta();
    expect(mergerSeconds(meta, 2, 2)).toBeCloseTo(MERGER_SECONDS);
    expect(mergerSeconds(meta, LIGHT, LIGHT)).toBeCloseTo(
      (MERGER_SECONDS * (1.4 * 1.4 * 2.8)) / (1.2 * 1.2 * 2.4)
    );
    expect(mergerSeconds(meta, 5, 5)).toBeLessThan(mergerSeconds(meta, LIGHT, 5));
    expect(mergerSeconds(meta, 5, LIGHT)).toBe(mergerSeconds(meta, LIGHT, 5));
  });
});

describe("一番よい組は、作りたい元素で変わる", () => {
  const full = () => layer4(Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8].map((b) => [b, 5])));

  it("テルル（第2ピーク）なら、合計の軽い組（円盤風）", () => {
    const [a, b] = bestPair(full(), 52)!;
    expect(NEUTRON_STAR_MASSES[a]! + NEUTRON_STAR_MASSES[b]!).toBeLessThanOrEqual(2.6);
  });

  it("ガドリニウム（ランタノイド）なら、ほどほどに偏った組", () => {
    const [a, b] = bestPair(full(), 64)!;
    expect(predictMerger(full(), a, b).dynamical).toMatchObject({ from: 56, to: 72 });
  });

  it("金なら、もっと偏った組（1.2 + 1.8 M☉ はランタノイドを作らない）", () => {
    const [a, b] = bestPair(full(), 79)!;
    expect(predictMerger(full(), a, b).dynamical).toMatchObject({ from: 72, to: 83 });
    expect(yieldOf(full(), LIGHT, 6, 64)).toBe(0);
  });

  it("時間あたりで比べる（同じ量なら早く合体する組）", () => {
    const meta = full();
    const [a, b] = bestPair(meta, 79)!;
    for (let x = 0; x < 9; x++) {
      for (let y = x; y < 9; y++) {
        const rate = (i: number, j: number) => yieldOf(meta, i, j, 79) / mergerSeconds(meta, i, j);
        expect(rate(a, b)).toBeGreaterThanOrEqual(rate(x, y));
      }
    }
  });

  it("ニュートリノの遮蔽で Ye を下げると、もっと対称な組も金に届く", () => {
    const meta = full();
    const reaching = () => {
      let n = 0;
      for (let a = 0; a < 9; a++)
        for (let b = a; b < 9; b++) n += yieldOf(meta, a, b, 79) > 0 ? 1 : 0;
      return n;
    };
    const before = reaching();
    expect(yieldOf(meta, 2, 7, 79)).toBe(0); // 1.4 + 1.9
    meta.shop.shield = 2;
    expect(reaching()).toBeGreaterThan(before);
    expect(yieldOf(meta, 2, 7, 79)).toBeGreaterThan(0);
  });

  it("在庫でその元素に届く組がなければ null", () => {
    expect(bestPair(layer4({ [LIGHT]: 4 }), 79)).toBeNull();
  });

  it("1回の合体で作るその元素の量：届く放出物（潮汐・円盤風）× 重み", () => {
    const meta = full();
    const p = predictMerger(meta, LIGHT, 5);
    expect(yieldOf(meta, LIGHT, 5, 64)).toBeCloseTo(p.dynamical.amount * rWeight(64));
    expect(yieldOf(meta, LIGHT, 5, 56)).toBeCloseTo(
      (p.dynamical.amount + p.disk.amount) * rWeight(56)
    );
    expect(yieldOf(meta, LIGHT, 5, 52)).toBeCloseTo(p.disk.amount * rWeight(52));
    expect(yieldOf(meta, LIGHT, LIGHT, 79)).toBe(0);
  });
});

describe("届く組がないときの案内", () => {
  it("在庫によらず一番よい組と、それを残す親の星の質量", () => {
    const meta = layer4({ [LIGHT]: 5, [6]: 5 }); // 1.2 と 1.8 しかない
    expect(bestPair(meta, 64)).toBeNull();
    const hint = pairHint(meta, 64)!;
    expect(predictMerger(meta, hint.bins[0], hint.bins[1]).dynamical).toMatchObject({ to: 72 });
    expect(hint.bins).toEqual(
      bestPair(layer4(Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8].map((b) => [b, 5]))), 64)
    );
    expect(hint.masses.map(neutronStarBin)).toEqual(hint.bins);
  });

  it("どの組でも届かなければ null（ウランは遮蔽が要る）", () => {
    expect(pairHint(layer4(), 92)).toBeNull();
  });

  describe("目標に出す案内", () => {
    it("在庫で届く組があれば ready", () => {
      expect(pairAdvice(layer4(), 52)).toEqual({ type: "ready" });
    });

    it("星団の星が届く中性子星をこれから残すなら wait", () => {
      const meta = layer4({});
      meta.cluster = [slotOf(meta, 10), slotOf(meta, 28)];
      expect(pairAdvice(meta, 64)).toEqual({ type: "wait" });
    });

    it("次の質量を決めていない星は今の星で数え、ブラックホールになる星は数えない", () => {
      const meta = layer4({});
      const current = createSlot(meta);
      current.star = { ...current.star, initialMass: 10 };
      meta.cluster = [{ ...current, nextMass: null }, slotOf(meta, 60)];
      expect(pairAdvice(meta, 52)).toEqual({ type: "wait" }); // 1.2 + 1.2 の円盤風
      meta.cluster = [slotOf(meta, 60)];
      expect(pairAdvice(meta, 52).type).toBe("masses");
    });

    it("作っている中性子星では届かなければ、星団の星の質量を出す", () => {
      const meta = layer4({ [LIGHT]: 5, [6]: 5 });
      meta.cluster = [slotOf(meta, 10), slotOf(meta, 32)];
      expect(pairAdvice(meta, 64)).toEqual({ type: "masses", ...pairHint(meta, 64)! });
    });

    it("遮蔽をあと1回強化すれば、作っている中性子星で届くなら遮蔽を勧める", () => {
      const meta = layer4({ [2]: 5, [HEAVY]: 5 }); // 1.4 + 2.0 はランタノイド
      expect(pairAdvice(meta, 75)).toEqual({ type: "shield" });
      meta.shop.shield = SHOP.shield.maxLevel!;
      meta.rProcess.discovered = [78];
      meta.rProcess.pool = meta.rProcess.pool.map((_, bin) => (bin === 2 || bin === HEAVY ? 1 : 0));
      expect(pairAdvice(meta, 64).type).toBe("masses"); // 遮蔽は上限：質量を変える
    });

    it("どの組でも届かなければ遮蔽", () => {
      expect(pairAdvice(layer4(), 92)).toEqual({ type: "shield" });
    });
  });
});

describe("連星を組む", () => {
  it("在庫から2つを取り、合体までの時間を持った連星にする", () => {
    const game: GameState = { ...createGame(), meta: layer4() };
    const next = formBinary(game, LIGHT, HEAVY);
    expect(next.meta.rProcess.pool[LIGHT]).toBe(4);
    expect(next.meta.rProcess.pool[HEAVY]).toBe(4);
    expect(next.meta.rProcess.binaries).toEqual([
      { a: LIGHT, b: HEAVY, remaining: mergerSeconds(createMeta(), LIGHT, HEAVY) },
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
    const seconds = mergerSeconds(game.meta, LIGHT, HEAVY);
    const before = advanceBinaries(game.meta, seconds - 1);
    expect(before.meta.rProcess.binaries[0]?.remaining).toBeCloseTo(1);
    expect(before.events).toEqual([]);
    const { meta, events } = advanceBinaries(before.meta, 1);
    expect(meta.rProcess.binaries).toEqual([]);
    expect(meta.rProcess.mergers).toBe(1);
    expect(events[0]).toMatchObject({ type: "merger", reach: 83, blackHole: false });
  });

  it("潮汐の放出物と円盤風を、それぞれ作る範囲の元素に 量 × 重み で配る", () => {
    const even = merged(3, 3).meta; // 1.5 + 1.5：どちらも第2ピークまで
    const p = predictMerger(createMeta(), 3, 3);
    expect(rAmount(even, 34)).toBeCloseTo(p.ejecta * rWeight(34));
    expect(rAmount(even, 52)).toBeCloseTo(p.ejecta * rWeight(52));
    expect(rAmount(even, 64)).toBe(0);
    const uneven = merged(LIGHT, HEAVY).meta; // 1.2 + 2.0：潮汐は第3ピーク、円盤風は第2ピーク
    const q = predictMerger(createMeta(), LIGHT, HEAVY);
    expect(rAmount(uneven, 78)).toBeCloseTo(q.dynamical.amount * rWeight(78));
    expect(rAmount(uneven, 52)).toBeCloseTo(q.disk.amount * rWeight(52));
    expect(rAmount(uneven, 64)).toBe(0);
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
    [72, "ランタノイド"],
    [56, "第1・第2ピーク（バリウムまで）"],
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

describe("周期表の先（トリウム・ウラン）", () => {
  it("金より多くの放出物が要る（完結の後の目標）", () => {
    const needed = (z: number) => rThreshold(z) / rWeight(z);
    expect(needed(90)).toBeGreaterThan(needed(79));
    expect(needed(92)).toBeGreaterThan(needed(79));
  });

  it("在庫で届く組のある元素を先に選ぶ（届かない元素で自動化が止まらない）", () => {
    const meta = layer4({ [LIGHT]: 5, [6]: 5 }); // ランタノイドに届かない
    meta.rProcess.amounts[64 - R_PATH_START] = rThreshold(64) * 0.9;
    meta.rProcess.amounts[75 - R_PATH_START] = rThreshold(75) * 0.1;
    expect(rGoal(meta)).toBe(75);
    expect(rGoal(layer4({}))).toBe(52); // どれにも届かなければ一番近いもの
  });

  it("ウランを見つけたら、作りたい元素はトリウム", () => {
    const meta = layer4();
    meta.rProcess.discovered = [...R_ELEMENTS, 92];
    expect(rGoal(meta)).toBe(90);
  });

  it("まだの元素のどれかに届く組か", () => {
    const meta = layer4();
    expect(usefulPair(meta, LIGHT, LIGHT)).toBe(true);
    meta.rProcess.discovered = [...R_ELEMENTS];
    expect(usefulPair(meta, LIGHT, LIGHT)).toBe(false); // 第2ピークまで：もう作るものがない
    meta.shop.shield = 4;
    expect(usefulPair(meta, LIGHT, HEAVY)).toBe(true); // ウランに届く
  });

  it("r過程の元素をそろえたら、作りたい元素はウラン", () => {
    const meta = layer4();
    meta.rProcess.discovered = [...R_ELEMENTS];
    expect(rGoal(meta)).toBe(92);
  });
});
