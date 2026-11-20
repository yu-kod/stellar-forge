import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { buyShopItem } from "@/game/actions";
import { LAYER2_AFTER } from "@/game/balance";
import { createGame, createStar } from "@/game/star";
import type { GameState } from "@/game/types";
import { collapsed, manualTicker } from "@/test-utils/game";
import { GameScreen } from "./GameScreen";

function renderGame(initial: GameState) {
  const clock = manualTicker();
  render(<GameScreen initial={initial} ticker={clock.ticker} />);
  return { ...clock, user: userEvent.setup() };
}

function withCluster(game: GameState = createGame()): GameState {
  game.meta.supernovae = LAYER2_AFTER;
  game.meta.dust.N = 30;
  return buyShopItem(game, "cluster");
}

describe("GameScreen：星団", () => {
  it("星団を持っていなければ出さない", () => {
    renderGame(createGame());
    expect(screen.queryByRole("region", { name: "星団" })).not.toBeInTheDocument();
  });

  it("星団の星の質量・世代・時間と、どう終わるかを見せる", () => {
    renderGame(withCluster());
    const slot = within(screen.getByRole("region", { name: "星団" })).getByRole("article", {
      name: "星団の星 2",
    });
    expect(slot).toHaveTextContent("7.00 M☉");
    expect(slot).toHaveTextContent("白色矮星になる");
    expect(slot).toHaveTextContent("0秒");
  });

  it("主星と一緒に時間が進む", () => {
    const { tick } = renderGame(withCluster());
    for (let i = 0; i < 8; i++) tick(0.25);
    const slot = screen.getByRole("article", { name: "星団の星 2" });
    expect(slot).toHaveTextContent("2秒");
  });

  it("主星が超新星の画面で止まっていても、星団の星は燃え続ける", () => {
    const { tick } = renderGame(withCluster(collapsed()));
    for (let i = 0; i < 8; i++) tick(0.25);
    expect(screen.getByRole("article", { name: "星団の星 2", hidden: true })).toHaveTextContent(
      "2秒"
    );
  });

  it("狙う星屑と次に生む質量を変えられる", async () => {
    const { user } = renderGame(withCluster());
    const slot = screen.getByRole("article", { name: "星団の星 2" });

    await user.selectOptions(within(slot).getByRole("combobox", { name: "狙う星屑" }), "Ne");
    await user.click(within(slot).getByRole("button", { name: "3 M☉" }));

    expect(within(slot).getByRole("combobox", { name: "狙う星屑" })).toHaveValue("Ne");
    expect(slot).toHaveTextContent("次は 3 M☉");
  });

  it("今の星屑を見せ、7 M☉ のボタンで軽い星に戻せる", async () => {
    const game = withCluster();
    game.meta.cluster[0]!.star.mass.C = 2;
    const { user } = renderGame(game);
    const slot = screen.getByRole("article", { name: "星団の星 2" });
    expect(within(slot).getByRole("listitem", { name: "炭素 2" })).toBeInTheDocument();

    await user.click(within(slot).getByRole("button", { name: "上限" }));
    await user.click(within(slot).getByRole("button", { name: "7 M☉" }));

    expect(slot).toHaveTextContent("次は 7 M☉");
  });

  it("重い星なら超新星になると書く", () => {
    const game = withCluster();
    game.meta.cluster[0]!.star = createStar(game.meta);
    renderGame(game);
    expect(screen.getByRole("article", { name: "星団の星 2" })).toHaveTextContent("超新星になる");
  });

  it("上限のボタンで重い星にできる", async () => {
    const { user } = renderGame(withCluster());
    const slot = screen.getByRole("article", { name: "星団の星 2" });
    await user.click(within(slot).getByRole("button", { name: "上限" }));
    expect(slot).toHaveTextContent("次は 25 M☉");
  });
});
