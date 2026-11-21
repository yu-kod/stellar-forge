import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";
import { DEFAULT_SEED_TARGET } from "./balance";
import { S_DISCOVERABLE } from "./sprocess";
import type { GameState } from "./types";

const MINUTE = 60;
const HOURS = 5;
const LAYER3_ITEMS = ["pocket", "flash", "binary"] as const;

/** s元素がそろうまでは few、そろったら30（重元素の星屑と Ia型超新星を稼ぐ） */
const switchTo30 = (few: number) => (s: GameState) =>
  s.meta.sProcess.discovered.length === S_DISCOVERABLE ? 30 : few;

/**
 * 第3層の判断：鉄の種が少ないと1つ1つは速く進むが、中性子を毒に取られ、重元素の星屑も稼げない。
 * 多いと星屑を稼いで強化を買えるが、中性子が薄まる。どちらの端も最善にならない
 */
describe("鉄の種の目標の板挟み（画面を開いたまま遊ぶ）", () => {
  let standard: IdleReport;
  let one: IdleReport;
  let oneThen30: IdleReport;
  let thirty: IdleReport;
  let shifting: IdleReport;
  beforeAll(() => {
    standard = playIdle(HOURS * 3600, { stopAt: "complete" });
    one = playIdle(HOURS * 3600, { seedTarget: 1, stopAt: "loop" });
    oneThen30 = playIdle(HOURS * 3600, { seedTarget: switchTo30(1), stopAt: "complete" });
    thirty = playIdle(HOURS * 3600, { seedTarget: 30, stopAt: "complete" });
    // 局面で変える：ストロンチウムまでは30（重元素の星屑で強化を買う）、その先は1（遠くまで）、そろったら30
    shifting = playIdle(HOURS * 3600, {
      seedTarget: (s) =>
        s.meta.sProcess.discovered.length === S_DISCOVERABLE
          ? 30
          : s.meta.sProcess.discovered.includes(38)
            ? 1
            : 30,
      stopAt: "complete",
    });
  }, 1_200_000);

  it("初期設定は種10", () => {
    expect(DEFAULT_SEED_TARGET).toBe(10);
  });

  it("種1は最初のピーク（ストロンチウム）には早いが、循環には10分以上遅れる", () => {
    expect(one.marks.strontium!).toBeLessThan(standard.marks.strontium!);
    expect(one.marks.loop! - standard.marks.loop!).toBeGreaterThanOrEqual(10 * MINUTE);
  });

  it("種1で進めて s元素がそろってから30にしても、初期設定より速くならない", () => {
    expect(oneThen30.marks.complete!).toBeGreaterThanOrEqual(standard.marks.complete!);
  });

  it("種30は重元素の星屑を2倍以上稼ぐが、83マスが埋まるのは初期設定と5分も変わらない（増やすだけでは速くならない）", () => {
    expect(thirty.heavyEarned).toBeGreaterThan(2 * standard.heavyEarned);
    expect(thirty.marks.complete!).toBeGreaterThanOrEqual(standard.marks.complete! - 5 * MINUTE);
  });

  it("最善の種は層の中で入れ替わる：30 → 1 → 30 と変えると、初期設定・種30のままより8%以上速い", () => {
    const faster = (r: IdleReport) => r.marks.complete! <= 0.92 * standard.marks.complete!;
    expect(faster(shifting)).toBe(true);
    expect(shifting.marks.complete!).toBeLessThanOrEqual(0.95 * thirty.marks.complete!);
  });

  it("初期設定では第3層の強化を10回以上買う（強化に意味がある）", () => {
    const levels = LAYER3_ITEMS.reduce((sum, id) => sum + standard.state.meta.shop[id], 0);
    expect(levels).toBeGreaterThanOrEqual(10);
  });

  it("種が多いほど白色矮星を使う（たまるだけにならない）", () => {
    expect(thirty.state.meta.iaSupernovae).toBeGreaterThan(1.5 * standard.state.meta.iaSupernovae);
  });
});
