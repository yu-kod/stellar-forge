import { describe, expect, it } from "vitest";
import { dustPreview } from "@/game/dust";
import { createGame, createStar } from "@/game/star";
import { DUST_IDS, type GameState } from "@/game/types";
import { aimFor, playStar, type Strategy } from "@/test-utils/simulate";

/** 数回目の星（星屑の強化を少し買った、自動制御はまだない） */
function earlyStar(): GameState {
  const game = createGame();
  game.meta.shop = {
    ...game.meta.shop,
    mass: 2,
    cno: 2,
    yield: 1,
    xs: 0,
    boom: 0,
    accel: 0,
    auto: 0,
    pre: 0,
  };
  game.meta.supernovae = 4;
  game.meta.discovered = { He: true, C: true, O: true, Ne: true };
  return { ...game, star: createStar(game.meta) };
}

const total = (game: GameState) => {
  const dust = dustPreview(game.meta, game.star);
  return DUST_IDS.reduce((sum, id) => sum + dust[id], 0);
};

/** ケイ素燃焼が始まったら強化をやめる */
const stopAtFinal =
  (strategy: Strategy): Strategy =>
  (state) =>
    state.star.ignitedAt.Si === undefined ? strategy(state) : [];

describe("最後の30秒", () => {
  it("ケイ素燃焼が始まってからもエネルギーを使い切ると、やめたときより星屑が2割以上多い", () => {
    const spent = playStar(earlyStar(), aimFor("C"));
    const saved = playStar(earlyStar(), stopAtFinal(aimFor("C")));
    expect(total(spent)).toBeGreaterThan(total(saved) * 1.2);
  });
});
