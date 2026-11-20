const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function superscript(n: number): string {
  return [...String(n)].map((c) => SUPERSCRIPT[c]).join("");
}

function withUnit(text: string, unit?: string): string {
  return unit ? `${text} ${unit}` : text;
}

/** 1.23×10⁴⁵ J のように書く。1万未満・0.01以上は小数2桁までそのまま */
export function formatNumber(value: number, unit?: string): string {
  if (!Number.isFinite(value)) return "∞";
  const abs = Math.abs(value);
  if (abs === 0 || (abs >= 0.01 && abs < 10000)) {
    return withUnit((Math.round(value * 100) / 100).toLocaleString("ja-JP"), unit);
  }
  const [mantissa, exponent] = value.toExponential(2).split("e");
  return withUnit(`${mantissa}×10${superscript(Number(exponent))}`, unit);
}

/** 質量。10 M☉ 未満は小数2桁、それ以上は1桁 */
export function formatMass(value: number): string {
  return `${value.toFixed(value < 10 ? 2 : 1)} M☉`;
}
