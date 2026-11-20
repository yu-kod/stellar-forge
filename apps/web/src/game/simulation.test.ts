import { describe, expect, it } from "vitest";
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

  it("15分以内に元素8種をすべて発見し、燃焼の自動制御を手に入れる", () => {
    const { state } = playCampaign(15 * 60);
    expect(Object.keys(state.meta.discovered).sort()).toEqual(
      ["C", "Fe", "He", "Mg", "Ne", "O", "S", "Si"].sort()
    );
    expect(state.meta.shop.auto).toBe(1);
  });
});
