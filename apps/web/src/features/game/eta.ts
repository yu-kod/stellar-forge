/** 次に見つける元素の進み具合（0〜1）と、そのときの時刻 [秒] */
export type ProgressSample = { z: number; progress: number; t: number };

/** 進み具合の追跡：最後の点と、ならした伸び [毎秒]、その元素を追い始めた時刻 */
export type ProgressTrack = ProgressSample & { rate: number | null; since: number };

/** 伸びをならす時間 [秒]（これくらいの間の平均になる） */
const SMOOTHING_SECONDS = 60;
/** 追い始めてから見積もりを出すまで [秒] */
const WARMUP_SECONDS = 10;

/** 新しい点で追跡を進める。元素が変わったら追い直す */
export function trackProgress(track: ProgressTrack | null, sample: ProgressSample): ProgressTrack {
  if (track === null || track.z !== sample.z) return { ...sample, rate: null, since: sample.t };
  const dt = sample.t - track.t;
  if (dt <= 0) return track;
  const instant = (sample.progress - track.progress) / dt;
  const rate =
    track.rate === null
      ? instant
      : track.rate + (instant - track.rate) * Math.min(1, dt / SMOOTHING_SECONDS);
  return { ...sample, rate, since: track.since };
}

/** 残りの時間の見積もり [秒]。追い始めて間もない・伸びていないなら null */
export function etaSeconds(track: ProgressTrack | null): number | null {
  if (track === null || track.rate === null || track.rate <= 0) return null;
  if (track.t - track.since < WARMUP_SECONDS) return null;
  return (1 - track.progress) / track.rate;
}
