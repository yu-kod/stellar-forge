import { describe, expect, it } from "vitest";
import { GALAXIES } from "./balance";
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
});
