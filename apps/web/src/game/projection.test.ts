import { describe, expect, it } from "vitest";
import {
  PROJECTION_HORIZON,
  SEED_TARGETS,
  nextPeak,
  projectionDone,
  startProjection,
  stepProjection,
} from "./projection";
import { createGame } from "./star";

describe("種ごとの見込み（いまの状態から、種だけ変えて次のピークまで進めてみる）", () => {
  it("次のピークは、まだのストロンチウム → バリウム → 鉛。そろっていれば null", () => {
    const { sProcess } = createGame().meta;
    expect(nextPeak(sProcess)).toBe(38);
    expect(nextPeak({ ...sProcess, discovered: [38] })).toBe(56);
    expect(nextPeak({ ...sProcess, discovered: [38, 56] })).toBe(82);
    expect(nextPeak({ ...sProcess, discovered: [38, 56, 82] })).toBeNull();
  });

  it("選べる種ごとに、いまの状態を写して始める", () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true };
    const jobs = startProjection(game);
    expect(SEED_TARGETS).toEqual([1, 3, 10, 30]);
    expect(jobs.map((job) => job.seeds)).toEqual([...SEED_TARGETS]);
    expect(jobs.map((job) => job.state.meta.sProcess.seedTarget)).toEqual([...SEED_TARGETS]);
    expect(jobs.every((job) => job.peak === 38)).toBe(true);
    // 自動交換で進めたときの見込み
    expect(jobs.every((job) => job.state.meta.autoShop)).toBe(true);
    expect(jobs.every((job) => job.elapsed === 0 && job.reachedAt === null)).toBe(true);
    expect(projectionDone(jobs)).toBe(false);
  });

  it("少しずつ進め、次のピークを見つけた時刻を残す。見込みの先（90分）まで届かなければ打ち切る", () => {
    const game = createGame();
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true };
    let jobs = startProjection(game).map((job) => ({
      ...job,
      state: {
        ...job.state,
        meta: {
          ...job.state.meta,
          sProcess: { ...job.state.meta.sProcess, discovered: [38] },
        },
      },
    }));
    jobs = stepProjection(jobs, 30);
    // 見つけた状態なら、すぐ届いたことになる
    expect(jobs.every((job) => job.reachedAt === 30)).toBe(true);
    expect(projectionDone(jobs)).toBe(true);
    expect(stepProjection(jobs, 30)).toBe(jobs);
    const late = startProjection(game).map((job) => ({ ...job, elapsed: PROJECTION_HORIZON - 1 }));
    const stopped = stepProjection(late, 30);
    expect(
      stopped.every((job) => job.reachedAt === null && job.elapsed >= PROJECTION_HORIZON)
    ).toBe(true);
    expect(projectionDone(stopped)).toBe(true);
  });

  it("ピークがそろっていれば見込みを出さない", () => {
    const game = createGame();
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, discovered: [38, 56, 82] };
    expect(startProjection(game)).toEqual([]);
  });
});
