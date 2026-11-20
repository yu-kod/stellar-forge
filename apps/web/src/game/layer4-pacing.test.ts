import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";
import { R_ELEMENTS } from "./merger";

const MINUTE = 60;

describe("第4層とエンディングのペーシング（画面を開いたまま遊ぶ）", () => {
  let report: IdleReport;
  let handsOff: IdleReport;
  beforeAll(() => {
    report = playIdle(270 * MINUTE);
    handsOff = playIdle(300 * MINUTE, { steer: false });
  }, 900_000);

  it("s過程の循環を見て元素がそろったら、第4層が始まる", () => {
    expect(report.marks.layer4).toBeGreaterThanOrEqual(report.marks.loop!);
    expect(report.marks.layer4! - report.marks.loop!).toBeLessThanOrEqual(15 * MINUTE);
  });

  it("第4層の最初の発見は、解放から5分以内", () => {
    expect(Math.min(...Object.values(report.rAt)) - report.marks.layer4!).toBeLessThanOrEqual(
      5 * MINUTE
    );
  });

  it("第4層の発見（金まで）は15分以上途切れない", () => {
    const rTimes = R_ELEMENTS.flatMap((z) => (report.rAt[z] === undefined ? [] : [report.rAt[z]]));
    const times = [report.marks.layer4!, ...rTimes.sort((a, b) => a - b)];
    const gaps = times.slice(1).map((t, i) => t - times[i]!);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(15 * MINUTE);
  });

  it("金は第4層の45分〜2時間後", () => {
    const gap = report.marks.gold! - report.marks.layer4!;
    expect(gap).toBeGreaterThanOrEqual(45 * MINUTE);
    expect(gap).toBeLessThanOrEqual(120 * MINUTE);
  });

  it("金で周期表の83マスが埋まる（ほかの元素はそれまでに見つかっている）", () => {
    expect(report.marks.complete).toBe(report.marks.gold);
  });

  it("完結の後もそのまま続ければ、1時間以内にトリウム・ウランに届く（自動化が止まらない）", () => {
    expect(report.rAt[90]! - report.marks.complete!).toBeLessThanOrEqual(60 * MINUTE);
    expect(report.rAt[92]! - report.marks.complete!).toBeLessThanOrEqual(60 * MINUTE);
  });

  it("何も触らなくても第4層で詰まらず、金まで届く", () => {
    expect(handsOff.marks.gold).toBeDefined();
  });
});
