import { beforeAll, describe, expect, it } from "vitest";
import { playIdle } from "@/test-utils/simulate";
import { projectionDone, startProjection, stepProjection, type SeedProjection } from "./projection";
import { createGame } from "./star";
import type { Galaxy } from "./types";

/** ストロンチウムを見つけた時点（種を変えるか迷うところ）から、種ごとの見込みを最後まで出す */
function projectAtStrontium(galaxy: Galaxy): Record<number, number> {
  const state = playIdle(330 * 60, {
    start: createGame(galaxy),
    keepCluster: true,
    layer3MainMass: 2,
    seedTarget: 30,
    stopAt: "strontium",
  }).state;
  let jobs: SeedProjection[] = startProjection(state);
  while (!projectionDone(jobs)) jobs = stepProjection(jobs, 60);
  return Object.fromEntries(jobs.map((job) => [job.seeds, job.loopAt ?? Infinity]));
}

/** 種ごとの見込みは、銀河で違う答えを指す（次の発見までの時間だけでは、金属の多い銀河で逆を指していた） */
describe("種ごとの循環までの見込み", () => {
  let milky: Record<number, number>;
  let rich: Record<number, number>;
  beforeAll(() => {
    milky = projectAtStrontium("milkyWay");
    rich = projectAtStrontium("metalRich");
  }, 900_000);

  it("天の川では、種1が種30より先に循環を見る", () => {
    expect(milky[1]!).toBeLessThan(milky[30]!);
  });

  it("金属の多い銀河の中心では、種30が種1より先に循環を見る（種1は中性子が毒に取られる）", () => {
    expect(rich[30]!).toBeLessThan(rich[1]!);
  });
});
