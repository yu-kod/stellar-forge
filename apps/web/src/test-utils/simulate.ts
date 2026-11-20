import {
  buyAllShopItems,
  canAutoRebirth,
  buyShopItem,
  buyStage,
  canBuyStage,
  canBuyShopItem,
  rebirth,
  setNextMass,
  setSeedTarget,
  setTarget,
  shopCost,
} from "@/game/actions";
import { funds, isShopItemOpen } from "@/game/shop";
import { DEFAULT_SEED_TARGET, LAYER2_AFTER, SHOP, TARGET_STAGES, bestTarget } from "@/game/balance";
import { advanceAll, setSlotMass, setSlotTarget } from "@/game/cluster";
import { nextShopGoal } from "@/game/goal";
import { bestPair, formBinary, pairAdvice, rGoal } from "@/game/merger";
import { S_DISCOVERABLE } from "@/game/sprocess";
import { ALL_ELEMENTS, foundElements } from "@/game/progress";
import { stageCost } from "@/game/rates";
import { step } from "@/game/step";
import { createGame } from "@/game/star";
import {
  SHOP_IDS,
  STAGE_IDS,
  type Currency,
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

/** その通貨を一番多く残す狙い。重元素の星屑は狙いでは増えないので、今の狙いのまま */
const targetOr = (currency: Currency, current: Target): Target => bestTarget(currency) ?? current;

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
        shopCost(state.meta, id) - funds(state.meta, SHOP[id].currency);
      return shortfall(b) < shortfall(a) ? b : a;
    });
    const target = targetOr(SHOP[wanted].currency, state.meta.target ?? "C");
    state = setTarget(state, target);
    const forNitrogen = SHOP[wanted].currency === "N" ? lightMassForNitrogen : null;
    state = setNextMass(state, forNitrogen);
    const ended = playStar(state, state.meta.shop.auto ? autoOnly : () => TARGET_STAGES[target]);
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
  /** 恒星風で得た重元素の星屑の合計 */
  heavyEarned: number;
  /** r過程で元素を見つけた時刻 [秒]（原子番号ごと） */
  rAt: Record<number, number>;
  /** s過程で元素を見つけた時刻 [秒]（原子番号ごと） */
  sAt: Record<number, number>;
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
      | "loop"
      | "layer4"
      | "rAuto"
      | "gold"
      | "complete",
      number
    >
  >;
  /** 期間中の星屑の最大値 */
  maxDust: number;
  /** 10分ごとの恒久強化の購入数 */
  purchasesPer10Min: number[];
  /** 第4層で手で組んだ連星の数 */
  manualPairs: number;
};

/**
 * 画面を開いたまま遊ぶ人をまねる。1秒ごとに、次の目標に合わせて狙いと質量を決め、
 * 自動制御がなければ狙いの段階を手で買い、恒久強化は買えるだけ買う。星団の星は窒素・炭素狙いの軽い星にする
 */
/** 第3層で保つ鉄の種の量。数か、その時の状態で決める関数 */
export type SeedPlan = number | ((state: GameState) => number);

/**
 * 画面を開いたまま遊ぶ。steer（初期値 true）では次の目標に合わせて狙い・質量・星団を決める。
 * false では狙いと質量を初期のまま触らない（星屑の交換と最初の自動制御までの手での強化だけ）
 */
export function playIdle(
  seconds: number,
  options: {
    seedTarget?: SeedPlan;
    steer?: boolean;
    /** 第3層の解放後に主星として生む質量（省略すると第2層と同じ決め方） */
    layer3MainMass?: number;
    /** 始める状態（省略すると新しいゲーム）。時刻は state.meta.elapsed から数える */
    start?: GameState;
    /** この印に届いたら止める */
    stopAt?: keyof IdleReport["marks"];
    /** 狙いを固定する（省略すると次の目標に合わせる） */
    target?: Target | ((state: GameState) => Target);
    /** これが true になったら止める */
    stopWhen?: (state: GameState) => boolean;
    /** 第4層で手で組む組（省略すると画面のはじめの選び方）。null なら組まない */
    pairing?: (state: GameState) => readonly [number, number] | null;
  } = {}
): IdleReport {
  const steer = options.steer ?? true;
  let state = options.start ?? createGame();
  const offset = Math.round(state.meta.elapsed);
  const plan = options.seedTarget ?? DEFAULT_SEED_TARGET;
  let manualPairs = 0;
  const marks: IdleReport["marks"] = {};
  const purchasesPer10Min: number[] = [];
  let maxDust = 0;
  let purchases = 0;
  const lightAt: Record<number, number> = {};
  const sAt: Record<number, number> = {};
  const rAt: Record<number, number> = {};
  let heavyEarned = 0;
  const levels = (s: GameState) => SHOP_IDS.reduce((sum, id) => sum + s.meta.shop[id], 0);
  const pairing = options.pairing ?? ((s: GameState) => bestPair(s.meta, rGoal(s.meta)));
  for (let t = offset + 1; t <= offset + seconds; t++) {
    if (options.stopAt && marks[options.stopAt] !== undefined) break;
    if (options.stopWhen?.(state)) break;
    if (state.star.end && !canAutoRebirth(state.meta)) state = rebirth(state);
    const currency = SHOP[nextShopGoal(state.meta).item].currency;
    const fixedTarget =
      typeof options.target === "function" ? options.target(state) : options.target;
    const target = fixedTarget ?? (steer ? targetOr(currency, state.meta.target ?? "C") : "Si");
    if (steer) {
      state = setTarget(state, target);
      const light = currency === "N" && state.meta.supernovae >= LAYER2_AFTER;
      const layer3 =
        options.layer3MainMass !== undefined &&
        state.meta.sProcess.unlocked &&
        !state.meta.rProcess.unlocked;
      state = setNextMass(state, layer3 ? options.layer3MainMass! : light ? 6 : null);
      // 第4層：星団の1つ目は軽い中性子星（1.2 M☉）を残す 10 M☉ の星にし、主星の重い中性子星と組む
      // 第4層では、解放のときに決まる星団の質量（中性子星を残す星）のまま。届く組がなければ目標の案内に従う
      if (!state.meta.rProcess.unlocked) {
        state.meta.cluster.forEach((_, i) => {
          state = setSlotTarget(setSlotMass(state, i, i === 0 ? 6 : 2), i, "C");
        });
      } else if (!options.pairing) {
        const advice = pairAdvice(state.meta, rGoal(state.meta));
        const hint =
          advice.type === "masses" ? advice : advice.type === "shield" ? advice.alternative : null;
        if (hint) {
          hint.masses.forEach((mass, i) => {
            if (i < state.meta.cluster.length) state = setSlotMass(state, i, mass);
          });
        }
      }
    }
    // 第3層：道の上の原子核の目標の量（Ia型超新星は自動で補う）。循環を見たら、重元素の星屑と Ia型超新星を稼ぐ
    const seeds = typeof plan === "number" ? plan : plan(state);
    // 循環を見て s過程の元素がそろったら、重元素の星屑と Ia型超新星を稼ぐ
    const sComplete = state.meta.sProcess.discovered.length === S_DISCOVERABLE;
    const farm = sComplete && steer && options.seedTarget === undefined;
    state = setSeedTarget(state, farm ? 30 : seeds);
    // 第4層：自動化がなければ、画面のはじめの選び方（いま作りたい元素を一番多く作る組）で手で組む
    // 組み方を指定したときは自動化を使わず、毎秒、枠が埋まるまで指定の組を組む
    if (options.pairing && state.meta.shop.rAuto) {
      state = { ...state, meta: { ...state.meta, shop: { ...state.meta.shop, rAuto: 0 } } };
    }
    if (state.meta.rProcess.unlocked && !state.meta.shop.rAuto) {
      for (;;) {
        const pair = pairing(state);
        const formed = pair ? formBinary(state, pair[0], pair[1]) : state;
        if (formed === state) break;
        state = formed;
        manualPairs++;
        if (!options.pairing) break;
      }
    }
    for (let half = 0; half < 2; half++) {
      const heavyBefore = state.meta.sProcess.heavy;
      state = advanceAll(state, 0.5, 0.1).state;
      heavyEarned += state.meta.sProcess.heavy - heavyBefore;
      if (!state.meta.shop.auto) state = buyCheapest(state, TARGET_STAGES[target]);
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
    for (const z of state.meta.sProcess.discovered) sAt[z] ??= t;
    for (const z of state.meta.rProcess.discovered) rAt[z] ??= t;
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
      ["layer4", state.meta.rProcess.unlocked],
      ["rAuto", state.meta.shop.rAuto > 0],
      ["gold", state.meta.rProcess.discovered.includes(79)],
      ["complete", foundElements(state.meta).length === ALL_ELEMENTS],
    ];
    for (const [mark, done] of reached) if (done && marks[mark] === undefined) marks[mark] = t;
  }
  return { state, marks, maxDust, purchasesPer10Min, lightAt, sAt, rAt, heavyEarned, manualPairs };
}
