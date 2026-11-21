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
        milkyWay: { layer2: null, layer3: null, layer4: null, complete: 100, galaxy: "milkyWay" },
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
    const best = splits(170 * MINUTE);
    const none = { layer2: null, layer3: null, layer4: null };
    expect(paceAgainstBest(none, best)).toBeNull();
    expect(paceAgainstBest({ ...none, layer2: 22 * MINUTE }, null)).toBeNull();
    expect(paceAgainstBest({ ...none, layer2: 22 * MINUTE }, best)).toEqual({
      layer: 2,
      diff: -3 * MINUTE,
    });
    expect(
      paceAgainstBest({ layer2: 22 * MINUTE, layer3: 60 * MINUTE, layer4: null }, best)
    ).toEqual({ layer: 3, diff: 5 * MINUTE });
    expect(
      paceAgainstBest({ layer2: 1, layer3: 2, layer4: 3 }, { ...best, layer4: null })
    ).toBeNull();
  });
});
