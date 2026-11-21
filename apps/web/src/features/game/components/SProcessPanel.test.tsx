import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { S_DISCOVERY_THRESHOLD, S_PATH_START } from "@/game/sprocess";
import { createGame } from "@/game/star";
import type { Meta } from "@/game/types";
import { SProcessPanel } from "./SProcessPanel";

/** ジルコニウムの作った量が、t 秒で発見の量の rate 倍ずつ増える第3層 */
function at(t: number, progress: number): Meta {
  const { meta } = createGame();
  meta.elapsed = t;
  meta.sProcess = { ...meta.sProcess, unlocked: true, discovered: [27, 28, 29] };
  meta.sProcess.produced = meta.sProcess.produced.map(() => 0);
  meta.sProcess.produced[40 - S_PATH_START] = S_DISCOVERY_THRESHOLD * progress;
  return meta;
}

describe("SProcessPanel：次の発見までの見込み", () => {
  it("いまの種で、次の発見までのおよその時間を出す（10秒見てから）", () => {
    const dispatch = () => {};
    const { rerender } = render(<SProcessPanel meta={at(0, 0.1)} dispatch={dispatch} />);
    expect(screen.queryByText(/次の発見/)).not.toBeInTheDocument();
    // 毎秒 0.5% ずつ伸びる
    for (let t = 1; t <= 20; t++) {
      rerender(<SProcessPanel meta={at(t, 0.1 + 0.005 * t)} dispatch={dispatch} />);
    }
    // 残り 80% ÷ 毎秒 0.5% = 160秒
    expect(screen.getByText(/次の発見/)).toHaveTextContent(
      "いまの種で、次の発見 ジルコニウム（Zr）まで約3分"
    );
  });
});
