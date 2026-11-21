import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { S_DISCOVERY_THRESHOLD, S_PATH_START } from "@/game/sprocess";
import { createGame } from "@/game/star";
import type { Meta } from "@/game/types";
import { trackProgress, type ProgressTrack } from "../eta";
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
  it("追跡（モデルが持つ）から、いまの種で次の発見までのおよその時間を出す", () => {
    const dispatch = () => {};
    // 毎秒 0.5% ずつ伸びた20秒
    let track: ProgressTrack | null = null;
    for (let t = 0; t <= 20; t++)
      track = trackProgress(track, { z: 40, progress: 0.1 + 0.005 * t, t });
    // 残り 80% ÷ 毎秒 0.5% = 160秒。描き直した直後（タブを移って戻った）でもすぐ出る
    render(<SProcessPanel meta={at(20, 0.2)} track={track} dispatch={dispatch} />);
    expect(screen.getByText(/次の発見/)).toHaveTextContent(
      "いまの種で、次の発見 ジルコニウム（Zr）まで約3分"
    );
  });

  it("追い始めたばかりなら出さない", () => {
    const track = trackProgress(null, { z: 40, progress: 0.1, t: 0 });
    render(<SProcessPanel meta={at(0, 0.1)} track={track} dispatch={() => {}} />);
    expect(screen.queryByText(/次の発見/)).not.toBeInTheDocument();
  });
});
