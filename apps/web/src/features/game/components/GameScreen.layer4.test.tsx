import { S_DISCOVERABLE_ELEMENTS } from "@/game/sprocess";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MERGER_SECONDS, R_ELEMENTS, R_PATH_START, formBinary, rThreshold } from "@/game/merger";
import { createGame } from "@/game/star";
import { SHOP } from "@/game/balance";
import { formatNumber } from "../format";
import { createSlot } from "@/game/actions";
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

  it("しくみの説明は畳んでおき、操作を上に出す（スマホで長くならない）", () => {
    renderGame(layer4());
    const details = within(panel())
      .getByText(/超新星の後に残った中性子星/)
      .closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(within(details!).getByText("しくみ")).toBeInTheDocument();
  });

  it("第4層では、星屑タブの第1・2層の強化を畳む（まとめて交換で買える）", async () => {
    const { user } = renderGame(layer4());
    await user.click(screen.getByRole("tab", { name: "星屑" }));
    const fold = screen.getByText(/第1・2層の強化/).closest("details");
    expect(fold).not.toHaveAttribute("open");
    expect(within(fold!).getByRole("article", { name: "より重い星" })).toBeInTheDocument();
  });

  it("中性子星の在庫を質量ごとに見せる", () => {
    renderGame(layer4());
    const pool = within(panel()).getByRole("list", { name: "中性子星の在庫" });
    expect(pool).toHaveTextContent("1.2 M☉×3");
    expect(pool).toHaveTextContent("2.0 M☉×4");
  });

  it("2つを選ぶと、潮汐の放出物と円盤風の量・Ye・作る範囲、合体までの時間を見込む。はじめは、いま作りたい元素を一番速く作る組", () => {
    renderGame(layer4());
    expect(within(panel()).getByRole("combobox", { name: "1つ目" })).toHaveValue(String(LIGHT));
    expect(within(panel()).getByRole("combobox", { name: "2つ目" })).toHaveValue(String(LIGHT));
    const preview = within(panel()).getByRole("status", { name: "合体の見込み" });
    expect(preview).toHaveTextContent("潮汐（赤）0.20：Ye 0.40 → 第1・第2ピーク（バリウムまで）");
    expect(preview).toHaveTextContent("円盤風（青）2.50：Ye 0.34 → 第1・第2ピーク（バリウムまで）");
    expect(preview).toHaveTextContent("合体まで 15分53秒・1回でテルル（Te）+2.70");
  });

  it("偏った組は、潮汐の放出物が重い元素まで届く", async () => {
    const { user } = renderGame(layer4());
    await user.selectOptions(
      within(panel()).getByRole("combobox", { name: "2つ目" }),
      String(HEAVY)
    );
    expect(within(panel()).getByRole("status", { name: "合体の見込み" })).toHaveTextContent(
      "潮汐（赤）1.40：Ye 0.18 → 第3ピーク（金まで）"
    );
  });

  it("合計が重すぎると、ブラックホールになると書く", async () => {
    const { user } = renderGame(layer4());
    await user.selectOptions(
      within(panel()).getByRole("combobox", { name: "1つ目" }),
      String(HEAVY)
    );
    await user.selectOptions(
      within(panel()).getByRole("combobox", { name: "2つ目" }),
      String(HEAVY)
    );
    expect(within(panel()).getByRole("status", { name: "合体の見込み" })).toHaveTextContent(
      "合計 4.0 M☉：すぐブラックホールになり、円盤風は吹かない。潮汐の放出物 0.25"
    );
  });

  it("連星にすると在庫が減り、合体までの時間を見せる。枠が埋まると組めない", async () => {
    const { user, tick } = renderGame(layer4());
    await user.click(within(panel()).getByRole("button", { name: "連星にする" }));
    expect(within(panel()).getByRole("list", { name: "中性子星の在庫" })).toHaveTextContent(
      "1.2 M☉×1"
    );
    const binaries = within(panel()).getByRole("list", { name: "合体を待つ連星" });
    expect(binaries).toHaveTextContent("1.2 + 1.2 M☉ 合体まで 15分53秒");
    expect(within(panel()).getByRole("button", { name: "連星にする" })).toBeDisabled();
    for (let i = 0; i < 4; i++) tick(0.25);
    expect(binaries).toHaveTextContent("合体まで 15分52秒");
  });

  it("自分で選ぶまでは、在庫が変わるとはじめの組も選び直す", async () => {
    const game = layer4({ [LIGHT]: 2, [HEAVY]: 4 });
    game.meta.shop.slots = 1;
    const { user } = renderGame(game);
    await user.click(within(panel()).getByRole("button", { name: "連星にする" }));
    // 1.2 M☉ がなくなったので、残りで届く組（2.0 + 2.0）
    expect(within(panel()).getByRole("combobox", { name: "1つ目" })).toHaveValue(String(HEAVY));
    expect(within(panel()).getByRole("button", { name: "連星にする" })).toBeEnabled();
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
    const model = gameReducer(createModel(game), { type: "tick", seconds: 2 * MERGER_SECONDS });
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
    game.meta.cluster = [createSlot(game.meta), createSlot(game.meta)];
    const model = gameReducer(createModel(game), { type: "tick", seconds: 0.1 });
    expect(model.notices.map((n) => n.event.type)).toContain("layer4Unlocked");
    render(<GameScreen initial={model.game} ticker={manualTicker().ticker} />);
    expect(screen.getByRole("note")).toHaveTextContent("r過程：次は");
  });
});

describe("第4層：在庫がない・全部作ったとき", () => {
  it("作りたい元素に届く組がなければ、在庫の一番軽いものと一番重いものを選んでおく", () => {
    const game = layer4({ [LIGHT]: 1, [HEAVY]: 4 });
    game.meta.rProcess.discovered = [52, 53, 54];
    renderGame(game);
    expect(within(panel()).getByRole("combobox", { name: "1つ目" })).toHaveValue(String(LIGHT));
    expect(within(panel()).getByRole("combobox", { name: "2つ目" })).toHaveValue(String(HEAVY));
  });

  const goalOf = (game: GameState) => {
    game.meta.supernovae = 50;
    game.meta.shop.auto = 1;
    render(<GameScreen initial={game} ticker={manualTicker().ticker} />);
    return screen.getByRole("note");
  };

  it("届かない元素の案内は、まだの元素の先頭2つのときだけ出す（遠い元素で目標を埋めない）", () => {
    const game = layer4({ [2]: 5, [HEAVY]: 5 }); // 1.4 と 2.0：第3ピークには遮蔽が要る
    expect(goalOf(game)).toHaveTextContent("r過程：次は");
    expect(screen.getByRole("note")).not.toHaveTextContent("届く組がない");
  });

  it("在庫でも、星団の星がこれから残す中性子星でも届かなければ、星団の星の質量を目標に出す", () => {
    const game = layer4({ [LIGHT]: 5, [6]: 5 }); // 1.2 と 1.8：ランタノイドに届かない
    game.meta.rProcess.discovered = [52, 53, 54];
    expect(goalOf(game)).toHaveTextContent(
      "ユウロピウム（Eu）に届く組がない：星団の星を 18 M☉ と 40 M☉ にすると、1.4 + 2.0 M☉ の組で届く"
    );
  });

  it("届く中性子星をこれから残すなら、待つと書く", () => {
    const game = layer4({});
    game.meta.cluster = [10, 28].map((mass) => ({ ...createSlot(game.meta), nextMass: mass }));
    expect(goalOf(game)).toHaveTextContent(
      "r過程：次は テルル（Te）を作る（0%）。届く中性子星が星団の超新星から来るのを待つ"
    );
  });

  it("遮蔽をあと1回強化すれば届くなら遮蔽を、質量を変えても届くならそれも出す", () => {
    const game = layer4({ [2]: 5, [HEAVY]: 5 });
    game.meta.rProcess.discovered = [52, 53, 54, 63, 64, 65, 66, 67, 68, 69];
    expect(goalOf(game)).toHaveTextContent(
      "レニウム（Re）に届く組がない：ニュートリノの遮蔽（酸素の星屑 あと"
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "。または星団の星を 10 M☉ と 40 M☉ にすると、1.2 + 2.0 M☉ の組で届く"
    );
  });

  it("どの組でも届かなければ、ニュートリノの遮蔽を勧める", () => {
    const game = layer4();
    game.meta.rProcess.discovered = [...R_ELEMENTS];
    game.meta.discovered = Object.fromEntries(
      ["He", "C", "N", "O", "Ne", "Mg", "Si", "S", "Fe"].map((id) => [id, true])
    );
    game.meta.lightFound = [3, 4, 5, 9, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    expect(goalOf(game)).toHaveTextContent(
      `ウラン（U）に届く組がない：ニュートリノの遮蔽（酸素の星屑 あと ${formatNumber(SHOP.shield.baseCost)}）で Ye を下げる`
    );
  });

  function complete(): GameState {
    const game = layer4();
    game.meta.discovered = Object.fromEntries(
      ["He", "C", "N", "O", "Ne", "Mg", "Si", "S", "Fe"].map((id) => [id, true])
    );
    game.meta.lightFound = [3, 4, 5, 9, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    game.meta.rProcess.discovered = [...R_ELEMENTS];
    game.meta.shop.shield = 4;
    game.meta.supernovae = 50;
    game.meta.shop.auto = 1;
    return game;
  }

  it("83マスがそろったら、目標を周期表の先にし、進み具合を出す", () => {
    const game = complete();
    game.meta.rProcess.amounts[92 - R_PATH_START] = rThreshold(92) * 0.42;
    render(<GameScreen initial={game} ticker={manualTicker().ticker} />);
    expect(screen.getByRole("note")).toHaveTextContent("周期表の先：ウラン（U）を作る（42%）");
  });

  it("ウランを見つけたら、まだのトリウムを目標にする", () => {
    const game = complete();
    game.meta.rProcess.discovered.push(92);
    render(<GameScreen initial={game} ticker={manualTicker().ticker} />);
    expect(screen.getByRole("note")).toHaveTextContent("周期表の先：トリウム（Th）を作る");
  });

  it("トリウム・ウランも見つけたら、すべてそろったと書く", () => {
    const game = complete();
    game.meta.rProcess.discovered.push(90, 92);
    render(<GameScreen initial={game} ticker={manualTicker().ticker} />);
    expect(screen.getByRole("note")).toHaveTextContent("ウランまで、すべての元素をそろえた");
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
    [{ type: "merger", ye: 0.4, ejecta: 1, reach: 56, blackHole: false }, "キロノバ（青）"],
    [{ type: "merger", ye: 0.25, ejecta: 1, reach: 72, blackHole: false }, "キロノバ（赤）"],
    [
      { type: "merger", ye: 0.4, ejecta: 0.25, reach: 56, blackHole: true },
      "すぐブラックホールになった",
    ],
    [{ type: "rDiscover", z: 79 }, "新元素 金（Au） 中性子星合体で作った"],
    [
      { type: "rDiscover", z: 92 },
      "ウラン238（半減期45億年）とトリウム232（140億年）の比は、古い星の年齢を測る時計になる",
    ],
    [
      { type: "sDiscover", z: 43 },
      "テクネチウムには安定な同位体がない。1952年に赤色巨星のスペクトルで見つかり、星の中でいまも元素が作られている証拠になった",
    ],
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

describe("エンディングの後（周期表の先）", () => {
  it("r過程の一覧に、トリウム・ウランの進み具合も出す", () => {
    const game = layer4();
    game.meta.rProcess.amounts[90 - R_PATH_START] = 3.5;
    renderGame(game);
    expect(within(panel()).getByRole("list", { name: "r過程で作る元素" })).toHaveTextContent(
      "トリウム（Th）3.50 / 15"
    );
  });

  it("まだの元素のどれにも届かない組では、連星にできない", async () => {
    const game = layer4({ [HEAVY]: 4 });
    game.meta.rProcess.discovered = [...R_ELEMENTS];
    renderGame(game);
    expect(within(panel()).getByRole("button", { name: "連星にする" })).toBeDisabled();
    expect(within(panel()).getByRole("status", { name: "合体の見込み" })).toHaveTextContent(
      "この組では、まだの元素に届かない"
    );
  });

  it("r過程の元素がすべてそろっても、r過程タブを描ける（作りたい元素はウラン）", () => {
    const game = layer4();
    game.meta.rProcess.discovered = [...R_ELEMENTS];
    renderGame(game);
    expect(within(panel()).getByRole("status", { name: "合体の見込み" })).toHaveTextContent(
      "ウラン（U）"
    );
  });

  it("トリウム・ウランの発見を知らせられる", async () => {
    const { Notices } = await import("./Notices");
    render(
      <Notices notices={[{ id: 1, event: { type: "rDiscover", z: 90 } }]} onDismiss={() => {}} />
    );
    expect(screen.getByRole("status")).toHaveTextContent("新元素 トリウム（Th）");
  });
});
