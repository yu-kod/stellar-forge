import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";

const MINUTE = 60;

describe("第4層とエンディングのペーシング（5時間、画面を開いたまま遊ぶ）", () => {
  let report: IdleReport;
  beforeAll(() => {
    report = playIdle(300 * MINUTE);
  }, 600_000);

  it("s過程の循環で第4層が始まる", () => {
    expect(report.marks.layer4).toBe(report.marks.loop);
  });

  it("第4層の最初の発見は40分以内", () => {
    const first = Math.min(...Object.values(report.rAt));
    expect(first - report.marks.layer4!).toBeLessThanOrEqual(40 * MINUTE);
  });

  it("金は第4層の90分〜3時間後", () => {
    const gap = report.marks.gold! - report.marks.layer4!;
    expect(gap).toBeGreaterThanOrEqual(90 * MINUTE);
    expect(gap).toBeLessThanOrEqual(180 * MINUTE);
  });

  it("金で周期表の83マスが埋まる（ほかの元素はそれまでに見つかっている）", () => {
    expect(report.marks.complete).toBe(report.marks.gold);
  });
});
