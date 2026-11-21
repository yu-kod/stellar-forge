import { beforeAll, describe, expect, it } from "vitest";
import { FASTER_MOVES, medalOf } from "@/features/game/hall";
import type { IdleReport } from "@/test-utils/simulate";
import { playFlow, reduceAfterStrontium } from "@/test-utils/strategies";

const MINUTE = 60;
const REDUCE_TO = [1, 3, 10, 30] as const;

/** 金属の多い銀河の中心：天の川とは最善の種の減らし方が違う */
describe("金属の多い銀河の中心の最善の作戦", () => {
  const minutes: Record<number, number> = {};
  let best: IdleReport;
  let none: number;
  let carbonOnly: number;
  let seedsOnly: number;
  let milkyLayer3: number;
  let milkyLayer4: number;
  beforeAll(() => {
    for (const to of REDUCE_TO) {
      const report = playFlow("metalRich", {
        seedTarget: reduceAfterStrontium(to),
        carbonStar: true,
      });
      minutes[to] = report.marks.complete!;
      if (to === 10) best = report;
    }
    none = playFlow("metalRich", { carbonStar: false }).marks.complete!;
    carbonOnly = playFlow("metalRich", { carbonStar: true }).marks.complete!;
    seedsOnly = playFlow("metalRich", {
      seedTarget: reduceAfterStrontium(10),
      carbonStar: false,
    }).marks.complete!;
    const milky = playFlow("milkyWay", { seedTarget: reduceAfterStrontium(1), carbonStar: true });
    milkyLayer3 = milky.marks.layer3!;
    milkyLayer4 = milky.marks.complete! - milky.marks.layer4!;
  }, 1_500_000);

  it("ストロンチウムの後は種を10まで減らすのが一番速い（1まで減らすと中性子が毒に取られ、30のままより遅い）", () => {
    const fastest = REDUCE_TO.reduce((a, b) => (minutes[b]! < minutes[a]! ? b : a));
    expect(fastest).toBe(10);
    expect(minutes[1]!).toBeGreaterThan(minutes[30]!);
  });

  it("金はその最善（炭素星＋種を10まで）だけ。ほかの減らし方は金に届かない", () => {
    expect(medalOf(minutes[10]!, "metalRich")).toBe("金");
    for (const to of [1, 3, 30]) expect(medalOf(minutes[to]!, "metalRich")).not.toBe("金");
  });

  it("記録タブで挙げる手は、それぞれ単独で何もしない流れより3分以上速い", () => {
    expect([...FASTER_MOVES.metalRich]).toEqual([
      "第3層で主星を炭素星にする",
      "鉄の種を局面で変える（減らしすぎない）",
    ]);
    for (const alone of [carbonOnly, seedsOnly]) {
      expect(none - alone).toBeGreaterThanOrEqual(3 * MINUTE);
    }
  });

  it("白色矮星をはじめから持つので、第3層の解放が天の川より5分以上早い", () => {
    expect(milkyLayer3 - best.marks.layer3!).toBeGreaterThanOrEqual(5 * MINUTE);
  });

  it("最善の流れでも、90分以降は10分ごとに平均4.5回以上恒久強化を買う（長いだけにしない）", () => {
    const late = best.purchasesPer10Min.slice(9);
    expect(late.reduce((sum, n) => sum + n, 0) / late.length).toBeGreaterThanOrEqual(4.5);
  });

  it("星が密集していて連星の枠が多いので、第4層も天の川より3分以上短い（2周目をなぞり直しにしない）", () => {
    const layer4 = best.marks.complete! - best.marks.layer4!;
    expect(milkyLayer4 - layer4).toBeGreaterThanOrEqual(3 * MINUTE);
  });
});
