import { describe, expect, it } from "vitest";
import { GALAXIES, HERITAGE_DUST, HERITAGE_HEAVY } from "./balance";
import { binarySlots } from "./merger";
import { NEUTRON_POISON, captureNeutrons, neutronPoison, seedPreview } from "./sprocess";
import { createGame, whiteDwarfsMade } from "./star";
import { GALAXY_IDS } from "./types";

describe("周の初めに選ぶ銀河", () => {
  it("はじめは天の川。ほかの銀河を選んで始められる", () => {
    expect(GALAXY_IDS).toEqual(["milkyWay", "metalRich"]);
    expect(createGame().meta.galaxy).toBe("milkyWay");
    expect(createGame("metalRich").meta.galaxy).toBe("metalRich");
    expect(GALAXIES.milkyWay.name).toBe("天の川");
    expect(GALAXIES.metalRich.name).toBe("金属の多い銀河の中心");
    // 説明は物理だけ。作戦（種をどうするか）は書かない
    expect(GALAXIES.metalRich.description).not.toMatch(/種/);
  });

  it("金属の多い銀河の中心は古い星が多く、はじめから白色矮星が20個ある（作った数・星の世代には数えない）", () => {
    const rich = createGame("metalRich");
    expect(GALAXIES.metalRich.whiteDwarfs).toBe(20);
    expect(rich.meta.whiteDwarfs).toBe(20);
    expect(createGame().meta.whiteDwarfs).toBe(0);
    expect(whiteDwarfsMade(rich.meta)).toBe(0);
    expect(rich.star.generation).toBe(1);
  });

  it("金属の多い銀河では、中性子を吸う軽い原子核（中性子の毒）が4倍。道に届く中性子が減る", () => {
    const milky = createGame().meta;
    const rich = createGame("metalRich").meta;
    expect(neutronPoison(milky)).toBe(NEUTRON_POISON);
    expect(neutronPoison(rich)).toBe(NEUTRON_POISON * 4);
    expect(seedPreview(rich, 1).share).toBeLessThan(seedPreview(milky, 1).share);
    const sp = { ...milky.sProcess, unlocked: true };
    sp.amounts = sp.amounts.map((_, i) => (i === 0 ? 1 : 0));
    const moved = (poison: number) => 1 - captureNeutrons(sp, 1, poison).sProcess.amounts[0]!;
    expect(moved(NEUTRON_POISON * 4)).toBeLessThan(moved(NEUTRON_POISON));
  });

  it("金属の多い銀河の中心は星が密集していて、連星の枠がはじめから1つ多い", () => {
    const rich = createGame("metalRich").meta;
    rich.rProcess = { ...rich.rProcess, unlocked: true };
    const milky = createGame().meta;
    milky.rProcess = { ...milky.rProcess, unlocked: true };
    expect(GALAXIES.metalRich.binarySlots).toBe(1);
    expect(binarySlots(rich)).toBe(binarySlots(milky) + 1);
  });

  it("2周目からは、前の周で作った元素が星間物質に残り、星屑を持って始まる", () => {
    expect(createGame().meta.dust).toEqual(createGame("milkyWay", 0).meta.dust);
    expect(Object.values(createGame().meta.dust).every((n) => n === 0)).toBe(true);
    expect(createGame("milkyWay", 1).meta.dust).toEqual(HERITAGE_DUST);
    expect(createGame("metalRich", 3).meta.dust).toEqual(HERITAGE_DUST);
  });

  it("前の周の s元素も残り、重元素の星屑を持って始まる（1周目は持たない）", () => {
    expect(HERITAGE_HEAVY).toBeGreaterThan(0);
    expect(createGame().meta.sProcess.heavy).toBe(0);
    expect(createGame("milkyWay", 1).meta.sProcess.heavy).toBe(HERITAGE_HEAVY);
    expect(createGame("metalRich", 2).meta.sProcess.heavy).toBe(HERITAGE_HEAVY);
  });

  it("ケイ素と硫黄は残さない（はじめに使い切ると、爆発的ケイ素燃焼の元素を見つける機会がなくなる）", () => {
    expect(HERITAGE_DUST.Si).toBe(0);
    expect(HERITAGE_DUST.S).toBe(0);
  });
});
