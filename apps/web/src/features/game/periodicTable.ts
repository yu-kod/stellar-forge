// prettier-ignore
const SYMBOLS = [
  "H", "He",
  "Li", "Be", "B", "C", "N", "O", "F", "Ne",
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe",
  "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi",
];

export type PeriodicCell = { number: number; symbol: string; row: number; column: number };

/** 周期表のマス目の位置。ランタノイド（57〜71）は7行目に下ろす */
function position(z: number): { row: number; column: number } {
  if (z === 1) return { row: 1, column: 1 };
  if (z === 2) return { row: 1, column: 18 };
  if (z <= 18) {
    const row = z <= 10 ? 2 : 3;
    const i = z - (row === 2 ? 3 : 11);
    return { row, column: i < 2 ? i + 1 : i + 11 };
  }
  if (z <= 54) {
    const row = z <= 36 ? 4 : 5;
    return { row, column: z - (row === 4 ? 18 : 36) };
  }
  if (z <= 56) return { row: 6, column: z - 54 };
  if (z <= 71) return { row: 7, column: z - 54 };
  return { row: 6, column: z - 68 };
}

export const PERIODIC_TABLE: readonly PeriodicCell[] = SYMBOLS.map((symbol, i) => ({
  number: i + 1,
  symbol,
  ...position(i + 1),
}));
