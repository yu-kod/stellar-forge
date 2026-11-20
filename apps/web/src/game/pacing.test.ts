import { describe, expect, it } from "vitest";
import { playIdle } from "@/test-utils/simulate";

const MINUTE = 60;

describe("ペーシング（2時間、画面を開いたまま遊ぶ）", () => {
  const report = playIdle(120 * MINUTE);

  it("第2層は30〜60分で解放される", () => {
    expect(report.marks.layer2).toBeGreaterThanOrEqual(28 * MINUTE);
    expect(report.marks.layer2).toBeLessThanOrEqual(60 * MINUTE);
  });

  it("第3層は第2層の25〜60分後に解放される", () => {
    const gap = report.marks.layer3! - report.marks.layer2!;
    expect(gap).toBeGreaterThanOrEqual(25 * MINUTE);
    expect(gap).toBeLessThanOrEqual(60 * MINUTE);
  });

  it("星屑は 10¹² を超えない（数値が暴走しない）", () => {
    expect(report.maxDust).toBeLessThan(1e12);
  });

  it("10分ごとに少なくとも1回は恒久強化を買える", () => {
    expect(Math.min(...report.purchasesPer10Min)).toBeGreaterThanOrEqual(1);
  });

  it("10分ごとの購入は多くても30回（クリックの作業にならない）", () => {
    expect(Math.max(...report.purchasesPer10Min)).toBeLessThanOrEqual(30);
  });
});
