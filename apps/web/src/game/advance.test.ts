import { describe, expect, it } from "vitest";
import { aboutToCollapse } from "@/test-utils/game";
import { setAutoRebirth } from "./actions";
import { advance, advanceRuns } from "./advance";
import { AUTO_REBIRTH_AFTER } from "./balance";
import { dustPreview } from "./dust";
import type { GameState } from "./types";
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

describe("advanceRuns：超新星のあと自動で次の星を生みながら進める", () => {
  function veteran(): GameState {
    const game = aboutToCollapse();
    game.meta.supernovae = AUTO_REBIRTH_AFTER;
    game.star.generation = AUTO_REBIRTH_AFTER + 1;
    return game;
  }

  it("自動で次の星を生めるなら、終わった星から次の星を生んで残りの時間を進める", () => {
    const { state, events } = advanceRuns(veteran(), 2, 0.05);
    expect(state.meta.supernovae).toBe(AUTO_REBIRTH_AFTER + 1);
    expect(state.star.generation).toBe(AUTO_REBIRTH_AFTER + 2);
    expect(state.star.time).toBeGreaterThan(1.5);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "supernova", generation: AUTO_REBIRTH_AFTER + 1 })
    );
  });

  it("超新星が10回に満たなければ、終わった星で止まる", () => {
    const game = aboutToCollapse();
    game.meta.supernovae = AUTO_REBIRTH_AFTER - 1;
    const { state } = advanceRuns(game, 2, 0.05);
    expect(state.star.end).toBe("collapse");
  });

  it("自動で次の星を生む設定を切っていれば、終わった星で止まる", () => {
    const game = setAutoRebirth(veteran(), false);
    const { state } = advanceRuns(game, 2, 0.05);
    expect(state.star.end).toBe("collapse");
  });

  it("得た星屑を知らせに載せる", () => {
    const game = veteran();
    const ended = advance(game, 2, 0.05).state;
    const { events } = advanceRuns(game, 2, 0.05);
    const supernova = events.find((e) => e.type === "supernova");
    expect(supernova).toEqual({
      type: "supernova",
      generation: AUTO_REBIRTH_AFTER + 1,
      gain: dustPreview(ended.meta, ended.star),
      end: "collapse",
    });
  });
});

describe("advanceRuns：白色矮星", () => {
  it("自動で次の星を生むときの知らせに、終わり方を載せる", () => {
    const game = aboutToCollapse();
    game.meta.supernovae = AUTO_REBIRTH_AFTER;
    const { events } = advanceRuns(game, 2, 0.05);
    expect(events).toContainEqual(expect.objectContaining({ type: "supernova", end: "collapse" }));
  });
});
