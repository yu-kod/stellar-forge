import { beforeAll, describe, expect, it } from "vitest";
import { FASTER_MOVES, medalOf } from "@/features/game/hall";
import { playIdle, type IdleReport } from "@/test-utils/simulate";
import { S_DISCOVERABLE } from "./sprocess";
import type { GameState } from "./types";

const LIMIT = 330 * 60;

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
