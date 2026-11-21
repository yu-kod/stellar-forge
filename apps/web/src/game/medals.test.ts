import { beforeAll, describe, expect, it } from "vitest";
import { FASTER_MOVES, medalLimit, medalOf } from "@/features/game/hall";
import { playIdle, type IdleReport } from "@/test-utils/simulate";
import { S_DISCOVERABLE } from "./sprocess";
import { createGame } from "./star";
import type { GameState } from "./types";

const LIMIT = 330 * 60;
const MINUTE = 60;

/** ストロンチウムまでは30、その先は1、s元素がそろったら30 */
const shifting = (s: GameState) =>
  s.meta.sProcess.discovered.length === S_DISCOVERABLE
    ? 30
    : s.meta.sProcess.discovered.includes(38)
      ? 1
      : 30;

/** メダルの基準は、画面の初期設定（星団の質量 7・7 M☉）で目標の案内に従う流れで測る */
describe("記録への挑戦のメダル", () => {
  let standard: IdleReport;
  let shiftOnly: IdleReport;
  let best: IdleReport;
  let carbonOnly: IdleReport;
  beforeAll(() => {
    standard = playIdle(LIMIT, { keepCluster: true, stopAt: "complete" });
    shiftOnly = playIdle(LIMIT, { keepCluster: true, seedTarget: shifting, stopAt: "complete" });
    carbonOnly = playIdle(LIMIT, { keepCluster: true, layer3MainMass: 2, stopAt: "complete" });
    // 第3層で主星を炭素星にし、種を局面で変える
    best = playIdle(LIMIT, {
      keepCluster: true,
      layer3MainMass: 2,
      seedTarget: shifting,
      stopAt: "complete",
    });
  }, 900_000);

  it("初期設定で案内に従うだけでは銅。種を局面で変えるだけ・炭素星だけでは銀（金には判断が2つ要る）", () => {
    expect(medalOf(standard.marks.complete!)).toBe("銅");
    expect(medalOf(shiftOnly.marks.complete!)).toBe("銀");
    expect(medalOf(carbonOnly.marks.complete!)).toBe("銀");
  });

  it("炭素星と種の切り替えを組み合わせると金", () => {
    expect(medalOf(best.marks.complete!)).toBe("金");
  });

  it("第4層に早く着いた分は、ほとんど（85% 以上）完結まで残る（第4層の強化は第4層で稼ぐ）", () => {
    const earlier = standard.marks.layer4! - best.marks.layer4!;
    const kept = standard.marks.complete! - best.marks.complete!;
    expect(earlier).toBeGreaterThan(0);
    expect(kept / earlier).toBeGreaterThanOrEqual(0.85);
  });

  it("記録タブで挙げる手は、それぞれ単独で初期設定より3分以上速い", () => {
    const alone: Record<string, IdleReport> = {
      鉄の種を局面で変える: shiftOnly,
      第3層で主星を炭素星にする: carbonOnly,
    };
    expect([...FASTER_MOVES.milkyWay]).toEqual(Object.keys(alone));
    for (const report of Object.values(alone)) {
      expect(standard.marks.complete! - report.marks.complete!).toBeGreaterThanOrEqual(3 * 60);
    }
  });
});

/** 2周目（前の周の星屑を持って始める）は、厳しい基準で同じ判断を求める */
describe("2周目のメダル", () => {
  const flows: Record<string, IdleReport> = {};
  let firstStandard: IdleReport;
  beforeAll(() => {
    const second = (options: Parameters<typeof playIdle>[1] = {}) =>
      playIdle(LIMIT, {
        start: createGame("milkyWay", 1),
        keepCluster: true,
        stopAt: "complete",
        ...options,
      });
    flows.standard = second();
    flows.shiftOnly = second({ seedTarget: shifting });
    flows.carbonOnly = second({ layer3MainMass: 2 });
    flows.best = second({ layer3MainMass: 2, seedTarget: shifting });
    firstStandard = playIdle(LIMIT, { keepCluster: true, stopAt: "complete" });
  }, 900_000);

  it("何もしないと銅。手を1つ打つと銀、2つで金（1周目と同じ）", () => {
    const medal = (name: string) => medalOf(flows[name]!.marks.complete!, "milkyWay", true);
    expect(medal("standard")).toBe("銅");
    expect(medal("shiftOnly")).toBe("銀");
    expect(medal("carbonOnly")).toBe("銀");
    expect(medal("best")).toBe("金");
  });

  it("何もしない流れは、1周目も2周目も銀の基準から5分以上外にある（色を誤差で決めない）", () => {
    expect(
      firstStandard.marks.complete! - medalLimit("銀", "milkyWay", false)
    ).toBeGreaterThanOrEqual(5 * MINUTE);
    expect(
      flows.standard!.marks.complete! - medalLimit("銀", "milkyWay", true)
    ).toBeGreaterThanOrEqual(5 * MINUTE);
  });
});
