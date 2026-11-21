import { describe, expect, it } from "vitest";
import { lowMassKind, lowMassNote } from "./lowMass";

describe("軽い星（8 M☉ 未満）の種類と倍率の説明", () => {
  it("4 M☉ 未満は炭素星、4〜8 M☉ は窒素を多く作る星、8 M☉ からは超新星（なし）", () => {
    expect(lowMassKind(3)).toBe("炭素星");
    expect(lowMassKind(3.99)).toBe("炭素星");
    expect(lowMassKind(4)).toBe("窒素の多い星");
    expect(lowMassKind(7)).toBe("窒素の多い星");
    expect(lowMassKind(8)).toBeNull();
  });

  it("炭素星は炭素の星屑 ×2・窒素が少ない。第3層からは s過程の中性子 ×3 も書く", () => {
    expect(lowMassNote(3, false)).toBe(
      "炭素星：白色矮星になると炭素の星屑 ×2。窒素はあまり作らない（燃えた水素の 3%）"
    );
    expect(lowMassNote(3, true)).toBe(
      "炭素星：白色矮星になると炭素の星屑 ×2。窒素はあまり作らない（燃えた水素の 3%）。s過程の中性子 ×3（¹³C ポケット）"
    );
  });

  it("4〜8 M☉ は外層の底で水素が燃え、窒素を多く作る", () => {
    expect(lowMassNote(7, true)).toBe(
      "外層の底で水素が燃え（高温底部燃焼）、窒素を多く作る（燃えた水素の 25%）。s過程の中性子は ×1"
    );
    expect(lowMassNote(7, false)).toBe(
      "外層の底で水素が燃え（高温底部燃焼）、窒素を多く作る（燃えた水素の 25%）"
    );
    expect(lowMassNote(8, true)).toBeNull();
  });
});
