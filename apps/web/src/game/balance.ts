import type { DustId, ElementId, ShopId, StageId } from "./types";

/**
 * バランスの数値。正は docs/design.md。ここを変えたら設計書の表とシミュレーションテストも直す。
 */

export const BASE_MASS = 25;
export const MASS_PER_SHOP_LEVEL = 5;
export const MASS_FROM_SILICON = 3;
export const CARBON_PER_CNO_LEVEL = 0.2;

/** 誕生時のコア温度 [K]。前主系列の収縮を持っていればヘリウム燃焼の温度から始まる */
export const BIRTH_TEMPERATURE = 4e7;
export const PRE_MAIN_SEQUENCE_TEMPERATURE = 2e8;

export const MASS_NUMBER = {
  H: 1,
  He: 4,
  C: 12,
  O: 16,
  Ne: 20,
  Mg: 24,
  Si: 28,
  S: 32,
  Fe: 56,
} as const;

/** 灰の重さ W とコア温度 T [K] の節目。間は log(T) を線形補間する */
export const TEMPERATURE_CURVE: readonly { weight: number; temperature: number }[] = [
  { weight: 0, temperature: 4e7 },
  { weight: 3, temperature: 2e8 },
  { weight: 10, temperature: 6e8 },
  { weight: 20, temperature: 1.2e9 },
  { weight: 26, temperature: 1.5e9 },
  { weight: 36, temperature: 2.7e9 },
];

/** 灰の重さを、この質量の星に換算する */
export const REFERENCE_MASS = 25;

export type StageSpec = {
  name: string;
  fuel: readonly ElementId[];
  /** 燃料 1 M☉ から生まれる元素の質量比 */
  products: Partial<Record<ElementId, number>>;
  /** 点火温度 [K] */
  ignition: number;
  /** 燃料 1 M☉ あたりのエネルギー [J] */
  energyPerMass: number;
  /** 基本速度 k₀ [/s]。強化できない段階は 0 */
  baseRate: number;
  initialCost: number;
  costGrowth: number;
  /** ケイ素燃焼。強化できず、点火から一定時間で崩壊させる */
  final: boolean;
};

export const STAGES: Record<StageId, StageSpec> = {
  H: {
    name: "水素燃焼",
    fuel: ["H"],
    products: { He: 1 },
    ignition: 1e7,
    energyPerMass: 1.27e45,
    baseRate: 0.004,
    initialCost: 2e44,
    costGrowth: 1.55,
    final: false,
  },
  He: {
    name: "ヘリウム燃焼",
    fuel: ["He"],
    products: { C: 0.6, O: 0.4 },
    ignition: 2e8,
    energyPerMass: 1.3e44,
    baseRate: 0.004,
    initialCost: 8e44,
    costGrowth: 1.6,
    final: false,
  },
  C: {
    name: "炭素燃焼",
    fuel: ["C"],
    products: { Ne: 0.8, Mg: 0.2 },
    ignition: 6e8,
    energyPerMass: 6.7e43,
    baseRate: 0.004,
    initialCost: 2e45,
    costGrowth: 1.65,
    final: false,
  },
  Ne: {
    name: "ネオン燃焼",
    fuel: ["Ne"],
    products: { O: 0.7, Mg: 0.3 },
    ignition: 1.2e9,
    energyPerMass: 2e43,
    baseRate: 0.004,
    initialCost: 4e45,
    costGrowth: 1.7,
    final: false,
  },
  O: {
    name: "酸素燃焼",
    fuel: ["O"],
    products: { Si: 0.8, S: 0.2 },
    ignition: 1.5e9,
    energyPerMass: 9e43,
    baseRate: 0.004,
    initialCost: 8e45,
    costGrowth: 1.75,
    final: false,
  },
  Si: {
    name: "ケイ素燃焼",
    fuel: ["Si", "S"],
    products: { Fe: 1 },
    ignition: 2.7e9,
    energyPerMass: 6.5e43,
    baseRate: 0,
    initialCost: Infinity,
    costGrowth: 1,
    final: true,
  },
};

/** 全段階の速度に掛かるゲームの速さ */
export const PACE = 0.4;
/** この Lv ごとに速度が2倍 */
export const MILESTONE_EVERY = 10;
export const CROSS_SECTION_PER_LEVEL = 1.25;
export const CNO_BONUS_PER_LEVEL = 0.25;
export const MAGNESIUM_DISCOUNT = 0.85;

/** 鉄のコアがこの質量 [M☉] に達すると崩壊する（チャンドラセカール質量） */
export const CHANDRASEKHAR_MASS = 1.4;
/** ケイ素燃焼の点火から崩壊までの秒数（実際の星では約1日。ゲーム用に圧縮） */
export const FINAL_STAGE_SECONDS = 30;
/** ケイ素燃焼の燃料が足りないときに、鉄に変える元素の順 */
export const FINAL_STAGE_FALLBACK_FUEL: readonly ElementId[] = [
  "Si",
  "S",
  "O",
  "Ne",
  "Mg",
  "C",
  "He",
];

/** 元素がこの質量 [M☉] 以上になったら発見する */
export const DISCOVERY_THRESHOLD = 0.05;

/** 生まれてこの秒数を過ぎ、燃焼量の合計がこれ未満なら燃え尽きる */
export const FIZZLE_AFTER_SECONDS = 30;
export const FIZZLE_RATE = 1e-6;

/** 「最大」で1回の操作で買う上限 */
export const MAX_BUY_PER_ACTION = 1000;

/** 燃焼の自動制御が1回の更新で買う上限 */
export const AUTO_BUY_PER_STEP = 20;

/** 星屑 = floor(質量^DUST_EXPONENT × 倍率) */
export const DUST_EXPONENT = 1.1;
export const BOOM_PER_LEVEL = 1.5;
export const OXYGEN_DUST_BONUS = 1.25;
export const FIZZLE_DUST_FACTOR = 0.3;

export type ShopSpec = {
  name: string;
  /** 支払う星屑の元素 */
  currency: DustId;
  description: string;
  baseCost: number;
  costGrowth: number;
  /** 1回だけ買える強化は 1 */
  maxLevel?: number;
};

export const SHOP: Record<ShopId, ShopSpec> = {
  mass: {
    name: "より重い星",
    currency: "O",
    description: "次の星の初期質量 +5 M☉",
    baseCost: 3,
    costGrowth: 2.2,
  },
  cno: {
    name: "金属量（CNOサイクル）",
    currency: "C",
    description: "炭素を触媒に水素燃焼 +25%。星が炭素を少し持って生まれる",
    baseCost: 3,
    costGrowth: 2.2,
  },
  yield: {
    name: "質量欠損の回収",
    currency: "Ne",
    description: "全エネルギー ×2",
    baseCost: 3,
    costGrowth: 2.5,
  },
  xs: {
    name: "反応断面積",
    currency: "Si",
    description: "全燃焼の速度 ×1.25",
    baseCost: 3,
    costGrowth: 2.5,
  },
  boom: {
    name: "爆発エネルギー",
    currency: "Mg",
    description: "超新星で得る星屑 ×1.5",
    baseCost: 4,
    costGrowth: 3,
  },
  auto: {
    name: "燃焼の自動制御",
    currency: "S",
    description: "燃焼強化を自動で買う。段階ごとに ON/OFF",
    baseCost: 4,
    costGrowth: 1,
    maxLevel: 1,
  },
  pre: {
    name: "前主系列の収縮",
    currency: "Si",
    description: "生まれた時点でヘリウム燃焼の温度になる",
    baseCost: 15,
    costGrowth: 1,
    maxLevel: 1,
  },
};

/** 超新星の記録を残す件数 */
export const LOG_LIMIT = 20;
