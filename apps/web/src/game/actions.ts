import {
  AUTO_REBIRTH_AFTER,
  CLUSTER_DEFAULT_MASS,
  LOG_LIMIT,
  MAX_BUY_PER_ACTION,
  SHOP,
  STAGES,
  TARGET_STAGES,
} from "./balance";
import { dustPreview, ejectedMetals } from "./dust";
import { isIgnited, stageCost } from "./rates";
import { isShopItemOpen } from "./shop";
import { createStar } from "./star";
import {
  DUST_IDS,
  type GameState,
  type Meta,
  type ShopId,
  type StageId,
  type ClusterSlot,
  type SupernovaRecord,
  type Target,
  STAGE_IDS,
} from "./types";

export function canBuyStage(state: GameState, stage: StageId): boolean {
  const { meta, star } = state;
  if (star.end || STAGES[stage].final || !isIgnited(star, stage)) return false;
  return star.energy >= stageCost(meta, star, stage);
}

/** 燃焼を1段階強化する。買えなければ同じ状態を返す */
export function buyStage(state: GameState, stage: StageId): GameState {
  if (!canBuyStage(state, stage)) return state;
  const cost = stageCost(state.meta, state.star, stage);
  return {
    meta: state.meta,
    star: {
      ...state.star,
      energy: state.star.energy - cost,
      levels: { ...state.star.levels, [stage]: state.star.levels[stage] + 1 },
    },
  };
}

export function buyStageMax(state: GameState, stage: StageId): GameState {
  let next = state;
  for (let i = 0; i < MAX_BUY_PER_ACTION && canBuyStage(next, stage); i++)
    next = buyStage(next, stage);
  return next;
}

/** 段階ごとの自動強化の ON/OFF。強化できない最後の段階は切り替えない */
export function setAuto(state: GameState, stage: StageId, on: boolean): GameState {
  if (STAGES[stage].final) return state;
  return {
    ...state,
    meta: { ...state.meta, autoOn: { ...state.meta.autoOn, [stage]: on }, target: null },
  };
}

/** 狙う星屑を決め、自動強化の ON/OFF をそれに合わせて一括で切り替える */
export function setTarget(state: GameState, target: Target): GameState {
  const stages = TARGET_STAGES[target];
  const autoOn = Object.fromEntries(
    STAGE_IDS.map((id) => [id, stages.includes(id)])
  ) as Meta["autoOn"];
  return { ...state, meta: { ...state.meta, autoOn, target } };
}

/** 次に生む星の質量 [M☉] を決める。1 以上の整数にそろえる。null なら上限 */
export function setNextMass(state: GameState, mass: number | null): GameState {
  const nextMass = mass === null ? null : Math.max(1, Math.floor(mass));
  return { ...state, meta: { ...state.meta, nextMass } };
}

/** 超新星のあと自動で次の星を生むかを切り替える */
export function setAutoRebirth(state: GameState, on: boolean): GameState {
  return { ...state, meta: { ...state.meta, autoRebirth: on } };
}

/** 自動で次の星を生めるか（設定が ON で、超新星の回数が足りている） */
export function canAutoRebirth(meta: Meta): boolean {
  return meta.autoRebirth && meta.supernovae >= AUTO_REBIRTH_AFTER;
}

/** 終わった星から星屑と中性子星を受け取り、次の世代の星を生む */
export function rebirth(state: GameState): GameState {
  const { meta, star } = state;
  if (!star.end) return state;
  const gain = dustPreview(meta, star);
  const record: SupernovaRecord = {
    generation: star.generation,
    time: star.time,
    ejected: ejectedMetals(star),
    gain,
    end: star.end,
  };
  const nextMeta: Meta = {
    ...meta,
    dust: Object.fromEntries(DUST_IDS.map((id) => [id, meta.dust[id] + gain[id]])) as Meta["dust"],
    supernovae: meta.supernovae + (star.end === "whiteDwarf" ? 0 : 1),
    neutronStars: meta.neutronStars + (star.end === "collapse" ? 1 : 0),
    whiteDwarfs: meta.whiteDwarfs + (star.end === "whiteDwarf" ? 1 : 0),
    log: [record, ...meta.log].slice(0, LOG_LIMIT),
  };
  return { meta: nextMeta, star: createStar(nextMeta) };
}

export function shopCost(meta: Meta, item: ShopId): number {
  const spec = SHOP[item];
  return Math.floor(spec.baseCost * spec.costGrowth ** meta.shop[item]);
}

export function canBuyShopItem(meta: Meta, item: ShopId): boolean {
  const spec = SHOP[item];
  if (!isShopItemOpen(meta, item)) return false;
  if (spec.maxLevel !== undefined && meta.shop[item] >= spec.maxLevel) return false;
  return meta.dust[spec.currency] >= shopCost(meta, item);
}

export function buyShopItem(state: GameState, item: ShopId): GameState {
  const { meta } = state;
  if (!canBuyShopItem(meta, item)) return state;
  const currency = SHOP[item].currency;
  const bought: Meta = {
    ...meta,
    dust: { ...meta.dust, [currency]: meta.dust[currency] - shopCost(meta, item) },
    shop: { ...meta.shop, [item]: meta.shop[item] + 1 },
  };
  if (item === "cluster") bought.cluster = [...meta.cluster, createSlot(bought)];
  return { star: state.star, meta: bought };
}

/** 星団に新しく加わる星（窒素を作る軽い星・炭素狙い） */
export function createSlot(meta: Meta): ClusterSlot {
  const settings = { nextMass: CLUSTER_DEFAULT_MASS, target: "C" as const };
  const view = setNextMass(
    setTarget({ meta, star: createStar(meta) }, settings.target),
    settings.nextMass
  );
  return { ...settings, star: createStar(view.meta) };
}
