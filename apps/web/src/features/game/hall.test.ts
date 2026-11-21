import { GALAXIES } from "@/game/balance";
import { describe, expect, it } from "vitest";
import type { Galaxy } from "@/game/types";
import {
  EMPTY_HALL,
  MEDALS,
  bestOf,
  medalOf,
  paceAgainstBest,
  parseHall,
  recordCompletion,
  type Splits,
} from "./hall";

const MINUTE = 60;

describe("記録への挑戦（やり直しても残る記録）", () => {
  it("完結までの時間でメダル：金 2時間15分以内、銀 2時間38分以内、それ以外は銅", () => {
    expect(MEDALS.map((m) => m.name)).toEqual(["金", "銀", "銅"]);
    expect(medalOf(135 * MINUTE)).toBe("金");
    expect(medalOf(135 * MINUTE + 1)).toBe("銀");
    expect(medalOf(158 * MINUTE)).toBe("銀");
    expect(medalOf(158 * MINUTE + 1)).toBe("銅");
  });

  const splits = (complete: number, galaxy: Galaxy = "milkyWay"): Splits => ({
    layer2: 25 * MINUTE,
    layer3: 55 * MINUTE,
    layer4: 140 * MINUTE,
    complete,
    galaxy,
    found: [],
  });

  it("完結の回数を数え、銀河ごとの最速の周と、今回・前回の層ごとの時刻を残す", () => {
    const once = recordCompletion(EMPTY_HALL, splits(190 * MINUTE));
    expect(once).toEqual({
      completions: 1,
      bests: { milkyWay: splits(190 * MINUTE) },
      last: splits(190 * MINUTE),
      previous: null,
    });
    const twice = recordCompletion(once, splits(170 * MINUTE));
    expect(twice.completions).toBe(2);
    expect(bestOf(twice, "milkyWay")).toEqual(splits(170 * MINUTE));
    expect(twice.previous).toEqual(splits(190 * MINUTE));
    // 最速の周は、同じ銀河で最速を更新したときだけ入れ替える
    const slower = recordCompletion(twice, splits(200 * MINUTE));
    expect(bestOf(slower, "milkyWay")).toEqual(splits(170 * MINUTE));
    const rich = recordCompletion(slower, splits(240 * MINUTE, "metalRich"));
    expect(bestOf(rich, "metalRich")).toEqual(splits(240 * MINUTE, "metalRich"));
    expect(bestOf(rich, "milkyWay")).toEqual(splits(170 * MINUTE));
    expect(bestOf(EMPTY_HALL, "milkyWay")).toBeNull();
  });

  it("保存されたものを読む。形が合わなければ空", () => {
    expect(parseHall(null)).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: "x" })).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: 0, bests: {} })).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: 2 })).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: 2, bests: null })).toEqual(EMPTY_HALL);
    const saved = {
      completions: 2,
      bests: { milkyWay: splits(100), metalRich: splits(150, "metalRich") },
      last: splits(150, "metalRich"),
      previous: splits(100),
    };
    expect(parseHall(saved)).toEqual(saved);
    expect(parseHall({ ...saved, last: { layer2: "x" } }).last).toBeNull();
    expect(parseHall({ ...saved, last: { ...splits(100), layer3: "x" } }).last).toBeNull();
    expect(parseHall({ ...saved, last: { ...splits(100), galaxy: "andromeda" } }).last).toBeNull();
    expect(parseHall({ ...saved, bests: { milkyWay: { layer2: "x" } } }).bests).toEqual({});
  });

  it("古い記録（最速の時間だけ）は天の川の記録として読む", () => {
    const { galaxy: _, ...plain } = splits(100);
    expect(parseHall({ completions: 2, best: 100 })).toEqual({
      completions: 2,
      bests: {
        milkyWay: {
          layer2: null,
          layer3: null,
          layer4: null,
          complete: 100,
          galaxy: "milkyWay",
          found: [],
        },
      },
      last: null,
      previous: null,
    });
    // 今回が最速なら、その層ごとの時刻を使う。最速の周の時刻があればそれを使う
    expect(bestOf(parseHall({ completions: 2, best: 100, last: plain }), "milkyWay")).toEqual(
      splits(100)
    );
    expect(
      bestOf(
        parseHall({
          completions: 2,
          best: 100,
          bestSplits: plain,
          last: { ...plain, complete: 120 },
        }),
        "milkyWay"
      )
    ).toEqual(splits(100));
    expect(parseHall({ completions: 0, best: null })).toEqual(EMPTY_HALL);
  });

  it("メダルの基準には銀河の目安の倍率を掛ける", () => {
    expect(medalOf(135 * MINUTE * GALAXIES.metalRich.par, "metalRich")).toBe("金");
    expect(medalOf(135 * MINUTE * GALAXIES.metalRich.par + 1, "metalRich")).toBe("銀");
    expect(medalOf(135 * MINUTE + 1)).toBe("銀");
  });

  it("遊んでいる周の、最後に解放した層の時刻と、最速の周の同じ層との差", () => {
    const best = { ...splits(170 * MINUTE), found: [] };
    const none = { milestones: { layer2: null, layer3: null, layer4: null }, foundTimes: [] };
    const at = (
      layer2: number | null,
      layer3: number | null = null,
      layer4: number | null = null
    ) => ({
      ...none,
      milestones: { layer2, layer3, layer4 },
    });
    expect(paceAgainstBest(none, best)).toBeNull();
    expect(paceAgainstBest(at(22 * MINUTE), null)).toBeNull();
    expect(paceAgainstBest(at(22 * MINUTE), best)).toEqual({ label: "第2層", diff: -3 * MINUTE });
    expect(paceAgainstBest(at(22 * MINUTE, 60 * MINUTE), best)).toEqual({
      label: "第3層",
      diff: 5 * MINUTE,
    });
    expect(paceAgainstBest(at(1, 2, 3), { ...best, layer4: null })).toBeNull();
  });

  it("最速の周の発見ごとの時刻があれば、いま見つけた数の元素に着いた時刻で比べる（層の中でも動く）", () => {
    const best = { ...splits(170 * MINUTE), found: [0, 60, 600, 1200] };
    const progress = {
      milestones: { layer2: null, layer3: null, layer4: null },
      foundTimes: [0, 50, 700],
    };
    expect(paceAgainstBest(progress, best)).toEqual({ label: "3元素目", diff: 100 });
    expect(paceAgainstBest({ ...progress, foundTimes: [0, 50, 700, 1100] }, best)).toEqual({
      label: "4元素目",
      diff: -100,
    });
    // 最速の周より多く見つけていれば、層で比べる
    expect(paceAgainstBest({ ...progress, foundTimes: [0, 1, 2, 3, 4] }, best)).toBeNull();
  });
});
