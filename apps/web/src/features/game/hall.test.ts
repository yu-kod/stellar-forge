import { describe, expect, it } from "vitest";
import { EMPTY_HALL, MEDALS, medalOf, parseHall, recordCompletion } from "./hall";

const MINUTE = 60;

describe("記録への挑戦（やり直しても残る記録）", () => {
  it("完結までの時間でメダル：金 2時間50分以内、銀 3時間以内、それ以外は銅", () => {
    expect(MEDALS.map((m) => m.name)).toEqual(["金", "銀", "銅"]);
    expect(medalOf(170 * MINUTE)).toBe("金");
    expect(medalOf(170 * MINUTE + 1)).toBe("銀");
    expect(medalOf(180 * MINUTE)).toBe("銀");
    expect(medalOf(180 * MINUTE + 1)).toBe("銅");
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
      last: splits(190 * MINUTE),
      previous: null,
    });
    const twice = recordCompletion(once, splits(170 * MINUTE));
    expect(twice).toMatchObject({ completions: 2, best: 170 * MINUTE });
    expect(twice.previous).toEqual(splits(190 * MINUTE));
    expect(recordCompletion(twice, splits(200 * MINUTE)).best).toBe(170 * MINUTE);
  });

  it("保存されたものを読む。形が合わなければ空", () => {
    expect(parseHall(null)).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: "x" })).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: 2, best: 100 })).toEqual({
      completions: 2,
      best: 100,
      last: null,
      previous: null,
    });
    const withSplits = { completions: 2, best: 100, last: splits(100), previous: null };
    expect(parseHall(withSplits)).toEqual(withSplits);
    expect(parseHall({ ...withSplits, last: { layer2: "x" } }).last).toBeNull();
    expect(parseHall({ ...withSplits, last: { ...splits(100), layer3: "x" } }).last).toBeNull();
    expect(parseHall({ completions: 0, best: null })).toEqual(EMPTY_HALL);
  });
});
