import { describe, expect, it } from "vitest";
import {
  MERGER_SECONDS,
  OBSERVE_RATE,
  advanceBinaries,
  formBinary,
  observe,
  predictMerger,
  rGoal,
  rThreshold,
  rWeight,
  setObserving,
} from "./merger";
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
    const game = layer4(0.05);
    const z = rGoal(game.meta);
    const { state, events } = observe(game);
    expect(state.meta.rProcess.ejecta).toBe(0);
    expect(state.meta.rProcess.amounts[z - R_PATH_START]).toBeCloseTo(
      0.05 * OBSERVE_RATE * rWeight(z)
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

  it("使い道を追観測にすると、貯めた分をすぐ回し、以後は合体のたびに放出物を発見に回す（貯めない）", () => {
    const game = layer4(0.05);
    const z = rGoal(game.meta);
    const on = setObserving(game, true).state;
    expect(on.meta.rProcess.observing).toBe(true);
    expect(on.meta.rProcess.ejecta).toBe(0);
    const formed = formBinary(on, 2, 2);
    const { meta } = advanceBinaries(formed.meta, MERGER_SECONDS);
    const e = predictMerger(formed.meta, 2, 2).ejecta;
    expect(meta.rProcess.ejecta).toBe(0);
    expect(meta.rProcess.amounts[z - R_PATH_START]).toBeGreaterThan(
      0.05 * OBSERVE_RATE * rWeight(z) + e * rWeight(z)
    );
    // 強化に戻すと、また貯まる
    const off = setObserving({ ...formed, meta }, false).state;
    expect(off.meta.rProcess.observing).toBe(false);
    const again = advanceBinaries(formBinary(off, 2, 2).meta, MERGER_SECONDS).meta;
    expect(again.rProcess.ejecta).toBeCloseTo(predictMerger(off.meta, 2, 2).ejecta);
  });

  it("はじめは強化に使う。第4層の前は切り替えられない", () => {
    expect(createGame().meta.rProcess.observing).toBe(false);
    const before = createGame();
    expect(setObserving(before, true).state).toBe(before);
  });
});
