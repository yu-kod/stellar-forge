import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { buyShopItem } from "@/game/actions";
import { LAYER2_AFTER } from "@/game/balance";
import { createGame } from "@/game/star";
import type { GameState } from "@/game/types";
import { collapsed, manualTicker } from "@/test-utils/game";
import { GameScreen } from "./GameScreen";

function renderGame(initial: GameState = createGame()) {
  const clock = manualTicker();
  render(<GameScreen initial={initial} ticker={clock.ticker} />);
  return { ...clock, user: userEvent.setup() };
}

const tabNames = () =>
  within(screen.getByRole("tablist", { name: "画面" }))
    .getAllByRole("tab")
    .map((tab) => tab.textContent);

describe("GameScreen：画面のタブ（スマホで縦に長くしない）", () => {
  it("最初は星・星屑・周期表・記録の4つ。星を開いている", () => {
    renderGame();
    expect(tabNames()).toEqual(["星", "星屑", "周期表", "記録"]);
    expect(screen.getByRole("tab", { name: "星" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "燃焼段階" })).toBeInTheDocument();
  });

  it("星団と s過程は、解放されたらタブが増える", async () => {
    const game = createGame();
    game.meta.supernovae = LAYER2_AFTER;
    game.meta.dust.N = 30;
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true };
    const { user } = renderGame(buyShopItem(game, "cluster"));
    expect(tabNames()).toEqual(["星", "星団", "s過程", "星屑", "周期表", "記録"]);
    expect(screen.queryByRole("region", { name: "s過程" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "s過程" }));
    expect(screen.getByRole("region", { name: "s過程" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "燃焼段階" })).not.toBeInTheDocument();
  });
});

describe("GameScreen：次の星を生んだあとのタブ", () => {
  it("交換できる強化がなければ、星のタブのまま", async () => {
    const game = collapsed();
    game.meta.shop.boom = 0;
    game.star.mass = { ...game.star.mass, C: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 0 };
    const { user } = renderGame(game);
    await user.click(screen.getByRole("button", { name: "放出された元素から次の星を生む" }));
    expect(screen.getByRole("tab", { name: "星" })).toHaveAttribute("aria-selected", "true");
  });
});
