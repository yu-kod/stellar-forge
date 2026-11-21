import { describe, expect, it } from "vitest";
import { EMPTY_HALL, MEDALS, medalOf, paceAgainstBest, parseHall, recordCompletion } from "./hall";

const MINUTE = 60;

describe("記録への挑戦（やり直しても残る記録）", () => {
  it("完結までの時間でメダル：金 2時間15分以内、銀 2時間38分以内、それ以外は銅", () => {
    expect(MEDALS.map((m) => m.name)).toEqual(["金", "銀", "銅"]);
    expect(medalOf(135 * MINUTE)).toBe("金");
    expect(medalOf(135 * MINUTE + 1)).toBe("銀");
    expect(medalOf(158 * MINUTE)).toBe("銀");
    expect(medalOf(158 * MINUTE + 1)).toBe("銅");
  });

  const splits = (complete: number) => ({
    layer2: 25 * MINUTE,
    layer3: 55 * MINUTE,
    layer4: 140 * MINUTE,
    complete,
  });

  it("完結の回数を数え、一番速い時間と、今回・前回の層ごとの時刻を残す", () => {
    const once = recordCompletion(EMPTY_HALL, splits(190 * MINUTE));
    expect(once).toEqual({
      completions: 1,
      best: 190 * MINUTE,
      bestSplits: splits(190 * MINUTE),
      last: splits(190 * MINUTE),
      previous: null,
    });
    const twice = recordCompletion(once, splits(170 * MINUTE));
    expect(twice).toMatchObject({ completions: 2, best: 170 * MINUTE });
    expect(twice.previous).toEqual(splits(190 * MINUTE));
    const slower = recordCompletion(twice, splits(200 * MINUTE));
    expect(slower.best).toBe(170 * MINUTE);
    // 最速の周の層ごとの時刻は、最速を更新したときだけ入れ替える
    expect(slower.bestSplits).toEqual(splits(170 * MINUTE));
  });

  it("保存されたものを読む。形が合わなければ空", () => {
    expect(parseHall(null)).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: "x" })).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: 2, best: 100 })).toEqual({
      completions: 2,
      best: 100,
      bestSplits: null,
      last: null,
      previous: null,
    });
    const withSplits = {
      completions: 2,
      best: 100,
      bestSplits: splits(100),
      last: splits(100),
      previous: null,
    };
    expect(parseHall(withSplits)).toEqual(withSplits);
    // 古い記録：最速の周の時刻がなければ、今回が最速ならそれを使う
    const { bestSplits: _, ...old } = withSplits;
    expect(parseHall(old).bestSplits).toEqual(splits(100));
    expect(parseHall({ ...old, last: splits(120) }).bestSplits).toBeNull();
    expect(parseHall({ ...withSplits, last: { layer2: "x" } }).last).toBeNull();
    expect(parseHall({ ...withSplits, last: { ...splits(100), layer3: "x" } }).last).toBeNull();
    expect(parseHall({ completions: 0, best: null })).toEqual(EMPTY_HALL);
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
