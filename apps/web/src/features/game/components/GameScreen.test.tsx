import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createGame } from "@/game/star";
import type { GameState } from "@/game/types";
import { aboutToCollapse, collapsed, manualTicker } from "@/test-utils/game";
import { GameScreen } from "./GameScreen";

function renderGame(initial: GameState = createGame()) {
  const clock = manualTicker();
  const view = render(<GameScreen initial={initial} ticker={clock.ticker} />);
  return { ...view, ...clock, user: userEvent.setup() };
}

function stageCard(name: string) {
  return screen.getByRole("article", { name });
}

describe("GameScreen：星と時間", () => {
  it("世代と経過時間を見せ、時間とともに進む", () => {
    const { tick } = renderGame();
    expect(screen.getByRole("heading", { level: 1, name: "星の炉" })).toBeInTheDocument();
    expect(screen.getByText("第1世代の星・0秒")).toBeInTheDocument();

    tick(0.25);
    tick(0.25);
    tick(0.25);
    tick(0.25);

    expect(screen.getByText("第1世代の星・1秒")).toBeInTheDocument();
  });

  it("×3 を押すと3倍の速さで進む", async () => {
    const { tick, user } = renderGame();

    await user.click(screen.getByRole("button", { name: "×3" }));
    tick(0.25);
    tick(0.25);

    expect(screen.getByRole("button", { name: "×3" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("第1世代の星・1秒")).toBeInTheDocument();
  });

  it("星の状態（エネルギー・星の質量・鉄のコア）とコア温度を見せる", () => {
    const game = createGame();
    game.star.energy = 1.234e45;
    renderGame(game);

    const panel = screen.getByRole("region", { name: "星の状態" });
    expect(within(panel).getByText("1.23×10⁴⁵ J")).toBeInTheDocument();
    expect(within(panel).getByText("25.0 M☉")).toBeInTheDocument();
    expect(within(panel).getByText("0.00 / 1.40 M☉")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "コア温度" })).toHaveAttribute(
      "aria-valuetext",
      "4.00×10⁷ K"
    );
    expect(screen.getByRole("img", { name: "星の断面（玉ねぎ構造）" })).toBeInTheDocument();
  });

  it("今コアが崩壊したら得られる星屑を元素ごとに見せる", () => {
    const game = createGame();
    game.star.mass.C = 2;
    renderGame(game);

    const preview = screen.getByRole("list", { name: "今コアが崩壊したら得られる星屑" });
    expect(within(preview).getByRole("listitem", { name: "炭素 2" })).toBeInTheDocument();
    expect(within(preview).getByRole("listitem", { name: "酸素 0" })).toBeInTheDocument();
  });

  it("次の目標として、まだ点火していない最初の段階を示す", () => {
    renderGame();
    expect(screen.getByRole("note")).toHaveTextContent(
      "次の目標：ヘリウム燃焼を点火する（コア温度 2.00×10⁸ K）"
    );
  });

  it("ケイ素燃焼だけが残ったら、崩壊までに外層の元素を育てるよう促す", () => {
    const game = createGame();
    game.star.temperature = 1.5e9;
    renderGame(game);
    expect(screen.getByRole("note")).toHaveTextContent(
      "次の目標：ケイ素燃焼が始まると30秒でコアが崩壊する。それまでに外層の元素を育てておこう"
    );
  });

  it("全段階が点火したら、最後の30秒の使い方を促す", () => {
    const game = aboutToCollapse();
    renderGame(game);
    expect(screen.getByRole("note")).toHaveTextContent(
      "最後の30秒：残っているヘリウムや炭素を、欲しい元素に変えきろう"
    );
  });
});

describe("GameScreen：燃焼の強化", () => {
  it("エネルギーが足りれば強化でき、Lv が上がる", async () => {
    const game = createGame();
    game.star.energy = 4e44;
    const { user } = renderGame(game);
    const card = stageCard("水素燃焼");
    expect(within(card).getByText(/強化 Lv1/)).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: /^強化/ }));

    expect(within(card).getByText(/強化 Lv2/)).toBeInTheDocument();
  });

  it("強化の費用を見せ、足りなければ押せない", () => {
    const game = createGame();
    game.star.energy = 1e44;
    renderGame(game);
    const card = stageCard("水素燃焼");

    expect(within(card).getByRole("button", { name: /^強化/ })).toHaveTextContent(
      "強化3.10×10⁴⁴ J"
    );
    expect(within(card).getByRole("button", { name: /^強化/ })).toBeDisabled();
    expect(within(card).getByRole("button", { name: "水素燃焼を買えるだけ強化" })).toBeDisabled();
  });

  it("「最大」は買えるだけ強化する", async () => {
    const game = createGame();
    game.star.energy = 1e46;
    const { user } = renderGame(game);
    const card = stageCard("水素燃焼");

    await user.click(within(card).getByRole("button", { name: "水素燃焼を買えるだけ強化" }));

    expect(within(card).queryByText(/強化 Lv1\b/)).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /^強化/ })).toBeDisabled();
  });

  it("点火していない段階は点火温度を見せ、強化できない", () => {
    renderGame();
    const card = stageCard("ヘリウム燃焼");
    expect(within(card).getByText(/点火温度/)).toHaveTextContent("点火温度 2.00×10⁸ K");
    expect(within(card).getByRole("button", { name: /^強化/ })).toHaveTextContent("強化未点火");
    expect(within(card).getByRole("button", { name: /^強化/ })).toBeDisabled();
  });

  it("燃えている段階は燃料と燃焼の速さを見せる", () => {
    renderGame();
    const card = stageCard("水素燃焼");
    expect(within(card).getByText(/燃料/)).toHaveTextContent("燃料 25.0 M☉");
    expect(within(card).getByText(/^燃焼/)).toHaveTextContent("燃焼 0.04 M☉/s");
  });

  it("ケイ素燃焼は強化できず、鉄のコアが育つ様子と崩壊までの秒数を見せる", () => {
    const game = aboutToCollapse();
    game.star.mass.Fe = 0.7;
    renderGame(game);
    const card = stageCard("ケイ素燃焼");

    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    expect(within(card).getByText("崩壊まで 15 秒")).toBeInTheDocument();
    expect(within(card).getByRole("progressbar", { name: "鉄のコア" })).toHaveAttribute(
      "aria-valuenow",
      "0.7"
    );
  });

  it("燃焼の自動制御を持っていれば、段階ごとに自動強化を切り替えられる", async () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    const { user } = renderGame(game);
    const auto = within(stageCard("水素燃焼")).getByRole("checkbox", { name: "自動" });
    expect(auto).toBeChecked();

    await user.click(auto);

    expect(auto).not.toBeChecked();
  });

  it("燃焼の自動制御を持っていなければ、自動の切り替えは出さない", () => {
    renderGame();
    expect(screen.queryByRole("checkbox", { name: "自動" })).not.toBeInTheDocument();
  });
});

describe("GameScreen：知らせ", () => {
  it("点火と新元素を知らせ、しばらくすると消える", () => {
    vi.useFakeTimers();
    const game = createGame();
    game.star.mass.C = 1;
    const { tick } = renderGame(game);

    tick(0.1);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("ヘリウム燃焼 点火 2.00×10⁸ K");
    expect(status).toHaveTextContent("新元素 炭素（C） ヘリウム燃焼の速度 ×2");

    act(() => vi.advanceTimersByTime(4200));

    expect(status).toBeEmptyDOMElement();
    vi.useRealTimers();
  });
});

describe("GameScreen：超新星", () => {
  it("鉄のコアが崩壊すると超新星の画面を出し、得た星屑を見せる", () => {
    const { tick } = renderGame(aboutToCollapse());

    tick(0.25);

    const dialog = screen.getByRole("dialog", { name: "第1世代　超新星" });
    expect(dialog).toHaveTextContent("中性子星が残った");
    const gain = within(dialog).getByRole("list", { name: "得た星屑" });
    expect(within(gain).getByRole("listitem", { name: /^ケイ素 \+[1-9]/ })).toBeInTheDocument();
  });

  it("放出された元素の量を見せる", () => {
    renderGame(collapsed());
    const ejected = screen.getByRole("list", { name: "放出された元素" });
    expect(within(ejected).getByRole("listitem", { name: "ケイ素 4.00 M☉" })).toBeInTheDocument();
  });

  it("燃え尽きた星は、そう伝える", () => {
    const game = collapsed();
    game.star.end = "fizzle";
    renderGame(game);
    expect(screen.getByRole("dialog", { name: "第1世代　燃え尽きた" })).toHaveTextContent(
      "燃料が尽きた"
    );
  });

  it("次の星を生むと、第2世代の星が始まり星屑の交換を開く", async () => {
    const { user } = renderGame(collapsed());

    await user.click(screen.getByRole("button", { name: "放出された元素から次の星を生む" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("第2世代の星・0秒")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "星屑" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("status")).toHaveTextContent("第2世代の星が生まれた");
  });

  it("Esc では閉じない（次の星を生むまで先へ進めない）", async () => {
    const { user } = renderGame(collapsed());
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("GameScreen：星屑の交換", () => {
  it("星屑が足りれば恒久強化と交換でき、手持ちが減る", async () => {
    const game = createGame();
    game.meta.dust.O = 4;
    const { user } = renderGame(game);
    await user.click(screen.getByRole("tab", { name: "星屑" }));
    const item = screen.getByRole("article", { name: "より重い星" });

    await user.click(within(item).getByRole("button", { name: /交換/ }));

    expect(within(item).getByText("Lv1")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "酸素 1" })).toBeInTheDocument();
  });

  it("足りなければ交換できない", async () => {
    const { user } = renderGame();
    await user.click(screen.getByRole("tab", { name: "星屑" }));
    const item = screen.getByRole("article", { name: "より重い星" });
    expect(within(item).getByRole("button", { name: /交換/ })).toHaveTextContent(
      "交換酸素の星屑 3"
    );
    expect(within(item).getByRole("button", { name: /交換/ })).toBeDisabled();
  });

  it("1回きりの強化は、取得したらそう見せる", async () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    const { user } = renderGame(game);
    await user.click(screen.getByRole("tab", { name: "星屑" }));
    const item = screen.getByRole("article", { name: "燃焼の自動制御" });
    expect(within(item).getByRole("button", { name: "取得済み" })).toBeDisabled();
  });
});
