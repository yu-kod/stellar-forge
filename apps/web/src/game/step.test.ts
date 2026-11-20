import { describe, expect, it } from "vitest";
import { createGame } from "./star";
import { step } from "./step";

describe("step：燃焼", () => {
  it("燃焼量 = k × 燃料 × dt だけ燃料が生成物に変わり、エネルギーが入る", () => {
    const game = createGame();
    const burned = 0.4 * 0.004 * 25 * 0.5;

    const { state } = step(game, 0.5);

    expect(state.star.mass.H).toBeCloseTo(25 - burned);
    expect(state.star.mass.He).toBeCloseTo(burned);
    expect(state.star.energy / (burned * 1.27e45)).toBeCloseTo(1);
    expect(state.star.time).toBeCloseTo(0.5);
  });

  it("渡した状態は書き換えない", () => {
    const game = createGame();
    const before = structuredClone(game);
    step(game, 1);
    expect(game).toEqual(before);
  });

  it("全段階の燃焼量を更新前の状態から計算してからまとめて反映する", () => {
    const game = createGame();
    game.star.temperature = 2e8;
    game.star.levels.He = 1;
    game.star.mass.H = 0;
    game.star.mass.He = 10;
    // ヘリウムの燃焼量は更新前の He から決まり、同じ更新で生まれた He は燃えない
    const burned = 0.4 * 0.004 * 10 * 1;

    const { state } = step(game, 1);

    expect(state.star.mass.C).toBeCloseTo(burned * 0.6);
    expect(state.star.mass.O).toBeCloseTo(burned * 0.4);
  });

  it("燃料が2種類ある段階は、残量の比で按分して減らす", () => {
    const game = createGame();
    game.star.temperature = 1.5e9;
    game.star.mass.H = 0;
    game.star.levels.O = 1;
    game.star.mass.O = 4;
    game.star.mass.Si = 3;
    game.star.mass.S = 1;
    game.star.temperature = 2.7e9; // ケイ素燃焼も点火済み
    const { state } = step(game, 0.1);
    // ケイ素燃焼は 1.4/30 M☉/s で Si と S を 3:1 で減らす（O 燃焼の生成分は更新後に加わる）
    const fe = (1.4 / 30) * 0.1;
    expect(state.star.mass.Fe).toBeCloseTo(fe);
    const oBurned = 0.4 * 0.004 * 4 * 0.1;
    expect(state.star.mass.Si).toBeCloseTo(3 - fe * 0.75 + oBurned * 0.8);
    expect(state.star.mass.S).toBeCloseTo(1 - fe * 0.25 + oBurned * 0.2);
  });

  it("エネルギーにはエネルギー倍率が掛かる", () => {
    const game = createGame();
    game.meta.shop.yield = 1;
    const { state } = step(game, 1);
    expect(state.star.energy / (0.4 * 0.004 * 25 * 1.27e45 * 2)).toBeCloseTo(1);
  });
});

describe("step：コア温度と点火", () => {
  it("灰がたまるとコア温度が上がり、点火温度に届いた段階が点火して Lv1 になる", () => {
    const game = createGame();
    game.star.mass.H = 22;
    game.star.mass.He = 3.2; // 灰の重さ 3.2 > 3（ヘリウム燃焼の点火）

    const { state, events } = step(game, 0.1);

    expect(state.star.temperature).toBeGreaterThanOrEqual(2e8);
    expect(state.star.levels.He).toBe(1);
    expect(state.star.ignitedAt.He).toBeCloseTo(0.1);
    expect(events).toContainEqual({ type: "ignite", stage: "He" });
  });

  it("温度は下がらない", () => {
    const game = createGame();
    game.star.temperature = 6e8;
    const { state } = step(game, 0.1);
    expect(state.star.temperature).toBe(6e8);
  });

  it("前主系列の収縮で生まれた星は、最初の更新でヘリウム燃焼が点火する", () => {
    const game = createGame();
    game.star.temperature = 2e8;
    const { events } = step(game, 0.1);
    expect(events).toContainEqual({ type: "ignite", stage: "He" });
  });

  it("ケイ素燃焼は点火しても Lv0 のまま（強化できない）", () => {
    const game = createGame();
    game.star.temperature = 2.7e9;
    game.star.mass.Si = 1;
    const { state, events } = step(game, 0.1);
    expect(events).toContainEqual({ type: "ignite", stage: "Si" });
    expect(state.star.levels.Si).toBe(0);
  });

  it("一度点火した段階は二度と点火イベントを出さない", () => {
    const game = createGame();
    game.star.temperature = 2e8;
    const first = step(game, 0.1);
    const second = step(first.state, 0.1);
    expect(second.events.filter((e) => e.type === "ignite")).toEqual([]);
  });
});

describe("step：元素の発見", () => {
  it("元素が初めて 0.05 M☉ 以上になったら発見し、恒久の記録に残す", () => {
    const game = createGame();
    game.star.mass.He = 0.0499;
    const { state, events } = step(game, 0.1);
    expect(state.meta.discovered.He).toBe(true);
    expect(events).toContainEqual({ type: "discover", element: "He" });
  });

  it("0.05 M☉ に届かなければ発見しない。発見済みなら二度と出さない", () => {
    const game = createGame();
    game.star.mass.H = 0;
    game.star.mass.C = 0.04;
    expect(step(game, 0.1).events).toEqual([]);

    game.meta.discovered.C = true;
    game.star.mass.C = 0.5;
    expect(step(game, 0.1).events).toEqual([]);
  });
});

describe("step：ケイ素燃焼と崩壊", () => {
  const finalStage = () => {
    const game = createGame();
    game.star.mass.H = 0;
    game.star.temperature = 2.7e9;
    game.star.ignitedAt = { H: 0, He: 0, C: 0, Ne: 0, O: 0, Si: 0 };
    game.meta.discovered = {
      He: true,
      C: true,
      O: true,
      Ne: true,
      Mg: true,
      Si: true,
      S: true,
      Fe: true,
    };
    return game;
  };

  it("鉄のコアが 1.4 M☉ に達したら崩壊する", () => {
    const game = finalStage();
    game.star.mass.Si = 5;
    game.star.mass.Fe = 1.4 - 0.01;
    const { state, events } = step(game, 1);
    expect(state.star.end).toBe("collapse");
    expect(events).toContainEqual({ type: "collapse" });
  });

  it("1.4 M☉ の手前では崩壊しない", () => {
    const game = finalStage();
    game.star.mass.Si = 5;
    game.star.mass.Fe = 1;
    expect(step(game, 0.1).state.star.end).toBeNull();
  });

  it("ケイ素と硫黄が足りなければ、酸素から順に他の元素を按分して鉄にする", () => {
    const game = finalStage();
    game.star.mass.O = 3;
    game.star.mass.He = 1;
    const fe = (1.4 / 30) * 1;
    const { state } = step(game, 1);
    expect(state.star.mass.Fe).toBeCloseTo(fe);
    expect(state.star.mass.O + state.star.mass.He).toBeCloseTo(4 - fe);
  });

  it("終わった星はもう燃えない", () => {
    const game = finalStage();
    game.star.mass.Si = 5;
    game.star.end = "collapse";
    const { state, events } = step(game, 1);
    expect(state.star).toEqual(game.star);
    expect(events).toEqual([]);
  });

  it("生まれて30秒を過ぎ、何も燃えていなければ燃え尽きる", () => {
    const game = createGame();
    game.star.mass.H = 0;
    game.star.mass.He = 0.5;
    game.star.time = 30;
    const { state, events } = step(game, 0.1);
    expect(state.star.end).toBe("fizzle");
    expect(events).toContainEqual({ type: "fizzle" });
  });

  it("30秒より前は、燃えていなくても燃え尽きにしない", () => {
    const game = createGame();
    game.star.mass.H = 0;
    game.star.mass.He = 0.5;
    game.star.time = 29;
    expect(step(game, 0.1).state.star.end).toBeNull();
  });
});

describe("step：燃焼の自動制御", () => {
  it("自動制御を持っていれば、ON の段階のうち一番安いものから買えるだけ買う", () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    game.star.temperature = 2e8;
    game.star.ignitedAt = { H: 0, He: 0 };
    game.star.levels.He = 1;
    game.star.energy = 2e44 * 1.55 + 2e44 * 1.55 ** 2 + 1e40;

    const { state } = step(game, 0.001);

    // ヘリウム燃焼（8e44×1.6）より水素燃焼のほうが安いので、水素燃焼を2回買う
    expect(state.star.levels.H).toBe(3);
    expect(state.star.levels.He).toBe(1);
  });

  it("OFF にした段階は買わない", () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    game.meta.autoOn.H = false;
    game.star.energy = 1e50;
    expect(step(game, 0.001).state.star.levels.H).toBe(1);
  });

  it("1回の更新で買うのは20回まで", () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    game.star.energy = 1e60;
    expect(step(game, 0.001).state.star.levels.H).toBe(21);
  });

  it("自動制御を持っていなければ買わない", () => {
    const game = createGame();
    game.star.energy = 1e50;
    expect(step(game, 0.001).state.star.levels.H).toBe(1);
  });
});
