import { act } from "@testing-library/react";
import type { Ticker } from "@/features/game/ticker";
import { createGame } from "@/game/star";
import type { GameState } from "@/game/types";

/** 全段階が点火し、鉄のコアが崩壊の直前まで育った星 */
export function aboutToCollapse(): GameState {
  const game = createGame();
  game.star.mass = { H: 10, He: 2, C: 1, N: 0, O: 3, Ne: 1, Mg: 1, Si: 4, S: 1, Fe: 1.39 };
  game.star.temperature = 2.7e9;
  game.star.time = 120;
  game.star.ignitedAt = { H: 0, He: 20, C: 50, Ne: 70, O: 80, Si: 90 };
  game.star.levels = { H: 5, He: 4, C: 3, Ne: 2, O: 1, Si: 0 };
  game.meta.discovered = {
    He: true,
    C: true,
    O: true,
    Ne: true,
    Mg: true,
    Si: true,
    S: true,
    Fe: true,
  };
  return game;
}

/** 超新星を終えた星 */
export function collapsed(): GameState {
  const game = aboutToCollapse();
  game.star.mass.Fe = 1.4;
  game.star.end = "collapse";
  return game;
}

/** 手で進める ticker。tick(秒) で登録されたコールバックを act の中で呼ぶ */
export function manualTicker() {
  const listeners = new Set<(seconds: number) => void>();
  const ticker: Ticker = (onFrame) => {
    listeners.add(onFrame);
    return () => listeners.delete(onFrame);
  };
  function tick(seconds: number) {
    act(() => {
      for (const listener of listeners) listener(seconds);
    });
  }
  return { ticker, tick };
}
