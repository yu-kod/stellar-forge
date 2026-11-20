import { bestTarget } from "@/game/balance";
import type { Currency, ElementId, Target } from "@/game/types";

export type ElementInfo = {
  name: string;
  /** 初めて作ったときに以後ずっと効く性質（docs/design.md「元素の発見」） */
  discovery: string;
  /** 元素の色。Tailwind が読み取れるよう、クラス名をそのまま書く */
  bg: string;
  fill: string;
};

export const ELEMENTS: Record<ElementId, ElementInfo> = {
  H: { name: "水素", discovery: "最初からある", bg: "bg-el-h", fill: "fill-el-h" },
  He: { name: "ヘリウム", discovery: "全エネルギー ×2", bg: "bg-el-he", fill: "fill-el-he" },
  C: { name: "炭素", discovery: "ヘリウム燃焼の速度 ×2", bg: "bg-el-c", fill: "fill-el-c" },
  N: {
    name: "窒素",
    discovery: "惑星状星雲の星屑 ×1.5",
    bg: "bg-el-n",
    fill: "fill-el-n",
  },
  O: { name: "酸素", discovery: "星屑 ×1.25", bg: "bg-el-o", fill: "fill-el-o" },
  Ne: { name: "ネオン", discovery: "炭素燃焼の速度 ×2", bg: "bg-el-ne", fill: "fill-el-ne" },
  Mg: {
    name: "マグネシウム",
    discovery: "燃焼強化の費用 −15%",
    bg: "bg-el-mg",
    fill: "fill-el-mg",
  },
  Si: { name: "ケイ素", discovery: "星の初期質量 +3 M☉", bg: "bg-el-si", fill: "fill-el-si" },
  S: { name: "硫黄", discovery: "酸素燃焼の速度 ×2", bg: "bg-el-s", fill: "fill-el-s" },
  Fe: { name: "鉄", discovery: "超新星が起こせるようになる", bg: "bg-el-fe", fill: "fill-el-fe" },
};

export function isGameElement(symbol: string): symbol is ElementId {
  return symbol in ELEMENTS;
}

/** 狙う星屑の名前 */
export const TARGET_NAMES: Record<Target, string> = {
  C: "炭素",
  Ne: "ネオン",
  O: "酸素・マグネシウム",
  Si: "ケイ素・硫黄",
};

/** 恒久強化の通貨の名前 */
export function currencyName(currency: Currency): string {
  return currency === "heavy" ? "重元素の星屑" : `${ELEMENTS[currency].name}の星屑`;
}

/** 次の目標の通貨を貯めるための手がかり */
export function targetHint(currency: Currency): string {
  const target = bestTarget(currency);
  return target ? `（狙い：${TARGET_NAMES[target]}）` : "（s過程の種を増やすと速く貯まる）";
}
