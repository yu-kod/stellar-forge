import {
  AUTO_REBIRTH_AFTER,
  CLUSTER_DEFAULT_MASS,
  LAYER3_AFTER,
  LOG_LIMIT,
  MAX_BUY_PER_ACTION,
  SHOP,
  STAGES,
  TARGET_STAGES,
} from "./balance";
import { dustPreview, ejectedMetals } from "./dust";
import { isIgnited, stageCost } from "./rates";
import { findLightElements } from "./light";
import { addNeutronStars, neutronStarBin } from "./rprocess";
import { funds, isShopItemOpen, isShopItemUseful, spend } from "./shop";
import { seedsPerIa } from "./sprocess";
import { createStar } from "./star";
import {
  DUST_IDS,
  type GameState,
  type Meta,
  type ShopId,
  type StageId,
  SHOP_IDS,
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

/** 星屑の自動交換を切り替える（燃焼の自動制御を持っていれば） */
export function setAutoShop(state: GameState, on: boolean): GameState {
  if (!state.meta.shop.auto) return state;
  return { ...state, meta: { ...state.meta, autoShop: on } };
}

/** 自動で次の星を生めるか（設定が ON で、超新星の回数が足りている） */
export function canAutoRebirth(meta: Meta): boolean {
  return meta.autoRebirth && meta.supernovae >= AUTO_REBIRTH_AFTER;
}

/** 白色矮星を1つ使って Ia型超新星を起こし、鉄の種を道に入れる（第3層） */
export function triggerIa(state: GameState): GameState {
  const { meta } = state;
  if (!meta.sProcess.unlocked || meta.whiteDwarfs < 1) return state;
  const amounts = [...meta.sProcess.amounts];
  amounts[0]! += seedsPerIa(meta);
  const next: Meta = {
    ...meta,
    whiteDwarfs: meta.whiteDwarfs - 1,
    iaSupernovae: meta.iaSupernovae + 1,
    sProcess: { ...meta.sProcess, amounts },
  };
  next.lightFound = [...next.lightFound, ...findLightElements(next, null)];
  return { ...state, meta: next };
}

/** 自動の Ia型超新星が保つ、道の上の原子核の量を決める（1以上の整数） */
export function setSeedTarget(state: GameState, target: number): GameState {
  const seedTarget = Math.max(1, Math.floor(target));
  return { ...state, meta: { ...state.meta, sProcess: { ...state.meta.sProcess, seedTarget } } };
}

/** 自動の Ia型超新星：道の上の原子核が目標の量になるまで、白色矮星を使って補う */
export function autoIa(state: GameState): GameState {
  if (!state.meta.sProcess.unlocked) return state;
  let next = state;
  const total = () => next.meta.sProcess.amounts.reduce((sum, a) => sum + a, 0);
  while (next.meta.whiteDwarfs >= 1 && total() < next.meta.sProcess.seedTarget) {
    next = triggerIa(next);
  }
  return next;
}

/** 終わった星から星屑と中性子星を受け取り、次の世代の星を生む */
export function rebirth(state: GameState): GameState {
  const { meta, star } = state;
  if (!star.end) return state;
  const gain = dustPreview(meta, star);
  // 崩壊した星は中性子星かブラックホールを残す
  const collapsed = star.end === "collapse";
  const bin = collapsed ? neutronStarBin(star.initialMass) : null;
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
    neutronStars: meta.neutronStars + (bin !== null ? 1 : 0),
    blackHoles: meta.blackHoles + (collapsed && bin === null ? 1 : 0),
    whiteDwarfs: meta.whiteDwarfs + (star.end === "whiteDwarf" ? 1 : 0),
    sProcess:
      star.end === "whiteDwarf" && meta.whiteDwarfs + 1 >= LAYER3_AFTER
        ? { ...meta.sProcess, unlocked: true }
        : meta.sProcess,
    bestRate: Object.fromEntries(
      DUST_IDS.map((id) => [id, Math.max(meta.bestRate[id], gain[id] / Math.max(1, star.time))])
    ) as Meta["bestRate"],
    rProcess: bin !== null ? addNeutronStars(meta.rProcess, bin, 1) : meta.rProcess,
    // 記録は超新星だけ。白色矮星は数だけ数える（星団で何百も生まれるため）
    log: star.end === "whiteDwarf" ? meta.log : [record, ...meta.log].slice(0, LOG_LIMIT),
  };
  nextMeta.lightFound = [...nextMeta.lightFound, ...findLightElements(nextMeta, star)];
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
  return funds(meta, spec.currency) >= shopCost(meta, item);
}

export function buyShopItem(state: GameState, item: ShopId): GameState {
  const { meta } = state;
  if (!canBuyShopItem(meta, item)) return state;
  const currency = SHOP[item].currency;
  const paid = spend(meta, currency, shopCost(meta, item));
  const bought: Meta = { ...paid, shop: { ...meta.shop, [item]: meta.shop[item] + 1 } };
  if (item === "cluster") bought.cluster = [...meta.cluster, createSlot(bought)];
  return { star: state.star, meta: bought };
}

/** 買える恒久強化を、買えなくなるまで全部買う（手持ちに対して安いものから） */
export function buyAllShopItems(state: GameState): GameState {
  let next = state;
  for (;;) {
    const affordable = SHOP_IDS.filter(
      (item) => canBuyShopItem(next.meta, item) && isShopItemUseful(next.meta, item)
    );
    if (affordable.length === 0) return next;
    const share = (item: ShopId) =>
      shopCost(next.meta, item) / funds(next.meta, SHOP[item].currency);
    next = buyShopItem(
      next,
      affordable.reduce((a, b) => (share(b) < share(a) ? b : a))
    );
  }
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
