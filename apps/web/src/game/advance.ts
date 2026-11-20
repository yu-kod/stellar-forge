import { MAX_STEP_SECONDS } from "./balance";
import { step, type GameEvent, type StepResult } from "./step";
import type { GameState } from "./types";

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
