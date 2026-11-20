import { describe, expect, it } from "vitest";
import { advance } from "./advance";
import { createGame } from "./star";
import { step } from "./step";

describe("advance：長い時間を細かい刻みに分けて進める", () => {
  it("最大刻みごとに step を繰り返したのと同じ結果になる", () => {
    let expected = createGame();
    for (let i = 0; i < 4; i++) expected = step(expected, 0.05).state;

    const { state } = advance(createGame(), 0.2, 0.05);

    expect(state.star.time).toBeCloseTo(0.2);
    expect(state.star.mass.He).toBeCloseTo(expected.star.mass.He);
  });

  it("割り切れない時間は等分した刻みで進める", () => {
    let expected = createGame();
    for (let i = 0; i < 3; i++) expected = step(expected, 0.12 / 3).state;

    const { state } = advance(createGame(), 0.12, 0.05);

    expect(state.star.mass.He).toBeCloseTo(expected.star.mass.He);
  });

  it("0秒なら何も変えない", () => {
    const game = createGame();
    const result = advance(game, 0, 0.05);
    expect(result).toEqual({ state: game, events: [] });
  });

  it("途中で星が終わったらそこで止め、各刻みのイベントを順に返す", () => {
    const game = createGame();
    game.star.mass.H = 0;
    game.star.mass.Si = 5;
    game.star.mass.Fe = 1.39;
    game.star.temperature = 2.7e9;
    game.star.ignitedAt = { H: 0, He: 0, C: 0, Ne: 0, O: 0, Si: 0 };

    const { state, events } = advance(game, 10, 0.05);

    expect(state.star.end).toBe("collapse");
    expect(state.star.time).toBeLessThan(1);
    expect(events.at(-1)).toEqual({ type: "collapse" });
  });

  it("刻みを省略すると 0.05 秒刻みになる", () => {
    let expected = createGame();
    for (let i = 0; i < 2; i++) expected = step(expected, 0.05).state;

    const { state } = advance(createGame(), 0.1);

    expect(state.star.mass.He).toBeCloseTo(expected.star.mass.He);
  });
});
