import { describe, expect, it } from "vitest";
import { OBSERVE_RATE, observe, rGoal, rThreshold, rWeight } from "./merger";
import { R_PATH_START } from "./rprocess";
import { createGame } from "./star";
import type { GameState } from "./types";

function layer4(ejecta: number): GameState {
  const game = createGame();
  game.meta.rProcess = { ...game.meta.rProcess, unlocked: true, ejecta };
  game.meta.rProcess.pool[2] = 4;
  return game;
}

describe("追観測：放出物を強化に使わず、いま作りたい元素の発見に回す", () => {
  it("放出物をすべて使い、いま作りたい元素に 放出物 × 倍率 × 重み を足す", () => {
    const game = layer4(0.1);
    const z = rGoal(game.meta);
    const { state, events } = observe(game);
    expect(state.meta.rProcess.ejecta).toBe(0);
    expect(state.meta.rProcess.amounts[z - R_PATH_START]).toBeCloseTo(
      0.1 * OBSERVE_RATE * rWeight(z)
    );
    expect(events).toEqual([]);
  });

  it("発見の量に届けば、その場で見つける", () => {
    const game = layer4(1);
    const z = rGoal(game.meta);
    game.meta.rProcess.amounts[z - R_PATH_START] = rThreshold(z) - 0.01;
    const { state, events } = observe(game);
    expect(state.meta.rProcess.discovered).toContain(z);
    expect(events).toEqual([{ type: "rDiscover", z }]);
  });

  it("第4層の前・放出物がないときは何もしない", () => {
    const none = layer4(0);
    expect(observe(none).state).toBe(none);
    const before = layer4(5);
    before.meta.rProcess.unlocked = false;
    expect(observe(before).state).toBe(before);
  });
});
