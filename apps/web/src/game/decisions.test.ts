import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";

const HOURS = 5;
const MINUTE = 60;

/** 判断が結果を変える（4時間、画面を開いたまま遊ぶ） */
describe("遊び方による違い", () => {
  let steer: IdleReport;
  let handsOff: IdleReport;
  let carbonStar: IdleReport;
  beforeAll(() => {
    steer = playIdle(HOURS * 3600);
    handsOff = playIdle(HOURS * 3600, { steer: false });
    carbonStar = playIdle(HOURS * 3600, { layer3MainMass: 2 });
  }, 1_200_000);

  it("次の目標に合わせて狙いと質量を決めると、何も触らないより5分以上早く第3層に届く", () => {
    expect(handsOff.marks.layer3! - steer.marks.layer3!).toBeGreaterThanOrEqual(5 * MINUTE);
  });

  it("第3層で主星を炭素星にすると、循環に10分以上早く届くが、超新星の星屑が減って第4層は長くなる（83マスまではどちらの道も10分以内）", () => {
    expect(steer.marks.loop! - carbonStar.marks.loop!).toBeGreaterThanOrEqual(10 * MINUTE);
    const layer4 = (r: IdleReport) => r.marks.complete! - r.marks.layer4!;
    expect(layer4(carbonStar)).toBeGreaterThan(layer4(steer));
    expect(Math.abs(carbonStar.marks.complete! - steer.marks.complete!)).toBeLessThanOrEqual(
      10 * MINUTE
    );
  });
});
