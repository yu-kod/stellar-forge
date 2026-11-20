import { buyStage, canBuyStage } from "./actions";
import {
  AUTO_BUY_PER_STEP,
  CHANDRASEKHAR_MASS,
  DISCOVERY_THRESHOLD,
  FIZZLE_AFTER_SECONDS,
  FIZZLE_RATE,
  FINAL_STAGE_FALLBACK_FUEL,
  FINAL_STAGE_SECONDS,
  STAGES,
} from "./balance";
import { burnRate, energyMultiplier, isIgnited, stageCost } from "./rates";
import { coreWeight, temperatureFromWeight } from "./temperature";
import {
  ELEMENT_IDS,
  STAGE_IDS,
  type Composition,
  type ElementId,
  type GameState,
  type Meta,
  type StageId,
  type Star,
  type StarEnd,
} from "./types";

export type GameEvent =
  | { type: "ignite"; stage: StageId }
  | { type: "discover"; element: ElementId }
  | { type: "collapse" }
  | { type: "fizzle" };

export type StepResult = { state: GameState; events: GameEvent[] };

const FINAL_RATE = CHANDRASEKHAR_MASS / FINAL_STAGE_SECONDS;

/** その更新で燃える量と、減らす燃料 */
function plannedBurn(meta: Meta, star: Star, stage: StageId, dt: number) {
  const spec = STAGES[stage];
  if (!spec.final) return { amount: burnRate(meta, star, stage) * dt, fuel: spec.fuel };
  if (!isIgnited(star, stage)) return { amount: 0, fuel: spec.fuel };
  const amount = FINAL_RATE * dt;
  const ownFuel = spec.fuel.reduce((sum, id) => sum + star.mass[id], 0);
  return { amount, fuel: ownFuel >= amount ? spec.fuel : FINAL_STAGE_FALLBACK_FUEL };
}

function totalBurnRate(meta: Meta, star: Star): number {
  return STAGE_IDS.reduce((sum, stage) => sum + plannedBurn(meta, star, stage, 1).amount, 0);
}

export function step(state: GameState, dt: number): StepResult {
  if (state.star.end) return { state, events: [] };
  const meta = structuredClone(state.meta);
  const star = structuredClone(state.star);
  const events: GameEvent[] = [];

  const delta = Object.fromEntries(ELEMENT_IDS.map((id) => [id, 0])) as Composition;
  let energy = 0;
  for (const stage of STAGE_IDS) {
    const { amount, fuel } = plannedBurn(meta, state.star, stage, dt);
    const available = fuel.reduce((sum, id) => sum + state.star.mass[id], 0);
    const burned = Math.min(amount, available);
    if (burned <= 0) continue;
    for (const id of fuel) delta[id] -= (burned * state.star.mass[id]) / available;
    for (const [id, share] of Object.entries(STAGES[stage].products) as [ElementId, number][]) {
      delta[id] += burned * share;
    }
    energy += burned * STAGES[stage].energyPerMass;
  }
  for (const id of ELEMENT_IDS) star.mass[id] = Math.max(0, star.mass[id] + delta[id]);
  star.energy += energy * energyMultiplier(meta);
  star.time += dt;

  star.temperature = Math.max(star.temperature, temperatureFromWeight(coreWeight(star)));
  for (const stage of STAGE_IDS) {
    if (star.ignitedAt[stage] !== undefined || !isIgnited(star, stage)) continue;
    star.ignitedAt[stage] = star.time;
    if (!STAGES[stage].final && star.levels[stage] === 0) star.levels[stage] = 1;
    events.push({ type: "ignite", stage });
  }

  for (const id of ELEMENT_IDS) {
    if (id === "H" || meta.discovered[id] || star.mass[id] < DISCOVERY_THRESHOLD) continue;
    meta.discovered[id] = true;
    events.push({ type: "discover", element: id });
  }

  const bought = meta.shop.auto ? autoBuy({ meta, star }) : { meta, star };
  const end = endOfLife(bought);
  if (!end) return { state: bought, events };
  return {
    state: { ...bought, star: { ...bought.star, end } },
    events: [...events, { type: end }],
  };
}

function autoBuy(state: GameState): GameState {
  let next = state;
  for (let i = 0; i < AUTO_BUY_PER_STEP; i++) {
    const candidates = STAGE_IDS.filter(
      (stage) => next.meta.autoOn[stage] && canBuyStage(next, stage)
    );
    if (candidates.length === 0) break;
    const cheapest = candidates.reduce((a, b) =>
      stageCost(next.meta, next.star, b) < stageCost(next.meta, next.star, a) ? b : a
    );
    next = buyStage(next, cheapest);
  }
  return next;
}

/** 鉄のコアが限界に達したら崩壊、何も燃えなくなったら燃え尽き */
function endOfLife({ meta, star }: GameState): StarEnd {
  if (star.mass.Fe >= CHANDRASEKHAR_MASS) return "collapse";
  if (star.time > FIZZLE_AFTER_SECONDS && totalBurnRate(meta, star) < FIZZLE_RATE) return "fizzle";
  return null;
}
