import { S_DISCOVERABLE } from "@/game/sprocess";
import { createGame } from "@/game/star";
import type { Galaxy, GameState } from "@/game/types";
import { playIdle, type IdleReport, type SeedPlan } from "./simulate";

const LIMIT = 330 * 60;

/** ストロンチウムまでは30、その先は to、s元素がそろったら30（局面で種を変える流れ） */
export function reduceAfterStrontium(to: number): (s: GameState) => number {
  return (s) =>
    s.meta.sProcess.discovered.length === S_DISCOVERABLE
      ? 30
      : s.meta.sProcess.discovered.includes(38)
        ? to
        : 30;
}

/**
 * 画面の初期設定の流れ（星団 7・7 M☉）で、第3層の主星を炭素星にするか・種の決め方（省略すると初期値）を変えて完結まで遊ぶ。
 * 金属の多い銀河は1回完結した後にしか選べないので、2周目（前の周の星屑を持って始まる）として遊ぶ
 */
export function playFlow(
  galaxy: Galaxy,
  { seedTarget, carbonStar }: { seedTarget?: SeedPlan; carbonStar: boolean }
): IdleReport {
  return playIdle(LIMIT, {
    start: createGame(galaxy, galaxy === "metalRich" ? 1 : 0),
    keepCluster: true,
    layer3MainMass: carbonStar ? 2 : undefined,
    seedTarget,
    stopAt: "complete",
  });
}
