import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createGame } from "@/game/star";
import { manualTicker } from "@/test-utils/game";
import { createModel, gameReducer } from "../model";
import { GameScreen } from "./GameScreen";
import { EMPTY_HALL, HALL_KEY } from "../hall";
import { createJsonStorage } from "@app/web-core";

/** jsdom の localStorage を空にして、初めの中身を入れる */
function memoryStorage(initial: Record<string, unknown>) {
  window.localStorage.clear();
  const storage = createJsonStorage();
  for (const [key, value] of Object.entries(initial)) storage.set(key, value);
  return storage;
}

/** 金だけが残っていて、すぐ合体する */
function almostDone() {
  const game = createGame();
  game.meta.discovered = Object.fromEntries(
    ["He", "C", "N", "O", "Ne", "Mg", "Si", "S", "Fe"].map((id) => [id, true])
  );
  game.meta.lightFound = [3, 4, 5, 9, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25];
  game.meta.sProcess = {
    ...game.meta.sProcess,
    unlocked: true,
    looped: true,
    discovered: Array.from({ length: 57 }, (_, i) => 27 + i).filter(
      (z) => ![63, 76, 77, 78, 79].includes(z)
    ),
  };
  game.meta.rProcess = { ...game.meta.rProcess, unlocked: true, discovered: [63, 76, 77, 78] };
  game.meta.rProcess.amounts[79 - 31] = 199;
  game.meta.rProcess.binaries = [{ a: 0, b: 8, remaining: 0.1 }];
  return game;
}

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
    // 白色矮星は Ia型超新星で使った分も含め、これまでに作った数（手持ち 380 + 使った 210）
    expect(stats).toHaveTextContent("白色矮星590");
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

describe("記録への挑戦", () => {
  it("遊んでいる間、上部に通算の時間と、最速の周の同じ層との差を出す", () => {
    const game = createGame();
    game.meta.elapsed = 62 * 60;
    game.meta.supernovae = 30;
    game.meta.milestones = { layer2: 20 * 60, layer3: null, layer4: null };
    const best = { layer2: 25 * 60, layer3: 55 * 60, layer4: 120 * 60, complete: 160 * 60 };
    const storage = memoryStorage({
      [HALL_KEY]: { completions: 1, bests: { milkyWay: best }, last: best },
    });
    render(<GameScreen initial={game} ticker={manualTicker().ticker} storage={storage} />);
    const pace = screen.getByRole("timer", { name: "通算の時間" });
    expect(pace).toHaveTextContent("通算 1時間2分");
    expect(pace).toHaveTextContent("最速の周より 第2層 −5分");
  });

  it("最速の周の発見ごとの時刻があれば、いま見つけた数の元素に着いた時刻で比べる", () => {
    const game = createGame();
    game.meta.elapsed = 10 * 60;
    game.meta.foundTimes = [0, 3 * 60];
    const best = {
      layer2: 25 * 60,
      layer3: 55 * 60,
      layer4: 120 * 60,
      complete: 160 * 60,
      found: [0, 2 * 60, 4 * 60],
    };
    const storage = memoryStorage({ [HALL_KEY]: { completions: 1, bests: { milkyWay: best } } });
    render(<GameScreen initial={game} ticker={manualTicker().ticker} storage={storage} />);
    expect(screen.getByRole("timer", { name: "通算の時間" })).toHaveTextContent(
      "最速の周より 2元素目 +1分"
    );
  });

  it("天の川でない周では、銀河の名前を出し、同じ銀河の最速の周と比べる", () => {
    const game = createGame("metalRich");
    game.meta.elapsed = 62 * 60;
    game.meta.milestones = { layer2: 20 * 60, layer3: null, layer4: null };
    const best = { layer2: 25 * 60, layer3: 55 * 60, layer4: 120 * 60, complete: 160 * 60 };
    const storage = memoryStorage({
      [HALL_KEY]: { completions: 1, bests: { milkyWay: best }, last: best },
    });
    render(<GameScreen initial={game} ticker={manualTicker().ticker} storage={storage} />);
    const pace = screen.getByRole("timer", { name: "通算の時間" });
    expect(pace).toHaveTextContent("金属の多い銀河の中心・通算 1時間2分");
    expect(pace).not.toHaveTextContent("最速");
  });

  it("最速の記録がなければ、通算の時間だけ出す", () => {
    const game = createGame();
    game.meta.elapsed = 5 * 60;
    render(<GameScreen initial={game} ticker={manualTicker().ticker} />);
    const pace = screen.getByRole("timer", { name: "通算の時間" });
    expect(pace).toHaveTextContent("通算 5分");
    expect(pace).not.toHaveTextContent("最速");
  });

  it("完結する前は、メダルの目安だけを出し、作戦は書かない（気づいた人の得にする）", async () => {
    const user = userEvent.setup();
    render(<GameScreen ticker={manualTicker().ticker} storage={memoryStorage({})} now={() => 0} />);
    await user.click(screen.getByRole("tab", { name: "記録" }));
    const hall = screen.getByRole("region", { name: "記録への挑戦" });
    expect(hall).toHaveTextContent("まだ完結していない");
    expect(hall).toHaveTextContent("金：2時間15分以内");
    expect(hall).not.toHaveTextContent("炭素星");
    expect(hall).not.toHaveTextContent("種");
  });

  it("金を取った銀河では、作戦の目安を出さない", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage({ [HALL_KEY]: { completions: 1, best: 130 * 60 } });
    render(<GameScreen ticker={manualTicker().ticker} storage={storage} now={() => 0} />);
    await user.click(screen.getByRole("tab", { name: "記録" }));
    const hall = screen.getByRole("region", { name: "記録への挑戦" });
    expect(hall).toHaveTextContent("天の川 最速 2時間10分（金）");
    expect(hall).not.toHaveTextContent("炭素星");
  });

  it("保存された記録を読み、記録タブに完結の回数と最速、メダルの目安を出す。金を取れていなければ作戦の目安も", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage({ [HALL_KEY]: { completions: 2, best: 150 * 60 } });
    render(<GameScreen ticker={manualTicker().ticker} storage={storage} now={() => 0} />);
    await user.click(screen.getByRole("tab", { name: "記録" }));
    const hall = screen.getByRole("region", { name: "記録への挑戦" });
    expect(hall).toHaveTextContent("完結 2回・天の川 最速 2時間30分（銀）");
    expect(hall).toHaveTextContent("金：2時間15分以内");
    expect(hall).toHaveTextContent("第3層で主星を炭素星にする");
  });

  it("エンディングに今回の時間のメダルと、次の挑戦を出す", async () => {
    const { EndingDialog } = await import("./EndingDialog");
    render(
      <EndingDialog
        game={completed()}
        hall={{ ...EMPTY_HALL, completions: 1 }}
        open
        onClose={() => {}}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("今回のメダル：銅");
    expect(dialog).toHaveTextContent("金：2時間15分以内");
  });

  it("天の川でない周のエンディングは、その銀河の基準でメダルを決め、銀河の名前を出す", async () => {
    const { EndingDialog } = await import("./EndingDialog");
    const game = completed();
    game.meta.galaxy = "metalRich";
    game.meta.heritage = true;
    game.meta.completedAt = 2 * 3600 + 8 * 60;
    render(
      <EndingDialog game={game} hall={{ ...EMPTY_HALL, completions: 1 }} open onClose={() => {}} />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("今回のメダル：金（金属の多い銀河の中心）");
    expect(dialog).toHaveTextContent("金：2時間9分以内");
  });

  it("前の周の星屑を持って始めた周は、厳しい基準でメダルを決め、そう書く", async () => {
    const { EndingDialog } = await import("./EndingDialog");
    const game = completed();
    game.meta.heritage = true;
    game.meta.completedAt = 2 * 3600 + 10 * 60;
    render(
      <EndingDialog game={game} hall={{ ...EMPTY_HALL, completions: 1 }} open onClose={() => {}} />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("今回のメダル：銀");
    expect(dialog).toHaveTextContent("金：2時間4分以内");
    expect(dialog).toHaveTextContent("前の周の星屑を持って始めた周");
  });

  it("記録タブの最速の周のメダルは、その周の基準で決める", async () => {
    const user = userEvent.setup();
    const best = {
      layer2: null,
      layer3: null,
      layer4: null,
      complete: 130 * 60,
      galaxy: "milkyWay",
      found: [],
      heritage: true,
    };
    const storage = memoryStorage({
      [HALL_KEY]: { completions: 2, bests: { milkyWay: best }, last: best, previous: null },
    });
    render(<GameScreen ticker={manualTicker().ticker} storage={storage} now={() => 0} />);
    await user.click(screen.getByRole("tab", { name: "記録" }));
    const hall = screen.getByRole("region", { name: "記録への挑戦" });
    expect(hall).toHaveTextContent("天の川 最速 2時間10分（銀）");
    expect(hall).toHaveTextContent("第3層で主星を炭素星にする");
  });

  it("エンディングに層ごとの時刻と、前回との差を出す", async () => {
    const { EndingDialog } = await import("./EndingDialog");
    const game = completed();
    game.meta.milestones = { layer2: 25 * 60, layer3: 55 * 60, layer4: 140 * 60 };
    render(
      <EndingDialog
        game={game}
        hall={{
          ...EMPTY_HALL,
          completions: 2,
          previous: {
            layer2: 30 * 60,
            layer3: 50 * 60,
            layer4: 140 * 60,
            complete: 4 * 3600,
            galaxy: "milkyWay",
            found: [],
            heritage: false,
          },
        }}
        open
        onClose={() => {}}
      />
    );
    const table = screen.getByRole("table", { name: "層ごとの時刻" });
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("第2層25分−5分");
    expect(rows[2]).toHaveTextContent("第3層55分+5分");
    expect(rows[3]).toHaveTextContent("第4層2時間20分±0分");
    expect(rows[4]).toHaveTextContent("完結4時間30分+30分");
  });

  it("完結したら記録を保存する", () => {
    const storage = memoryStorage({});
    const { tick } = (() => {
      const clock = manualTicker();
      render(
        <GameScreen initial={almostDone()} ticker={clock.ticker} storage={storage} now={() => 0} />
      );
      return clock;
    })();
    tick(0.25);
    expect(storage.get(HALL_KEY)).toMatchObject({
      completions: 1,
      bests: { milkyWay: { complete: expect.any(Number) } },
    });
  });
});

describe("エンディングから次の周へ", () => {
  it("銀河を選んで、そのまま次の周を始められる（記録は残る）", async () => {
    const user = userEvent.setup();
    const storage = memoryStorage({});
    const clock = manualTicker();
    render(
      <GameScreen initial={almostDone()} ticker={clock.ticker} storage={storage} now={() => 0} />
    );
    clock.tick(0.25);
    const dialog = await screen.findByRole("dialog", { name: "周期表が埋まった" });
    const galaxies = within(dialog).getByRole("radiogroup", { name: "次の周の銀河" });
    await user.click(within(galaxies).getByRole("radio", { name: /金属の多い銀河の中心/ }));
    await user.click(within(dialog).getByRole("button", { name: "この銀河で次の周を始める" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("timer", { name: "通算の時間" })).toHaveTextContent(
      "金属の多い銀河の中心・通算 0分"
    );
    expect(storage.get(HALL_KEY)).toMatchObject({ completions: 1 });
  });
});

describe("EndingDialog", () => {
  it("まだ埋まっていなければ時間は 0分（記録からは開けない）", async () => {
    const { EndingDialog } = await import("./EndingDialog");
    render(<EndingDialog game={createGame()} hall={EMPTY_HALL} open onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("（0分）");
  });
});
