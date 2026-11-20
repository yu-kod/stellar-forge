import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";

const MINUTE = 60;

/** 最初の15分：狙い（どの段階まで燃やすか）で流れが変わる */
describe("最初の15分の狙い", () => {
  let silicon: IdleReport;
  let oxygen: IdleReport;
  beforeAll(() => {
    silicon = playIdle(15 * MINUTE, { target: "Si" });
    oxygen = playIdle(15 * MINUTE, { target: "O" });
  }, 300_000);

  it("ケイ素まで燃やすと、鉄の芯が崩壊して硫黄が残り、燃焼の自動制御に届く", () => {
    expect(silicon.marks.auto).toBeLessThanOrEqual(15 * MINUTE);
  });

  it("酸素で止めると、星は崩壊せずに燃え尽き、硫黄が残らないので自動制御に届かない", () => {
    expect(oxygen.state.meta.supernovae).toBeLessThan(silicon.state.meta.supernovae);
    expect(oxygen.state.meta.dust.S).toBe(0);
    expect(oxygen.marks.auto).toBeUndefined();
  });
});
