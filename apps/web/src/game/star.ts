import {
  BASE_MASS,
  BIRTH_TEMPERATURE,
  CARBON_PER_CNO_LEVEL,
  MASS_FROM_SILICON,
  LAYER2_AFTER,
  MASS_PER_SHOP_LEVEL,
  PRE_MAIN_SEQUENCE_TEMPERATURE,
  REFERENCE_MASS,
} from "./balance";
import { createSProcess } from "./sprocess";
import { ELEMENT_IDS, type Composition, type GameState, type Meta, type Star } from "./types";

export const emptyComposition = (): Composition =>
  Object.fromEntries(ELEMENT_IDS.map((id) => [id, 0])) as Composition;

/** 生める星の質量の上限 [M☉] */
export function maxMass(meta: Meta): number {
  return (
    BASE_MASS + MASS_PER_SHOP_LEVEL * meta.shop.mass + (meta.discovered.Si ? MASS_FROM_SILICON : 0)
  );
}

/** 次に生む星の質量。第2層の解放後は選んだ質量（上限まで） */
function birthMass(meta: Meta): number {
  const max = maxMass(meta);
  if (meta.supernovae < LAYER2_AFTER || meta.nextMass === null) return max;
  return Math.min(max, meta.nextMass);
}

export function createMeta(): Meta {
  return {
    dust: { C: 0, N: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 0 },
    supernovae: 0,
    neutronStars: 0,
    whiteDwarfs: 0,
    nextMass: null,
    discovered: {},
    shop: {
      mass: 0,
      cno: 0,
      yield: 0,
      xs: 0,
      boom: 0,
      accel: 0,
      auto: 0,
      pre: 0,
      recycle: 0,
      nebula: 0,
      pulse: 0,
      cluster: 0,
    },
    autoOn: { H: true, He: true, C: true, Ne: true, O: true, Si: false },
    target: "Si",
    autoRebirth: true,
    log: [],
    cluster: [],
    sProcess: createSProcess(),
  };
}

export function createStar(meta: Meta): Star {
  const initialMass = birthMass(meta);
  const mass = emptyComposition();
  mass.C = CARBON_PER_CNO_LEVEL * meta.shop.cno * Math.min(1, initialMass / REFERENCE_MASS);
  mass.H = initialMass - mass.C;
  return {
    generation: meta.supernovae + meta.whiteDwarfs + 1,
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
