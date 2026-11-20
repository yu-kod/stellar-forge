import { buyStage, canBuyStage } from "./actions";
import {
  AUTO_BUY_PER_STEP,
  CHANDRASEKHAR_MASS,
  AGB_SECONDS,
  CARBON_STAR_CNO_NITROGEN_PER_HYDROGEN,
  CARBON_STAR_LIMIT,
  CARBON_STAR_NEUTRONS,
  CNO_NITROGEN_PER_HYDROGEN,
  LOW_MASS_CNO_NITROGEN_PER_HYDROGEN,
  LOW_MASS_LIMIT,
  LOW_MASS_MAX_TEMPERATURE,
  NEUTRONS_PER_HELIUM,
  WHITE_DWARF_HYDROGEN,
  DISCOVERY_THRESHOLD,
  FIZZLE_AFTER_SECONDS,
  FIZZLE_RATE,
  FINAL_STAGE_FALLBACK_FUEL,
  FINAL_STAGE_SECONDS,
  ACCEL_PER_LEVEL,
  MIN_FINAL_STAGE_SECONDS,
  STAGES,
} from "./balance";
import { burnRate, energyMultiplier, isIgnited, stageCost } from "./rates";
import { captureNeutrons, neutronMultiplier } from "./sprocess";
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
  | { type: "fizzle" }
  | { type: "whiteDwarf" }
  | { type: "agb" }
  | { type: "sDiscover"; z: number }
  | { type: "sLoop" };

export type StepResult = { state: GameState; events: GameEvent[] };

/** ケイ素燃焼が始まってから崩壊するまでの秒数 */
export function finalStageSeconds(meta: Meta): number {
  return Math.max(
    MIN_FINAL_STAGE_SECONDS,
    FINAL_STAGE_SECONDS * ACCEL_PER_LEVEL ** meta.shop.accel
  );
}

/** ケイ素燃焼が鉄を作る一定の速さ [M☉/s] */
function finalRate(meta: Meta): number {
  return CHANDRASEKHAR_MASS / finalStageSeconds(meta);
}

/** その更新で燃える量と、減らす燃料 */
function plannedBurn(meta: Meta, star: Star, stage: StageId, dt: number) {
  const spec = STAGES[stage];
  if (!spec.final) return { amount: burnRate(meta, star, stage) * dt, fuel: spec.fuel };
  if (!isIgnited(star, stage)) return { amount: 0, fuel: spec.fuel };
  const amount = finalRate(meta) * dt;
  const ownFuel = spec.fuel.reduce((sum, id) => sum + star.mass[id], 0);
  return { amount, fuel: ownFuel >= amount ? spec.fuel : FINAL_STAGE_FALLBACK_FUEL };
}

/** いま毎秒入るエネルギー [J/s]。表示用で、燃料が足りない分は数えない */
export function energyRate({ meta, star }: GameState): number {
  let rate = 0;
  for (const stage of STAGE_IDS) {
    const { amount, fuel } = plannedBurn(meta, star, stage, 1);
    const available = fuel.reduce((sum, id) => sum + star.mass[id], 0);
    rate += Math.min(amount, available) * STAGES[stage].energyPerMass;
  }
  return rate * energyMultiplier(meta);
}

/** 鉄のコアが限界に達するまでの秒数（ケイ素燃焼は一定の速さで鉄を作る） */
export function secondsToCollapse(meta: Meta, star: Star): number {
  return Math.max(0, (CHANDRASEKHAR_MASS - star.mass.Fe) / finalRate(meta));
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
  let heliumBurned = 0;
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
    if (stage === "He") heliumBurned = burned;
    if (stage === "H") {
      // CNO サイクル：燃えた水素に比例して、炭素を窒素に変える（炭素があるだけ）
      const perHydrogen = !isLowMass(state.star)
        ? CNO_NITROGEN_PER_HYDROGEN
        : isCarbonStar(state.star)
          ? CARBON_STAR_CNO_NITROGEN_PER_HYDROGEN
          : LOW_MASS_CNO_NITROGEN_PER_HYDROGEN;
      const converted = Math.min(state.star.mass.C, burned * perHydrogen);
      delta.C -= converted;
      delta.N += converted;
    }
  }
  for (const id of ELEMENT_IDS) star.mass[id] = Math.max(0, star.mass[id] + delta[id]);
  star.energy += energy * energyMultiplier(meta);
  star.time += dt;

  const ceiling = isLowMass(star) ? LOW_MASS_MAX_TEMPERATURE : Infinity;
  star.temperature = Math.min(
    ceiling,
    Math.max(star.temperature, temperatureFromWeight(coreWeight(star)))
  );
  for (const stage of STAGE_IDS) {
    if (star.ignitedAt[stage] !== undefined || !isIgnited(star, stage)) continue;
    star.ignitedAt[stage] = star.time;
    // 狙いの内（自動強化が ON）の段階だけ、点火した瞬間に Lv1 から燃え始める
    if (!STAGES[stage].final && star.levels[stage] === 0 && meta.autoOn[stage]) {
      star.levels[stage] = 1;
    }
    events.push({ type: "ignite", stage });
  }

  // 第3層：軽い星のヘリウム燃焼の熱パルスが中性子を出し、s過程の道の原子核が捕まえる
  if (meta.sProcess.unlocked && state.star.agbStartedAt !== null && heliumBurned > 0) {
    const carbonStar = isCarbonStar(state.star) ? CARBON_STAR_NEUTRONS : 1;
    const neutrons = heliumBurned * NEUTRONS_PER_HELIUM * carbonStar * neutronMultiplier(meta);
    const captured = captureNeutrons(meta.sProcess, neutrons);
    meta.sProcess = captured.sProcess;
    for (const z of captured.discovered) events.push({ type: "sDiscover", z });
    if (captured.looped) events.push({ type: "sLoop" });
  }

  for (const id of ELEMENT_IDS) {
    if (id === "H" || meta.discovered[id] || star.mass[id] < DISCOVERY_THRESHOLD) continue;
    meta.discovered[id] = true;
    events.push({ type: "discover", element: id });
  }

  // 軽い星は外層の水素が尽きると漸近巨星分枝星になる（熱パルスの段階）
  if (
    isLowMass(star) &&
    star.agbStartedAt === null &&
    star.mass.H < WHITE_DWARF_HYDROGEN * star.initialMass
  ) {
    star.agbStartedAt = star.time;
    events.push({ type: "agb" });
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

/** 炭素燃焼に届かない軽い星か */
export function isLowMass(star: Star): boolean {
  return star.initialMass < LOW_MASS_LIMIT;
}

/** 窒素をあまり作らず、炭素と中性子を多く出す軽い星（4 M☉ 未満） */
export function isCarbonStar(star: Star): boolean {
  return star.initialMass < CARBON_STAR_LIMIT;
}

/** 鉄のコアが限界に達したら崩壊、軽い星は外層の水素が尽きたら白色矮星、何も燃えなくなったら燃え尽き */
function endOfLife({ meta, star }: GameState): StarEnd {
  if (star.mass.Fe >= CHANDRASEKHAR_MASS) return "collapse";
  if (star.agbStartedAt !== null && star.time - star.agbStartedAt >= AGB_SECONDS - 1e-9) {
    return "whiteDwarf";
  }
  if (star.time > FIZZLE_AFTER_SECONDS && totalBurnRate(meta, star) < FIZZLE_RATE) return "fizzle";
  return null;
}
