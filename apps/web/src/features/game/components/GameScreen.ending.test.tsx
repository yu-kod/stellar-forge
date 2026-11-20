import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createGame } from "@/game/star";
import { manualTicker } from "@/test-utils/game";
import { createModel, gameReducer } from "../model";
import { GameScreen } from "./GameScreen";

function completed() {
  const game = createGame();
  game.meta.completedAt = 4 * 3600 + 30 * 60;
  game.meta.elapsed = game.meta.completedAt;
  game.meta.supernovae = 520;
  game.meta.whiteDwarfs = 380;
  game.meta.iaSupernovae = 210;
  game.meta.rProcess.mergers = 150;
  game.star.generation = 900;
  return game;
}

describe("GameScreen：エンディング", () => {
  it("83マスが埋まった画面：かかった時間と、これまでの星の数、起源で塗り分けた周期表", async () => {
    const user = userEvent.setup();
    render(<GameScreen initial={completed()} ticker={manualTicker().ticker} />);
    await user.click(screen.getByRole("tab", { name: "記録" }));
    await user.click(screen.getByRole("button", { name: "エンディングを見る" }));
    const dialog = screen.getByRole("dialog", { name: "周期表が埋まった" });
    expect(dialog).toHaveTextContent("4時間30分");
    const stats = within(dialog).getByRole("list", { name: "ここまでの星" });
    expect(stats).toHaveTextContent("星900世代");
    expect(stats).toHaveTextContent("超新星520");
    expect(stats).toHaveTextContent("白色矮星380");
    expect(stats).toHaveTextContent("Ia型超新星210");
    expect(stats).toHaveTextContent("中性子星合体150");
    const legend = within(dialog).getByRole("list", { name: "元素の起源" });
    expect(within(legend).getAllByRole("listitem")).toHaveLength(6);
    expect(
      within(dialog).getByRole("listitem", { name: "79 Au 金：中性子星合体" })
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "宇宙を見続ける" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Esc でも閉じられる", async () => {
    const user = userEvent.setup();
    const game = completed();
    render(<GameScreen initial={game} ticker={manualTicker().ticker} />);
    await user.click(screen.getByRole("tab", { name: "記録" }));
    await user.click(screen.getByRole("button", { name: "エンディングを見る" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("初めて埋まったときは自分で開く", () => {
    const model = gameReducer(createModel(createGame()), { type: "openEnding" });
    expect(model.ending).toBe(true);
  });
});

describe("EndingDialog", () => {
  it("まだ埋まっていなければ時間は 0分（記録からは開けない）", async () => {
    const { EndingDialog } = await import("./EndingDialog");
    render(<EndingDialog game={createGame()} open onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("（0分）");
  });
});
