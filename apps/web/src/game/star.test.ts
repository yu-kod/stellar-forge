import { describe, expect, it } from "vitest";
import { createGame, createMeta, createStar } from "./star";

describe("createGame", () => {
  it("最初の星は 25 M☉ の水素だけでできていて、水素燃焼だけが Lv1 で燃えている", () => {
    const { star } = createGame();
    expect(star.generation).toBe(1);
    expect(star.initialMass).toBe(25);
    expect(star.mass.H).toBe(25);
    expect(star.mass.He).toBe(0);
    expect(star.temperature).toBe(4e7);
    expect(star.levels).toEqual({ H: 1, He: 0, C: 0, Ne: 0, O: 0, Si: 0 });
    expect(star.energy).toBe(0);
    expect(star.end).toBeNull();
  });

  it("恒久の進行は空から始まる", () => {
    const { meta } = createGame();
    expect(meta.supernovae).toBe(0);
    expect(meta.neutronStars).toBe(0);
    expect(meta.dust).toEqual({ C: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 0 });
    expect(meta.discovered).toEqual({});
    expect(meta.autoOn).toEqual({ H: true, He: true, C: true, Ne: true, O: true, Si: false });
  });
});

describe("createStar", () => {
  it("恒久強化と発見済みの元素が次の星の生まれ方に効く", () => {
    const meta = createMeta();
    meta.supernovae = 3;
    meta.shop.mass = 2;
    meta.shop.cno = 1;
    meta.shop.pre = 1;
    meta.discovered.Si = true;

    const star = createStar(meta);

    expect(star.generation).toBe(4);
    expect(star.initialMass).toBe(25 + 10 + 3);
    expect(star.mass.C).toBeCloseTo(0.2);
    expect(star.mass.H).toBeCloseTo(38 - 0.2);
    expect(star.temperature).toBe(2e8);
  });
});
