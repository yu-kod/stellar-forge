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

  it("第3層で主星を炭素星にすると、循環に8分以上早く届き、その分だけ早く完結する（第4層の長さはほぼ変わらない）", () => {
    expect(steer.marks.loop! - carbonStar.marks.loop!).toBeGreaterThanOrEqual(8 * MINUTE);
    const layer4 = (r: IdleReport) => r.marks.complete! - r.marks.layer4!;
    expect(Math.abs(layer4(carbonStar) - layer4(steer))).toBeLessThanOrEqual(5 * MINUTE);
    expect(steer.marks.complete! - carbonStar.marks.complete!).toBeGreaterThanOrEqual(8 * MINUTE);
  });
});
