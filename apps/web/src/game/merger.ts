import {
  NEUTRON_STAR_MASSES,
  R_PATH_END,
  R_PATH_START,
  type Binary,
  type RProcess,
} from "./rprocess";
import { ENVELOPE_TIME, SHIELD_YE, TAIL_EJECTA } from "./balance";
import type { GameState, Meta } from "./types";

export { R_PATH_START, createRProcess } from "./rprocess";

/** 合体までの時間 [秒]（重力波で近づく） */
export const MERGER_SECONDS = 900;
/** 合計がこれを超えると、すぐブラックホールになる [M☉] */
export const BLACK_HOLE_MASS = 3.4;
/** ブラックホールになったときの放出物 */
export const BLACK_HOLE_EJECTA = 0.25;
/** r過程だけで作る元素を発見する量 */
const R_THRESHOLDS: Readonly<Record<number, number>> = {
  63: 5,
  76: 8,
  77: 20,
  78: 40,
  79: 200,
};
/** おまけ（トリウム・ウラン）を発見する量 */
const ACTINIDE_THRESHOLD = 0.5;

const EUROPIUM = 63;
const OSMIUM = 76;
const IRIDIUM = 77;
const PLATINUM = 78;
const GOLD = 79;
const THORIUM = 90;
const URANIUM = 92;
/** 第4層で発見する元素（r過程だけで作るもの） */
export const R_ONLY_ELEMENTS: readonly number[] = [EUROPIUM, OSMIUM, IRIDIUM, PLATINUM, GOLD];
/** おまけ（周期表の先） */
export const ACTINIDES: readonly number[] = [THORIUM, URANIUM];

/** 放出物の Ye と届くところ（docs/design.md「連星と合体」の表。境目は「以下なら届く」） */
const REACH: readonly { maxYe: number; z: number }[] = [
  { maxYe: 0.14, z: URANIUM },
  { maxYe: 0.22, z: 83 },
  { maxYe: 0.3, z: 72 },
];
const FIRST_PEAK_END = 50;

/** 太陽系の r過程の組成の形をまとめた重み */
export function rWeight(z: number): number {
  if (z >= 32 && z <= 36) return 1;
  if (z <= 50) return 0.3;
  if (z <= 55) return 1;
  if (z <= 72) return 0.15;
  if (z <= 75) return 0.6;
  if (z <= PLATINUM) return 1;
  if (z === GOLD) return 0.3;
  if (z <= 83) return 0.2;
  if (z === THORIUM || z === URANIUM) return 0.05;
  return 0;
}

const has = (rProcess: RProcess, z: number) => rProcess.discovered.includes(z);

/** 同時に持てる連星の数 */
export function binarySlots(meta: Meta): number {
  return 1 + meta.shop.slots + (has(meta.rProcess, IRIDIUM) ? 1 : 0);
}

/** 連星が合体するまでの時間 [秒] */
export function mergerSeconds(meta: Meta): number {
  return (
    MERGER_SECONDS * ENVELOPE_TIME ** meta.shop.envelope * (has(meta.rProcess, OSMIUM) ? 0.5 : 1)
  );
}

export type MergerPreview = {
  q: number;
  ye: number;
  ejecta: number;
  reach: number;
  blackHole: boolean;
};

/** 2つの段の中性子星を合体させたらどうなるか */
export function predictMerger(meta: Meta, a: number, b: number): MergerPreview {
  const m1 = NEUTRON_STAR_MASSES[a]!;
  const m2 = NEUTRON_STAR_MASSES[b]!;
  const q = Math.min(m1, m2) / Math.max(m1, m2);
  const blackHole = m1 + m2 > BLACK_HOLE_MASS + 1e-9;
  const shielded = meta.shop.shield + (has(meta.rProcess, PLATINUM) ? 1 : 0);
  const ye = 0.4 - 0.55 * (1 - q) - SHIELD_YE * shielded;
  const ejectaMultiplier =
    (has(meta.rProcess, EUROPIUM) ? 2 : 1) * (1 + TAIL_EJECTA * meta.shop.tail);
  const ejecta = (blackHole ? BLACK_HOLE_EJECTA : 1 + 3 * (1 - q)) * ejectaMultiplier;
  const reach = REACH.find((r) => ye <= r.maxYe + 1e-9)?.z ?? FIRST_PEAK_END;
  return { q, ye, ejecta, reach, blackHole };
}

/** 在庫から2つを取って連星にする。枠が埋まっている・在庫が足りないなら何もしない */
export function formBinary(state: GameState, a: number, b: number): GameState {
  const { rProcess } = state.meta;
  const pool = [...rProcess.pool];
  pool[a]! -= 1;
  pool[b]! -= 1;
  const full = rProcess.binaries.length >= binarySlots(state.meta);
  if (!rProcess.unlocked || full || pool[a]! < 0 || pool[b]! < 0) return state;
  const binary: Binary = { a, b, remaining: mergerSeconds(state.meta) };
  return {
    ...state,
    meta: {
      ...state.meta,
      rProcess: { ...rProcess, pool, binaries: [...rProcess.binaries, binary] },
    },
  };
}

/** 連星の自動化：枠が空いていれば、在庫の一番軽い星と一番重い星を組む */
export function autoBinary(state: GameState): GameState {
  if (!state.meta.shop.rAuto) return state;
  let next = state;
  for (;;) {
    const held = next.meta.rProcess.pool.flatMap((n, bin) => (n > 0 ? [bin] : []));
    if (held.length === 0) return next;
    const formed = formBinary(next, held[0]!, held.at(-1)!);
    if (formed === next) return next;
    next = formed;
  }
}

export type MergerEvent =
  ({ type: "merger" } & Omit<MergerPreview, "q">) | { type: "rDiscover"; z: number };

/** その元素を発見する量 */
export function rThreshold(z: number): number {
  return R_THRESHOLDS[z] ?? ACTINIDE_THRESHOLD;
}

/** 合体させ、届くところまでの元素に 放出物 × 重み を配る */
function merge(meta: Meta, binary: Binary): { meta: Meta; events: MergerEvent[] } {
  const { ye, ejecta, reach, blackHole } = predictMerger(meta, binary.a, binary.b);
  const amounts = meta.rProcess.amounts.map((amount, i) => {
    const z = i + R_PATH_START;
    return z <= reach ? amount + ejecta * rWeight(z) : amount;
  });
  const found = [...R_ONLY_ELEMENTS, ...ACTINIDES].filter(
    (z) => !has(meta.rProcess, z) && amounts[z - R_PATH_START]! >= rThreshold(z)
  );
  const rProcess: RProcess = {
    ...meta.rProcess,
    amounts,
    discovered: [...meta.rProcess.discovered, ...found],
    mergers: meta.rProcess.mergers + 1,
  };
  return {
    meta: { ...meta, rProcess },
    events: [
      { type: "merger", ye, ejecta, reach, blackHole },
      ...found.map((z) => ({ type: "rDiscover" as const, z })),
    ],
  };
}

/** 連星を進め、時間が来たものを合体させる */
export function advanceBinaries(
  meta: Meta,
  seconds: number
): { meta: Meta; events: MergerEvent[] } {
  if (meta.rProcess.binaries.length === 0) return { meta, events: [] };
  let current: Meta = meta;
  const events: MergerEvent[] = [];
  const waiting: Binary[] = [];
  for (const binary of meta.rProcess.binaries) {
    const remaining = binary.remaining - seconds;
    if (remaining > 1e-9) {
      waiting.push({ ...binary, remaining });
      continue;
    }
    const result = merge(current, binary);
    current = result.meta;
    events.push(...result.events);
  }
  return { meta: { ...current, rProcess: { ...current.rProcess, binaries: waiting } }, events };
}

/** まだ見つけていない r過程の元素のうち、発見の量に一番近いもの（割合は 0〜1）。すべて見つけていれば null */
export function nextRDiscovery(rProcess: RProcess): { z: number; progress: number } | null {
  const candidates = R_ONLY_ELEMENTS.filter((z) => !has(rProcess, z)).map((z) => ({
    z,
    progress: Math.min(1, rProcess.amounts[z - R_PATH_START]! / rThreshold(z)),
  }));
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.progress > a.progress ? b : a));
}

/** 届くところの名前 */
export function reachName(reach: number): string {
  if (reach === URANIUM) return "アクチノイド（ウランまで）";
  if (reach === 83) return "第3ピーク（金まで）";
  if (reach === 72) return "第2ピーク（ユウロピウムまで）";
  return "第1ピーク（スズまで）";
}

/** r過程の道の長さ（テスト・画面用） */
export const R_PATH_LENGTH = R_PATH_END - R_PATH_START + 1;
