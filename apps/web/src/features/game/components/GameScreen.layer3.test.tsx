import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LAYER2_AFTER, LAYER3_AFTER } from "@/game/balance";
import {
  S_DISCOVERABLE_ELEMENTS,
  S_PATH_END,
  S_PATH_START,
  S_DISCOVERY_THRESHOLD,
} from "@/game/sprocess";
import { createGame } from "@/game/star";
import type { GameState } from "@/game/types";
import { manualTicker, openTab } from "@/test-utils/game";
import { gameReducer, createModel } from "../model";
import { GameScreen } from "./GameScreen";

function renderGame(initial: GameState) {
  const clock = manualTicker();
  render(<GameScreen initial={initial} ticker={clock.ticker} />);
  openTab("s過程");
  return { ...clock, user: userEvent.setup() };
}

function layer3(whiteDwarfs = 5): GameState {
  const game = createGame();
  game.meta.supernovae = LAYER2_AFTER;
  game.meta.whiteDwarfs = whiteDwarfs;
  game.meta.sProcess = { ...game.meta.sProcess, unlocked: true };
  return game;
}

const index = (z: number) => z - S_PATH_START;

describe("GameScreen：第3層 s過程", () => {
  it("第3層が解放されるまでは出さない", () => {
    renderGame(createGame());
    expect(screen.queryByRole("region", { name: "s過程" })).not.toBeInTheDocument();
  });

  it("白色矮星の数と、道の上の原子核の量を見せる", () => {
    const game = layer3(5);
    game.meta.sProcess.amounts[index(38)] = 2.5;
    renderGame(game);
    const panel = screen.getByRole("region", { name: "s過程" });
    expect(panel).toHaveTextContent("白色矮星5");
    expect(panel).toHaveTextContent("道の上の原子核2.50");
    expect(
      within(panel).getByRole("img", { name: "s過程の道の組成（鉄〜ビスマス）" })
    ).toBeInTheDocument();
  });

  it("恒星風で得た重元素の星屑と、毎秒の稼ぎを見せる", () => {
    const game = layer3(5);
    game.meta.sProcess.heavy = 12.3;
    game.meta.sProcess.amounts[index(S_PATH_END)] = 1000;
    renderGame(game);
    const panel = screen.getByRole("region", { name: "s過程" });
    expect(panel).toHaveTextContent("重元素の星屑12.3");
    expect(panel).toHaveTextContent("毎秒 +2.20");
  });

  it("Ia型超新星を起こすと、白色矮星を1つ使って鉄の種を道に入れる", async () => {
    const { user } = renderGame(layer3(5));
    const panel = screen.getByRole("region", { name: "s過程" });

    await user.click(within(panel).getByRole("button", { name: "Ia型超新星を起こす" }));

    expect(panel).toHaveTextContent("白色矮星4");
    expect(panel).toHaveTextContent("道の上の原子核1.00");
  });

  it("10回まとめて起こせる（白色矮星が足りる分だけ）", async () => {
    const { user } = renderGame(layer3(4));
    const panel = screen.getByRole("region", { name: "s過程" });

    await user.click(within(panel).getByRole("button", { name: "10回起こす" }));

    expect(panel).toHaveTextContent("白色矮星0");
    expect(panel).toHaveTextContent("道の上の原子核4.00");
    expect(within(panel).getByRole("button", { name: "Ia型超新星を起こす" })).toBeDisabled();
  });

  it("s過程で発見した元素の数と、周期表の色づけ", async () => {
    const game = layer3();
    game.meta.sProcess.discovered = [27, 38];
    const { user } = renderGame(game);
    expect(screen.getByRole("region", { name: "s過程" })).toHaveTextContent(
      "s過程で発見した元素 2 / 52"
    );
    await user.click(screen.getByRole("tab", { name: "周期表" }));
    expect(
      screen.getByRole("listitem", { name: "38 Sr ストロンチウム：s過程で作った" })
    ).toBeInTheDocument();
  });

  it("次の目標に、s過程で次に見つける元素を出す", () => {
    const game = layer3();
    game.meta.sProcess.discovered = [27, 28];
    game.meta.shop.auto = 1;
    renderGame(game);
    expect(screen.getByRole("note")).toHaveTextContent("s過程：次は 銅（Cu）を見つける（0%）");
  });

  it("s元素をすべて見つけて循環を待つ間は、そう書く", () => {
    const game = layer3();
    game.meta.sProcess.discovered = [...S_DISCOVERABLE_ELEMENTS];
    game.meta.shop.auto = 1;
    renderGame(game);
    expect(screen.getByRole("note")).toHaveTextContent(
      "ビスマスが中性子を捕まえて鉛へ戻るのを待つ"
    );
  });

  it("一番発見に近い元素と、その進み具合を出す（魔法数で詰まっている間の目安）", () => {
    const game = layer3();
    game.meta.sProcess.discovered = [27, 28, 29];
    game.meta.sProcess.produced[index(40)] = S_DISCOVERY_THRESHOLD * 0.42;
    game.meta.sProcess.produced[index(30)] = S_DISCOVERY_THRESHOLD * 0.1;
    game.meta.shop.auto = 1;
    renderGame(game);
    expect(screen.getByRole("note")).toHaveTextContent(
      "s過程：次は ジルコニウム（Zr）を見つける（42%）"
    );
  });

  it("循環を見たら、目標はビスマスの先へ", () => {
    const game = layer3();
    game.meta.shop.auto = 1;
    game.meta.sProcess.looped = true;
    renderGame(game);
    expect(screen.getByRole("note")).toHaveTextContent("第3層クリア");
  });

  function agbStar(): GameState {
    const game = layer3();
    game.meta.nextMass = 3;
    game.meta.discovered = { He: true, C: true, N: true, O: true };
    game.star.initialMass = 3;
    game.star.mass = { ...game.star.mass, H: 0.2, He: 2.8 };
    game.star.temperature = 2e8;
    game.star.levels.He = 20;
    game.star.agbStartedAt = 0;
    return game;
  }

  it("道の上で元素を見つけたら知らせる", () => {
    const game = agbStar();
    game.meta.sProcess.amounts[0] = 1;
    const { tick } = renderGame(game);
    tick(0.5);
    expect(screen.getByRole("status")).toHaveTextContent("新元素 コバルト（Co） s過程で作った");
  });

  it("ビスマスから鉛に戻る循環を見たら知らせる", () => {
    const game = agbStar();
    game.meta.sProcess.amounts[index(S_PATH_END)] = 1;
    const { tick } = renderGame(game);
    tick(0.5);
    expect(screen.getByRole("status")).toHaveTextContent("ビスマス → ポロニウム → 鉛");
  });
});

describe("GameScreen：第3層の強化と自動化", () => {
  it("星屑タブに第3層の強化を出す", async () => {
    const { user } = renderGame(layer3());
    await user.click(screen.getByRole("tab", { name: "星屑" }));
    expect(screen.getByRole("heading", { name: "第3層（s過程）" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "¹³C ポケット" })).toBeInTheDocument();
  });

  it("第3層では、鉄の種の目標の量を選べる", async () => {
    const game = layer3(0);
    const { user } = renderGame(game);
    const picker = screen.getByRole("radiogroup", { name: "道の上の原子核を保つ量" });
    expect(within(picker).getByRole("radio", { name: "3" })).toBeChecked();

    await user.click(within(picker).getByRole("radio", { name: "10" }));

    expect(within(picker).getByRole("radio", { name: "10" })).toBeChecked();
  });
});

describe("第3層の解放を知らせる", () => {
  it("画面に、s過程が始まったと出す", async () => {
    const game = createGame();
    game.meta.supernovae = LAYER2_AFTER;
    game.meta.whiteDwarfs = LAYER3_AFTER - 1;
    game.meta.nextMass = 3;
    game.star.initialMass = 3;
    game.star.end = "whiteDwarf";
    const { user } = renderGame(game);
    await user.click(screen.getByRole("button", { name: "放出された元素から次の星を生む" }));
    expect(screen.getByRole("status")).toHaveTextContent("第3層：s過程が始まった");
  });

  it("白色矮星が規定の数に達して第3層が解放されたら知らせる", () => {
    const game = createGame();
    game.meta.supernovae = LAYER2_AFTER;
    game.meta.whiteDwarfs = LAYER3_AFTER - 1;
    game.meta.nextMass = 3;
    game.star.initialMass = 3;
    game.star.end = "whiteDwarf";
    const model = gameReducer(createModel(game), { type: "rebirth" });
    expect(model.notices.map((n) => n.event.type)).toContain("layer3Unlocked");
  });
});
