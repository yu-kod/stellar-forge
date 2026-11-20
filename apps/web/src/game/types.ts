export const ELEMENT_IDS = ["H", "He", "C", "O", "Ne", "Mg", "Si", "S", "Fe"] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

export const STAGE_IDS = ["H", "He", "C", "Ne", "O", "Si"] as const;
export type StageId = (typeof STAGE_IDS)[number];

/** 星屑になる元素。水素・ヘリウム・鉄は星屑にならない */
export const DUST_IDS = ["C", "O", "Ne", "Mg", "Si", "S"] as const;
export type DustId = (typeof DUST_IDS)[number];

/** 狙う星屑。燃焼をどこまで強化するか（玉ねぎをどこまで焼くか）の4段階 */
export const TARGET_IDS = ["C", "Ne", "O", "Si"] as const;
export type Target = (typeof TARGET_IDS)[number];

export const SHOP_IDS = ["mass", "cno", "yield", "xs", "boom", "accel", "auto", "pre"] as const;
export type ShopId = (typeof SHOP_IDS)[number];

export type Composition = Record<ElementId, number>;

export type StarEnd = null | "collapse" | "fizzle";

export type Star = {
  generation: number;
  initialMass: number;
  /** 元素ごとの質量 [M☉] */
  mass: Composition;
  /** 使えるエネルギー [J] */
  energy: number;
  /** 秒。この星が生まれてからのゲーム内時間 */
  time: number;
  /** コア温度 [K]。下がらない */
  temperature: number;
  levels: Record<StageId, number>;
  ignitedAt: Partial<Record<StageId, number>>;
  end: StarEnd;
};

export type SupernovaRecord = {
  generation: number;
  time: number;
  ejected: number;
  gain: Record<DustId, number>;
  end: Exclude<StarEnd, null>;
};

export type Meta = {
  dust: Record<DustId, number>;
  supernovae: number;
  neutronStars: number;
  discovered: Partial<Record<ElementId, true>>;
  shop: Record<ShopId, number>;
  autoOn: Record<StageId, boolean>;
  /** 狙う星屑。段階ごとに自動強化を切り替えたら null（自分で決める） */
  target: Target | null;
  log: SupernovaRecord[];
};

export type GameState = { meta: Meta; star: Star };
