import { beforeAll, describe, expect, it } from "vitest";
import { playIdle } from "@/test-utils/simulate";
import { projectionDone, startProjection, stepProjection, type SeedProjection } from "./projection";
import { createGame } from "./star";
import type { Galaxy } from "./types";

/** ストロンチウムを見つけた時点（種を変えるか迷うところ）から、種ごとに次のピーク（バリウム）までの見込みを出す */
function projectAtStrontium(galaxy: Galaxy): Record<number, number> {
  const state = playIdle(330 * 60, {
    start: createGame(galaxy),
    keepCluster: true,
    layer3MainMass: 2,
    seedTarget: 30,
    stopAt: "strontium",
  }).state;
  let jobs: SeedProjection[] = startProjection(state);
  expect(jobs.every((job) => job.peak === 56)).toBe(true);
  while (!projectionDone(jobs)) jobs = stepProjection(jobs, 60);
  return Object.fromEntries(jobs.map((job) => [job.seeds, job.reachedAt ?? Infinity]));
}

/** 種ごとの見込みは、銀河で違う答えを指す（次の発見までの時間だけでは、金属の多い銀河で逆を指していた） */
describe("種ごとの次のピークまでの見込み", () => {
  let milky: Record<number, number>;
  let rich: Record<number, number>;
  beforeAll(() => {
    milky = projectAtStrontium("milkyWay");
    rich = projectAtStrontium("metalRich");
  }, 900_000);

  const fastest = (minutes: Record<number, number>) =>
    Number(Object.entries(minutes).reduce((a, b) => (b[1] < a[1] ? b : a))[0]);

  it("天の川では、種1が一番先にバリウムを見つける", () => {
    expect(fastest(milky)).toBe(1);
  });

  it("金属の多い銀河の中心では、種1は一番にならず、種3より遅い（減らしすぎると中性子が毒に取られる）", () => {
    expect(fastest(rich)).not.toBe(1);
    expect(rich[1]!).toBeGreaterThan(rich[3]!);
  });
});
