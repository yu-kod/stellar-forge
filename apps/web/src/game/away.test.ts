import { describe, expect, it } from "vitest";
import { buyShopItem } from "./actions";
import {
  AWAY_CHUNK_SECONDS,
  AWAY_LIMIT_SECONDS,
  AWAY_STEP_SECONDS,
  advanceAway,
  isStopped,
} from "./away";
import { LAYER2_AFTER } from "./balance";
import { createGame } from "./star";
import { aboutToCollapse, collapsed } from "@/test-utils/game";

describe("留守の間の進行", () => {
  it("留守は12時間まで", () => {
    expect(AWAY_LIMIT_SECONDS).toBe(12 * 3600);
  });

  it("1フレームで進める刻みの数は 500 まで（12時間でも画面が固まらない）", () => {
    expect(AWAY_CHUNK_SECONDS / AWAY_STEP_SECONDS).toBeLessThanOrEqual(500);
    expect(AWAY_LIMIT_SECONDS / AWAY_CHUNK_SECONDS).toBeLessThanOrEqual(60);
  });

  it("その時間だけ星を進める", () => {
    expect(advanceAway(createGame(), 60).star.time).toBeCloseTo(60);
  });

  it("自動で次の星を生めるなら、周回を続ける", () => {
    const game = aboutToCollapse();
    game.meta.supernovae = 10;
    const next = advanceAway(game, 600);
    expect(next.meta.supernovae).toBeGreaterThan(10);
    expect(next.star.end).toBeNull();
  });

  it("終わった星だけで星団もなければ止まっている（超新星の画面から再開する）", () => {
    const game = collapsed();
    expect(isStopped(game)).toBe(true);
    expect(advanceAway(game, 60)).toBe(game);
  });

  it("主星が止まっていても、星団の星は燃え続ける", () => {
    const game = collapsed();
    game.meta.supernovae = LAYER2_AFTER;
    game.meta.dust.N = 30;
    game.meta.autoRebirth = false;
    const withCluster = buyShopItem(game, "cluster");
    expect(isStopped(withCluster)).toBe(false);
    const next = advanceAway(withCluster, 60);
    expect(next.star.end).toBe("collapse");
    expect(next.meta.cluster[0]?.star.time).toBeCloseTo(60);
  });
});
