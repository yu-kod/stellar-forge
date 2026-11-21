import { setAutoShop, setSeedTarget } from "./actions";
import { advanceAll } from "./cluster";
import type { SProcess } from "./sprocess";
import type { GameState } from "./types";

/** 選べる鉄の種の目標 */
export const SEED_TARGETS: readonly number[] = [1, 3, 10, 30];
/** 見込みを出す先 [秒]。ここまでに次のピークを見つけなければ「90分より先」 */
export const PROJECTION_HORIZON = 90 * 60;
/** 見込みで進めるときの1歩の上限 [秒]（実際より粗いが、順位はほぼ変わらない） */
const PROJECTION_STEP = 3;
/** s過程のピーク（ストロンチウム・バリウム・鉛） */
const PEAKS: readonly number[] = [38, 56, 82];

/** まだ見つけていない、次のピーク。そろっていれば null */
export function nextPeak(sProcess: SProcess): number | null {
  return PEAKS.find((z) => !sProcess.discovered.includes(z)) ?? null;
}

/** 1つの種での見込み：いまの状態を写し、種だけ変えて進めたもの */
export type SeedProjection = {
  seeds: number;
  /** 見込みを出すピーク */
  peak: number;
  state: GameState;
  /** 進めた時間 [秒] */
  elapsed: number;
  /** そのピークを見つけた時刻 [秒]。まだなら null */
  reachedAt: number | null;
};

/** いまの状態から、種だけ変えて（自動交換で）次のピークまで進める見込みを始める。ピークがそろっていれば空 */
export function startProjection(state: GameState): SeedProjection[] {
  const peak = nextPeak(state.meta.sProcess);
  if (peak === null) return [];
  return SEED_TARGETS.map((seeds) => ({
    seeds,
    peak,
    state: setAutoShop(setSeedTarget(state, seeds), true),
    elapsed: 0,
    reachedAt: null,
  }));
}

const finished = (job: SeedProjection) =>
  job.reachedAt !== null || job.elapsed >= PROJECTION_HORIZON;

/** すべての種の見込みが出たか */
export function projectionDone(jobs: readonly SeedProjection[]): boolean {
  return jobs.every(finished);
}

/** まだの見込みを seconds だけ進める。すべて出ていれば同じものを返す */
export function stepProjection(jobs: SeedProjection[], seconds: number): SeedProjection[] {
  if (projectionDone(jobs)) return jobs;
  return jobs.map((job) => {
    if (finished(job)) return job;
    const state = advanceAll(job.state, seconds, PROJECTION_STEP).state;
    const elapsed = job.elapsed + seconds;
    const reached = state.meta.sProcess.discovered.includes(job.peak);
    return { ...job, state, elapsed, reachedAt: reached ? elapsed : null };
  });
}
