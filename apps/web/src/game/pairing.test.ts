import { beforeAll, describe, expect, it } from "vitest";
import { playIdle } from "@/test-utils/simulate";
import { setSlotMass } from "./cluster";
import { R_ELEMENTS, bestPair, rGoal } from "./merger";
import type { GameState } from "./types";

const MINUTE = 60;

const allFound = (s: GameState) => R_ELEMENTS.every((z) => s.meta.rProcess.discovered.includes(z));

/** 第4層の解放の時点から、星団の星の質量（作る中性子星）と組み方を変えて、r過程の元素がそろうまでの時間を測る */
function minutesToAll(
  start: GameState,
  masses: readonly number[],
  how: "auto" | "stubborn" | [number, number] = "auto"
) {
  let state = start;
  masses.forEach((mass, i) => {
    state = setSlotMass(state, i, mass);
  });
  // auto：自動化と目標の案内に従う。stubborn：案内に従わず、質量はそのまま、在庫で一番よい組を組む
  const pairing =
    how === "auto"
      ? undefined
      : how === "stubborn"
        ? (s: GameState) => bestPair(s.meta, rGoal(s.meta))
        : (s: GameState) => {
            const [a, b] = how;
            const { pool } = s.meta.rProcess;
            return pool[a]! >= 1 && pool[b]! >= 1 ? how : null;
          };
  const report = playIdle(150 * MINUTE, {
    start: state,
    pairing,
    stopWhen: allFound,
  });
  return allFound(report.state)
    ? (report.state.meta.elapsed - start.meta.elapsed) / MINUTE
    : Infinity;
}

describe("第4層の組み合わせは判断になる（作戦で r過程の元素がそろうまでの時間が変わる）", () => {
  const minutes: Record<string, number> = {};
  beforeAll(() => {
    const start = playIdle(300 * MINUTE, { stopAt: "layer4" }).state;
    minutes.default = minutesToAll(start, [18, 40]); // 解放のときの質量（1.4 と 2.0）のまま、自動化に任せる
    minutes.light = minutesToAll(start, [10, 28]); // 1.2 と 1.7：軽い組は重力波で合体が遅い
    minutes.symmetric = minutesToAll(start, [14, 28]); // 1.3 と 1.7：第3ピークに届かず、目標の案内で質量を変える
    minutes.stubbornLight = minutesToAll(start, [10, 28], "stubborn"); // 1.2 と 1.7 のまま案内に従わない
    minutes.stubbornSymmetric = minutesToAll(start, [14, 28], "stubborn"); // 1.3 と 1.7 のまま：第3ピークで詰まる
    minutes.fixed = minutesToAll(start, [10, 32], [0, 6]); // 1.2 + 1.8 だけ：ランタノイドを作らない
  }, 900_000);

  it("3通り以上の作戦で元素がそろい、最善と最悪の差は最善の25%以上", () => {
    const reached = Object.values(minutes).filter(Number.isFinite);
    expect(reached.length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...reached) - Math.min(...reached)).toBeGreaterThanOrEqual(
      0.25 * Math.min(...reached)
    );
  });

  it("案内に従わず質量を変えないと、詰まることがある（1.3 と 1.7 は第3ピークに届かない）", () => {
    expect(minutes.stubbornSymmetric).toBe(Infinity);
    expect(minutes.symmetric).toBeLessThan(Infinity);
  });

  it("1.2 + 1.8 M☉ 固定は最善にならない（ランタノイドがそろわない）", () => {
    expect(minutes.fixed).toBe(Infinity);
  });

  it("軽い中性子星（1.2 M☉）の組は、重い組より10分以上遅い（重力波で近づくのが遅い）", () => {
    expect(minutes.light).toBeGreaterThan(minutes.default! + 10);
  });
});
