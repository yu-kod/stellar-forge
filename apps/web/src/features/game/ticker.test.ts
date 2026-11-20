import { describe, expect, it, vi } from "vitest";
import { animationFrameTicker } from "./ticker";

function fakeAnimationFrames() {
  let callback: FrameRequestCallback | undefined;
  const request = vi.fn((cb: FrameRequestCallback) => {
    callback = cb;
    return 7;
  });
  const cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", cancel);
  return { frame: (now: number) => callback?.(now), cancel };
}

describe("animationFrameTicker", () => {
  it("前のフレームからの経過秒数を渡す（最初のフレームは基準にするだけ）", () => {
    const frames = fakeAnimationFrames();
    const onFrame = vi.fn();
    animationFrameTicker(onFrame);

    frames.frame(1000);
    frames.frame(1016);
    frames.frame(1116);

    expect(onFrame.mock.calls).toEqual([[0.016], [0.1]]);
  });

  it("タブが裏にあったなどで間が空いても、1フレームは0.25秒までに抑える", () => {
    const frames = fakeAnimationFrames();
    const onFrame = vi.fn();
    animationFrameTicker(onFrame);

    frames.frame(0);
    frames.frame(5000);

    expect(onFrame).toHaveBeenCalledWith(0.25);
  });

  it("止めると次のフレームを取り消す", () => {
    const frames = fakeAnimationFrames();
    const stop = animationFrameTicker(vi.fn());
    stop();
    expect(frames.cancel).toHaveBeenCalledWith(7);
  });
});
