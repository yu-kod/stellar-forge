import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";

const MINUTE = 60;

describe("ペーシング（4時間、画面を開いたまま遊ぶ）", () => {
  let report: IdleReport;
  beforeAll(() => {
    report = playIdle(240 * MINUTE);
  }, 300_000);

  it("第2層は25〜60分で解放される", () => {
    expect(report.marks.layer2).toBeGreaterThanOrEqual(25 * MINUTE);
    expect(report.marks.layer2).toBeLessThanOrEqual(60 * MINUTE);
  });

  it("第3層は第2層の25〜60分後に解放される", () => {
    const gap = report.marks.layer3! - report.marks.layer2!;
    expect(gap).toBeGreaterThanOrEqual(25 * MINUTE);
    expect(gap).toBeLessThanOrEqual(60 * MINUTE);
  });

  it("s過程：ストロンチウムのピークは第3層の10〜40分後", () => {
    const gap = report.marks.strontium! - report.marks.layer3!;
    expect(gap).toBeGreaterThanOrEqual(10 * MINUTE);
    expect(gap).toBeLessThanOrEqual(40 * MINUTE);
  });

  it("s過程：バリウム → 鉛 → 循環の順に届き、循環は第3層の1.5〜3時間後", () => {
    const { layer3, strontium, barium, lead, loop } = report.marks;
    expect(barium!).toBeGreaterThan(strontium!);
    expect(lead!).toBeGreaterThan(barium!);
    expect(loop!).toBeGreaterThanOrEqual(lead!);
    expect(loop! - layer3!).toBeGreaterThanOrEqual(90 * MINUTE);
    expect(loop! - layer3!).toBeLessThanOrEqual(180 * MINUTE);
  });

  it("軽い元素は第1層から少しずつ見つかり、一度にまとめて出ない", () => {
    const times = Object.values(report.lightAt);
    const beforeLayer2 = times.filter((t) => t < report.marks.layer2!);
    expect(beforeLayer2.length).toBeGreaterThanOrEqual(3);
    expect(times.length).toBeGreaterThanOrEqual(8);
    expect(new Set(times.map((t) => Math.floor(t / (10 * MINUTE)))).size).toBeGreaterThanOrEqual(6);
  });

  it("星屑は 10¹² を超えない（数値が暴走しない）", () => {
    expect(report.maxDust).toBeLessThan(1e12);
  });

  it("最初の2時間は、10分ごとに1〜30回恒久強化を買う", () => {
    const firstTwoHours = report.purchasesPer10Min.slice(0, 12);
    expect(Math.min(...firstTwoHours)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...firstTwoHours)).toBeLessThanOrEqual(30);
  });

  it("90分以降も、10分ごとに平均5回以上恒久強化を買い、30分以上何も買えない時間がない", () => {
    const late = report.purchasesPer10Min.slice(9);
    expect(late.reduce((sum, n) => sum + n, 0) / late.length).toBeGreaterThanOrEqual(5);
    late.slice(0, -2).forEach((n, i) => {
      expect(n + late[i + 1]! + late[i + 2]!).toBeGreaterThan(0);
    });
  });
});
