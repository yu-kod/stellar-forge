import { beforeAll, describe, expect, it } from "vitest";
import { playIdle } from "@/test-utils/simulate";
import { createGame } from "./star";

const MINUTE = 60;

/** 2周目は、前の周で作った元素が星間物質に残り、星屑を持って始まる（1周目のなぞり直しにしない） */
describe("2周目の序盤", () => {
  let first: number;
  let second: number;
  beforeAll(() => {
    const layer3 = (completions: number) =>
      playIdle(120 * MINUTE, {
        start: createGame("milkyWay", completions),
        keepCluster: true,
        stopAt: "layer3",
      }).marks.layer3!;
    first = layer3(0);
    second = layer3(1);
  }, 900_000);

  it("同じ銀河でも、第1・2層（第3層の解放まで）が5分以上短い", () => {
    expect(first - second).toBeGreaterThanOrEqual(5 * MINUTE);
  });
});
