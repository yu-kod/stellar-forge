import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PROJECTION_HORIZON } from "@/game/projection";
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
    render(
      <SProcessPanel meta={at(20, 0.2)} track={track} projection={null} dispatch={dispatch} />
    );
    expect(screen.getByText(/次の発見/)).toHaveTextContent(
      "いまの種で、次の発見 ジルコニウム（Zr）まで約3分"
    );
  });

  it("追い始めたばかりなら出さない", () => {
    const track = trackProgress(null, { z: 40, progress: 0.1, t: 0 });
    render(<SProcessPanel meta={at(0, 0.1)} track={track} projection={null} dispatch={() => {}} />);
    expect(screen.queryByText(/次の発見/)).not.toBeInTheDocument();
  });

  it("種ごとに、自動交換で進めたときの次のピークまでの見込みを出す（どれが一番かの印は付けない）", () => {
    const meta = at(0, 0.1);
    const job = (seeds: number, reachedAt: number | null, elapsed: number) => ({
      seeds,
      peak: 56,
      state: { meta, star: createGame().star },
      elapsed,
      reachedAt,
    });
    const projection = [
      job(1, null, PROJECTION_HORIZON),
      job(3, 40 * 60, 40 * 60),
      job(10, 34 * 60, 34 * 60),
      job(30, null, 20 * 60),
    ];
    render(<SProcessPanel meta={meta} track={null} projection={projection} dispatch={() => {}} />);
    const list = screen.getByRole("list", { name: "種の見込み" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("バリウムまで 90分より先");
    expect(rows[1]).toHaveTextContent("バリウムまで約40分");
    expect(rows[2]).toHaveTextContent("バリウムまで約34分");
    expect(rows[3]).toHaveTextContent("バリウムまで 計算中");
    expect(list).not.toHaveTextContent("一番");
  });
});
