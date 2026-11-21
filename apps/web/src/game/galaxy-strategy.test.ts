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
  layer3[`${galaxy}-${String(seedTarget)}-${carbonStar}`] = report.marks.layer3!;
  purchases[`${galaxy}-${String(seedTarget)}-${carbonStar}`] = report.purchasesPer10Min;
  return report.marks.complete ?? Infinity;
}

/** 流れごとの第3層の解放の時刻 */
const layer3: Record<string, number> = {};
/** 流れごとの10分ごとの恒久強化の購入数 */
const purchases: Record<string, number[]> = {};

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

  it("銀河で第1・2層も変わる：金属の多い銀河は白色矮星をはじめから持ち、最善の流れどうしで第3層の解放が5分以上早い", () => {
    const milky = layer3[`milkyWay-${String(shifting)}-true`]!;
    const rich = layer3["metalRich-30-true"]!;
    expect(milky - rich).toBeGreaterThanOrEqual(5 * MINUTE);
  });

  it("金属の多い銀河の最善の流れでも、90分以降は10分ごとに平均4.5回以上恒久強化を買う（長いだけにしない）", () => {
    const late = purchases["metalRich-30-true"]!.slice(9);
    expect(late.reduce((sum, n) => sum + n, 0) / late.length).toBeGreaterThanOrEqual(4.5);
  });
});
