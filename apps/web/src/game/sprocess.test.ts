import { describe, expect, it } from "vitest";
import { triggerIa } from "./actions";
import { LAYER2_AFTER, LAYER3_AFTER } from "./balance";
import { dustPreview } from "./dust";
import {
  S_PATH_END,
  S_PATH_START,
  captureNeutrons,
  captures,
  createSProcess,
  crossSection,
  isRProcessOnly,
  neutronMultiplier,
  sDustMultiplier,
  seedsPerIa,
  type SProcess,
} from "./sprocess";
import { createMeta, createStar } from "./star";
import { step } from "./step";
import type { GameState, Meta } from "./types";

const index = (z: number) => z - S_PATH_START;

function withAmounts(entries: Record<number, number>): SProcess {
  const sp = createSProcess();
  for (const [z, amount] of Object.entries(entries)) sp.amounts[index(Number(z))] = amount;
  return sp;
}

function layer3Meta(overrides: Partial<Meta> = {}): Meta {
  const meta = { ...createMeta(), supernovae: LAYER2_AFTER, ...overrides };
  meta.sProcess = { ...meta.sProcess, unlocked: true, ...overrides.sProcess };
  return meta;
}

describe("s過程の道", () => {
  it("鉄（26）からビスマス（83）まで", () => {
    expect(S_PATH_START).toBe(26);
    expect(S_PATH_END).toBe(83);
    expect(createSProcess().amounts).toHaveLength(58);
  });

  it("次の元素へ進むのに捕まえる中性子は、原子量の差（四捨五入、最低1）", () => {
    expect(captures(26)).toBe(3); // Fe 55.8 → Co 58.9
    expect(captures(27)).toBe(1); // Co 58.9 → Ni 58.7（原子量が下がっても1）
    expect(captures(82)).toBe(2); // Pb 207.2 → Bi 209.0
    let total = 0;
    for (let z = S_PATH_START; z < S_PATH_END; z++) total += captures(z);
    expect(total).toBe(158);
  });

  it("断面積は Z / 40。中性子の魔法数の元素は ×0.15", () => {
    expect(crossSection(40)).toBeCloseTo(0.15);
    expect(crossSection(42)).toBeCloseTo(42 / 40);
    expect(crossSection(56)).toBeCloseTo((56 / 40) * 0.15);
    expect(crossSection(82)).toBeCloseTo((82 / 40) * 0.15);
  });

  it("金・白金・イリジウム・オスミウム・ユウロピウムは r過程で作る元素", () => {
    expect([63, 76, 77, 78, 79].every(isRProcessOnly)).toBe(true);
    expect(isRProcessOnly(82)).toBe(false);
  });
});

describe("captureNeutrons", () => {
  it("中性子が足りれば、鉄の種は捕まえた数に応じて次の元素へ進む", () => {
    const { sProcess } = captureNeutrons(withAmounts({ 26: 1 }), 1.5);
    // 鉄 → コバルトは3個。1.5個なら半分が進む
    expect(sProcess.amounts[index(26)]).toBeCloseTo(0.5);
    expect(sProcess.amounts[index(27)]).toBeCloseTo(0.5);
  });

  it("1回では1つ先までしか進まない（全部捕まえても）", () => {
    const { sProcess } = captureNeutrons(withAmounts({ 26: 1 }), 100);
    expect(sProcess.amounts[index(26)]).toBe(0);
    expect(sProcess.amounts[index(27)]).toBeCloseTo(1);
    expect(sProcess.amounts[index(28)]).toBe(0);
  });

  it("中性子は 量 × 断面積 の比で配られる", () => {
    // Fe（σ 0.65）と Mo（σ 1.05）が同じ量なら、Mo のほうが多く捕まえる
    const { sProcess } = captureNeutrons(withAmounts({ 26: 1, 42: 1 }), 0.2);
    const ironMoved = sProcess.amounts[index(27)]!;
    const molyMoved = sProcess.amounts[index(43)]!;
    expect((molyMoved * captures(42)) / (ironMoved * captures(26))).toBeCloseTo(42 / 26);
  });

  it("種がなければ中性子は捨てられる", () => {
    const { sProcess } = captureNeutrons(createSProcess(), 10);
    expect(sProcess.amounts.every((a) => a === 0)).toBe(true);
  });

  it("量が 0.01 を超えた元素を発見する（鉄は最初から）", () => {
    const { discovered } = captureNeutrons(withAmounts({ 26: 1 }), 0.3);
    expect(discovered).toEqual([27]);
  });

  it("r過程で作る元素は、量が増えても発見しない", () => {
    const { discovered } = captureNeutrons(withAmounts({ 78: 1 }), 100);
    expect(discovered).toEqual([]);
  });

  it("一度発見した元素は、もう一度は数えない", () => {
    const sp = withAmounts({ 26: 1 });
    sp.discovered = [27];
    expect(captureNeutrons(sp, 0.3).discovered).toEqual([]);
  });

  it("ビスマスがごくわずか（発見の量に満たない）なら、循環を見たことにはしない", () => {
    const { sProcess, looped } = captureNeutrons(withAmounts({ 83: 1e-9, 26: 1 }), 100);
    expect(looped).toBe(false);
    expect(sProcess.looped).toBe(false);
  });

  it("ビスマスが中性子を捕まえると鉛に戻り、初めて戻ったら循環を見たことになる", () => {
    const { sProcess, looped } = captureNeutrons(withAmounts({ 83: 1 }), 100);
    expect(sProcess.amounts[index(83)]).toBe(0);
    expect(sProcess.amounts[index(82)]).toBeCloseTo(1);
    expect(looped).toBe(true);
    expect(sProcess.looped).toBe(true);
    expect(captureNeutrons(sProcess, 1).looped).toBe(false);
  });
});

describe("発見の効果", () => {
  it("発見した s元素1つにつき中性子 +5%、鉛を発見していれば ×2", () => {
    const meta = layer3Meta();
    meta.sProcess.discovered = [27, 28, 29];
    expect(neutronMultiplier(meta)).toBeCloseTo(1.15);
    meta.sProcess.discovered = [27, 82];
    expect(neutronMultiplier(meta)).toBeCloseTo(1.1 * 2);
  });

  it("ストロンチウムを発見していれば鉄の種 ×2", () => {
    const meta = layer3Meta();
    expect(seedsPerIa(meta)).toBe(1);
    meta.sProcess.discovered = [38];
    expect(seedsPerIa(meta)).toBe(2);
  });

  it("バリウムを発見していればすべての星屑 ×2", () => {
    const meta = layer3Meta();
    const star = createStar(meta);
    star.mass.C = 4;
    const before = dustPreview(meta, star).C;
    meta.sProcess.discovered = [56];
    expect(dustPreview(meta, star).C).toBe(Math.floor(4 ** 1.1 * 1.05 * 2));
    expect(before).toBe(Math.floor(4 ** 1.1));
  });

  it("発見した s元素1つにつき、すべての星屑 +5%（足し算）", () => {
    const meta = layer3Meta();
    meta.sProcess.discovered = [27, 28, 29, 30];
    expect(sDustMultiplier(meta)).toBeCloseTo(1.2, 10);
  });
});

describe("Ia型超新星", () => {
  function layer3(): GameState {
    const meta = layer3Meta({ whiteDwarfs: 2 });
    return { meta, star: createStar(meta) };
  }

  it("白色矮星を1つ使って、鉄の種を1つ道に入れる", () => {
    const next = triggerIa(layer3());
    expect(next.meta.whiteDwarfs).toBe(1);
    expect(next.meta.sProcess.amounts[0]).toBe(1);
  });

  it("白色矮星がなければ起こせない", () => {
    const game = layer3();
    game.meta.whiteDwarfs = 0;
    expect(triggerIa(game)).toBe(game);
  });

  it("第3層が解放されるまでは起こせない", () => {
    const meta = { ...createMeta(), whiteDwarfs: 2 };
    const game = { meta, star: createStar(meta) };
    expect(triggerIa(game)).toBe(game);
  });
});

describe("第3層の解放と中性子", () => {
  it("白色矮星が規定の数になると第3層が解放される", () => {
    expect(LAYER3_AFTER).toBe(40);
  });

  it("第3層の解放後、軽い星のヘリウム燃焼が中性子を出し、鉄の種が捕まえる", () => {
    const meta = layer3Meta({ nextMass: 3 });
    meta.sProcess.amounts[0] = 1;
    const game: GameState = { meta, star: createStar(meta) };
    game.star.mass.H = 1;
    game.star.mass.He = 2;
    game.star.temperature = 2e8;
    game.star.levels.He = 10;
    game.star.agbStartedAt = 0;
    const { state } = step(game, 1);
    expect(state.meta.sProcess.amounts[0]).toBeLessThan(1);
    expect(state.meta.sProcess.amounts[1]).toBeGreaterThan(0);
  });

  it("道の上で元素を見つけたり、ビスマスから鉛に戻ったりしたら知らせる", () => {
    const meta = layer3Meta({ nextMass: 3 });
    meta.sProcess.amounts[0] = 1;
    meta.sProcess.amounts[S_PATH_END - S_PATH_START] = 1;
    const game: GameState = { meta, star: createStar(meta) };
    game.star.mass.H = 1;
    game.star.mass.He = 2;
    game.star.temperature = 2e8;
    game.star.levels.He = 50;
    game.star.agbStartedAt = 0;
    const { events } = step(game, 1);
    expect(events).toContainEqual({ type: "sDiscover", z: 27 });
    expect(events).toContainEqual({ type: "sLoop" });
  });

  it("漸近巨星分枝星になる前の軽い星は中性子を出さない", () => {
    const meta = layer3Meta({ nextMass: 3 });
    meta.sProcess.amounts[0] = 1;
    const game: GameState = { meta, star: createStar(meta) };
    game.star.mass.H = 1;
    game.star.mass.He = 2;
    game.star.temperature = 2e8;
    game.star.levels.He = 10;
    expect(step(game, 1).state.meta.sProcess.amounts[0]).toBe(1);
  });

  it("炭素星（4 M☉ 未満）は中性子を3倍出す", () => {
    const run = (mass: number) => {
      const meta = layer3Meta({ nextMass: mass });
      meta.sProcess.amounts[0] = 100;
      const game: GameState = { meta, star: createStar(meta) };
      game.star.mass.H = 0.1;
      game.star.mass.He = 2;
      game.star.temperature = 2e8;
      game.star.levels.He = 10;
      game.star.agbStartedAt = 0;
      return 100 - step(game, 0.1).state.meta.sProcess.amounts[0]!;
    };
    expect(run(3) / run(5)).toBeCloseTo(3);
  });

  it("重い星は中性子を出さない", () => {
    const meta = layer3Meta();
    meta.sProcess.amounts[0] = 1;
    const game: GameState = { meta, star: createStar(meta) };
    game.star.mass.He = 5;
    game.star.temperature = 2e8;
    game.star.levels.He = 10;
    expect(step(game, 1).state.meta.sProcess.amounts[0]).toBe(1);
  });
});
