import { canAutoRebirth } from "./actions";
import { advanceAll } from "./cluster";
import type { GameState } from "./types";

/** 留守の間を進める上限 [秒] */
export const AWAY_LIMIT_SECONDS = 12 * 3600;
/** 留守の間は粗い刻みで進める（ケイ素燃焼の最短 8 秒より十分短い） */
export const AWAY_STEP_SECONDS = 2;
/** 画面の1フレームで進める留守の時間 [秒]。長い留守は数十フレームに分ける */
export const AWAY_CHUNK_SECONDS = 900;

/** 主星が終わって超新星の画面で止まり、星団もなければ、留守の間は何も進まない */
export function isStopped(game: GameState): boolean {
  return game.star.end !== null && !canAutoRebirth(game.meta) && game.meta.cluster.length === 0;
}

/** 留守の間を進める */
export function advanceAway(game: GameState, seconds: number): GameState {
  if (isStopped(game)) return game;
  return advanceAll(game, seconds, AWAY_STEP_SECONDS).state;
}
