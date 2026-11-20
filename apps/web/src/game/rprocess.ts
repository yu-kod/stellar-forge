import type { GameState, Meta } from "./types";

/** 中性子星の質量の段階 [M☉]（docs/design.md「中性子星の質量」） */
export const NEUTRON_STAR_MASSES = [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0] as const;

/** 親の星の初期質量 4 M☉ ごとに、中性子星が1段重くなる */
const MASS_PER_BIN = 4;
/** 中性子星を残す一番軽い星 [M☉] */
const LIGHTEST_PROGENITOR = 8;

/** r過程の道（ガリウム〜ウラン） */
export const R_PATH_START = 31;
export const R_PATH_END = 92;

/** 重力波で近づいている連星。a・b は中性子星の段 */
export type Binary = { a: number; b: number; remaining: number };

export type RProcess = {
  /** 第4層が解放されたか */
  unlocked: boolean;
  /** 中性子星の在庫。添字は NEUTRON_STAR_MASSES の段 */
  pool: number[];
  /** 合体を待つ連星 */
  binaries: Binary[];
  /** r過程で作った各元素の量。添字は Z − 31 */
  amounts: number[];
  /** r過程で発見した元素の原子番号 */
  discovered: number[];
  /** 合体の回数 */
  mergers: number;
};

export function createRProcess(): RProcess {
  return {
    unlocked: false,
    pool: NEUTRON_STAR_MASSES.map(() => 0),
    binaries: [],
    amounts: Array.from({ length: R_PATH_END - R_PATH_START + 1 }, () => 0),
    discovered: [],
    mergers: 0,
  };
}

/** 親の星の初期質量から、残す中性子星の段 */
export function neutronStarBin(initialMass: number): number {
  const bin = Math.floor((initialMass - LIGHTEST_PROGENITOR) / MASS_PER_BIN);
  return Math.min(NEUTRON_STAR_MASSES.length - 1, Math.max(0, bin));
}

/** 中性子星を在庫に足す */
export function addNeutronStars(rProcess: RProcess, bin: number, count: number): RProcess {
  const pool = [...rProcess.pool];
  pool[bin]! += count;
  return { ...rProcess, pool };
}

/** s過程の循環を見たら第4層を解放する。それまでの中性子星は主星の質量の段に入れる */
export function unlockLayer4(state: GameState): GameState {
  const { meta, star } = state;
  if (meta.rProcess.unlocked || !meta.sProcess.looped) return state;
  const rProcess = addNeutronStars(
    { ...meta.rProcess, unlocked: true },
    neutronStarBin(star.initialMass),
    meta.neutronStars
  );
  return { ...state, meta: { ...meta, rProcess } satisfies Meta };
}
