import { LIGHT_SITES } from "./light";
import { ELEMENT_IDS, type ElementId, type Meta } from "./types";

/** 周期表の元素の数（水素〜ビスマス） */
export const ALL_ELEMENTS = 83;

const ATOMIC_NUMBER: Record<ElementId, number> = {
  H: 1,
  He: 2,
  C: 6,
  N: 7,
  O: 8,
  Ne: 10,
  Mg: 12,
  Si: 14,
  S: 16,
  Fe: 26,
};

/** 見つけた元素の原子番号（水素は最初から）。周期表の先のおまけ（トリウム・ウラン）は数えない */
export function foundElements(meta: Meta): number[] {
  const burned = ELEMENT_IDS.filter((id) => id === "H" || meta.discovered[id]).map(
    (id) => ATOMIC_NUMBER[id]
  );
  const all = [
    ...burned,
    ...meta.lightFound,
    ...meta.sProcess.discovered,
    ...meta.rProcess.discovered,
  ];
  return [...new Set(all)].filter((z) => z <= ALL_ELEMENTS).sort((a, b) => a - b);
}

/** 元素の主な起源（エンディングの周期表の色分け） */
export const ORIGINS = {
  bigBang: "ビッグバン",
  cosmicRay: "宇宙線",
  massive: "大質量星",
  lowMass: "軽い星",
  typeIa: "Ia型超新星",
  merger: "中性子星合体",
} as const;
export type Origin = keyof typeof ORIGINS;

const R_ONLY = new Set([63, 76, 77, 78, 79]);
/** r過程が主な元素（太陽系の量の8割ほど以上） */
const R_DOMINANT = new Set([52, 53, 54, 63, 64, 65, 66, 67, 68, 69, 75, 76, 77, 78, 79]);

/**
 * 原子番号の主な起源（簡略化）。鉄族（V〜Ni）は Ia型超新星、Cu〜Sr は大質量星の中の弱い s過程、
 * r過程が主な元素は中性子星合体、残りの重い元素は軽い星の s過程
 */
export function originOf(z: number): Origin {
  if (z <= 2) return "bigBang";
  if (z <= 5) return "cosmicRay";
  if (z === 6 || z === 7 || z === 9) return "lowMass";
  if (z <= 22) return "massive";
  if (z <= 28) return "typeIa";
  if (z <= 38) return "massive";
  return R_DOMINANT.has(z) ? "merger" : "lowMass";
}

/** Ia型超新星で作る軽い元素と、要る回数 */
const IA_COUNTS: Readonly<Record<number, number>> = { 23: 5, 24: 20, 25: 50 };
const F_HINT = "第3層で炭素星（4 M☉ 未満）を白色矮星にする（星団の星の質量を 2〜3 M☉ に）";

/** まだ見つけていない元素の作り方 */
export function missingHint(meta: Meta, z: number): string {
  const ia = IA_COUNTS[z];
  if (ia !== undefined) {
    return `Ia型超新星（あと ${ia - meta.iaSupernovae} 回。s過程の種を多く保つと白色矮星を使って増える）`;
  }
  if (z === 9) return F_HINT;
  if (Object.values(ATOMIC_NUMBER).includes(z))
    return "第1層の燃焼で作る（狙いを変えて、その段階まで燃やす）";
  if (R_ONLY.has(z)) return "中性子星合体（第4層）";
  const site = LIGHT_SITES[z];
  if (site !== undefined) return site;
  return "s過程（種を少なく保つと、遠くまで進む）";
}

/** 一番軽い未発見の元素と、その作り方。すべて見つけていれば null */
export function nextMissing(meta: Meta): { z: number; hint: string } | null {
  const found = new Set(foundElements(meta));
  for (let z = 1; z <= ALL_ELEMENTS; z++) {
    if (!found.has(z)) return { z, hint: missingHint(meta, z) };
  }
  return null;
}
