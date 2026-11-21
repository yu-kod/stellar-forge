import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";

const MINUTE = 60;
const LIMIT = 330 * MINUTE;

/** 張り付いて遊ぶ人と、5分に1回しか触らない人の差（星屑の自動交換）。画面の初期設定（星団 7・7 M☉）で目標の案内に従う流れで測る */
describe("張り付きで記録が決まらない", () => {
  let attentive: IdleReport;
  let occasional: IdleReport;
  let occasionalAuto: IdleReport;
  beforeAll(() => {
    attentive = playIdle(LIMIT, { keepCluster: true, stopAt: "complete" });
    occasional = playIdle(LIMIT, { keepCluster: true, touchEvery: 5 * MINUTE, stopAt: "complete" });
    occasionalAuto = playIdle(LIMIT, {
      keepCluster: true,
      touchEvery: 5 * MINUTE,
      autoShop: true,
      stopAt: "complete",
    });
  }, 1_200_000);

  it("自動交換を ON にすれば、5分に1回しか触らなくても、張り付いた人と完結の差は5%以内", () => {
    expect(
      Math.abs(occasionalAuto.marks.complete! - attentive.marks.complete!)
    ).toBeLessThanOrEqual(0.05 * attentive.marks.complete!);
  });

  it("自動交換がなければ、5分に1回では30分以上遅れる（自動交換に意味がある）", () => {
    expect(occasional.marks.complete! - attentive.marks.complete!).toBeGreaterThanOrEqual(
      30 * MINUTE
    );
  });
});
