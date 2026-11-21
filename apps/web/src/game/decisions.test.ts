import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";
import { SHOP, bestTarget } from "./balance";
import { nextShopGoal } from "./goal";
import { previewRun } from "./preview";
import { DUST_IDS, TARGET_IDS, type DustId, type GameState, type Target } from "./types";

/**
 * 燃焼の自動制御を持ったら、目標の答え（狙い）を読まず、狙う星屑の見込みで次の目標の星屑が一番多い狙いを選ぶ
 * （見込みは1分ごとに見直す）。自動制御の前は目標の案内に従う
 */
function byPreview(): (state: GameState) => Target {
  let checkedAt = -Infinity;
  let chosen: Target = "C";
  return (state) => {
    const currency = SHOP[nextShopGoal(state.meta).item].currency;
    if (!(DUST_IDS as readonly string[]).includes(currency)) return state.meta.target ?? chosen;
    if (!state.meta.shop.auto) return bestTarget(currency) ?? chosen;
    if (state.meta.elapsed - checkedAt < 60) return chosen;
    checkedAt = state.meta.elapsed;
    const amount = (target: Target) => previewRun(state.meta, target).dust[currency as DustId];
    chosen = [...TARGET_IDS].sort((a, b) => amount(b) - amount(a))[0]!;
    return chosen;
  };
}

const HOURS = 5;
const MINUTE = 60;

/** 判断が結果を変える（4時間、画面を開いたまま遊ぶ） */
describe("遊び方による違い", () => {
  let steer: IdleReport;
  let handsOff: IdleReport;
  let carbonStar: IdleReport;
  let previews: IdleReport;
  beforeAll(() => {
    previews = playIdle(HOURS * 3600, { target: byPreview(), stopAt: "layer3" });
    steer = playIdle(HOURS * 3600);
    handsOff = playIdle(HOURS * 3600, { steer: false });
    carbonStar = playIdle(HOURS * 3600, { layer3MainMass: 2 });
  }, 1_200_000);

  it("次の目標に合わせて狙いと質量を決めると、何も触らないより5分以上早く第3層に届く", () => {
    expect(handsOff.marks.layer3! - steer.marks.layer3!).toBeGreaterThanOrEqual(5 * MINUTE);
  });

  it("目標の答えを読まず、狙う星屑の見込みで比べて狙いを選んでも、何も触らないより5分以上早く第3層に届く（見込みが判断の材料になる）", () => {
    expect(handsOff.marks.layer3! - previews.marks.layer3!).toBeGreaterThanOrEqual(5 * MINUTE);
  });

  it("第3層で主星を炭素星にすると、循環に8分以上早く届き、その分だけ早く完結する（第4層の長さはほぼ変わらない）", () => {
    expect(steer.marks.loop! - carbonStar.marks.loop!).toBeGreaterThanOrEqual(8 * MINUTE);
    const layer4 = (r: IdleReport) => r.marks.complete! - r.marks.layer4!;
    expect(Math.abs(layer4(carbonStar) - layer4(steer))).toBeLessThanOrEqual(5 * MINUTE);
    expect(steer.marks.complete! - carbonStar.marks.complete!).toBeGreaterThanOrEqual(8 * MINUTE);
  });
});
