import {
  DEFAULT_SEED_TARGET,
  BARIUM_STAR_KEPT,
  HEAVY_PER_DREDGE_UP,
  NEUTRONS_PER_POCKET,
  S_WIND_RATE,
} from "./balance";
import type { Meta } from "./types";

/**
 * s過程（遅い中性子捕獲）。鉄（26）からビスマス（83）までの元素を一本の道として扱う。
 * 実際の核種図の道をまとめたもの（docs/design.md「第3層」）
 */
export const S_PATH_START = 26;
export const S_PATH_END = 83;

/** 標準原子量（四捨五入の前）。次の元素へ進むのに捕まえる中性子の数を決める */
// prettier-ignore
const ATOMIC_WEIGHT: readonly number[] = [
  55.8, 58.9, 58.7, 63.5, 65.4, 69.7, 72.6, 74.9, 79.0, 79.9, 83.8, 85.5, 87.6, 88.9, 91.2,
  92.9, 96.0, 98, 101.1, 102.9, 106.4, 107.9, 112.4, 114.8, 118.7, 121.8, 127.6, 126.9, 131.3,
  132.9, 137.3, 138.9, 140.1, 140.9, 144.2, 145, 150.4, 152.0, 157.3, 158.9, 162.5, 164.9,
  167.3, 168.9, 173.0, 175.0, 178.5, 180.9, 183.8, 186.2, 190.2, 192.2, 195.1, 197.0, 200.6,
  204.4, 207.2, 209.0,
];

/** 中性子の魔法数（N = 50・82・126）にあたる元素。捕まえにくいので原子核が溜まる */
const MAGIC = new Set([38, 39, 40, 56, 57, 58, 82, 83]);
const MAGIC_CROSS_SECTION = 0.15;

/** 主に r過程で作られる元素。s過程の道は通り抜けるが、第3層では発見しない */
const R_PROCESS_ONLY = new Set([63, 76, 77, 78, 79]);

/** 道の上で見つけられる元素（鉄の先からビスマスまで。r過程の元素を除く） */
export const S_DISCOVERABLE_ELEMENTS: readonly number[] = Array.from(
  { length: S_PATH_END - S_PATH_START },
  (_, i) => S_PATH_START + 1 + i
).filter((z) => !R_PROCESS_ONLY.has(z));
export const S_DISCOVERABLE = S_DISCOVERABLE_ELEMENTS.length;

/** 元素を発見する、作った量（その元素に進んできた原子核の合計）の、道の上の原子核の合計に対する比 */
export const S_DISCOVERY_THRESHOLD = 0.05;
/**
 * 中性子毒：道の外の軽い原子核（¹⁴N・²²Ne など）が中性子を捕まえる強さ（量 × 断面積 と同じ単位）。
 * 鉄の種が少ないと、中性子の多くを毒に取られる
 */
export const NEUTRON_POISON = 3;

/** 発見の効果 */
export const NEUTRONS_PER_DISCOVERY = 0.05;
/** 発見した s元素1つあたりの、すべての星屑の上乗せ（足し算） */
export const DUST_PER_S_DISCOVERY = 0.05;
export const STRONTIUM = 38;
export const BARIUM = 56;
export const LEAD = 82;

export type SProcess = {
  /** 第3層が解放されたか（白色矮星を使っても戻らない） */
  unlocked: boolean;
  /** 道の上の各元素の量（鉄の種 1 = 1）。添字は Z − 26 */
  amounts: number[];
  /** 第3層で発見した元素の原子番号 */
  discovered: number[];
  /** ビスマスから鉛に戻る循環を見たか */
  looped: boolean;
  /** これまでに作った量（その元素に進んできた原子核の合計）。添字は Z − 26 */
  produced: number[];
  /** 自動の Ia型超新星が保つ、道の上の原子核の量 */
  seedTarget: number;
  /** 恒星風で星の外へ出た s元素から得た、重元素の星屑 */
  heavy: number;
};

export function createSProcess(): SProcess {
  return {
    unlocked: false,
    amounts: Array.from({ length: S_PATH_END - S_PATH_START + 1 }, () => 0),
    produced: Array.from({ length: S_PATH_END - S_PATH_START + 1 }, () => 0),
    discovered: [],
    looped: false,
    seedTarget: DEFAULT_SEED_TARGET,
    heavy: 0,
  };
}

/** 元素 Z から Z+1 に進むのに捕まえる中性子の数 */
export function captures(z: number): number {
  const i = z - S_PATH_START;
  return Math.max(1, Math.round(ATOMIC_WEIGHT[i + 1]! - ATOMIC_WEIGHT[i]!));
}

/** 中性子の捕まえやすさ（相対） */
export function crossSection(z: number): number {
  return (z / 40) * (MAGIC.has(z) ? MAGIC_CROSS_SECTION : 1);
}

/** 中性子の魔法数にあたる元素か（ピークになる） */
export function isMagic(z: number): boolean {
  return MAGIC.has(z);
}

export function isRProcessOnly(z: number): boolean {
  return R_PROCESS_ONLY.has(z);
}

/**
 * 元素を発見する作った量：道の上の原子核の合計の5%（実際の観測も [Ba/Fe] のように鉄との比で測る）。合計が1未満なら 0.05
 */
export function discoveryThreshold(sProcess: SProcess): number {
  const total = sProcess.amounts.reduce((sum, a) => sum + a, 0);
  return S_DISCOVERY_THRESHOLD * Math.max(1, total);
}

/**
 * 中性子を道の上の原子核に配る。各元素は 量 × 断面積 の比で受け取り、
 * 捕まえた数 / 次へ進む数 だけ次の元素へ進む（1回で1つ先まで）。ビスマスの先は鉛に戻る
 */
export function captureNeutrons(
  sProcess: SProcess,
  neutrons: number
): { sProcess: SProcess; discovered: number[]; looped: boolean } {
  const { amounts } = sProcess;
  const onPath = amounts.reduce((sum, a, i) => sum + a * crossSection(i + S_PATH_START), 0);
  if (onPath === 0 || neutrons <= 0) return { sProcess, discovered: [], looped: false };
  const weight = onPath + NEUTRON_POISON;
  const threshold = discoveryThreshold(sProcess);
  const next = [...amounts];
  const produced = [...sProcess.produced];
  let loopedNow = false;
  amounts.forEach((amount, i) => {
    if (amount === 0) return;
    const z = i + S_PATH_START;
    const captured = (neutrons * amount * crossSection(z)) / weight;
    const isLast = z === S_PATH_END;
    // ビスマス209 → ビスマス210 → ポロニウム210 → α崩壊で鉛206（1個捕まえれば戻る）
    const moved = Math.min(amount, captured / (isLast ? 1 : captures(z)));
    next[i]! -= moved;
    const to = isLast ? LEAD - S_PATH_START : i + 1;
    next[to]! += moved;
    produced[to]! += moved;
    // ごくわずかな量（数値の端数）がビスマスに届いただけでは、循環を見たことにしない
    if (isLast && produced[i]! >= threshold) loopedNow = true;
  });
  const found = produced
    .map((a, i) => ({ a, z: i + S_PATH_START }))
    .filter(
      ({ a, z }) =>
        z !== S_PATH_START &&
        a >= threshold &&
        !isRProcessOnly(z) &&
        !sProcess.discovered.includes(z)
    )
    .map(({ z }) => z);
  const looped = loopedNow && !sProcess.looped;
  return {
    sProcess: {
      ...sProcess,
      amounts: next,
      produced,
      discovered: [...sProcess.discovered, ...found],
      looped: sProcess.looped || loopedNow,
    },
    discovered: found,
    looped,
  };
}

/** 星の外へ出た原子核1つの、重元素の星屑としての価値（鉄 6 〜 ビスマス 12） */
export function heavyValue(z: number): number {
  return HEAVY_PER_NUCLEUS * (1 + (z - S_PATH_START) / (S_PATH_END - S_PATH_START));
}
const HEAVY_PER_NUCLEUS = 6;

/**
 * 漸近巨星分枝星の恒星風（惑星状星雲）で、道の上の原子核が毎秒一定の割合で星の外へ出る。
 * 出た分は 量 × 価値 の重元素の星屑になる。kept の割合は連星の相手が受け取り、道に戻る（バリウム星）
 */
export function blowWinds(
  sProcess: SProcess,
  seconds: number,
  valueMultiplier = 1,
  kept = 0
): SProcess {
  const out = 1 - Math.exp(-S_WIND_RATE * seconds);
  let heavy = sProcess.heavy;
  const blown = sProcess.amounts.map((amount, i) => {
    heavy += amount * out * heavyValue(i + S_PATH_START) * valueMultiplier;
    return amount * (1 - out * (1 - kept));
  });
  // 目標より多い分は早く外へ出す（目標を下げたら、余りを重元素の星屑にして道を軽くする）
  const total = blown.reduce((sum, amount) => sum + amount, 0);
  const excess = Math.max(0, total - sProcess.seedTarget);
  const extra = excess > 0 ? (excess * (1 - Math.exp(-EXCESS_WIND_RATE * seconds))) / total : 0;
  const amounts = blown.map((amount, i) => {
    heavy += amount * extra * heavyValue(i + S_PATH_START) * valueMultiplier;
    return amount * (1 - extra);
  });
  return { ...sProcess, amounts, heavy };
}

/** 鉄の種の目標より多い分が、恒星風で外へ出る速さ [1/秒] */
export const EXCESS_WIND_RATE = 0.03;

/** 今の道の組成で、恒星風から毎秒得る重元素の星屑 */
export function heavyRate(meta: Meta): number {
  const value = meta.sProcess.amounts.reduce(
    (sum, amount, i) => sum + amount * heavyValue(i + S_PATH_START),
    0
  );
  return value * S_WIND_RATE * heavyMultiplier(meta);
}

/** 恒星風で出た原子核のうち、連星の相手が受け取って道に戻る割合（バリウム星） */
export function windKept(meta: Meta): number {
  return BARIUM_STAR_KEPT * meta.shop.binary;
}

/** 恒星風で出る s元素の価値の倍率（第3ドレッジアップ） */
export function heavyMultiplier(meta: Meta): number {
  return 1 + HEAVY_PER_DREDGE_UP * meta.shop.flash;
}

/** まだ見つけていない s元素のうち、発見の量に一番近いもの（割合は 0〜1）。すべて見つけていれば null */
export function nextSDiscovery(sProcess: SProcess): { z: number; progress: number } | null {
  const candidates = S_DISCOVERABLE_ELEMENTS.filter((z) => !sProcess.discovered.includes(z)).map(
    (z) => ({
      z,
      progress: Math.min(1, sProcess.produced[z - S_PATH_START]! / discoveryThreshold(sProcess)),
    })
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.progress > a.progress ? b : a));
}

/** 中性子の倍率（発見した s元素1つにつき +5%、鉛で ×2） */
export function neutronMultiplier(meta: Meta): number {
  const { discovered } = meta.sProcess;
  const upgrades = NEUTRONS_PER_POCKET ** meta.shop.pocket;
  return (
    (1 + NEUTRONS_PER_DISCOVERY * discovered.length) *
    (discovered.includes(LEAD) ? 2 : 1) *
    upgrades
  );
}

/** Ia型超新星1回で道に入る鉄の種（ストロンチウムで ×2） */
export function seedsPerIa(meta: Meta): number {
  return meta.sProcess.discovered.includes(STRONTIUM) ? 2 : 1;
}

/** すべての星屑の倍率（バリウムで ×2） */
export function sDustMultiplier(meta: Meta): number {
  const { discovered } = meta.sProcess;
  return (1 + DUST_PER_S_DISCOVERY * discovered.length) * (discovered.includes(BARIUM) ? 2 : 1);
}
