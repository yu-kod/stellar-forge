import { setTarget } from "./actions";
import { advance } from "./advance";
import { dustPreview } from "./dust";
import { createStar } from "./star";
import type { DustId, Meta, Target } from "./types";

export type RunPreview = { seconds: number; dust: Record<DustId, number> };

/** 見込みを出すときの刻み（画面で4つの狙いを毎周見込むので、粗く速く） */
const PREVIEW_STEP_SECONDS = 0.25;
/** 見込みを打ち切る長さ [秒] */
const PREVIEW_LIMIT_SECONDS = 3600;

/**
 * 今の恒久強化のまま、次の星をその狙いで燃やしたら（燃焼は自動で強化する）どうなるかを見込む。
 * meta は変えない
 */
export function previewRun(meta: Meta, target: Target): RunPreview {
  const steered = setTarget({ meta, star: createStar(meta) }, target).meta;
  const start = { meta: { ...steered, autoRebirth: false }, star: createStar(steered) };
  const { state } = advance(start, PREVIEW_LIMIT_SECONDS, PREVIEW_STEP_SECONDS);
  return { seconds: state.star.time, dust: dustPreview(state.meta, state.star) };
}
