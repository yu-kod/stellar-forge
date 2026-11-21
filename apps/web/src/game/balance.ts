import type { Currency, DustId, ElementId, ShopId, StageId, Target } from "./types";

/** その星屑を一番多く残す狙い */
const BEST_TARGET: Record<DustId, Target> = {
  C: "C",
  N: "C",
  O: "O",
  Ne: "Ne",
  Mg: "O",
  Si: "Si",
  S: "Si",
};

/** その通貨を一番多く残す狙い。重元素の星屑と放出物は狙いでは増えない（null） */
export function bestTarget(currency: Currency): Target | null {
  return currency === "heavy" || currency === "ejecta" ? null : BEST_TARGET[currency];
}

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
  N: 14,
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
/** コア温度の上限 [K]。鉄のコアが崩壊する直前の温度。曲線の外挿をここで止める */
export const MAX_CORE_TEMPERATURE = 5e9;

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
export const PACE = 0.75;
/** この Lv ごとに速度が2倍 */
export const MILESTONE_EVERY = 10;
/** 反応断面積の1 Lv ごとの上乗せ（足し算） */
export const CROSS_SECTION_PER_LEVEL = 0.25;
/**
 * 段階ごとの速度定数の上限 [1/秒]（1秒に燃料のこの割合まで）。実際の星と同じく、水素燃焼（主系列）が
 * いちばん長く、後の段階ほど速い。強化をいくら重ねても、水素燃焼が周回の長さを決める
 */
export const RATE_CAP: Record<StageId, number> = {
  H: 0.03,
  He: 0.12,
  C: 0.3,
  Ne: 0.3,
  O: 0.3,
  Si: 0.3,
};
export const CNO_BONUS_PER_LEVEL = 0.25;
export const MAGNESIUM_DISCOUNT = 0.85;
/** ケイ素燃焼が始まった後（最後の数十秒）の燃焼強化の費用の倍率。貯めたエネルギーを使い切る見せ場にする */
export const FINAL_PHASE_COST = 0.25;

/** 鉄のコアがこの質量 [M☉] に達すると崩壊する（チャンドラセカール質量） */
export const CHANDRASEKHAR_MASS = 1.4;
/** ケイ素燃焼の点火から崩壊までの秒数（実際の星では約1日。ゲーム用に圧縮） */
export const FINAL_STAGE_SECONDS = 20;
/** ケイ素燃焼の加速の1 Lv ごとの倍率と、崩壊までの時間の下限 [秒] */
export const ACCEL_PER_LEVEL = 0.85;
export const MIN_FINAL_STAGE_SECONDS = 8;
/** ケイ素燃焼の燃料が足りないときに、鉄に変える元素の順 */
export const FINAL_STAGE_FALLBACK_FUEL: readonly ElementId[] = [
  "Si",
  "S",
  "O",
  "Ne",
  "Mg",
  "C",
  "N",
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

/** 自動で次の星を生めるようになるまでの超新星の回数 */
export const AUTO_REBIRTH_AFTER = 10;

/** 第2層（星の質量を選ぶ）を解放する超新星の回数 */
export const LAYER2_AFTER = 25;
/** これより軽い星は炭素燃焼に届かず、白色矮星になる [M☉] */
export const LOW_MASS_LIMIT = 8;
/** 軽い星のコア温度の上限 [K]（ヘリウム燃焼は点火するが炭素燃焼は点火しない） */
export const LOW_MASS_MAX_TEMPERATURE = 3.5e8;
/** 軽い星は、外層の水素が初期質量のこの割合を下回ると白色矮星になる */
export const WHITE_DWARF_HYDROGEN = 0.1;
/** 軽い星が漸近巨星分枝星として過ごす時間 [秒]。その後、白色矮星になる */
export const AGB_SECONDS = 20;
/** これより軽い星は炭素星になる（窒素は少なく、炭素と中性子が多い）[M☉] */
export const CARBON_STAR_LIMIT = 4;
/** 炭素星が白色矮星になったときの炭素の星屑の倍率 */
export const CARBON_STAR_DUST = 2;
/** 炭素星の中性子の倍率（¹³C ポケット） */
export const CARBON_STAR_NEUTRONS = 3;
/** 惑星状星雲（白色矮星になったとき）の星屑の倍率と、窒素を発見済みなら掛ける倍率 */
export const PLANETARY_NEBULA_DUST = 2;
export const NITROGEN_DUST_BONUS = 1.5;
/** 水素燃焼で、燃えた水素に対して炭素を窒素に変える割合（CNO サイクル） */
export const CNO_NITROGEN_PER_HYDROGEN = 0.01;
/** 4〜8 M☉ の星は外層の底で水素が燃え（hot bottom burning）、窒素をたくさん作る */
export const LOW_MASS_CNO_NITROGEN_PER_HYDROGEN = 0.25;
/** 炭素星（4 M☉ 未満）の窒素 */
export const CARBON_STAR_CNO_NITROGEN_PER_HYDROGEN = 0.03;

/** 第3層（s過程）を解放する白色矮星の数 */
export const LAYER3_AFTER = 40;
/** 軽い星がヘリウム燃焼 1 M☉ あたりに出す中性子（鉄の種 1 が 1 個捕まえる量を 1 とする） */
export const NEUTRONS_PER_HELIUM = 3.9;

/** 長い時間を進めるときの1回の更新の最大の長さ [秒] */
export const MAX_STEP_SECONDS = 0.05;

/** 狙う星屑ごとに、自動で強化する段階（その元素を燃料にする段階より手前まで） */
export const TARGET_STAGES: Record<Target, readonly StageId[]> = {
  C: ["H", "He"],
  Ne: ["H", "He", "C"],
  O: ["H", "He", "C", "Ne"],
  Si: ["H", "He", "C", "Ne", "O"],
};

/** 星屑 = floor(質量^DUST_EXPONENT × 倍率) */
export const DUST_EXPONENT = 1.1;
export const BOOM_PER_LEVEL = 1.5;
export const OXYGEN_DUST_BONUS = 1.25;
export const FIZZLE_DUST_FACTOR = 0.3;

export type ShopSpec = {
  name: string;
  /** 支払う星屑の元素（heavy は s過程の重元素の星屑） */
  currency: Currency;
  description: string;
  baseCost: number;
  costGrowth: number;
  /** 1回だけ買える強化は 1 */
  maxLevel?: number;
  /** 解放される層。省略すると第1層 */
  layer?: 2 | 3 | 4;
};

export const SHOP: Record<ShopId, ShopSpec> = {
  mass: {
    name: "より重い星",
    currency: "O",
    description: "次の星の初期質量 +5 M☉",
    baseCost: 3,
    costGrowth: 1.8,
  },
  cno: {
    name: "金属量（CNOサイクル）",
    currency: "C",
    description: "炭素を触媒に水素燃焼 +25%。星が炭素を少し持って生まれる",
    baseCost: 3,
    costGrowth: 1.8,
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
    description: "全燃焼の速度 +25%",
    baseCost: 3,
    costGrowth: 1.8,
  },
  boom: {
    name: "爆発エネルギー",
    currency: "Mg",
    description: "超新星で得る星屑 ×1.5",
    baseCost: 4,
    costGrowth: 3,
  },
  accel: {
    name: "ケイ素燃焼の加速",
    currency: "S",
    description: "崩壊までの時間 ×0.85（下限 8 秒）",
    baseCost: 8,
    costGrowth: 2.5,
  },
  auto: {
    name: "燃焼の自動制御",
    currency: "S",
    description: "燃焼強化を自動で買う。段階ごとに ON/OFF",
    baseCost: 2,
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
  recycle: {
    name: "星間ガスの再利用",
    currency: "N",
    description: "すべての星屑 +25%",
    baseCost: 10,
    costGrowth: 1.8,
    layer: 2,
  },
  nebula: {
    name: "惑星状星雲の濃縮",
    currency: "N",
    description: "白色矮星になったときの星屑 +50%",
    baseCost: 5,
    costGrowth: 1.8,
    layer: 2,
  },
  pulse: {
    name: "熱パルス",
    currency: "N",
    description: "軽い星のヘリウム燃焼の速度 ×2",
    baseCost: 8,
    costGrowth: 3,
    layer: 2,
  },
  cluster: {
    name: "星団",
    currency: "N",
    description: "主星と一緒に燃やす星を1つ増やす（全部で3つまで）",
    baseCost: 30,
    costGrowth: 10,
    maxLevel: 2,
    layer: 2,
  },
  pocket: {
    name: "¹³C ポケット",
    currency: "heavy",
    description: "中性子 ×1.5",
    baseCost: 10,
    costGrowth: 2,
    layer: 3,
  },
  flash: {
    name: "第3ドレッジアップ",
    currency: "heavy",
    description: "恒星風で外へ出る s元素の価値 +50%",
    baseCost: 15,
    costGrowth: 2,
    layer: 3,
  },
  binary: {
    name: "バリウム星",
    currency: "heavy",
    description: "恒星風で出た原子核のうち Lv ごとに 10% を、連星の相手が受け取って道に戻す",
    baseCost: 40,
    costGrowth: 2.5,
    maxLevel: 5,
    layer: 3,
  },
  envelope: {
    name: "共通外層",
    currency: "ejecta",
    description: "連星が近い状態で生まれる。合体までの時間 ×0.6",
    baseCost: 5,
    costGrowth: 3,
    maxLevel: 3,
    layer: 4,
  },
  slots: {
    name: "連星の枠",
    currency: "ejecta",
    description: "同時に持てる連星 +1",
    baseCost: 10,
    costGrowth: 4,
    maxLevel: 2,
    layer: 4,
  },
  tail: {
    name: "潮汐の尾",
    currency: "ejecta",
    description: "合体の放出物 +50%",
    baseCost: 0.6,
    costGrowth: 3,
    maxLevel: 5,
    layer: 4,
  },
  shield: {
    name: "ニュートリノの遮蔽",
    currency: "ejecta",
    description:
      "潮汐の放出物の Ye −0.025（重い元素まで届く。ランタノイドを作る組は第3ピークへずれる）",
    baseCost: 25,
    costGrowth: 3,
    maxLevel: 4,
    layer: 4,
  },
  rAuto: {
    name: "連星の自動化",
    currency: "S",
    description: "枠が空いたら、いま作りたい元素を一番速く作る組を在庫から組む",
    baseCost: 5e4,
    costGrowth: 1,
    maxLevel: 1,
    layer: 4,
  },
};

/** 第2層の強化（窒素）の効果 */
export const RECYCLE_PER_LEVEL = 0.25;
export const NEBULA_PER_LEVEL = 0.5;
export const PULSE_PER_LEVEL = 2;

/** 第4層の強化の効果 */
export const ENVELOPE_TIME = 0.6;
export const TAIL_EJECTA = 0.5;
export const SHIELD_YE = 0.025;

/** バリウム星1つあたりの、恒星風で出た原子核が道に戻る割合 */
export const BARIUM_STAR_KEPT = 0.1;

/** s過程の原子核が恒星風で星の外へ出る割合 [/秒] */
export const S_WIND_RATE = 0.0011;

/** 軽い元素1つあたりの、すべての星屑の上乗せ（足し算） */
export const LAYER3_LIGHT_DUST = 0.05;

/** 第3層の強化の効果 */
/** ¹³C ポケット1つあたりの中性子の倍率（掛け算） */
export const NEUTRONS_PER_POCKET = 1.5;
/** 第3ドレッジアップ1つあたりの、恒星風で出る s元素の価値の上乗せ（足し算） */
export const HEAVY_PER_DREDGE_UP = 0.5;
/** 鉄の種の目標の量（自動の Ia型超新星）の初期値 */
export const DEFAULT_SEED_TARGET = 10;

/** 星団の星の初期設定（窒素を作る軽い星） */
export const CLUSTER_DEFAULT_MASS = 7;

/** 超新星の記録を残す件数 */
export const LOG_LIMIT = 20;
