import { MASS_NUMBER, REFERENCE_MASS, TEMPERATURE_CURVE } from "./balance";
import { ELEMENT_IDS, type Star } from "./types";

/** 水素以外の元素を質量数 / 4 で重みづけした「灰の重さ」。25 M☉ の星に換算する */
export function coreWeight(star: Star): number {
  let weight = 0;
  for (const id of ELEMENT_IDS) {
    if (id === "H") continue;
    weight += (star.mass[id] * MASS_NUMBER[id]) / 4;
  }
  return (weight * REFERENCE_MASS) / star.initialMass;
}

const lerpLog = (
  a: { weight: number; temperature: number },
  b: { weight: number; temperature: number },
  weight: number
) => {
  const f = (weight - a.weight) / (b.weight - a.weight);
  return Math.exp(
    Math.log(a.temperature) + f * (Math.log(b.temperature) - Math.log(a.temperature))
  );
};

export function temperatureFromWeight(weight: number): number {
  for (let i = 1; i < TEMPERATURE_CURVE.length; i++) {
    const a = TEMPERATURE_CURVE[i - 1]!;
    const b = TEMPERATURE_CURVE[i]!;
    if (weight <= b.weight) return lerpLog(a, b, weight);
  }
  const last = TEMPERATURE_CURVE.at(-1)!;
  const prev = TEMPERATURE_CURVE.at(-2)!;
  return lerpLog(prev, last, weight);
}
