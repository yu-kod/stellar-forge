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
