import { describe, expect, it } from "vitest";
import { dustPreview } from "@/game/dust";
import { createGame, createStar } from "@/game/star";
import type { GameState } from "@/game/types";
import { aimFor, playStar, type Strategy } from "@/test-utils/simulate";

/** 星屑の強化をひととおり少し買った星（自動制御はまだない） */
function earlyStar(): GameState {
  const game = createGame();
  game.meta.shop = { ...game.meta.shop, mass: 5, cno: 5, yield: 4, xs: 3, boom: 2 };
  game.meta.supernovae = 8;
  game.meta.discovered = { He: true, C: true, N: true, O: true, Ne: true, Mg: true };
  return { ...game, star: createStar(game.meta) };
}

/** ケイ素燃焼が始まったら強化をやめる */
const stopAtFinal =
  (strategy: Strategy): Strategy =>
  (state) =>
    state.star.ignitedAt.Si === undefined ? strategy(state) : [];

describe("最後の数十秒", () => {
  it.each(["Ne", "Si"] as const)(
    "ケイ素燃焼が始まってからもエネルギーを使い切ると、狙いの星屑（%s）がやめたときより多い",
    (target) => {
      const spent = playStar(earlyStar(), aimFor(target));
      const saved = playStar(earlyStar(), stopAtFinal(aimFor(target)));
      const dustOf = (game: GameState) => dustPreview(game.meta, game.star)[target];
      expect(dustOf(spent)).toBeGreaterThan(dustOf(saved) * 1.04);
    }
  );
});
