import { describe, expect, it } from "vitest";
import type { GameState } from "./types";
import { aimFor, greedy, playCampaign, playStar } from "@/test-utils/simulate";
import { dustPreview } from "./dust";
import { createGame } from "./star";

/** docs/design.md「ペーシング目標」をテストで固定する */
describe("バランス", () => {
  it("最初の星は、何も考えず全部強化しても 90〜180 秒で超新星になる", () => {
    const { star } = playStar(createGame(), greedy);
    expect(star.end).toBe("collapse");
    expect(star.time).toBeGreaterThanOrEqual(90);
    expect(star.time).toBeLessThanOrEqual(180);
  });

  it("最初の星で6段階すべてが点火する", () => {
    const { star } = playStar(createGame(), greedy);
    expect(Object.keys(star.ignitedAt).sort()).toEqual(["C", "H", "He", "Ne", "O", "Si"]);
  });

  it("炭素を狙って遊ぶと、炭素の星屑が一番多い", () => {
    const { meta, star } = playStar(createGame(), aimFor("C"));
    const dust = dustPreview(meta, star);
    expect(Math.max(...Object.values(dust))).toBe(dust.C);
  });

  it("ネオンを狙うと、炭素を狙ったときよりネオンが多く残る", () => {
    const ne = playStar(createGame(), aimFor("Ne")).star.mass.Ne;
    const c = playStar(createGame(), aimFor("C")).star.mass.Ne;
    expect(ne).toBeGreaterThan(c);
  });

  it("15分以内に元素9種をすべて発見し、燃焼の自動制御を手に入れる", () => {
    const { state } = playCampaign(15 * 60);
    expect(Object.keys(state.meta.discovered).sort()).toEqual(
      ["C", "Fe", "He", "Mg", "N", "Ne", "O", "S", "Si"].sort()
    );
    expect(state.meta.shop.auto).toBe(1);
  });

  it("1時間遊ぶあいだ、星屑の強化を15分以上買えない区間がない", () => {
    const { purchases } = playCampaign(60 * 60);
    const gaps = purchases.slice(1).map((t, i) => t - purchases[i]!);
    expect(Math.max(...gaps)).toBeLessThan(15 * 60);
    expect(purchases.at(-1)).toBeGreaterThan(45 * 60);
  });

  it("第2層では、窒素を狙うときに軽い星を混ぜたほうが、重い星だけより速く進む", () => {
    const { state: start } = playCampaign(20 * 60);
    const layer1Levels = (state: GameState) =>
      (["mass", "cno", "yield", "xs", "boom", "accel"] as const).reduce(
        (sum, id) => sum + state.meta.shop[id],
        0
      );
    const heavy = playCampaign(30 * 60, { start });
    const mixed = playCampaign(30 * 60, { start, lightMassForNitrogen: 7 });
    expect(mixed.state.meta.whiteDwarfs).toBeGreaterThan(0);
    expect(layer1Levels(mixed.state)).toBeGreaterThan(layer1Levels(heavy.state) + 5);
  });
});
