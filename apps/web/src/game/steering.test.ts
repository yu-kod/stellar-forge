import { describe, expect, it } from "vitest";
import { createGame, createStar } from "@/game/star";
import { TARGET_IDS, DUST_IDS, type Target, type GameState } from "@/game/types";
import { dustPreview } from "@/game/dust";
import { setTarget } from "@/game/actions";
import { playStar, autoOnly } from "@/test-utils/simulate";

/** 中盤（星屑の強化をひととおり買い、自動制御を持っている）の星 */
function midGame(target: Target): GameState {
  const game = createGame();
  game.meta.shop = { mass: 6, cno: 5, yield: 5, xs: 8, boom: 6, accel: 0, auto: 1, pre: 1 };
  game.meta.supernovae = 30;
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
  const steered = setTarget(game, target);
  return { ...steered, star: createStar(steered.meta) };
}

const MAIN_DUST: Record<Target, string> = { C: "C", Ne: "Ne", O: "O", Si: "Si" };

describe("狙う星屑で組成が分かれる", () => {
  it.each(TARGET_IDS)("狙い %s では、その元素の星屑が一番多い", (target) => {
    const ended = playStar(midGame(target), autoOnly);
    const dust = dustPreview(ended.meta, ended.star);
    const top = DUST_IDS.reduce((a, b) => (dust[b] > dust[a] ? b : a));
    expect(top).toBe(MAIN_DUST[target]);
  });

  it("狙いを外した元素は、狙ったときの半分も取れない", () => {
    const dustOf = (target: Target) => {
      const ended = playStar(midGame(target), autoOnly);
      return dustPreview(ended.meta, ended.star);
    };
    const carbon = dustOf("C");
    const silicon = dustOf("Si");
    expect(silicon.C).toBeLessThan(carbon.C / 2);
    expect(carbon.Si).toBeLessThan(silicon.Si / 2);
  });
});
