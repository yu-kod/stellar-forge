import { S_DISCOVERABLE_ELEMENTS } from "@/game/sprocess";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MERGER_SECONDS, R_ELEMENTS, R_PATH_START, formBinary } from "@/game/merger";
import { createGame } from "@/game/star";
import type { GameState } from "@/game/types";
import { manualTicker, openTab } from "@/test-utils/game";
import { createModel, gameReducer } from "../model";
import { GameScreen } from "./GameScreen";

const LIGHT = 0;
const HEAVY = 8;

function layer4(pool: Record<number, number> = { [LIGHT]: 3, [HEAVY]: 4 }): GameState {
  const game = createGame();
  game.meta.sProcess = {
    ...game.meta.sProcess,
    unlocked: true,
    looped: true,
    discovered: [...S_DISCOVERABLE_ELEMENTS],
  };
  game.meta.rProcess = { ...game.meta.rProcess, unlocked: true };
  for (const [bin, n] of Object.entries(pool)) game.meta.rProcess.pool[Number(bin)] = n;
  return game;
}

function renderGame(initial: GameState) {
  const clock = manualTicker();
  render(<GameScreen initial={initial} ticker={clock.ticker} />);
  openTab("r過程");
  return { ...clock, user: userEvent.setup() };
}

const panel = () => screen.getByRole("region", { name: "中性子星合体" });

describe("GameScreen：第4層 中性子星合体", () => {
  it("第4層の前はタブを出さない", () => {
    render(<GameScreen initial={createGame()} ticker={manualTicker().ticker} />);
    expect(screen.queryByRole("tab", { name: "r過程" })).not.toBeInTheDocument();
  });

  it("中性子星の在庫を質量ごとに見せる", () => {
    renderGame(layer4());
    const pool = within(panel()).getByRole("list", { name: "中性子星の在庫" });
    expect(pool).toHaveTextContent("1.2 M☉×3");
    expect(pool).toHaveTextContent("2.0 M☉×4");
  });

  it("2つを選ぶと、質量比・Ye・届くところ・放出物を見込む。はじめは、いま作りたい元素を一番多く作る組", () => {
    renderGame(layer4());
    expect(within(panel()).getByRole("combobox", { name: "1つ目" })).toHaveValue(String(LIGHT));
    expect(within(panel()).getByRole("combobox", { name: "2つ目" })).toHaveValue(String(HEAVY));
    expect(within(panel()).getByRole("status", { name: "合体の見込み" })).toHaveTextContent(
      "質量比 0.60・Ye 0.18 → 第3ピーク（金まで）・放出物 0.55"
    );
    expect(within(panel()).getByRole("status", { name: "合体の見込み" })).toHaveTextContent(
      "1回でテルル（Te）+0.55"
    );
  });

  it("合計が重すぎると、ブラックホールになると書く", async () => {
    const { user } = renderGame(layer4());
    await user.selectOptions(
      within(panel()).getByRole("combobox", { name: "1つ目" }),
      String(HEAVY)
    );
    expect(within(panel()).getByRole("status", { name: "合体の見込み" })).toHaveTextContent(
      "合計 4.0 M☉：すぐブラックホールになり、放出物は 4分の1"
    );
  });

  it("連星にすると在庫が減り、合体までの時間を見せる。枠が埋まると組めない", async () => {
    const { user, tick } = renderGame(layer4());
    await user.click(within(panel()).getByRole("button", { name: "連星にする" }));
    expect(within(panel()).getByRole("list", { name: "中性子星の在庫" })).toHaveTextContent(
      "1.2 M☉×2"
    );
    const binaries = within(panel()).getByRole("list", { name: "合体を待つ連星" });
    expect(binaries).toHaveTextContent("1.2 + 2.0 M☉ 合体まで 10分0秒");
    expect(within(panel()).getByRole("button", { name: "連星にする" })).toBeDisabled();
    for (let i = 0; i < 4; i++) tick(0.25);
    expect(binaries).toHaveTextContent("合体まで 9分59秒");
  });

  it("r過程が主な元素の進み具合を見せる（金が最後）", () => {
    const game = layer4();
    game.meta.rProcess.amounts[79 - R_PATH_START] = 2.5;
    renderGame(game);
    const goals = within(panel()).getByRole("list", { name: "r過程で作る元素" });
    expect(goals).toHaveTextContent("金（Au）2.50 / 66");
  });

  it("合体したら、キロノバと届いたところを知らせる", () => {
    const game = formBinary(layer4(), LIGHT, HEAVY);
    const model = gameReducer(createModel(game), { type: "tick", seconds: MERGER_SECONDS });
    expect(model.notices.map((n) => n.event.type)).toContain("merger");
  });

  it("第4層が始まったら知らせ、次の目標を r過程にする", () => {
    const game = createGame();
    game.meta.sProcess = {
      ...game.meta.sProcess,
      unlocked: true,
      looped: true,
      discovered: [...S_DISCOVERABLE_ELEMENTS],
    };
    game.meta.shop.auto = 1;
    game.meta.supernovae = 50;
    const model = gameReducer(createModel(game), { type: "tick", seconds: 0.1 });
    expect(model.notices.map((n) => n.event.type)).toContain("layer4Unlocked");
    render(<GameScreen initial={model.game} ticker={manualTicker().ticker} />);
    expect(screen.getByRole("note")).toHaveTextContent("r過程：次は");
  });
});

describe("第4層：在庫がない・全部作ったとき", () => {
  it("作りたい元素に届く組がなければ、在庫の一番軽いものと一番重いものを選んでおく", () => {
    renderGame(layer4({ [HEAVY]: 4 }));
    expect(within(panel()).getByRole("combobox", { name: "1つ目" })).toHaveValue(String(HEAVY));
    expect(within(panel()).getByRole("combobox", { name: "2つ目" })).toHaveValue(String(HEAVY));
  });

  it("83マスがそろったら、目標を周期表の先にする", () => {
    const game = layer4();
    game.meta.discovered = Object.fromEntries(
      ["He", "C", "N", "O", "Ne", "Mg", "Si", "S", "Fe"].map((id) => [id, true])
    );
    game.meta.lightFound = [3, 4, 5, 9, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    game.meta.rProcess.discovered = [...R_ELEMENTS];
    game.meta.supernovae = 50;
    game.meta.shop.auto = 1;
    render(<GameScreen initial={game} ticker={manualTicker().ticker} />);
    expect(screen.getByRole("note")).toHaveTextContent("周期表の先");
  });

  it("在庫が空でも欄を出し、連星にはできない", () => {
    renderGame(layer4({}));
    expect(within(panel()).getByRole("button", { name: "連星にする" })).toBeDisabled();
  });

  it("r過程の元素を全部作ったら、目標にまだの元素と作り方を出す", () => {
    const game = layer4();
    game.meta.rProcess.discovered = [...R_ELEMENTS];
    game.meta.supernovae = 50;
    game.meta.shop.auto = 1;
    render(<GameScreen initial={game} ticker={manualTicker().ticker} />);
    expect(screen.getByRole("note")).toHaveTextContent("まだの元素 ヘリウム（He）：第1層の燃焼");
  });
});

describe("第4層の周期表と知らせ", () => {
  it("r過程で作った元素を色付けし、発見の数に足す", async () => {
    const game = layer4();
    game.meta.rProcess.discovered = [79];
    const { user } = renderGame(game);
    await user.click(screen.getByRole("tab", { name: "周期表" }));
    expect(
      screen.getByRole("listitem", { name: /^79 Au 金：中性子星合体の r過程で作った/ })
    ).toHaveClass("bg-el-r");
    expect(screen.getByText(/発見した元素/)).toHaveTextContent("発見した元素 54 / 83");
  });

  it.each([
    [
      { type: "merger", ye: 0.18, ejecta: 2.2, reach: 83, blackHole: false },
      "キロノバ（赤）：中性子星合体の r過程が第3ピーク（金まで）に届いた",
    ],
    [{ type: "merger", ye: 0.4, ejecta: 1, reach: 50, blackHole: false }, "キロノバ（青）"],
    [
      { type: "merger", ye: 0.4, ejecta: 0.25, reach: 50, blackHole: true },
      "すぐブラックホールになった",
    ],
    [{ type: "rDiscover", z: 79 }, "新元素 金（Au） 中性子星合体で作った"],
    [{ type: "layer4Unlocked" }, "第4層：中性子星合体が始まった"],
  ] as const)("知らせ：%o", async (event, text) => {
    const { Notices } = await import("./Notices");
    render(<Notices notices={[{ id: 1, event }]} onDismiss={() => {}} />);
    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});

describe("第4層の強化", () => {
  it("s過程を終えたら、星屑タブの第3層の強化は畳んでそう書く", async () => {
    const { user } = renderGame(layer4());
    await user.click(screen.getByRole("tab", { name: "星屑" }));
    expect(screen.getByText(/s過程は終えた/)).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "¹³C ポケット" })).not.toBeInTheDocument();
  });

  it("星屑タブに第4層の強化を出す", async () => {
    const { user } = renderGame(layer4());
    await user.click(screen.getByRole("tab", { name: "星屑" }));
    expect(screen.getByRole("heading", { name: "第4層（中性子星合体）" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "連星の自動化" })).toBeInTheDocument();
  });
});
