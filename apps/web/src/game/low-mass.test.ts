import { describe, expect, it } from "vitest";
import { rebirth, setNextMass } from "./actions";
import { LAYER2_AFTER } from "./balance";
import { dustPreview } from "./dust";
import { createGame, createMeta, createStar, maxMass } from "./star";
import { step } from "./step";
import type { GameState, Meta } from "./types";
import { RATE_CAP } from "./balance";
import { effectiveRate, isIgnited } from "./rates";

/** Lv1 の段階の速度定数（上限を掛けたもの） */
const K1 = effectiveRate(0.4 * 0.004, RATE_CAP.H);

function layer2Meta(overrides: Partial<Meta> = {}): Meta {
  return { ...createMeta(), supernovae: LAYER2_AFTER, ...overrides };
}

function lowMassGame(mass = 3): GameState {
  const meta = layer2Meta({ nextMass: mass });
  return { meta, star: createStar(meta) };
}

describe("星の質量を選ぶ", () => {
  it("上限は 25 + 5 ×（より重い星の Lv）+（ケイ素を発見済みなら 3）", () => {
    const meta = createMeta();
    meta.shop.mass = 2;
    meta.discovered.Si = true;
    expect(maxMass(meta)).toBe(38);
  });

  it("第2層が解放されていれば、選んだ質量で星が生まれる", () => {
    const star = createStar(layer2Meta({ nextMass: 3 }));
    expect(star.initialMass).toBe(3);
    expect(star.mass.H).toBe(3);
  });

  it("第2層が解放されるまでは、選んでいても上限の質量で生まれる", () => {
    const star = createStar({ ...createMeta(), nextMass: 3 });
    expect(star.initialMass).toBe(25);
  });

  it("選んだ質量が上限を超えていたら上限で生まれる", () => {
    expect(createStar(layer2Meta({ nextMass: 99 })).initialMass).toBe(25);
  });

  it("選んでいなければ上限で生まれる", () => {
    expect(createStar(layer2Meta({ nextMass: null })).initialMass).toBe(25);
  });

  it("軽い星が持って生まれる炭素は、質量に比例して少なくなる", () => {
    const meta = layer2Meta({ nextMass: 5 });
    meta.shop.cno = 2;
    expect(createStar(meta).mass.C).toBeCloseTo(0.4 * (5 / 25));
  });

  it("世代は超新星と白色矮星を合わせた数 + 1", () => {
    const meta = layer2Meta({ whiteDwarfs: 2 });
    expect(createStar(meta).generation).toBe(LAYER2_AFTER + 3);
  });
});

describe("軽い星（8 M☉ 未満）", () => {
  it("コア温度は 3.5×10⁸ K で頭打ちになり、炭素燃焼は点火しない", () => {
    const game = lowMassGame();
    game.star.mass.H = 1;
    game.star.mass.C = 2;
    const { state } = step(game, 0.1);
    expect(state.star.temperature).toBe(3.5e8);
    expect(isIgnited(state.star, "He")).toBe(true);
    expect(isIgnited(state.star, "C")).toBe(false);
  });

  it("外層の水素が初期質量の10%を下回ると、白色矮星になって終わる", () => {
    const game = lowMassGame(5);
    game.star.mass.H = 0.49;
    game.star.mass.He = 4.51;
    const { state, events } = step(game, 0.1);
    expect(state.star.end).toBe("whiteDwarf");
    expect(events).toContainEqual({ type: "whiteDwarf" });
  });

  it("重い星は水素が減っても白色矮星にならない", () => {
    const game = createGame();
    game.star.mass.H = 1;
    game.star.mass.He = 24;
    expect(step(game, 0.1).state.star.end).toBeNull();
  });

  it("白色矮星になったら、星屑 ×2（惑星状星雲）", () => {
    const game = lowMassGame(5);
    game.star.mass.C = 2;
    const before = dustPreview(game.meta, game.star).C;
    game.star.end = "whiteDwarf";
    expect(dustPreview(game.meta, game.star).C).toBe(Math.floor(2 ** 1.1 * 2));
    expect(before).toBe(Math.floor(2 ** 1.1));
  });

  it("窒素を発見していれば、惑星状星雲の星屑はさらに ×1.5", () => {
    const game = lowMassGame(5);
    game.meta.discovered.N = true;
    game.star.mass.C = 2;
    game.star.end = "whiteDwarf";
    expect(dustPreview(game.meta, game.star).C).toBe(Math.floor(2 ** 1.1 * 2 * 1.5));
  });

  it("白色矮星から次の星を生むと、白色矮星が1つ増え、中性子星と超新星の数は変わらない", () => {
    const game = lowMassGame(5);
    game.star.end = "whiteDwarf";
    const next = rebirth(game);
    expect(next.meta.whiteDwarfs).toBe(1);
    expect(next.meta.supernovae).toBe(LAYER2_AFTER);
    expect(next.meta.neutronStars).toBe(0);
    expect(next.meta.log[0]?.end).toBe("whiteDwarf");
    expect(next.star.generation).toBe(LAYER2_AFTER + 2);
  });
});

describe("CNO サイクル", () => {
  it("重い星の水素燃焼は、燃えた水素の1%ぶんの炭素を窒素に変える", () => {
    const game = createGame();
    game.star.mass.H = 24;
    game.star.mass.C = 1;
    const burned = K1 * 24 * 1;
    const { state } = step(game, 1);
    expect(state.star.mass.N / (burned * 0.01)).toBeCloseTo(1);
    expect((1 - state.star.mass.C) / (burned * 0.01)).toBeCloseTo(1);
  });

  it("軽い星では外層の対流で炭素がよく混ざり、燃えた水素の20%ぶんを窒素に変える", () => {
    const game = lowMassGame(5);
    game.star.mass.H = 4;
    game.star.mass.C = 1;
    const burned = K1 * 4 * 1;
    const { state } = step(game, 1);
    expect(state.star.mass.N / (burned * 0.2)).toBeCloseTo(1);
  });

  it("炭素がなければ窒素はできない", () => {
    const { state } = step(createGame(), 1);
    expect(state.star.mass.N).toBe(0);
  });

  it("窒素が 0.05 M☉ を超えたら発見する", () => {
    const game = createGame();
    game.star.mass.N = 0.06;
    const { events } = step(game, 0.1);
    expect(events).toContainEqual({ type: "discover", element: "N" });
  });
});

describe("setNextMass", () => {
  it("次に生む星の質量を決める（1 M☉ 以上、整数）", () => {
    const meta = layer2Meta();
    const game = { meta, star: createStar(meta) };
    expect(setNextMass(game, 3.4).meta.nextMass).toBe(3);
    expect(setNextMass(game, 0).meta.nextMass).toBe(1);
    expect(setNextMass(game, null).meta.nextMass).toBeNull();
  });
});
