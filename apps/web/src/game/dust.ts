import {
  BOOM_PER_LEVEL,
  CARBON_STAR_DUST,
  CARBON_STAR_LIMIT,
  DUST_EXPONENT,
  FIZZLE_DUST_FACTOR,
  NEBULA_PER_LEVEL,
  NITROGEN_DUST_BONUS,
  OXYGEN_DUST_BONUS,
  PLANETARY_NEBULA_DUST,
  RECYCLE_PER_LEVEL,
} from "./balance";
import { lightDustMultiplier } from "./light";
import { sDustMultiplier } from "./sprocess";
import { DUST_IDS, type DustId, type Meta, type Star } from "./types";

/** 外層に残っている重元素（炭素〜硫黄）の合計 [M☉] */
export function ejectedMetals(star: Star): number {
  return DUST_IDS.reduce((sum, id) => sum + star.mass[id], 0);
}

function dustMultiplier(meta: Meta, star: Star): number {
  let k =
    BOOM_PER_LEVEL ** meta.shop.boom *
    (1 + RECYCLE_PER_LEVEL * meta.shop.recycle) *
    sDustMultiplier(meta) *
    lightDustMultiplier(meta);
  if (meta.discovered.O) k *= OXYGEN_DUST_BONUS;
  if (star.end === "fizzle") k *= FIZZLE_DUST_FACTOR;
  if (star.end === "whiteDwarf") {
    k *= PLANETARY_NEBULA_DUST * (1 + NEBULA_PER_LEVEL * meta.shop.nebula);
    if (meta.discovered.N) k *= NITROGEN_DUST_BONUS;
  }
  return k;
}

/** 今崩壊したら得られる星屑 */
export function dustPreview(meta: Meta, star: Star): Record<DustId, number> {
  const k = dustMultiplier(meta, star);
  // 炭素星が白色矮星になると、外層に汲み上げた炭素を多く放つ
  const carbonStar =
    star.end === "whiteDwarf" && star.initialMass < CARBON_STAR_LIMIT ? CARBON_STAR_DUST : 1;
  return Object.fromEntries(
    DUST_IDS.map((id) => [
      id,
      Math.floor(star.mass[id] ** DUST_EXPONENT * k * (id === "C" ? carbonStar : 1)),
    ])
  ) as Record<DustId, number>;
}
