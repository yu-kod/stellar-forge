import {
  CNO_BONUS_PER_LEVEL,
  CROSS_SECTION_PER_LEVEL,
  LOW_MASS_LIMIT,
  PULSE_PER_LEVEL,
  FINAL_PHASE_COST,
  MAGNESIUM_DISCOUNT,
  MILESTONE_EVERY,
  PACE,
  STAGES,
} from "./balance";
import type { Meta, StageId, Star } from "./types";

/** 発見済みの元素で2倍になる段階 */
const DISCOVERY_BOOST: Partial<Record<StageId, "C" | "Ne" | "S">> = { He: "C", C: "Ne", O: "S" };

export function rateConstant(meta: Meta, star: Star, stage: StageId): number {
  const level = star.levels[stage];
  let k = PACE * STAGES[stage].baseRate * level * 2 ** Math.floor(level / MILESTONE_EVERY);
  k *= CROSS_SECTION_PER_LEVEL ** meta.shop.xs;
  if (stage === "H") k *= 1 + CNO_BONUS_PER_LEVEL * meta.shop.cno;
  const boost = DISCOVERY_BOOST[stage];
  if (boost && meta.discovered[boost]) k *= 2;
  if (stage === "He" && star.initialMass < LOW_MASS_LIMIT) k *= PULSE_PER_LEVEL ** meta.shop.pulse;
  return k;
}

export function isIgnited(star: Star, stage: StageId): boolean {
  return star.temperature >= STAGES[stage].ignition;
}

export function fuelOf(star: Star, stage: StageId): number {
  return STAGES[stage].fuel.reduce((sum, id) => sum + star.mass[id], 0);
}

/** 毎秒の燃焼量 [M☉/s] = k × 燃料 */
export function burnRate(meta: Meta, star: Star, stage: StageId): number {
  if (!isIgnited(star, stage)) return 0;
  return rateConstant(meta, star, stage) * fuelOf(star, stage);
}

export function stageCost(meta: Meta, star: Star, stage: StageId): number {
  const spec = STAGES[stage];
  const discount = meta.discovered.Mg ? MAGNESIUM_DISCOUNT : 1;
  const finalPhase = isIgnited(star, "Si") ? FINAL_PHASE_COST : 1;
  return spec.initialCost * spec.costGrowth ** star.levels[stage] * discount * finalPhase;
}

export function energyMultiplier(meta: Meta): number {
  return 2 ** meta.shop.yield * (meta.discovered.He ? 2 : 1);
}
