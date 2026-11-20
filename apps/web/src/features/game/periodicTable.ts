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

// prettier-ignore
const NAMES = [
  "水素", "ヘリウム",
  "リチウム", "ベリリウム", "ホウ素", "炭素", "窒素", "酸素", "フッ素", "ネオン",
  "ナトリウム", "マグネシウム", "アルミニウム", "ケイ素", "リン", "硫黄", "塩素", "アルゴン",
  "カリウム", "カルシウム", "スカンジウム", "チタン", "バナジウム", "クロム", "マンガン", "鉄", "コバルト",
  "ニッケル", "銅", "亜鉛", "ガリウム", "ゲルマニウム", "ヒ素", "セレン", "臭素", "クリプトン",
  "ルビジウム", "ストロンチウム", "イットリウム", "ジルコニウム", "ニオブ", "モリブデン", "テクネチウム",
  "ルテニウム", "ロジウム", "パラジウム", "銀", "カドミウム", "インジウム", "スズ", "アンチモン", "テルル",
  "ヨウ素", "キセノン",
  "セシウム", "バリウム", "ランタン", "セリウム", "プラセオジム", "ネオジム", "プロメチウム", "サマリウム",
  "ユウロピウム", "ガドリニウム", "テルビウム", "ジスプロシウム", "ホルミウム", "エルビウム", "ツリウム",
  "イッテルビウム", "ルテチウム", "ハフニウム", "タンタル", "タングステン", "レニウム", "オスミウム",
  "イリジウム", "白金", "金", "水銀", "タリウム", "鉛", "ビスマス",
];

export type PeriodicCell = {
  number: number;
  symbol: string;
  name: string;
  row: number;
  column: number;
};

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
  name: NAMES[i]!,
  ...position(i + 1),
}));

/** 原子番号から周期表のマス */
export function elementOf(z: number): PeriodicCell {
  return PERIODIC_TABLE[z - 1]!;
}
