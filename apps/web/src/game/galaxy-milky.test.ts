import { beforeAll, describe, expect, it } from "vitest";
import { medalOf } from "@/features/game/hall";
import { playFlow, reduceAfterStrontium } from "@/test-utils/strategies";

const REDUCE_TO = [1, 3, 10, 30] as const;

/** 天の川：炭素星にし、ストロンチウムの後に種をどこまで減らすかで完結までの時間を比べる */
describe("天の川の最善の作戦", () => {
  const minutes: Record<number, number> = {};
  beforeAll(() => {
    for (const to of REDUCE_TO) {
      minutes[to] = playFlow("milkyWay", {
        seedTarget: reduceAfterStrontium(to),
        carbonStar: true,
      }).marks.complete!;
    }
  }, 1_500_000);

  it("ストロンチウムの後は種を1まで減らすのが一番速い（30のままより10分以上速い）", () => {
    const best = REDUCE_TO.reduce((a, b) => (minutes[b]! < minutes[a]! ? b : a));
    expect(best).toBe(1);
    expect(minutes[30]! - minutes[1]!).toBeGreaterThanOrEqual(10 * 60);
  });

  it("最善の流れは金、30のままは金に届かない", () => {
    expect(medalOf(minutes[1]!, "milkyWay")).toBe("金");
    expect(medalOf(minutes[30]!, "milkyWay")).not.toBe("金");
  });
});
