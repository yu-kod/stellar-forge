import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createJsonStorage } from "@app/web-core";
import { describe, expect, it } from "vitest";
import { createGame } from "@/game/star";
import type { GameState } from "@/game/types";
import { aboutToCollapse, manualTicker } from "@/test-utils/game";
import { HALL_KEY } from "../hall";
import { SAVE_KEY, toSave, type SaveData } from "../save";
import { GameScreen } from "./GameScreen";

const NOW = Date.UTC(2026, 10, 20, 12, 0, 0);

function setup({
  saved,
  now = NOW,
  hall,
}: { saved?: unknown; now?: number; hall?: unknown } = {}) {
  const storage = createJsonStorage();
  if (saved !== undefined) storage.set(SAVE_KEY, saved);
  if (hall !== undefined) storage.set(HALL_KEY, hall);
  const clock = { now };
  const ticker = manualTicker();
  render(<GameScreen storage={storage} now={() => clock.now} ticker={ticker.ticker} />);
  return {
    ...ticker,
    clock,
    user: userEvent.setup(),
    saved: () => storage.get<SaveData>(SAVE_KEY),
  };
}

function setVisibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

function thirdGeneration(): GameState {
  const game = createGame();
  game.meta.supernovae = 2;
  game.star.generation = 3;
  game.meta.dust.C = 7;
  return game;
}

describe("GameScreen：保存と再開", () => {
  it("保存した進行から再開する", () => {
    setup({ saved: toSave(thirdGeneration(), NOW) });
    expect(screen.getByText("第3世代の星・0秒")).toBeInTheDocument();
  });

  it("閉じていた間も星が燃え、そのことを知らせる", () => {
    setup({ saved: toSave(createGame(), NOW - 125_000) });
    expect(screen.getByText("第1世代の星・125秒")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("留守のあいだに 2分 ぶん星が燃えた");
  });

  it("長い留守は少しずつ進め、その間は進み具合を見せる", () => {
    const game = aboutToCollapse();
    game.meta.supernovae = 10;
    const { tick } = setup({ saved: toSave(game, NOW - 2 * 3600_000) });
    expect(screen.getByRole("status", { name: "留守の間の進み具合" })).toHaveTextContent(
      "留守の間を進めています（あと 1時間45分）"
    );
    for (let i = 0; i < 7; i++) tick(0.016);
    expect(screen.queryByRole("status", { name: "留守の間の進み具合" })).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "知らせ" })).toHaveTextContent(
      "留守のあいだに 2時間0分 ぶん星が燃えた"
    );
  });

  it("タブが裏に回っていた間も進める", () => {
    const { clock } = setup({ saved: toSave(createGame(), NOW) });
    setVisibility("hidden");
    clock.now = NOW + 90_000;
    setVisibility("visible");
    expect(screen.getByText("第1世代の星・90秒")).toBeInTheDocument();
  });

  it("少しの留守では知らせない", () => {
    setup({ saved: toSave(createGame(), NOW - 10_000) });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("壊れたセーブなら最初から始める", () => {
    setup({ saved: { version: 1, game: "broken" } });
    expect(screen.getByText("第1世代の星・0秒")).toBeInTheDocument();
  });

  it("5秒ごとに保存する", () => {
    const { tick, clock, saved } = setup();
    tick(0.1);
    expect(saved()?.savedAt).toBe(NOW);

    clock.now = NOW + 4_000;
    tick(0.1);
    expect(saved()?.savedAt).toBe(NOW);

    clock.now = NOW + 5_000;
    tick(0.1);
    expect(saved()?.savedAt).toBe(NOW + 5_000);
    expect(saved()?.game.star.time).toBeCloseTo(0.3);
  });

  it("ページを離れるときに保存する", () => {
    const { tick, clock, saved } = setup();
    tick(0.1);
    clock.now = NOW + 1_000;
    tick(0.1);

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(saved()?.savedAt).toBe(NOW + 1_000);
    expect(saved()?.game.star.time).toBeCloseTo(0.2);
  });

  it("タブが裏に回ったときに保存する", () => {
    const { tick, clock, saved } = setup();
    tick(0.1);
    clock.now = NOW + 1_000;
    tick(0.1);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(saved()?.savedAt).toBe(NOW + 1_000);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("表に戻ったときは保存しない", () => {
    const { tick, clock, saved } = setup();
    tick(0.1);
    clock.now = NOW + 1_000;

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(saved()?.savedAt).toBe(NOW);
  });

  it("確かめてから最初からやり直し、保存も消す", async () => {
    const { user, saved } = setup({ saved: toSave(thirdGeneration(), NOW) });

    await user.click(screen.getByRole("button", { name: "最初からやり直す" }));
    const dialog = screen.getByRole("dialog", { name: "最初からやり直しますか？" });
    expect(dialog).toHaveTextContent("星屑・発見した元素・記録がすべて消えます");
    await user.click(screen.getByRole("button", { name: "消してやり直す" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("第1世代の星・0秒")).toBeInTheDocument();
    expect(saved()?.game.meta.dust.C).toBe(0);
  });

  it("1回完結した後は、やり直すときに次の周の銀河を選べる", async () => {
    const { user, saved } = setup({
      saved: toSave(thirdGeneration(), NOW),
      hall: { completions: 1, best: 150 * 60 },
    });
    await user.click(screen.getByRole("button", { name: "最初からやり直す" }));
    const dialog = screen.getByRole("dialog", { name: "最初からやり直しますか？" });
    const galaxies = within(dialog).getByRole("radiogroup", { name: "次の周の銀河" });
    expect(within(galaxies).getByRole("radio", { name: /天の川/ })).toBeChecked();
    const rich = within(galaxies).getByRole("radio", { name: /金属の多い銀河の中心/ });
    expect(galaxies).toHaveTextContent("中性子の毒 ×4");
    await user.click(rich);
    await user.click(screen.getByRole("button", { name: "消してやり直す" }));
    expect(saved()?.game.meta.galaxy).toBe("metalRich");
  });

  it("まだ完結していなければ、銀河は選べない（天の川）", async () => {
    const { user } = setup({ saved: toSave(thirdGeneration(), NOW) });
    await user.click(screen.getByRole("button", { name: "最初からやり直す" }));
    expect(screen.queryByRole("radiogroup", { name: "次の周の銀河" })).not.toBeInTheDocument();
  });

  it("やめればそのまま続ける", async () => {
    const { user } = setup({ saved: toSave(thirdGeneration(), NOW) });
    await user.click(screen.getByRole("button", { name: "最初からやり直す" }));
    await user.click(screen.getByRole("button", { name: "やめる" }));
    expect(screen.getByText("第3世代の星・0秒")).toBeInTheDocument();
  });
});
