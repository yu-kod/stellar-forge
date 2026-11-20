import {
  NEUTRON_STAR_MASSES,
  neutronStarBin,
  progenitorMass,
  R_PATH_END,
  R_PATH_START,
  type Binary,
  type RProcess,
} from "./rprocess";
import { ENVELOPE_TIME, SHIELD_YE, SHOP, TAIL_EJECTA } from "./balance";
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
/** ほぼ r過程だけで作る元素（このゲームの s過程の道では作らない。周期表の83マスに数える） */
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
  0.6, 2.1, 3, 4.3, 6.2, 9, 13, 18, 26, 37, 44, 77, 110, 155, 220,
];
/** おまけ（トリウム・ウラン）の発見に要る放出物（金より多い。完結の後の目標） */
const ACTINIDE_EJECTA = 300;
/** 特別な効果のない r過程の元素1つあたりの放出物の上乗せ */
const EJECTA_PER_R_ELEMENT = 0.05;
/** 合計がこれより軽いほど、合体後の星が長く残って（円盤風で）放出物が増える [M☉] */
const LONG_LIVED_SPAN = 0.8;
const MAX_REMNANT_FACTOR = 1.5;
/** おまけ（周期表の先） */
export const ACTINIDES: readonly number[] = [THORIUM, URANIUM];

/** 潮汐の放出物：対称な組でも少しは飛び、質量比が偏るほど増える */
export const DYNAMICAL_BASE = 0.2;
export const DYNAMICAL_ASYMMETRY = 3;
/** 円盤風：合体後の星が長く残るほど多い。ニュートリノを浴びて Ye が高い */
const DISK_SCALE = 2;
export const DISK_YE = 0.34;
/** 合体までの時間の基準にする段（1.4 M☉） */
const REFERENCE_BIN = 2;

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

/** 連星が合体するまでの時間 [秒]。重力波で近づく時間は m1·m2·(m1+m2) に反比例する（1.4 + 1.4 M☉ が基準） */
export function mergerSeconds(meta: Meta, a = REFERENCE_BIN, b = REFERENCE_BIN): number {
  const m1 = NEUTRON_STAR_MASSES[a]!;
  const m2 = NEUTRON_STAR_MASSES[b]!;
  const reference = NEUTRON_STAR_MASSES[REFERENCE_BIN];
  const inspiral = (reference * reference * 2 * reference) / (m1 * m2 * (m1 + m2));
  return (
    MERGER_SECONDS *
    inspiral *
    ENVELOPE_TIME ** meta.shop.envelope *
    (has(meta.rProcess, OSMIUM) ? 0.5 : 1)
  );
}

/** 放出物の一部：量・Ye・作る元素の範囲（原子番号） */
export type Ejecta = { amount: number; ye: number; from: number; to: number };

export type MergerPreview = {
  q: number;
  blackHole: boolean;
  /** 潮汐で飛ぶ放出物（質量比が偏るほど多く、Ye が低い：赤いキロノバ） */
  dynamical: Ejecta;
  /** 合体後に残る星の円盤風（合計が軽いほど長く残って多い。ニュートリノで Ye が高い：青いキロノバ） */
  disk: Ejecta;
  /** 放出物の合計 */
  ejecta: number;
  /** 潮汐の放出物の Ye */
  ye: number;
  /** 届く一番重い元素 */
  reach: number;
};

/** Ye の帯ごとの、作る元素の範囲（docs/design.md「連星と合体」の表。境目は「以下なら」） */
const BANDS: readonly { maxYe: number; from: number; to: number }[] = [
  { maxYe: 0.14, from: 72, to: URANIUM },
  { maxYe: 0.22, from: 72, to: 83 },
  { maxYe: 0.3, from: 56, to: 72 },
  { maxYe: Infinity, from: R_PATH_START, to: 56 },
];

/** その Ye の放出物が作る元素の範囲 */
export function bandOf(ye: number): { from: number; to: number } {
  const band = BANDS.find((b) => ye <= b.maxYe + 1e-9)!;
  return { from: band.from, to: band.to };
}

/** 2つの段の中性子星を合体させたらどうなるか */
export function predictMerger(meta: Meta, a: number, b: number): MergerPreview {
  // 並べる順によらないよう、軽い方を先にする
  const m1 = NEUTRON_STAR_MASSES[Math.min(a, b)]!;
  const m2 = NEUTRON_STAR_MASSES[Math.max(a, b)]!;
  const q = m1 / m2;
  const blackHole = m1 + m2 > BLACK_HOLE_MASS + 1e-9;
  const shielded = meta.shop.shield + (has(meta.rProcess, PLATINUM) ? 1 : 0);
  const ye = 0.4 - 0.55 * (1 - q) - SHIELD_YE * shielded;
  const plain = meta.rProcess.discovered.filter((z) => !SPECIAL.has(z)).length;
  const multiplier =
    (has(meta.rProcess, EUROPIUM) ? 2 : 1) *
    (1 + TAIL_EJECTA * meta.shop.tail + EJECTA_PER_R_ELEMENT * plain);
  // 合計が軽いほど、合体後の星が長く残って（すぐブラックホールにならず）円盤風が吹く
  const lifetime = Math.min(
    MAX_REMNANT_FACTOR,
    Math.max(0, (BLACK_HOLE_MASS - m1 - m2) / LONG_LIVED_SPAN)
  );
  const dynamicalAmount = blackHole
    ? BLACK_HOLE_EJECTA
    : DYNAMICAL_BASE + DYNAMICAL_ASYMMETRY * (1 - q);
  const dynamical = { amount: dynamicalAmount * multiplier, ye, ...bandOf(ye) };
  const disk = {
    amount: DISK_SCALE * lifetime * multiplier,
    ye: DISK_YE,
    ...bandOf(DISK_YE),
  };
  return {
    q,
    blackHole,
    dynamical,
    disk,
    ejecta: dynamical.amount + disk.amount,
    ye,
    reach: Math.max(dynamical.to, disk.to),
  };
}

/** 合体1回で、その元素に配る量（届く放出物 × 重み） */
function deposit(preview: MergerPreview, z: number): number {
  return [preview.dynamical, preview.disk]
    .filter((part) => z >= part.from && z <= part.to)
    .reduce((sum, part) => sum + part.amount * rWeight(z), 0);
}

/** 在庫から2つを取って連星にする。枠が埋まっている・在庫が足りないなら何もしない */
export function formBinary(state: GameState, a: number, b: number): GameState {
  const { rProcess } = state.meta;
  const pool = [...rProcess.pool];
  pool[a]! -= 1;
  pool[b]! -= 1;
  const full = rProcess.binaries.length >= binarySlots(state.meta);
  if (!rProcess.unlocked || full || pool[a]! < 0 || pool[b]! < 0) return state;
  const binary: Binary = { a, b, remaining: mergerSeconds(state.meta, a, b) };
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
  return deposit(predictMerger(meta, a, b), z);
}

/** その組の、その元素を作る速さ（1回の量 ÷ 合体までの時間） */
function rateOf(meta: Meta, a: number, b: number, z: number): number {
  return yieldOf(meta, a, b, z) / mergerSeconds(meta, a, b);
}

/** 組める組（have が true のもの）のうち、その元素を時間あたりで一番多く作るもの。届く組がなければ null */
function fastestPair(
  meta: Meta,
  z: number,
  have: (a: number, b: number) => boolean
): [number, number] | null {
  let best: { pair: [number, number]; rate: number } | null = null;
  for (let a = 0; a < NEUTRON_STAR_MASSES.length; a++) {
    for (let b = a; b < NEUTRON_STAR_MASSES.length; b++) {
      const rate = have(a, b) ? rateOf(meta, a, b, z) : 0;
      if (rate > 0 && (best === null || rate > best.rate)) best = { pair: [a, b], rate };
    }
  }
  return best?.pair ?? null;
}

/** 在庫で組める組のうち、その元素を時間あたりで一番多く作るもの。届く組がなければ null */
export function bestPair(meta: Meta, z: number): [number, number] | null {
  const { pool } = meta.rProcess;
  return fastestPair(meta, z, (a, b) => (a === b ? pool[a]! >= 2 : pool[a]! >= 1 && pool[b]! >= 1));
}

/** 在庫によらず、その元素を一番速く作る組と、その中性子星を残す親の星の質量。どの組でも届かなければ null */
export function pairHint(
  meta: Meta,
  z: number
): { bins: [number, number]; masses: [number, number] } | null {
  const pair = fastestPair(meta, z, () => true);
  if (!pair) return null;
  return { bins: pair, masses: [progenitorMass(pair[0]), progenitorMass(pair[1])] };
}

/** 目標に出す、組の案内 */
export type PairAdvice =
  | { type: "ready" }
  | { type: "wait" }
  | { type: "masses"; bins: [number, number]; masses: [number, number] }
  | {
      type: "shield";
      /** 遮蔽を待たずに、星団の質量を変えて届く組（なければ null） */
      alternative: { bins: [number, number]; masses: [number, number] } | null;
    };

/**
 * その元素に届く組があるか。なければ、在庫と星団の星がこれから残す中性子星で届くなら待つ、
 * 遮蔽をあと1回強化すれば届くなら遮蔽を、届かなければ星団の星の質量を勧める（どの組でも届かなければ遮蔽）
 */
export function pairAdvice(meta: Meta, z: number): PairAdvice {
  if (bestPair(meta, z)) return { type: "ready" };
  const coming = meta.cluster.flatMap((slot) => {
    const bin = neutronStarBin(slot.nextMass ?? slot.star.initialMass);
    return bin === null ? [] : [bin];
  });
  const { pool } = meta.rProcess;
  // 作っている段はいくつでも来る。在庫だけの段は、同じ段で組むなら2つ要る
  const enough = (bin: number, need: number) => coming.includes(bin) || pool[bin]! >= need;
  const reachable = (m: Meta) =>
    fastestPair(m, z, (a, b) => (a === b ? enough(a, 2) : enough(a, 1) && enough(b, 1))) !== null;
  if (reachable(meta)) return { type: "wait" };
  const shielded = { ...meta, shop: { ...meta.shop, shield: meta.shop.shield + 1 } };
  const hint = pairHint(meta, z);
  if (meta.shop.shield < SHOP.shield.maxLevel! && reachable(shielded)) {
    return { type: "shield", alternative: hint };
  }
  return hint ? { type: "masses", ...hint } : { type: "shield", alternative: null };
}

/** いま作りたい元素：まだの r過程の元素のうち、在庫で届く組のあるものの一番近いもの（なければ一番近いもの）。すべて見つけていればおまけ（ウラン） */
export function rGoal(meta: Meta): number {
  const reachable = nextRDiscovery(meta.rProcess, (z) => bestPair(meta, z) !== null);
  const actinide = [URANIUM, THORIUM].find((z) => !has(meta.rProcess, z));
  return reachable?.z ?? nextRDiscovery(meta.rProcess)?.z ?? actinide ?? URANIUM;
}

/** その組が、まだの元素（r過程の元素とトリウム・ウラン）のどれかに届くか */
export function usefulPair(meta: Meta, a: number, b: number): boolean {
  return [...R_ELEMENTS, ...ACTINIDES].some(
    (z) => !has(meta.rProcess, z) && yieldOf(meta, a, b, z) > 0
  );
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
  | ({ type: "merger" } & Pick<MergerPreview, "ye" | "ejecta" | "reach" | "blackHole">)
  | { type: "rDiscover"; z: number };

/** その元素を発見する量（届いた放出物の合計 × 重み） */
export function rThreshold(z: number): number {
  const index = R_ELEMENTS.indexOf(z);
  return (index >= 0 ? EJECTA_MILESTONES[index]! : ACTINIDE_EJECTA) * rWeight(z);
}

/** 合体させ、届くところまでの元素に 放出物 × 重み を配る */
function merge(meta: Meta, binary: Binary): { meta: Meta; events: MergerEvent[] } {
  const preview = predictMerger(meta, binary.a, binary.b);
  const { ye, ejecta, reach, blackHole } = preview;
  const amounts = meta.rProcess.amounts.map(
    (amount, i) => amount + deposit(preview, i + R_PATH_START)
  );
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
export function nextRDiscovery(
  rProcess: RProcess,
  allowed: (z: number) => boolean = () => true
): { z: number; progress: number } | null {
  const candidates = R_ELEMENTS.filter((z) => !has(rProcess, z) && allowed(z)).map((z) => ({
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
  if (reach === 72) return "ランタノイド";
  return "第1・第2ピーク（バリウムまで）";
}

/** r過程の道の長さ（テスト・画面用） */
export const R_PATH_LENGTH = R_PATH_END - R_PATH_START + 1;
