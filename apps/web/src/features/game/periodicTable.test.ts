import { describe, expect, it } from "vitest";
import { PERIODIC_TABLE } from "./periodicTable";

function cell(symbol: string) {
  return PERIODIC_TABLE.find((c) => c.symbol === symbol);
}

describe("PERIODIC_TABLE：水素からビスマスまでの83マス", () => {
  it("原子番号の順に83マスある", () => {
    expect(PERIODIC_TABLE).toHaveLength(83);
    expect(PERIODIC_TABLE.map((c) => c.number)).toEqual(
      Array.from({ length: 83 }, (_, i) => i + 1)
    );
  });

  it.each([
    ["H", 1, 1],
    ["He", 1, 18],
    ["Li", 2, 1],
    ["B", 2, 13],
    ["Na", 3, 1],
    ["Al", 3, 13],
    ["Ar", 3, 18],
    ["Fe", 4, 8],
    ["Kr", 4, 18],
    ["Xe", 5, 18],
    ["Ba", 6, 2],
    ["Hf", 6, 4],
    ["Au", 6, 11],
    ["Bi", 6, 15],
  ])("%s は %i 行 %i 列", (symbol, row, column) => {
    expect(cell(symbol)).toMatchObject({ row, column });
  });

  it("ランタノイドは下の段に並べる", () => {
    expect(cell("La")).toMatchObject({ row: 7, column: 3 });
    expect(cell("Lu")).toMatchObject({ row: 7, column: 17 });
  });

  it.each([
    ["H", "水素"],
    ["Fe", "鉄"],
    ["Sr", "ストロンチウム"],
    ["Ba", "バリウム"],
    ["Au", "金"],
    ["Pb", "鉛"],
    ["Bi", "ビスマス"],
  ])("%s の名前は %s", (symbol, name) => {
    expect(cell(symbol)?.name).toBe(name);
  });

  it("同じマスに2つの元素は置かない", () => {
    const keys = PERIODIC_TABLE.map((c) => `${c.row}-${c.column}`);
    expect(new Set(keys).size).toBe(83);
  });
});
