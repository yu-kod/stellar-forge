import { beforeAll, describe, expect, it } from "vitest";
import { medalOf } from "@/features/game/hall";
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
  let best: IdleReport;
  beforeAll(() => {
    standard = playIdle(LIMIT, { keepCluster: true, stopAt: "complete" });
    // 第3層で主星を炭素星にし、種を局面で変える
    best = playIdle(LIMIT, {
      keepCluster: true,
      layer3MainMass: 2,
      seedTarget: shifting,
      stopAt: "complete",
    });
  }, 900_000);

  it("初期設定で案内に従うと銀", () => {
    expect(medalOf(standard.marks.complete!)).toBe("銀");
  });

  it("炭素星と種の切り替えを組み合わせると金", () => {
    expect(medalOf(best.marks.complete!)).toBe("金");
  });
});
