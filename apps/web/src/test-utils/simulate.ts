import {
  buyAllShopItems,
  canAutoRebirth,
  buyShopItem,
  buyStage,
  canBuyStage,
  canBuyShopItem,
  rebirth,
  setNextMass,
  setTarget,
  shopCost,
  triggerIa,
} from "@/game/actions";
import { isShopItemOpen } from "@/game/shop";
import { LAYER2_AFTER, SHOP, TARGET_STAGES } from "@/game/balance";
import { advanceAll, setSlotMass, setSlotTarget } from "@/game/cluster";
import { nextShopGoal } from "@/game/goal";
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

export type IdleReport = {
  state: GameState;
  /** 軽い元素を見つけた時刻 [秒]（原子番号ごと） */
  lightAt: Record<number, number>;
  /** 解放などが起きた時刻 [秒] */
  marks: Partial<
    Record<
      | "auto"
      | "layer2"
      | "autoRebirth"
      | "cluster"
      | "layer3"
      | "strontium"
      | "barium"
      | "lead"
      | "loop",
      number
    >
  >;
  /** 期間中の星屑の最大値 */
  maxDust: number;
  /** 10分ごとの恒久強化の購入数 */
  purchasesPer10Min: number[];
};

/**
 * 画面を開いたまま遊ぶ人をまねる。1秒ごとに、次の目標に合わせて狙いと質量を決め、
 * 自動制御がなければ狙いの段階を手で買い、恒久強化は買えるだけ買う。星団の星は窒素・炭素狙いの軽い星にする
 */
export function playIdle(seconds: number): IdleReport {
  let state = createGame();
  const marks: IdleReport["marks"] = {};
  const purchasesPer10Min: number[] = [];
  let maxDust = 0;
  let purchases = 0;
  const lightAt: Record<number, number> = {};
  const levels = (s: GameState) => SHOP_IDS.reduce((sum, id) => sum + s.meta.shop[id], 0);
  for (let t = 1; t <= seconds; t++) {
    if (state.star.end && !canAutoRebirth(state.meta)) state = rebirth(state);
    const currency = SHOP[nextShopGoal(state.meta).item].currency;
    state = setTarget(state, TARGET_FOR[currency]);
    const light = currency === "N" && state.meta.supernovae >= LAYER2_AFTER;
    state = setNextMass(state, light ? 6 : null);
    state.meta.cluster.forEach((_, i) => {
      state = setSlotTarget(setSlotMass(state, i, i === 0 ? 6 : 2), i, "C");
    });
    // 第3層：自動化がなければ、道の上の原子核が目標の量になるまで手で Ia型超新星を起こす
    const onPath = state.meta.sProcess.amounts.reduce((sum, a) => sum + a, 0);
    if (state.meta.sProcess.unlocked && !state.meta.shop.autoIa && onPath < 3) {
      state = triggerIa(state);
    }
    for (let half = 0; half < 2; half++) {
      state = advanceAll(state, 0.5, 0.1).state;
      if (!state.meta.shop.auto) state = buyCheapest(state, TARGET_STAGES[TARGET_FOR[currency]]);
    }
    const before = levels(state);
    state = buyAllShopItems(state);
    purchases += levels(state) - before;
    if (t % 600 === 0) {
      purchasesPer10Min.push(purchases);
      purchases = 0;
    }
    maxDust = Math.max(maxDust, ...Object.values(state.meta.dust));
    for (const z of state.meta.lightFound) lightAt[z] ??= t;
    const reached: [keyof IdleReport["marks"], boolean][] = [
      ["auto", state.meta.shop.auto > 0],
      ["layer2", state.meta.supernovae >= LAYER2_AFTER],
      ["autoRebirth", canAutoRebirth(state.meta)],
      ["cluster", state.meta.shop.cluster > 0],
      ["layer3", state.meta.sProcess.unlocked],
      ["strontium", state.meta.sProcess.discovered.includes(38)],
      ["barium", state.meta.sProcess.discovered.includes(56)],
      ["lead", state.meta.sProcess.discovered.includes(82)],
      ["loop", state.meta.sProcess.looped],
    ];
    for (const [mark, done] of reached) if (done && marks[mark] === undefined) marks[mark] = t;
  }
  return { state, marks, maxDust, purchasesPer10Min, lightAt };
}
