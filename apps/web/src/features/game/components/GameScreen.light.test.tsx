import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AUTO_REBIRTH_AFTER, LAYER2_AFTER } from "@/game/balance";
import { createGame } from "@/game/star";
import type { GameState } from "@/game/types";
import { aboutToCollapse, collapsed, manualTicker } from "@/test-utils/game";
import { createModel, gameReducer } from "../model";
import { GameScreen } from "./GameScreen";

function renderGame(initial: GameState) {
  const clock = manualTicker();
  render(<GameScreen initial={initial} ticker={clock.ticker} />);
  return { ...clock, user: userEvent.setup() };
}

const lightNotices = (model: ReturnType<typeof createModel>) =>
  model.notices.flatMap((n) => (n.event.type === "light" ? [n.event.z] : []));

describe("軽い元素（リチウム〜マンガン）", () => {
  it("超新星の後に次の星を生むと、見つけた軽い元素を知らせる", async () => {
    const game = collapsed();
    game.star.mass.Ne = 1;
    const { user } = renderGame(game);
    await user.click(screen.getByRole("button", { name: "放出された元素から次の星を生む" }));
    expect(screen.getByRole("status")).toHaveTextContent("新元素 ナトリウム（Na）");
  });

  it("自動で次の星を生んだときも知らせる", () => {
    const game = aboutToCollapse();
    game.meta.supernovae = AUTO_REBIRTH_AFTER;
    game.meta.autoRebirth = true;
    const model = gameReducer(createModel(game), { type: "tick", seconds: 60 });
    expect(lightNotices(model)).toContain(11);
  });

  it("Ia型超新星で見つけたものも知らせる", () => {
    const game = createGame();
    game.meta.supernovae = LAYER2_AFTER;
    game.meta.whiteDwarfs = 5;
    game.meta.iaSupernovae = 4;
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true };
    const model = gameReducer(createModel(game), { type: "triggerIa", count: 1 });
    expect(lightNotices(model)).toEqual([23]);
  });

  it("周期表で見つけた軽い元素を色付けし、作った場所を書く。まだのものは作り方を書く", async () => {
    const game = createGame();
    game.meta.lightFound = [11];
    const { user } = renderGame(game);
    await user.click(screen.getByRole("tab", { name: "周期表" }));
    expect(screen.getByRole("listitem", { name: /^11 Na ナトリウム：炭素燃焼/ })).toHaveClass(
      "bg-el-light"
    );
    expect(
      screen.getByRole("listitem", { name: /^3 Li リチウム（未発見）：宇宙線/ })
    ).not.toHaveClass("bg-el-light");
    expect(screen.getByText(/発見した元素/)).toHaveTextContent("発見した元素 2 / 83");
  });
});
