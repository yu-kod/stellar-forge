import { describe, expect, it } from "vitest";
import { foundElements } from "@/game/progress";
import { createGame } from "@/game/star";
import type { GameState } from "@/game/types";
import { createModel, gameReducer } from "./model";

/** 金だけが残っている状態（金は合体の直前） */
function almostComplete(): GameState {
  const game = createGame();
  game.meta.discovered = {
    He: true,
    C: true,
    N: true,
    O: true,
    Ne: true,
    Mg: true,
    Si: true,
    S: true,
    Fe: true,
  };
  game.meta.lightFound = [3, 4, 5, 9, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25];
  game.meta.sProcess = {
    ...game.meta.sProcess,
    unlocked: true,
    looped: true,
    discovered: Array.from({ length: 57 }, (_, i) => 27 + i).filter(
      (z) => ![63, 76, 77, 78, 79].includes(z)
    ),
  };
  game.meta.rProcess = { ...game.meta.rProcess, unlocked: true, discovered: [63, 76, 77, 78] };
  game.meta.rProcess.amounts[79 - 31] = 199;
  game.meta.rProcess.binaries = [{ a: 0, b: 8, remaining: 1 }];
  game.meta.elapsed = 4 * 3600;
  return game;
}

describe("gameReducer：層の解放の時刻", () => {
  it("第2〜4層が解放された時刻を、初めてのときに残す", () => {
    const game = createGame();
    game.meta.elapsed = 1500;
    game.meta.supernovae = 25;
    let model = gameReducer(createModel(game), { type: "tick", seconds: 0.1 });
    expect(model.game.meta.milestones.layer2).toBeCloseTo(1500.1);
    expect(model.game.meta.milestones.layer3).toBeNull();
    model = gameReducer(model, { type: "tick", seconds: 0.1 });
    expect(model.game.meta.milestones.layer2).toBeCloseTo(1500.1);
  });

  it("見つけた元素の数が増えた時刻を残す（最速の周と元素ごとに比べる）", () => {
    const game = createGame();
    expect(game.meta.foundTimes).toEqual([0]);
    game.meta.elapsed = 100;
    game.meta.lightFound = [3];
    const model = gameReducer(createModel(game), { type: "tick", seconds: 0.1 });
    expect(foundElements(model.game.meta)).toHaveLength(2);
    expect(model.game.meta.foundTimes).toEqual([0, model.game.meta.elapsed]);
    expect(gameReducer(model, { type: "tick", seconds: 0.1 }).game.meta.foundTimes).toHaveLength(2);
  });
});

describe("gameReducer：エンディング", () => {
  it("83マスが埋まったら、その時の遊んだ時間を残してエンディングを開く", () => {
    const model = gameReducer(createModel(almostComplete()), { type: "tick", seconds: 1 });
    expect(model.game.meta.completedAt).toBeCloseTo(4 * 3600 + 1);
    expect(model.ending).toBe(true);
  });

  it("完結したら、やり直しても残る記録（回数と最速）に足す。やり直しても記録は残る", () => {
    const model = gameReducer(createModel(almostComplete()), { type: "tick", seconds: 1 });
    expect(model.hall.completions).toBe(1);
    expect(model.hall.bests.milkyWay).toMatchObject({ complete: 4 * 3600 + 1, galaxy: "milkyWay" });
    expect(model.hall.last?.complete).toBe(4 * 3600 + 1);
    expect(gameReducer(model, { type: "reset" }).hall).toEqual(model.hall);
  });

  it("前の周の星屑を持って始めた周かを記録に残す（メダルの基準が変わる）", () => {
    const first = gameReducer(createModel(almostComplete()), { type: "tick", seconds: 1 });
    expect(first.hall.last?.heritage).toBe(false);
    const game = almostComplete();
    game.meta.heritage = true;
    const later = gameReducer(createModel(game), { type: "tick", seconds: 1 });
    expect(later.hall.last?.heritage).toBe(true);
  });

  it("閉じたら遊び続けられ、もう自分では開かない。記録からは開ける", () => {
    let model = gameReducer(createModel(almostComplete()), { type: "tick", seconds: 1 });
    model = gameReducer(model, { type: "closeEnding" });
    expect(model.ending).toBe(false);
    model = gameReducer(model, { type: "tick", seconds: 1 });
    expect(model.ending).toBe(false);
    expect(gameReducer(model, { type: "openEnding" }).ending).toBe(true);
  });

  it("まだ埋まっていなければ開かない", () => {
    const game = almostComplete();
    game.meta.rProcess.binaries = [];
    const model = gameReducer(createModel(game), { type: "tick", seconds: 1 });
    expect(model.game.meta.completedAt).toBeNull();
    expect(model.ending).toBe(false);
  });
});
