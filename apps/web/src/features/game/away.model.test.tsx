import { describe, expect, it } from "vitest";
import { AWAY_CHUNK_SECONDS } from "@/game/away";
import { createGame } from "@/game/star";
import { aboutToCollapse } from "@/test-utils/game";
import { createModel, gameReducer } from "./model";

const awayNotices = (model: ReturnType<typeof createModel>) =>
  model.notices.filter((n) => n.event.type === "away").map((n) => n.event);

describe("gameReducer：留守の間を進める", () => {
  it("短い留守はすぐ進め、知らせる", () => {
    const model = gameReducer(createModel(createGame()), { type: "away", seconds: 120 });
    expect(model.game.star.time).toBeCloseTo(120);
    expect(model.away).toBeNull();
    expect(awayNotices(model)).toEqual([
      { type: "away", seconds: 120, supernovae: 0, whiteDwarfs: 0 },
    ]);
  });

  it("知らせには、増えた超新星と白色矮星の数を書く", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { Notices } = await import("./components/Notices");
    render(
      <Notices
        notices={[
          { id: 1, event: { type: "away", seconds: 7200, supernovae: 120, whiteDwarfs: 30 } },
        ]}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "留守のあいだに 2時間0分 ぶん星が燃えた。超新星 120 回・白色矮星 30 個"
    );
  });

  it("白色矮星だけ増えたときも、句読点がおかしくならない", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { Notices } = await import("./components/Notices");
    render(
      <Notices
        notices={[{ id: 1, event: { type: "away", seconds: 60, supernovae: 0, whiteDwarfs: 2 } }]}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "留守のあいだに 1分 ぶん星が燃えた。白色矮星 2 個"
    );
  });

  it("30秒未満の留守は進めるが知らせない", () => {
    const model = gameReducer(createModel(createGame()), { type: "away", seconds: 10 });
    expect(model.game.star.time).toBeCloseTo(10);
    expect(awayNotices(model)).toEqual([]);
  });

  it("長い留守は1フレームごとに少しずつ進め、終わったら超新星と白色矮星の数を知らせる", () => {
    const game = aboutToCollapse();
    game.meta.supernovae = 10;
    let model = gameReducer(createModel(game), { type: "away", seconds: 3 * AWAY_CHUNK_SECONDS });
    expect(model.away).toEqual({
      total: 3 * AWAY_CHUNK_SECONDS,
      remaining: 2 * AWAY_CHUNK_SECONDS,
      supernovae: 10,
      whiteDwarfs: 0,
    });
    expect(awayNotices(model)).toEqual([]);
    model = gameReducer(model, { type: "tick", seconds: 0.016 });
    expect(model.away?.remaining).toBe(AWAY_CHUNK_SECONDS);
    model = gameReducer(model, { type: "tick", seconds: 0.016 });
    expect(model.away).toBeNull();
    const [notice] = awayNotices(model);
    expect(notice).toMatchObject({ type: "away", seconds: 3 * AWAY_CHUNK_SECONDS });
    expect(notice && "supernovae" in notice && notice.supernovae).toBe(
      model.game.meta.supernovae - 10
    );
  });

  it("進めている途中にまた留守にしたら、残りに足す（12時間まで）", () => {
    const game = aboutToCollapse();
    game.meta.supernovae = 10;
    let model = gameReducer(createModel(game), { type: "away", seconds: 10 * 3600 });
    model = gameReducer(model, { type: "away", seconds: 10 * 3600 });
    expect(model.away?.total).toBe(12 * 3600);
  });

  it("進めている途中で星が止まったら（超新星の画面）、残りは捨てて知らせる", () => {
    const model = gameReducer(createModel(createGame()), { type: "away", seconds: 3 * 3600 });
    expect(model.game.star.end).not.toBeNull();
    expect(model.away).toBeNull();
    expect(awayNotices(model)).toHaveLength(1);
  });

  it("止まっている星（超新星の画面）なら進めない", () => {
    const game = aboutToCollapse();
    game.star.end = "collapse";
    const start = createModel(game);
    expect(gameReducer(start, { type: "away", seconds: 600 })).toBe(start);
  });
});
