import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";

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
      observeAfter: 30 * MINUTE,
    });
    early = playIdle(330 * MINUTE, {
      keepCluster: true,
      stopAt: "complete",
      observeAfter: 15 * MINUTE,
    });
    later = playIdle(330 * MINUTE, {
      keepCluster: true,
      stopAt: "complete",
      observeAfter: 40 * MINUTE,
    });
  }, 1_200_000);

  it("強化をそろえた後（解放から30分）で切り替えると、第4層が5分以上短くなる", () => {
    expect(layer4(never) - layer4(late)).toBeGreaterThanOrEqual(5 * MINUTE);
  });

  it("早すぎる切り替え（15分）は、強化が足りず遅くなる。遅すぎる（40分）と縮みが小さい（いつ切り替えるかが判断）", () => {
    expect(layer4(early)).toBeGreaterThan(layer4(never));
    expect(layer4(later)).toBeGreaterThan(layer4(late));
  });
});
