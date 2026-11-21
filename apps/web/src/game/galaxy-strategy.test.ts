import { beforeAll, describe, expect, it } from "vitest";
import { FASTER_MOVES, medalOf } from "@/features/game/hall";
import { playIdle, type SeedPlan } from "@/test-utils/simulate";
import { S_DISCOVERABLE } from "./sprocess";
import { createGame } from "./star";
import type { Galaxy, GameState } from "./types";

const MINUTE = 60;
const LIMIT = 330 * MINUTE;

/** ストロンチウムまでは30、その先は1、s元素がそろったら30 */
const shifting = (s: GameState) =>
  s.meta.sProcess.discovered.length === S_DISCOVERABLE
    ? 30
    : s.meta.sProcess.discovered.includes(38)
      ? 1
      : 30;

/** 第3層で主星を炭素星にするか・種の決め方（省略すると初期値）を変えて、完結までの時間を測る（画面の初期設定の流れ） */
function complete(galaxy: Galaxy, seedTarget: SeedPlan | undefined, carbonStar = true): number {
  const report = playIdle(LIMIT, {
    start: createGame(galaxy),
    keepCluster: true,
    layer3MainMass: carbonStar ? 2 : undefined,
    seedTarget,
    stopAt: "complete",
  });
  return report.marks.complete ?? Infinity;
}

/** 銀河で最善の作戦が変わる */
describe("銀河ごとの最善の作戦", () => {
  const minutes: Record<string, number> = {};
  beforeAll(() => {
    minutes.milkyShift = complete("milkyWay", shifting);
    minutes.milkyKeep = complete("milkyWay", 30);
    minutes.richShift = complete("metalRich", shifting);
    minutes.richKeep = complete("metalRich", 30);
    // 金属の多い銀河で、判断を1つだけした流れと、何もしない流れ
    minutes.richDefault = complete("metalRich", undefined, false);
    minutes.richCarbonOnly = complete("metalRich", undefined);
    minutes.richKeepOnly = complete("metalRich", 30, false);
  }, 1_500_000);

  it("天の川では、種を局面で変える（30→1→30）ほうが30のままより10分以上速い", () => {
    expect(minutes.milkyKeep! - minutes.milkyShift!).toBeGreaterThanOrEqual(10 * MINUTE);
  });

  it("金属の多い銀河の中心では逆に、種を30のまま保つほうが10分以上速い（減らすと中性子が毒に取られる）", () => {
    expect(minutes.richShift! - minutes.richKeep!).toBeGreaterThanOrEqual(10 * MINUTE);
  });

  it("メダルの基準は銀河の倍率を掛ける。どちらの銀河でも、その銀河の最善（判断2つ）で金、逆の種では金に届かない", () => {
    expect(medalOf(minutes.milkyShift!, "milkyWay")).toBe("金");
    expect(medalOf(minutes.milkyKeep!, "milkyWay")).not.toBe("金");
    expect(medalOf(minutes.richKeep!, "metalRich")).toBe("金");
    expect(medalOf(minutes.richShift!, "metalRich")).not.toBe("金");
  });

  it("金属の多い銀河の記録タブで挙げる手は、それぞれ単独で何もしない流れより3分以上速い", () => {
    expect([...FASTER_MOVES.metalRich]).toEqual([
      "第3層で主星を炭素星にする",
      "鉄の種を30のまま保つ",
    ]);
    for (const alone of [minutes.richCarbonOnly!, minutes.richKeepOnly!]) {
      expect(minutes.richDefault! - alone).toBeGreaterThanOrEqual(3 * MINUTE);
    }
  });
});
