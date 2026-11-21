import { S_DISCOVERABLE_ELEMENTS } from "@/game/sprocess";
import { describe, expect, it } from "vitest";
import { createSlot, rebirth } from "./actions";
import { advanceAll } from "./cluster";
import {
  NEUTRON_STAR_MASSES,
  STARTER_SECONDS,
  createRProcess,
  neutronStarBin,
  unlockLayer4,
} from "./rprocess";
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
  ])("%d M☉ の星は %d 段目", (mass, bin) => {
    expect(neutronStarBin(mass)).toBe(bin);
  });
});

describe("40 M☉ より重い星は、崩壊してもブラックホールになる", () => {
  it("中性子星の段はなく、ブラックホールの数を数える", () => {
    expect(neutronStarBin(41)).toBeNull();
    // 8 M☉ 未満は白色矮星になり、中性子星を残さない
    expect(neutronStarBin(7)).toBeNull();
    expect(neutronStarBin(2)).toBeNull();
    const next = rebirth(ended(createMeta(), 108, "collapse"));
    expect(next.meta.blackHoles).toBe(1);
    expect(next.meta.neutronStars).toBe(0);
    expect(next.meta.rProcess.pool).toEqual(createRProcess().pool);
  });
});

describe("中性子星の在庫", () => {
  it("第4層の前から、崩壊した星の中性子星を親の質量の段に入れる", () => {
    const next = rebirth(ended(createMeta(), 9, "collapse"));
    expect(next.meta.neutronStars).toBe(1);
    expect(next.meta.rProcess.pool[0]).toBe(1);
    expect(rebirth(ended(next.meta, 40, "collapse")).meta.rProcess.pool[8]).toBe(1);
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
  it("循環を見ても、s過程の元素がそろうまでは解放しない", () => {
    const game = createGame();
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, looped: true, discovered: [27] };
    expect(unlockLayer4(game)).toBe(game);
  });

  it("解放のとき、在庫の一番軽い2つは、すでに重力波で近づいていた連星として2分で合体する", () => {
    const game = createGame();
    game.meta.sProcess = {
      ...game.meta.sProcess,
      unlocked: true,
      looped: true,
      discovered: [...S_DISCOVERABLE_ELEMENTS],
    };
    game.meta.rProcess.pool[4] = 1;
    game.meta.rProcess.pool[5] = 2;
    game.meta.rProcess.pool[7] = 1;
    const next = unlockLayer4(game);
    expect(next.meta.rProcess.binaries).toEqual([{ a: 4, b: 5, remaining: STARTER_SECONDS }]);
    expect(next.meta.rProcess.pool.slice(4, 8)).toEqual([0, 1, 0, 1]);
    expect(STARTER_SECONDS).toBe(120);
    game.meta.rProcess.pool = game.meta.rProcess.pool.map(() => 0);
    game.meta.rProcess.pool[5] = 1; // 1つだけなら組まない
    expect(unlockLayer4(game).meta.rProcess.binaries).toEqual([]);
  });

  it("循環を見る前は解放しない", () => {
    const game = createGame();
    expect(unlockLayer4(game)).toBe(game);
  });

  it("循環を見たら解放し、星団の星を中性子星を残す質量（18 M☉ と 40 M☉）にする", () => {
    const game = createGame();
    game.meta.sProcess = {
      ...game.meta.sProcess,
      unlocked: true,
      looped: true,
      discovered: [...S_DISCOVERABLE_ELEMENTS],
    };
    game.meta.cluster = [createSlot(game.meta), createSlot(game.meta)];
    const next = unlockLayer4(game);
    expect(next.meta.rProcess.unlocked).toBe(true);
    expect(next.meta.cluster.map((slot) => slot.nextMass)).toEqual([18, 40]);
    expect(unlockLayer4(next)).toBe(next);
  });

  it("毎回の更新の後に判定する", () => {
    const game = createGame();
    game.meta.sProcess = {
      ...game.meta.sProcess,
      unlocked: true,
      looped: true,
      discovered: [...S_DISCOVERABLE_ELEMENTS],
    };
    expect(advanceAll(game, 0.1).state.meta.rProcess.unlocked).toBe(true);
  });
});
