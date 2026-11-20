import { describe, expect, it } from "vitest";
import { rebirth } from "./actions";
import { dustPreview } from "./dust";
import { collapsed } from "@/test-utils/game";

describe("これまでの一番よい1周の稼ぎ（星屑ごとの毎秒）", () => {
  it("星が終わるたびに、その周の 星屑 ÷ 時間 が今までより大きければ更新する", () => {
    const game = collapsed();
    const gain = dustPreview(game.meta, game.star);
    const next = rebirth(game).meta;
    expect(next.bestRate.O).toBeCloseTo(gain.O / game.star.time, 10);
    const slow = collapsed();
    slow.meta = { ...slow.meta, bestRate: next.bestRate };
    slow.star.time *= 10;
    expect(rebirth(slow).meta.bestRate.O).toBe(next.bestRate.O);
  });
});
