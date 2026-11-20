import { describe, expect, it } from "vitest";
import { setTarget } from "./actions";
import { dustPreview } from "./dust";
import { previewRun } from "./preview";
import { createGame, createStar } from "./star";
import type { GameState, Target } from "./types";
import { autoOnly, playStar } from "@/test-utils/simulate";

/** 燃焼の自動制御を持った中盤の星 */
function midGame(): GameState {
  const game = createGame();
  game.meta.shop = { ...game.meta.shop, mass: 6, cno: 5, yield: 5, xs: 8, boom: 6, auto: 1 };
  game.meta.supernovae = 30;
  return { ...game, star: createStar(game.meta) };
}

describe("狙いごとの1周の見込み", () => {
  it("その狙いで次の星を燃やしたときの、長さと星屑を見込む", () => {
    const meta = midGame().meta;
    const preview = previewRun(meta, "C");
    const played = playStar(
      { meta: setTarget({ meta, star: createStar(meta) }, "C").meta, star: createStar(meta) },
      autoOnly
    );
    expect(preview.seconds / played.star.time).toBeCloseTo(1, 1);
    expect(preview.dust.C / dustPreview(played.meta, played.star).C).toBeCloseTo(1, 1);
  });

  it.each<[Target, "C" | "Ne" | "O" | "Si"]>([
    ["C", "C"],
    ["Ne", "Ne"],
    ["O", "O"],
    ["Si", "Si"],
  ])("狙い %s では %s の星屑が一番多いと見込む", (target, element) => {
    const { dust } = previewRun(midGame().meta, target);
    expect(Math.max(...Object.values(dust))).toBe(dust[element]);
  });

  it("今の狙いや質量の設定は変えない（見込むだけ）", () => {
    const meta = midGame().meta;
    meta.target = "O";
    const before = structuredClone(meta);
    previewRun(meta, "C");
    expect(meta).toEqual(before);
  });
});
