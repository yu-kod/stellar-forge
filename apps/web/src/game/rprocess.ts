import { S_DISCOVERABLE } from "./sprocess";
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
  /** 貯めたキロノバの放出物（第4層の強化の通貨） */
  ejecta: number;
};

export function createRProcess(): RProcess {
  return {
    unlocked: false,
    pool: NEUTRON_STAR_MASSES.map(() => 0),
    binaries: [],
    amounts: Array.from({ length: R_PATH_END - R_PATH_START + 1 }, () => 0),
    discovered: [],
    mergers: 0,
    ejecta: 0,
  };
}

/** これより重い星は、崩壊するとブラックホールになる [M☉] */
export const HEAVIEST_PROGENITOR = 40;

/** 親の星の初期質量から、残す中性子星の段。40 M☉ より重い星はブラックホール、8 M☉ 未満は白色矮星になる（null） */
export function neutronStarBin(initialMass: number): number | null {
  if (initialMass > HEAVIEST_PROGENITOR || initialMass < LIGHTEST_PROGENITOR) return null;
  const bin = Math.floor((initialMass - LIGHTEST_PROGENITOR) / MASS_PER_BIN);
  return Math.min(NEUTRON_STAR_MASSES.length - 1, bin);
}

/** その段の中性子星を残す親の星の質量（段の真ん中。2.0 M☉ は 40 M☉） [M☉] */
export function progenitorMass(bin: number): number {
  return Math.min(HEAVIEST_PROGENITOR, LIGHTEST_PROGENITOR + MASS_PER_BIN * bin + MASS_PER_BIN / 2);
}

/** 第4層の解放時に星団の星に設定する質量：1.4 M☉ と 2.0 M☉ の中性子星を残す（同士で第2ピーク、組んでランタノイド） */
export const LAYER4_SLOT_MASSES = [18, 40] as const;

/** 中性子星を在庫に足す */
export function addNeutronStars(rProcess: RProcess, bin: number, count: number): RProcess {
  const pool = [...rProcess.pool];
  pool[bin]! += count;
  return { ...rProcess, pool };
}

/**
 * s過程の循環を見たら第4層を解放する。星団の星を、中性子星を残す質量（軽いものと重いもの）にする
 * （主星の上限の質量の星はブラックホールになり、中性子星を残さないため）
 */
/** 解放のとき、すでに重力波で近づいていた連星が合体するまでの時間 [秒] */
export const STARTER_SECONDS = 120;

/** 在庫の一番軽い2つを、すでに近づいていた連星にする（在庫が2つ未満なら何もしない） */
function starterBinary(rProcess: RProcess): RProcess {
  const pool = [...rProcess.pool];
  const take = () => {
    const bin = pool.findIndex((n) => n > 0);
    if (bin >= 0) pool[bin]! -= 1;
    return bin;
  };
  const a = take();
  const b = take();
  if (b < 0) return rProcess;
  return {
    ...rProcess,
    pool,
    binaries: [...rProcess.binaries, { a, b, remaining: STARTER_SECONDS }],
  };
}

export function unlockLayer4(state: GameState): GameState {
  const { meta } = state;
  const sComplete = meta.sProcess.discovered.length === S_DISCOVERABLE;
  if (meta.rProcess.unlocked || !meta.sProcess.looped || !sComplete) return state;
  const cluster = meta.cluster.map((slot, i) => ({
    ...slot,
    // 星団は2つまで
    nextMass: LAYER4_SLOT_MASSES[i]!,
  }));
  return {
    ...state,
    meta: {
      ...meta,
      cluster,
      rProcess: { ...starterBinary(meta.rProcess), unlocked: true },
    } satisfies Meta,
  };
}
