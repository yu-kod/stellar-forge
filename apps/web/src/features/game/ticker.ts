/** 経過秒数を受け取るコールバックを登録し、止める関数を返す。テストでは手で進める ticker に差し替える */
export type Ticker = (onFrame: (seconds: number) => void) => () => void;

const MAX_FRAME_SECONDS = 0.25;

export const animationFrameTicker: Ticker = (onFrame) => {
  let last: number | undefined;
  let id = requestAnimationFrame(loop);
  function loop(now: number) {
    if (last !== undefined) onFrame(Math.min(MAX_FRAME_SECONDS, (now - last) / 1000));
    last = now;
    id = requestAnimationFrame(loop);
  }
  return () => cancelAnimationFrame(id);
};
