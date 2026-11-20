import type { SProcess } from "./sprocess";

export const ELEMENT_IDS = ["H", "He", "C", "N", "O", "Ne", "Mg", "Si", "S", "Fe"] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];

export const STAGE_IDS = ["H", "He", "C", "Ne", "O", "Si"] as const;
export type StageId = (typeof STAGE_IDS)[number];

/** 星屑になる元素。水素・ヘリウム・鉄は星屑にならない */
export const DUST_IDS = ["C", "N", "O", "Ne", "Mg", "Si", "S"] as const;
export type DustId = (typeof DUST_IDS)[number];

/** 狙う星屑。燃焼をどこまで強化するか（玉ねぎをどこまで焼くか）の4段階 */
export const TARGET_IDS = ["C", "Ne", "O", "Si"] as const;
export type Target = (typeof TARGET_IDS)[number];

export const SHOP_IDS = [
  "mass",
  "cno",
  "yield",
  "xs",
  "boom",
  "accel",
  "auto",
  "pre",
  "recycle",
  "nebula",
  "pulse",
  "cluster",
  "pocket",
  "flash",
  "binary",
  "autoIa",
] as const;
export type ShopId = (typeof SHOP_IDS)[number];

export type Composition = Record<ElementId, number>;

export type StarEnd = null | "collapse" | "fizzle" | "whiteDwarf";

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
  /** 軽い星が漸近巨星分枝星になった時刻 [秒]。まだなら null */
  agbStartedAt: number | null;
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
  /** 軽い星が残した白色矮星の数（第3層の材料） */
  whiteDwarfs: number;
  /** 次に生む星の質量 [M☉]。null なら上限。第2層の解放後に効く */
  nextMass: number | null;
  discovered: Partial<Record<ElementId, true>>;
  shop: Record<ShopId, number>;
  autoOn: Record<StageId, boolean>;
  /** 狙う星屑。段階ごとに自動強化を切り替えたら null（自分で決める） */
  target: Target | null;
  /** 超新星のあと自動で次の星を生むか（超新星の回数が足りれば効く） */
  autoRebirth: boolean;
  log: SupernovaRecord[];
  /** 星団の星（主星のほかに最大2つ） */
  cluster: ClusterSlot[];
  /** 第3層 s過程の道 */
  sProcess: SProcess;
};

/** 星団で主星と一緒に燃やす星。いつも自動で強化し、終わったら自動で次の星を生む */
export type ClusterSlot = { star: Star; nextMass: number | null; target: Target };

export type GameState = { meta: Meta; star: Star };
