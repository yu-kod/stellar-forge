import { describe, expect, it } from "vitest";
import { rebirth } from "./actions";
import { advanceAll } from "./cluster";
import { NEUTRON_STAR_MASSES, createRProcess, neutronStarBin, unlockLayer4 } from "./rprocess";
import { createGame, createMeta, createStar } from "./star";
import type { GameState, Meta } from "./types";

function ended(
  meta: Meta,
  initialMass: number,
  end: "collapse" | "fizzle" | "whiteDwarf"
): GameState {
  const star = createStar(meta);
  star.initialMass = initialMass;
  star.end = end;
  return { meta, star };
}

function layer4(): Meta {
  const meta = createMeta();
  meta.rProcess = { ...createRProcess(), unlocked: true };
  return meta;
}

describe("中性子星の質量（親の星の初期質量で決まる9段階）", () => {
  it("1.2〜2.0 M☉ の9段階", () => {
    expect(NEUTRON_STAR_MASSES).toEqual([1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]);
  });

  it.each([
    [8, 0],
    [11, 0],
    [12, 1],
    [20, 3],
    [39, 7],
    [40, 8],
    [108, 8],
  ])("%d M☉ の星は %d 段目", (mass, bin) => {
    expect(neutronStarBin(mass)).toBe(bin);
  });
});

describe("中性子星の在庫", () => {
  it("第4層の前は在庫に入れず、数だけ数える", () => {
    const next = rebirth(ended(createMeta(), 20, "collapse"));
    expect(next.meta.neutronStars).toBe(1);
    expect(next.meta.rProcess.pool).toEqual(createRProcess().pool);
  });

  it("第4層の後は、崩壊した星の中性子星を親の質量の段に入れる", () => {
    const next = rebirth(ended(layer4(), 9, "collapse"));
    expect(next.meta.rProcess.pool[0]).toBe(1);
    expect(rebirth(ended(next.meta, 50, "collapse")).meta.rProcess.pool[8]).toBe(1);
  });

  it.each(["fizzle", "whiteDwarf"] as const)("%s では中性子星を残さない", (end) => {
    expect(rebirth(ended(layer4(), 20, end)).meta.rProcess.pool).toEqual(createRProcess().pool);
  });

  it("星団の星が崩壊しても在庫に入る", () => {
    const game = createGame();
    game.meta.rProcess = { ...createRProcess(), unlocked: true };
    game.meta.cluster = [
      { star: ended(game.meta, 10, "collapse").star, nextMass: 10, target: "C" },
    ];
    const { state } = advanceAll(game, 0.1);
    expect(state.meta.rProcess.pool[0]).toBe(1);
  });
});

describe("第4層の解放（s過程の循環を見たら）", () => {
  it("循環を見る前は解放しない", () => {
    const game = createGame();
    expect(unlockLayer4(game)).toBe(game);
  });

  it("循環を見たら解放し、それまでの中性子星を主星の質量で在庫に入れる", () => {
    const game = createGame();
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, looped: true };
    game.meta.neutronStars = 7;
    game.star.initialMass = 30;
    const next = unlockLayer4(game);
    expect(next.meta.rProcess.unlocked).toBe(true);
    expect(next.meta.rProcess.pool[neutronStarBin(30)]).toBe(7);
    expect(unlockLayer4(next)).toBe(next);
  });

  it("毎回の更新の後に判定する", () => {
    const game = createGame();
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, looped: true };
    expect(advanceAll(game, 0.1).state.meta.rProcess.unlocked).toBe(true);
  });
});
