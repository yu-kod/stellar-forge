import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";
import { createGame } from "./star";

const MINUTE = 60;
const LIMIT = 330 * MINUTE;

/** 最初の45分で、発見（軽い元素・s過程の元素）と層の解放のあいだが一番長くあいた時間 */
function longestQuiet(report: IdleReport, within = 45 * MINUTE): number {
  const events = [
    0,
    ...Object.values(report.lightAt),
    ...Object.values(report.sAt),
    report.marks.layer2!,
    report.marks.layer3!,
  ]
    .filter((t) => t <= within)
    .sort((a, b) => a - b);
  return Math.max(...events.slice(1).map((t, i) => t - events[i]!));
}

/** 2周目は、前の周で作った元素が星間物質に残り、星屑を持って始まる（1周目のなぞり直しにしない） */
describe("2周目", () => {
  let first: IdleReport;
  let second: IdleReport;
  beforeAll(() => {
    const play = (completions: number) =>
      playIdle(LIMIT, {
        start: createGame("milkyWay", completions),
        keepCluster: true,
        stopAt: "complete",
      });
    first = play(0);
    second = play(1);
  }, 900_000);

  it("同じ銀河でも、第1・2層（第3層の解放まで）が5分以上短い", () => {
    expect(first.marks.layer3! - second.marks.layer3!).toBeGreaterThanOrEqual(5 * MINUTE);
  });

  it("初期設定の流れでも、1周目より5分以上速く完結する（前の周の s元素で第3層も速い）", () => {
    expect(first.marks.complete! - second.marks.complete!).toBeGreaterThanOrEqual(5 * MINUTE);
  });

  it("最初の45分に、発見と層の解放のあいだが10分を超えない（1周目も2周目も）", () => {
    expect(longestQuiet(first)).toBeLessThanOrEqual(10 * MINUTE);
    expect(longestQuiet(second)).toBeLessThanOrEqual(10 * MINUTE);
  });

  it("2周目でも、爆発的ケイ素燃焼の元素（アルゴン・カリウム・カルシウム）を第1・2層で見つける", () => {
    for (const z of [18, 19, 20]) {
      expect(second.lightAt[z]).toBeLessThan(second.marks.layer3!);
    }
  });
});
