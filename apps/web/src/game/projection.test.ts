import { describe, expect, it } from "vitest";
import {
  PROJECTION_HORIZON,
  SEED_TARGETS,
  projectionDone,
  startProjection,
  stepProjection,
} from "./projection";
import { createGame } from "./star";

describe("種ごとの見込み（いまの状態から、種だけ変えて先まで進めてみる）", () => {
  it("選べる種ごとに、いまの状態を写して始める", () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true };
    const jobs = startProjection(game);
    expect(SEED_TARGETS).toEqual([1, 3, 10, 30]);
    expect(jobs.map((job) => job.seeds)).toEqual([...SEED_TARGETS]);
    expect(jobs.map((job) => job.state.meta.sProcess.seedTarget)).toEqual([...SEED_TARGETS]);
    // 自動交換で進めたときの見込み
    expect(jobs.every((job) => job.state.meta.autoShop)).toBe(true);
    expect(jobs.every((job) => job.elapsed === 0 && job.loopAt === null)).toBe(true);
    expect(projectionDone(jobs)).toBe(false);
  });

  it("少しずつ進め、循環を見た時刻を残す。見込みの先（90分）まで届かなければ打ち切る", () => {
    const game = createGame();
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, looped: true };
    let jobs = startProjection(game);
    jobs = stepProjection(jobs, 30);
    // はじめから循環を見ている状態なら、すぐ届いたことになる
    expect(jobs.every((job) => job.loopAt === 30)).toBe(true);
    expect(projectionDone(jobs)).toBe(true);
    expect(stepProjection(jobs, 30)).toBe(jobs);
    const fresh = createGame();
    fresh.meta.sProcess = { ...fresh.meta.sProcess, unlocked: true };
    const late = startProjection(fresh).map((job) => ({ ...job, elapsed: PROJECTION_HORIZON - 1 }));
    const stopped = stepProjection(late, 30);
    expect(stopped.every((job) => job.loopAt === null && job.elapsed >= PROJECTION_HORIZON)).toBe(
      true
    );
    expect(projectionDone(stopped)).toBe(true);
  });
});
