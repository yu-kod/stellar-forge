import { describe, expect, it } from "vitest";
import { setTarget } from "@/game/actions";
import { dustPreview } from "@/game/dust";
import { createGame, createStar } from "@/game/star";
import { DUST_IDS, TARGET_IDS, type GameState, type Target } from "@/game/types";
import { autoOnly, playStar } from "@/test-utils/simulate";

/** 何時間も遊んだ後の、強化を大量に重ねた星 */
function lateStar(target: Target): GameState {
  const game = createGame();
  game.meta.shop = {
    ...game.meta.shop,
    mass: 40,
    cno: 40,
    yield: 60,
    xs: 100,
    boom: 30,
    accel: 20,
    auto: 1,
    pre: 1,
  };
  game.meta.supernovae = 300;
  game.meta.discovered = {
    He: true,
    C: true,
    N: true,
    O: true,
    Ne: true,
    Mg: true,
    Si: true,
    S: true,
  };
  const steered = setTarget(game, target);
  return { ...steered, star: createStar(steered.meta) };
}

const MAIN_DUST: Record<Target, (typeof DUST_IDS)[number]> = { C: "C", Ne: "Ne", O: "O", Si: "Si" };

describe("強化を重ねても周回の形が崩れない", () => {
  it.each(TARGET_IDS)("狙い %s：ケイ素燃焼の点火まで15秒以上かかる", (target) => {
    const ended = playStar(lateStar(target), autoOnly);
    expect(ended.star.ignitedAt.Si).toBeGreaterThan(15);
  });

  it.each(TARGET_IDS)("狙い %s：狙いの星屑が一番多い", (target) => {
    const ended = playStar(lateStar(target), autoOnly);
    const dust = dustPreview(ended.meta, ended.star);
    const top = DUST_IDS.reduce((a, b) => (dust[b] > dust[a] ? b : a));
    expect(top).toBe(MAIN_DUST[target]);
  });
});
