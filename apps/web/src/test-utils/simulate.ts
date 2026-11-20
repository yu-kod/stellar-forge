import {
  buyShopItem,
  buyStage,
  canBuyStage,
  canBuyShopItem,
  rebirth,
  shopCost,
} from "@/game/actions";
import { SHOP } from "@/game/balance";
import { stageCost } from "@/game/rates";
import { step } from "@/game/step";
import { createGame } from "@/game/star";
import { SHOP_IDS, STAGE_IDS, type DustId, type GameState, type StageId } from "@/game/types";

/** その元素を外層に残すために強化する段階 */
export const STAGES_FOR: Record<DustId, readonly StageId[]> = {
  C: ["H", "He"],
  O: ["H", "He", "Ne"],
  Ne: ["H", "He", "C"],
  Mg: ["H", "He", "C", "Ne"],
  Si: ["H", "He", "C", "Ne", "O"],
  S: ["H", "He", "C", "Ne", "O"],
};

export type Strategy = (state: GameState) => readonly StageId[];

export const greedy: Strategy = () => STAGE_IDS;
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

/** 一番近く買える恒久強化を狙い、その通貨の元素を残すように遊び続ける */
export function playCampaign(gameSeconds: number): { state: GameState; elapsed: number } {
  let state = createGame();
  let elapsed = 0;
  while (elapsed < gameSeconds) {
    const target = SHOP_IDS.filter(
      (id) => SHOP[id].maxLevel === undefined || state.meta.shop[id] < SHOP[id].maxLevel
    ).reduce((a, b) =>
      shopCost(state.meta, b) - state.meta.dust[SHOP[b].currency] <
      shopCost(state.meta, a) - state.meta.dust[SHOP[a].currency]
        ? b
        : a
    );
    const ended = playStar(state, aimFor(SHOP[target].currency));
    elapsed += ended.star.time;
    state = rebirth(ended);
    for (let bought = true; bought;) {
      bought = false;
      for (const id of SHOP_IDS) {
        if (canBuyShopItem(state.meta, id)) {
          state = buyShopItem(state, id);
          bought = true;
        }
      }
    }
  }
  return { state, elapsed };
}
