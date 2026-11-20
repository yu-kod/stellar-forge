import { DEFAULT_SEED_TARGET, NEUTRONS_PER_UPGRADE } from "./balance";
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
const MAGIC_CROSS_SECTION = 0.05;

/** 主に r過程で作られる元素。s過程の道は通り抜けるが、第3層では発見しない */
const R_PROCESS_ONLY = new Set([63, 76, 77, 78, 79]);

/** 道の上で見つけられる元素（鉄の先からビスマスまで。r過程の元素を除く） */
export const S_DISCOVERABLE_ELEMENTS: readonly number[] = Array.from(
  { length: S_PATH_END - S_PATH_START },
  (_, i) => S_PATH_START + 1 + i
).filter((z) => !R_PROCESS_ONLY.has(z));
export const S_DISCOVERABLE = S_DISCOVERABLE_ELEMENTS.length;

/** 元素を発見する量 */
export const S_DISCOVERY_THRESHOLD = 0.01;

/** 発見の効果 */
export const NEUTRONS_PER_DISCOVERY = 0.05;
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
  /** 自動の Ia型超新星が保つ、道の上の原子核の量 */
  seedTarget: number;
};

export function createSProcess(): SProcess {
  return {
    unlocked: false,
    amounts: Array.from({ length: S_PATH_END - S_PATH_START + 1 }, () => 0),
    discovered: [],
    looped: false,
    seedTarget: DEFAULT_SEED_TARGET,
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

export function isRProcessOnly(z: number): boolean {
  return R_PROCESS_ONLY.has(z);
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
  const weight = amounts.reduce((sum, a, i) => sum + a * crossSection(i + S_PATH_START), 0);
  if (weight === 0 || neutrons <= 0) return { sProcess, discovered: [], looped: false };
  const next = [...amounts];
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
    // ごくわずかな量（数値の端数）がビスマスに届いただけでは、循環を見たことにしない
    if (isLast && amount >= S_DISCOVERY_THRESHOLD) loopedNow = true;
  });
  const found = next
    .map((a, i) => ({ a, z: i + S_PATH_START }))
    .filter(
      ({ a, z }) =>
        z !== S_PATH_START &&
        a >= S_DISCOVERY_THRESHOLD &&
        !isRProcessOnly(z) &&
        !sProcess.discovered.includes(z)
    )
    .map(({ z }) => z);
  const looped = loopedNow && !sProcess.looped;
  return {
    sProcess: {
      ...sProcess,
      amounts: next,
      discovered: [...sProcess.discovered, ...found],
      looped: sProcess.looped || loopedNow,
    },
    discovered: found,
    looped,
  };
}

/** 中性子の倍率（発見した s元素1つにつき +5%、鉛で ×2） */
export function neutronMultiplier(meta: Meta): number {
  const { discovered } = meta.sProcess;
  const upgrades = 1 + NEUTRONS_PER_UPGRADE * (meta.shop.pocket + meta.shop.flash);
  return (
    (1 + NEUTRONS_PER_DISCOVERY * discovered.length) *
    (discovered.includes(LEAD) ? 2 : 1) *
    upgrades
  );
}

/** Ia型超新星1回で道に入る鉄の種（ストロンチウムで ×2） */
export function seedsPerIa(meta: Meta): number {
  return (1 + meta.shop.binary) * (meta.sProcess.discovered.includes(STRONTIUM) ? 2 : 1);
}

/** すべての星屑の倍率（バリウムで ×2） */
export function sDustMultiplier(meta: Meta): number {
  return meta.sProcess.discovered.includes(BARIUM) ? 2 : 1;
}
