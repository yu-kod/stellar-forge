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

/** 原子番号の主な起源。ゲームで見つける場（第1〜4層）に合わせてまとめたもの */
export function originOf(z: number): Origin {
  if (z <= 2) return "bigBang";
  if (z <= 5) return "cosmicRay";
  if (z === 6 || z === 7 || z === 9) return "lowMass";
  if (z <= 22) return "massive";
  if (z <= 26) return "typeIa";
  return R_ONLY.has(z) ? "merger" : "lowMass";
}
