import { describe, expect, it } from "vitest";
import { S_WIND_RATE } from "./balance";
import { advanceAll } from "./cluster";
import { blowWinds, createSProcess, heavyValue, S_PATH_END, S_PATH_START } from "./sprocess";
import { createGame } from "./star";

const index = (z: number) => z - S_PATH_START;

describe("s過程の原子核は恒星風で星の外へ出て、重元素の星屑になる", () => {
  it("毎秒一定の割合で道の上の原子核が減る", () => {
    const sp = createSProcess();
    sp.amounts[index(26)] = 10;
    const next = blowWinds(sp, 10);
    expect(next.amounts[index(26)]).toBeCloseTo(10 * Math.exp(-S_WIND_RATE * 10), 10);
  });

  it("重い原子核ほど価値が高い（鉄 1、ビスマス 2）", () => {
    expect(heavyValue(S_PATH_START)).toBe(1);
    expect(heavyValue(S_PATH_END)).toBe(2);
  });

  it("出ていった量 × 価値 を重元素の星屑として受け取る", () => {
    const sp = createSProcess();
    sp.amounts[index(26)] = 4;
    sp.amounts[index(83)] = 2;
    const next = blowWinds(sp, 5);
    const out = 1 - Math.exp(-S_WIND_RATE * 5);
    expect(next.heavy / (out * (4 * 1 + 2 * 2))).toBeCloseTo(1, 10);
  });

  it("時間を分けて進めても、まとめて進めても同じ", () => {
    const sp = createSProcess();
    sp.amounts[index(40)] = 3;
    const once = blowWinds(sp, 2);
    const twice = blowWinds(blowWinds(sp, 1), 1);
    expect(twice.amounts[index(40)]! / once.amounts[index(40)]!).toBeCloseTo(1, 10);
    expect(twice.heavy / once.heavy).toBeCloseTo(1, 10);
  });

  it("第3層の解放後、毎回の更新で吹く。解放前は吹かない", () => {
    const game = createGame();
    game.meta.sProcess.amounts[index(26)] = 1;
    expect(advanceAll(game, 1).state.meta.sProcess.amounts[index(26)]).toBe(1);
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true };
    const after = advanceAll(game, 1).state.meta.sProcess;
    expect(after.amounts[index(26)]).toBeLessThan(1);
    expect(after.heavy).toBeGreaterThan(0);
  });

  it("出ていった分は、Ia型超新星の自動化が白色矮星で補う", () => {
    const game = createGame();
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, seedTarget: 3 };
    game.meta.sProcess.amounts[index(26)] = 3;
    game.meta.whiteDwarfs = 10;
    const after = advanceAll(game, 30).state.meta;
    expect(after.whiteDwarfs).toBeLessThan(10);
    expect(after.sProcess.amounts.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(3);
  });
});
