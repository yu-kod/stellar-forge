import { setAutoShop, setSeedTarget } from "./actions";
import { advanceAll } from "./cluster";
import type { GameState } from "./types";

/** 選べる鉄の種の目標 */
export const SEED_TARGETS: readonly number[] = [1, 3, 10, 30];
/** 見込みを出す先 [秒]。ここまでに循環を見なければ「90分より先」 */
export const PROJECTION_HORIZON = 90 * 60;
/** 見込みで進めるときの1歩の上限 [秒]（実際より粗いが、順位はほぼ変わらない） */
const PROJECTION_STEP = 3;

/** 1つの種での見込み：いまの状態を写して進めたもの */
export type SeedProjection = {
  seeds: number;
  state: GameState;
  /** 進めた時間 [秒] */
  elapsed: number;
  /** 循環（ビスマス → 鉛）を見た時刻 [秒]。まだなら null */
  loopAt: number | null;
};

/** いまの状態から、種だけ変えて（自動交換で）進める見込みを始める */
export function startProjection(state: GameState): SeedProjection[] {
  return SEED_TARGETS.map((seeds) => ({
    seeds,
    state: setAutoShop(setSeedTarget(state, seeds), true),
    elapsed: 0,
    loopAt: null,
  }));
}

const finished = (job: SeedProjection) => job.loopAt !== null || job.elapsed >= PROJECTION_HORIZON;

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
    return { ...job, state, elapsed, loopAt: state.meta.sProcess.looped ? elapsed : null };
  });
}
