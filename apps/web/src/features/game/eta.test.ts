import { describe, expect, it } from "vitest";
import { etaSeconds, trackProgress, type ProgressTrack } from "./eta";

describe("次の発見までの見込み", () => {
  const run = (points: [number, number, number][]) =>
    points.reduce<ProgressTrack | null>(
      (track, [z, progress, t]) => trackProgress(track, { z, progress, t }),
      null
    );

  it("進み具合の伸び（毎秒）をならし、残りの時間を見積もる", () => {
    // 毎秒 0.5% ずつ：50% のとき、残り 100秒
    const points: [number, number, number][] = Array.from({ length: 101 }, (_, t) => [
      40,
      t * 0.005,
      t,
    ]);
    expect(etaSeconds(run(points))).toBeCloseTo(100);
  });

  it("その元素を追い始めて10秒たつまでは見積もらない。伸びていなければ見積もらない", () => {
    expect(etaSeconds(null)).toBeNull();
    expect(
      etaSeconds(
        run([
          [40, 0.1, 0],
          [40, 0.2, 9],
        ])
      )
    ).toBeNull();
    expect(
      etaSeconds(
        run([
          [40, 0.1, 0],
          [40, 0.2, 10],
        ])
      )
    ).toBeCloseTo(80);
    expect(
      etaSeconds(
        run([
          [40, 0.5, 0],
          [40, 0.5, 60],
        ])
      )
    ).toBeNull();
  });

  it("次の元素に変わったら追い直す。時間が進んでいなければそのまま", () => {
    const track = run([
      [40, 0.1, 0],
      [40, 0.9, 60],
      [56, 0, 61],
    ]);
    expect(track).toMatchObject({ z: 56, since: 61, rate: null });
    expect(trackProgress(track, { z: 56, progress: 0.5, t: 61 })).toBe(track);
  });
});
