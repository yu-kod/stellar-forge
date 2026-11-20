import { canAutoRebirth, rebirth } from "./actions";
import { MAX_STEP_SECONDS } from "./balance";
import { dustPreview } from "./dust";
import { step, type GameEvent, type StepResult } from "./step";
import type { DustId, GameState, StarEnd } from "./types";

/** 自動で次の星を生んだときの知らせ */
export type SupernovaEvent = {
  type: "supernova";
  generation: number;
  gain: Record<DustId, number>;
  end: Exclude<StarEnd, null>;
};
export type RunsResult = { state: GameState; events: (GameEvent | SupernovaEvent)[] };

/** seconds 秒を maxStep 秒以下の等しい刻みに分けて進める。星が終わったらそこで止める */
export function advance(
  state: GameState,
  seconds: number,
  maxStep: number = MAX_STEP_SECONDS
): StepResult {
  const count = Math.ceil(seconds / maxStep);
  const dt = seconds / count;
  let current = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < count && !current.star.end; i++) {
    const result = step(current, dt);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

/**
 * advance と同じく進めるが、自動で次の星を生めるなら、星が終わるたびに次の星を生んで
 * 残りの時間も進める（画面を開いている間と、留守中の進行で使う）
 */
export function advanceRuns(
  state: GameState,
  seconds: number,
  maxStep: number = MAX_STEP_SECONDS
): RunsResult {
  let current = state;
  let remaining = seconds;
  const events: RunsResult["events"] = [];
  for (;;) {
    const before = current.star.time;
    const result = advance(current, remaining, maxStep);
    current = result.state;
    events.push(...result.events);
    remaining -= current.star.time - before;
    if (!current.star.end || !canAutoRebirth(current.meta) || remaining <= 0) break;
    const gain = dustPreview(current.meta, current.star);
    events.push({
      type: "supernova",
      generation: current.star.generation,
      gain,
      end: current.star.end,
    });
    current = rebirth(current);
  }
  return { state: current, events };
}
