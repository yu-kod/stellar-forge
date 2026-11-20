import {
  BOOM_PER_LEVEL,
  DUST_EXPONENT,
  FIZZLE_DUST_FACTOR,
  NEBULA_PER_LEVEL,
  NITROGEN_DUST_BONUS,
  OXYGEN_DUST_BONUS,
  PLANETARY_NEBULA_DUST,
  RECYCLE_PER_LEVEL,
} from "./balance";
import { DUST_IDS, type DustId, type Meta, type Star } from "./types";

/** 外層に残っている重元素（炭素〜硫黄）の合計 [M☉] */
export function ejectedMetals(star: Star): number {
  return DUST_IDS.reduce((sum, id) => sum + star.mass[id], 0);
}

function dustMultiplier(meta: Meta, star: Star): number {
  let k = BOOM_PER_LEVEL ** meta.shop.boom * RECYCLE_PER_LEVEL ** meta.shop.recycle;
  if (meta.discovered.O) k *= OXYGEN_DUST_BONUS;
  if (star.end === "fizzle") k *= FIZZLE_DUST_FACTOR;
  if (star.end === "whiteDwarf") {
    k *= PLANETARY_NEBULA_DUST * NEBULA_PER_LEVEL ** meta.shop.nebula;
    if (meta.discovered.N) k *= NITROGEN_DUST_BONUS;
  }
  return k;
}

/** 今崩壊したら得られる星屑 */
export function dustPreview(meta: Meta, star: Star): Record<DustId, number> {
  const k = dustMultiplier(meta, star);
  return Object.fromEntries(
    DUST_IDS.map((id) => [id, Math.floor(star.mass[id] ** DUST_EXPONENT * k)])
  ) as Record<DustId, number>;
}
