import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LAYER2_AFTER } from "@/game/balance";
import { createGame, createStar } from "@/game/star";
import type { GameState } from "@/game/types";
import { collapsed, manualTicker, openTab } from "@/test-utils/game";
import { GameScreen } from "./GameScreen";

function renderGame(initial: GameState) {
  const clock = manualTicker();
  render(<GameScreen initial={initial} ticker={clock.ticker} />);
  return { ...clock, user: userEvent.setup() };
}

function layer2(): GameState {
  const game = createGame();
  game.meta.supernovae = LAYER2_AFTER;
  game.star.generation = LAYER2_AFTER + 1;
  return game;
}

function lowMassStar(): GameState {
  const game = layer2();
  game.meta.nextMass = 3;
  return { ...game, star: createStar(game.meta) };
}

describe("GameScreen：第2層 星の質量を選ぶ", () => {
  it("40 M☉ を超えるとブラックホール。130 M☉ を超える星には対不安定型超新星の一言を添える", () => {
    const game = layer2();
    game.meta.shop.mass = 3; // 上限 40 M☉
    renderGame(game);
    expect(screen.getByRole("group", { name: "次に生む星の質量" })).not.toHaveTextContent(
      "ブラックホール"
    );
    cleanup();
    game.meta.shop.mass = 21; // 上限 130 M☉
    renderGame(game);
    const picker = screen.getByRole("group", { name: "次に生む星の質量" });
    expect(picker).toHaveTextContent("超新星になる（40 M☉ を超えるとブラックホールが残る）");
    expect(picker).toHaveTextContent("対不安定型超新星");
  });

  it("超新星5回までは質量を選べない", () => {
    renderGame(createGame());
    expect(screen.queryByRole("group", { name: "次に生む星の質量" })).not.toBeInTheDocument();
  });

  it("はじめは上限の質量で、超新星になると書く", () => {
    renderGame(layer2());
    const picker = screen.getByRole("group", { name: "次に生む星の質量" });
    expect(within(picker).getByRole("slider")).toHaveValue("25");
    expect(picker).toHaveTextContent("25 M☉：超新星になる");
  });

  it("軽い星を選ぶと、白色矮星になると書く", async () => {
    const { user } = renderGame(layer2());
    const picker = screen.getByRole("group", { name: "次に生む星の質量" });

    await user.click(within(picker).getByRole("button", { name: "3 M☉" }));

    expect(within(picker).getByRole("slider")).toHaveValue("3");
    expect(picker).toHaveTextContent("3 M☉：白色矮星になる（超新星にならない）");
  });

  it("8 M☉ からは超新星になる", async () => {
    const { user } = renderGame(layer2());
    const picker = screen.getByRole("group", { name: "次に生む星の質量" });
    await user.click(within(picker).getByRole("button", { name: "8 M☉" }));
    expect(picker).toHaveTextContent("8 M☉：超新星になる");
  });

  it("スライダーで細かく選べる。上限まで動かすと「上限」を選んだことになる", () => {
    const game = layer2();
    renderGame(game);
    const slider = within(screen.getByRole("group", { name: "次に生む星の質量" })).getByRole(
      "slider"
    );
    // range の操作は userEvent が扱えないので change を直接送る
    fireEvent.change(slider, { target: { value: "6" } });
    expect(slider).toHaveValue("6");
    fireEvent.change(slider, { target: { value: "25" } });
    expect(slider).toHaveValue("25");
  });

  it("自動で次の星を生むとき、白色矮星になったことを知らせる", () => {
    const game = lowMassStar();
    game.meta.supernovae = LAYER2_AFTER;
    game.star.mass.H = 0.29;
    game.star.agbStartedAt = -20;
    game.star.mass.He = 2.71;
    const { tick } = renderGame(game);
    tick(0.1);
    expect(screen.getByRole("status")).toHaveTextContent(/白色矮星 星屑 \+\d+/);
  });

  it("上限のボタンでいつでも一番重い星に戻せる", async () => {
    const game = layer2();
    game.meta.nextMass = 3;
    const { user } = renderGame(game);
    const picker = screen.getByRole("group", { name: "次に生む星の質量" });

    await user.click(within(picker).getByRole("button", { name: "上限 25 M☉" }));

    expect(within(picker).getByRole("slider")).toHaveValue("25");
  });

  it("軽い星では、炭素燃焼より先は点火しないと書き、白色矮星までの目標を出す", () => {
    renderGame(lowMassStar());
    const carbon = screen.getByRole("article", { name: "炭素燃焼" });
    expect(carbon).toHaveTextContent("軽い星（8 M☉ 未満）では点火しない");
    expect(screen.getByRole("note")).toHaveTextContent(
      "外層の水素が 0.30 M☉ を下回ると白色矮星になる。それまでにヘリウムを炭素・酸素に変えよう"
    );
  });

  it("軽い星を燃やしている間も、層の目標を2行目に出す", () => {
    const game = lowMassStar();
    game.meta.shop.auto = 1;
    renderGame(game);
    expect(screen.getByRole("note")).toHaveTextContent(/白色矮星になる。.*次の目標：/);
  });

  it("漸近巨星分枝星になったら、白色矮星までの秒数を出す", () => {
    const game = lowMassStar();
    game.star.agbStartedAt = 0;
    game.star.time = 5;
    renderGame(game);
    expect(screen.getByRole("note")).toHaveTextContent(
      "漸近巨星分枝星：あと 15 秒で外層を放って白色矮星になる"
    );
  });

  it("白色矮星になったら、惑星状星雲を放ったと伝える", () => {
    const game = lowMassStar();
    game.meta.autoRebirth = false;
    game.star.end = "whiteDwarf";
    renderGame(game);
    expect(
      screen.getByRole("dialog", { name: `第${LAYER2_AFTER + 1}世代\u3000白色矮星` })
    ).toHaveTextContent("惑星状星雲");
  });

  it("超新星の画面でも次の星の質量を選べ、その質量で生まれる", async () => {
    const game = collapsed();
    game.meta.autoRebirth = false;
    game.meta.supernovae = LAYER2_AFTER;
    const { user } = renderGame(game);
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "3 M☉" }));
    await user.click(
      within(dialog).getByRole("button", { name: "放出された元素から次の星を生む" })
    );

    openTab("星");
    expect(screen.getByRole("region", { name: "星の状態" })).toHaveTextContent("3.00 M☉");
  });

  it("第2層を解放する回数目の超新星で、質量を選べるようになったと知らせる", async () => {
    const game = collapsed();
    game.meta.autoRebirth = false;
    game.meta.supernovae = LAYER2_AFTER - 1;
    const { user } = renderGame(game);

    await user.click(screen.getByRole("button", { name: "放出された元素から次の星を生む" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "第2層：次に生む星の質量を選べるようになった"
    );
  });
});
