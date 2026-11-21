import {
  CARBON_STAR_CNO_NITROGEN_PER_HYDROGEN,
  CARBON_STAR_DUST,
  CARBON_STAR_LIMIT,
  CARBON_STAR_NEUTRONS,
  LOW_MASS_CNO_NITROGEN_PER_HYDROGEN,
  LOW_MASS_LIMIT,
} from "@/game/balance";

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** 軽い星（8 M☉ 未満）の種類。超新星になる星は null */
export function lowMassKind(mass: number): "炭素星" | "窒素の多い星" | null {
  if (mass >= LOW_MASS_LIMIT) return null;
  return mass < CARBON_STAR_LIMIT ? "炭素星" : "窒素の多い星";
}

/** 軽い星の倍率の説明。第3層（s過程）を解放していれば中性子の倍率も書く */
export function lowMassNote(mass: number, sProcess: boolean): string | null {
  const kind = lowMassKind(mass);
  if (kind === null) return null;
  if (kind === "炭素星") {
    const base = `炭素星：白色矮星になると炭素の星屑 ×${CARBON_STAR_DUST}。窒素はあまり作らない（燃えた水素の ${percent(CARBON_STAR_CNO_NITROGEN_PER_HYDROGEN)}）`;
    return sProcess ? `${base}。s過程の中性子 ×${CARBON_STAR_NEUTRONS}（¹³C ポケット）` : base;
  }
  const base = `外層の底で水素が燃え（高温底部燃焼）、窒素を多く作る（燃えた水素の ${percent(LOW_MASS_CNO_NITROGEN_PER_HYDROGEN)}）`;
  return sProcess ? `${base}。s過程の中性子は ×1` : base;
}
