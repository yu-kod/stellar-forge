import { describe, expect, it } from "vitest";
import { EMPTY_HALL, MEDALS, medalOf, parseHall, recordCompletion } from "./hall";

const MINUTE = 60;

describe("記録への挑戦（やり直しても残る記録）", () => {
  it("完結までの時間でメダル：金 2時間55分以内、銀 3時間5分以内、それ以外は銅", () => {
    expect(MEDALS.map((m) => m.name)).toEqual(["金", "銀", "銅"]);
    expect(medalOf(175 * MINUTE)).toBe("金");
    expect(medalOf(175 * MINUTE + 1)).toBe("銀");
    expect(medalOf(185 * MINUTE)).toBe("銀");
    expect(medalOf(185 * MINUTE + 1)).toBe("銅");
  });

  it("完結の回数を数え、一番速い時間を残す", () => {
    const once = recordCompletion(EMPTY_HALL, 190 * MINUTE);
    expect(once).toEqual({ completions: 1, best: 190 * MINUTE });
    expect(recordCompletion(once, 200 * MINUTE)).toEqual({ completions: 2, best: 190 * MINUTE });
    expect(recordCompletion(once, 170 * MINUTE)).toEqual({ completions: 2, best: 170 * MINUTE });
  });

  it("保存されたものを読む。形が合わなければ空", () => {
    expect(parseHall(null)).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: "x" })).toEqual(EMPTY_HALL);
    expect(parseHall({ completions: 2, best: 100 })).toEqual({ completions: 2, best: 100 });
    expect(parseHall({ completions: 0, best: null })).toEqual(EMPTY_HALL);
  });
});
