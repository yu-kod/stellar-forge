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
export const MERGER_SECONDS = 600;
/** 合計がこれを超えると、すぐブラックホールになる [M☉] */
export const BLACK_HOLE_MASS = 3.4;
/** ブラックホールになったときの放出物 */
export const BLACK_HOLE_EJECTA = 0.25;

const EUROPIUM = 63;
const OSMIUM = 76;
const IRIDIUM = 77;
const PLATINUM = 78;
const GOLD = 79;
const THORIUM = 90;
const URANIUM = 92;
/** 第4層で発見する元素（r過程だけで作るもの。周期表の83マスに数える） */
export const R_ONLY_ELEMENTS: readonly number[] = [EUROPIUM, OSMIUM, IRIDIUM, PLATINUM, GOLD];
/**
 * r過程が主な元素（太陽系の量の8割ほど以上が r過程）。発見の順に並べる。
 * s過程ですでに見つけているものは「r過程でも作った」印になる
 */
export const R_ELEMENTS: readonly number[] = [
  52,
  53,
  54,
  EUROPIUM,
  64,
  65,
  66,
  67,
  68,
  69,
  75,
  OSMIUM,
  IRIDIUM,
  PLATINUM,
  GOLD,
];
/** 発見に要る、その元素に届いた放出物の合計（R_ELEMENTS の順。等比） */
const EJECTA_MILESTONES: readonly number[] = [
  0.6, 2.1, 3, 4.3, 6.2, 9, 13, 18, 26, 37, 54, 77, 110, 155, 220,
];
/** おまけ（トリウム・ウラン）の発見に要る放出物 */
const ACTINIDE_EJECTA = 40;
/** 特別な効果のない r過程の元素1つあたりの放出物の上乗せ */
const EJECTA_PER_R_ELEMENT = 0.05;
/** 合計がこれより軽いほど、合体後の星が長く残って（円盤風で）放出物が増える [M☉] */
const LONG_LIVED_SPAN = 0.8;
const MAX_REMNANT_FACTOR = 1.5;
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
/** 特別な効果を持つ r過程の元素 */
const SPECIAL = new Set([EUROPIUM, OSMIUM, IRIDIUM, PLATINUM, GOLD, THORIUM, URANIUM]);

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
  // 並べる順によらないよう、軽い方を先にする
  const m1 = NEUTRON_STAR_MASSES[Math.min(a, b)]!;
  const m2 = NEUTRON_STAR_MASSES[Math.max(a, b)]!;
  const q = Math.min(m1, m2) / Math.max(m1, m2);
  const blackHole = m1 + m2 > BLACK_HOLE_MASS + 1e-9;
  const shielded = meta.shop.shield + (has(meta.rProcess, PLATINUM) ? 1 : 0);
  const ye = 0.4 - 0.55 * (1 - q) - SHIELD_YE * shielded;
  const plain = meta.rProcess.discovered.filter((z) => !SPECIAL.has(z)).length;
  const ejectaMultiplier =
    (has(meta.rProcess, EUROPIUM) ? 2 : 1) *
    (1 + TAIL_EJECTA * meta.shop.tail + EJECTA_PER_R_ELEMENT * plain);
  // 合計が軽いほど合体後の星が長く残り（すぐブラックホールにならず）、円盤から多く飛ぶ
  const remnant = Math.min(
    MAX_REMNANT_FACTOR,
    Math.max(BLACK_HOLE_EJECTA, (BLACK_HOLE_MASS - m1 - m2) / LONG_LIVED_SPAN)
  );
  const ejecta = (blackHole ? BLACK_HOLE_EJECTA : (1 + 3 * (1 - q)) * remnant) * ejectaMultiplier;
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

/** 1回の合体で作る、その元素の量（届かなければ 0） */
export function yieldOf(meta: Meta, a: number, b: number, z: number): number {
  const { ejecta, reach } = predictMerger(meta, a, b);
  return z <= reach ? ejecta * rWeight(z) : 0;
}

/** 在庫で組める組のうち、その元素を一番多く作るもの。届く組がなければ null */
export function bestPair(meta: Meta, z: number): [number, number] | null {
  const { pool } = meta.rProcess;
  let best: { pair: [number, number]; amount: number } | null = null;
  for (let a = 0; a < pool.length; a++) {
    for (let b = a; b < pool.length; b++) {
      const enough = a === b ? pool[a]! >= 2 : pool[a]! >= 1 && pool[b]! >= 1;
      const amount = enough ? yieldOf(meta, a, b, z) : 0;
      if (amount > 0 && (best === null || amount > best.amount)) best = { pair: [a, b], amount };
    }
  }
  return best?.pair ?? null;
}

/** いま作りたい元素：まだの r過程の元素のうち一番近いもの。すべて見つけていればおまけ（ウラン） */
export function rGoal(meta: Meta): number {
  return nextRDiscovery(meta.rProcess)?.z ?? URANIUM;
}

/** 連星の自動化：枠が空いていれば、いま作りたい元素を一番多く作る組を組む（届かない組は作らない） */
export function autoBinary(state: GameState): GameState {
  if (!state.meta.shop.rAuto) return state;
  let next = state;
  for (;;) {
    const pair = bestPair(next.meta, rGoal(next.meta));
    if (!pair) return next;
    const formed = formBinary(next, pair[0], pair[1]);
    if (formed === next) return next;
    next = formed;
  }
}

export type MergerEvent =
  ({ type: "merger" } & Omit<MergerPreview, "q">) | { type: "rDiscover"; z: number };

/** その元素を発見する量（届いた放出物の合計 × 重み） */
export function rThreshold(z: number): number {
  const index = R_ELEMENTS.indexOf(z);
  return (index >= 0 ? EJECTA_MILESTONES[index]! : ACTINIDE_EJECTA) * rWeight(z);
}

/** 合体させ、届くところまでの元素に 放出物 × 重み を配る */
function merge(meta: Meta, binary: Binary): { meta: Meta; events: MergerEvent[] } {
  const { ye, ejecta, reach, blackHole } = predictMerger(meta, binary.a, binary.b);
  const amounts = meta.rProcess.amounts.map((amount, i) => {
    const z = i + R_PATH_START;
    return z <= reach ? amount + ejecta * rWeight(z) : amount;
  });
  const found = [...R_ELEMENTS, ...ACTINIDES].filter(
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
  const candidates = R_ELEMENTS.filter((z) => !has(rProcess, z)).map((z) => ({
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
