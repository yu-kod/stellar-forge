import { LOG_LIMIT, MAX_BUY_PER_ACTION, SHOP, STAGES } from "./balance";
import { dustPreview, ejectedMetals } from "./dust";
import { isIgnited, stageCost } from "./rates";
import { createStar } from "./star";
import {
  DUST_IDS,
  type GameState,
  type Meta,
  type ShopId,
  type StageId,
  type SupernovaRecord,
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
    supernovae: meta.supernovae + 1,
    neutronStars: meta.neutronStars + (star.end === "collapse" ? 1 : 0),
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
  if (spec.maxLevel !== undefined && meta.shop[item] >= spec.maxLevel) return false;
  return meta.dust[spec.currency] >= shopCost(meta, item);
}

export function buyShopItem(state: GameState, item: ShopId): GameState {
  const { meta } = state;
  if (!canBuyShopItem(meta, item)) return state;
  const currency = SHOP[item].currency;
  return {
    star: state.star,
    meta: {
      ...meta,
      dust: { ...meta.dust, [currency]: meta.dust[currency] - shopCost(meta, item) },
      shop: { ...meta.shop, [item]: meta.shop[item] + 1 },
    },
  };
}
