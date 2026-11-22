import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";
import { reduceAfterStrontium } from "@/test-utils/strategies";
import { createGame } from "./star";

const MINUTE = 60;
const layer4 = (r: IdleReport) => r.marks.complete! - r.marks.layer4!;

/** 第4層の判断：放出物を強化に使い続けるか、どこかで使い道を追観測に切り替えるか（1回だけ。画面の初期設定の流れ） */
describe("追観測に切り替える時", () => {
  let never: IdleReport;
  let late: IdleReport;
  let early: IdleReport;
  let later: IdleReport;
  beforeAll(() => {
    never = playIdle(330 * MINUTE, { keepCluster: true, stopAt: "complete" });
    late = playIdle(330 * MINUTE, {
      keepCluster: true,
      stopAt: "complete",
      observeAfter: 25 * MINUTE,
    });
    early = playIdle(330 * MINUTE, {
      keepCluster: true,
      stopAt: "complete",
      observeAfter: 10 * MINUTE,
    });
    later = playIdle(330 * MINUTE, {
      keepCluster: true,
      stopAt: "complete",
      observeAfter: 40 * MINUTE,
    });
  }, 1_200_000);

  it("強化をそろえた後（解放から25分）で切り替えると、第4層が8分以上短くなる（記録タブで挙げる手になる重さ）", () => {
    expect(layer4(never) - layer4(late)).toBeGreaterThanOrEqual(8 * MINUTE);
  });

  it("早すぎる切り替え（10分）は、強化が足りず遅くなる。遅すぎる（40分）と縮みが小さい（いつ切り替えるかが判断）", () => {
    expect(layer4(early)).toBeGreaterThan(layer4(never));
    expect(layer4(later)).toBeGreaterThan(layer4(late));
  });
});

/** 金属の多い銀河（2周目・最善の流れ）でも、切り替える時の谷は1つ（記録タブの作戦の目安はどの銀河にも同じ一文を出す） */
describe("金属の多い銀河で追観測に切り替える時", () => {
  const AFTER = [10, 15, 20, 25, 30, 35] as const;
  /** 合体は1回ずつ起こるので、1分までの揺れは谷の形に数えない */
  const JITTER = 1 * MINUTE;
  const lengths: Record<number, number> = {};
  let never: number;
  beforeAll(() => {
    const play = (observeAfter?: number) =>
      layer4(
        playIdle(330 * MINUTE, {
          start: createGame("metalRich", 1),
          keepCluster: true,
          stopAt: "complete",
          layer3MainMass: 2,
          seedTarget: reduceAfterStrontium(10),
          ...(observeAfter === undefined ? {} : { observeAfter }),
        })
      );
    never = play();
    for (const minutes of AFTER) lengths[minutes] = play(minutes * MINUTE);
  }, 1_500_000);

  it("一番よい時の前は短くなっていき、後は長くなっていく（谷が1つ）。一番よい時は切り替えないより5分以上短い", () => {
    const values = AFTER.map((minutes) => lengths[minutes]!);
    const best = values.indexOf(Math.min(...values));
    for (let i = 1; i <= best; i++) expect(values[i]!).toBeLessThanOrEqual(values[i - 1]! + JITTER);
    for (let i = best + 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]! - JITTER);
    }
    expect(never - values[best]!).toBeGreaterThanOrEqual(5 * MINUTE);
  });
});
