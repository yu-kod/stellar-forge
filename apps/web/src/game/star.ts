import {
  BASE_MASS,
  BIRTH_TEMPERATURE,
  CARBON_PER_CNO_LEVEL,
  MASS_FROM_SILICON,
  MASS_PER_SHOP_LEVEL,
  PRE_MAIN_SEQUENCE_TEMPERATURE,
} from "./balance";
import type { Composition, GameState, Meta, Star } from "./types";

const emptyComposition = (): Composition => ({
  H: 0,
  He: 0,
  C: 0,
  O: 0,
  Ne: 0,
  Mg: 0,
  Si: 0,
  S: 0,
  Fe: 0,
});

export function createMeta(): Meta {
  return {
    dust: { C: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 0 },
    supernovae: 0,
    neutronStars: 0,
    discovered: {},
    shop: { mass: 0, cno: 0, yield: 0, xs: 0, boom: 0, auto: 0, pre: 0 },
    autoOn: { H: true, He: true, C: true, Ne: true, O: true, Si: false },
    target: "Si",
    log: [],
  };
}

export function createStar(meta: Meta): Star {
  const initialMass =
    BASE_MASS + MASS_PER_SHOP_LEVEL * meta.shop.mass + (meta.discovered.Si ? MASS_FROM_SILICON : 0);
  const mass = emptyComposition();
  mass.C = CARBON_PER_CNO_LEVEL * meta.shop.cno;
  mass.H = initialMass - mass.C;
  return {
    generation: meta.supernovae + 1,
    initialMass,
    mass,
    energy: 0,
    time: 0,
    temperature: meta.shop.pre ? PRE_MAIN_SEQUENCE_TEMPERATURE : BIRTH_TEMPERATURE,
    levels: { H: 1, He: 0, C: 0, Ne: 0, O: 0, Si: 0 },
    ignitedAt: { H: 0 },
    end: null,
  };
}

export function createGame(): GameState {
  const meta = createMeta();
  return { meta, star: createStar(meta) };
}
