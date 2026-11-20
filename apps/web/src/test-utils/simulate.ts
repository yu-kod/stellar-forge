import {
  buyShopItem,
  buyStage,
  canBuyStage,
  canBuyShopItem,
  rebirth,
  setNextMass,
  setTarget,
  shopCost,
} from "@/game/actions";
import { isShopItemOpen } from "@/game/shop";
import { SHOP, TARGET_STAGES } from "@/game/balance";
import { stageCost } from "@/game/rates";
import { step } from "@/game/step";
import { createGame } from "@/game/star";
import {
  SHOP_IDS,
  STAGE_IDS,
  type DustId,
  type GameState,
  type StageId,
  type Target,
} from "@/game/types";

/** その元素を外層に残すために強化する段階（狙う星屑と同じ） */
export const STAGES_FOR: Record<DustId, readonly StageId[]> = {
  C: TARGET_STAGES.C,
  N: TARGET_STAGES.C,
  O: TARGET_STAGES.O,
  Ne: TARGET_STAGES.Ne,
  Mg: TARGET_STAGES.O,
  Si: TARGET_STAGES.Si,
  S: TARGET_STAGES.Si,
};

export type Strategy = (state: GameState) => readonly StageId[];

export const greedy: Strategy = () => STAGE_IDS;
/** 手では買わず、自動制御に任せる */
export const autoOnly: Strategy = () => [];
export const aimFor =
  (element: DustId): Strategy =>
  () =>
    STAGES_FOR[element];

/** 許した段階のうち一番安いものを、買えなくなるまで買う */
function buyCheapest(state: GameState, allowed: readonly StageId[]): GameState {
  let next = state;
  for (;;) {
    const candidates = allowed.filter((stage) => canBuyStage(next, stage));
    if (candidates.length === 0) return next;
    const cheapest = candidates.reduce((a, b) =>
      stageCost(next.meta, next.star, b) < stageCost(next.meta, next.star, a) ? b : a
    );
    next = buyStage(next, cheapest);
  }
}

/** 1つの星を終わりまで遊ぶ。0.5秒ごとに強化を買う */
export function playStar(start: GameState, strategy: Strategy, dt = 0.1): GameState {
  let state = start;
  let sinceBuy = 0;
  while (!state.star.end && state.star.time < 3600) {
    state = step(state, dt).state;
    sinceBuy += dt;
    if (sinceBuy >= 0.5) {
      sinceBuy = 0;
      state = buyCheapest(state, strategy(state));
    }
  }
  return state;
}

/** その星屑を一番多く残す狙い */
const TARGET_FOR: Record<DustId, Target> = {
  C: "C",
  N: "C",
  O: "O",
  Ne: "Ne",
  Mg: "O",
  Si: "Si",
  S: "Si",
};

/**
 * 一番近く買える恒久強化を狙い、その通貨の元素を残すように遊び続ける。
 * 自動制御を持ったら手では買わず、狙いだけを切り替える。星屑の強化を買った時刻（秒）も返す
 */
export function playCampaign(
  gameSeconds: number,
  {
    start = createGame(),
    lightMassForNitrogen = null,
  }: {
    start?: GameState;
    /** 窒素の強化を狙うときに生む軽い星の質量。null なら常に上限の質量 */
    lightMassForNitrogen?: number | null;
  } = {}
): {
  state: GameState;
  elapsed: number;
  purchases: number[];
} {
  let state = start;
  let elapsed = 0;
  const purchases: number[] = [];
  while (elapsed < gameSeconds) {
    const wanted = SHOP_IDS.filter(
      (id) =>
        isShopItemOpen(state.meta, id) &&
        (SHOP[id].maxLevel === undefined || state.meta.shop[id] < SHOP[id].maxLevel)
    ).reduce((a, b) => {
      const shortfall = (id: typeof a) =>
        shopCost(state.meta, id) - state.meta.dust[SHOP[id].currency];
      return shortfall(b) < shortfall(a) ? b : a;
    });
    const target = TARGET_FOR[SHOP[wanted].currency];
    state = setTarget(state, target);
    const forNitrogen = SHOP[wanted].currency === "N" ? lightMassForNitrogen : null;
    state = setNextMass(state, forNitrogen);
    const ended = playStar(state, state.meta.shop.auto ? autoOnly : aimFor(SHOP[wanted].currency));
    elapsed += ended.star.time;
    state = rebirth(ended);
    for (let bought = true; bought;) {
      bought = false;
      for (const id of SHOP_IDS) {
        if (canBuyShopItem(state.meta, id)) {
          state = buyShopItem(state, id);
          bought = true;
          purchases.push(elapsed);
        }
      }
    }
  }
  return { state, elapsed, purchases };
}
