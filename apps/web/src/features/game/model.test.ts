import { describe, expect, it } from "vitest";
import { createGame } from "@/game/star";
import { aboutToCollapse, collapsed } from "@/test-utils/game";
import { createModel, gameReducer, type Model } from "./model";

function modelWith(overrides: Partial<Model> = {}): Model {
  return { ...createModel(createGame()), ...overrides };
}

describe("gameReducer", () => {
  it("tick は経過秒数に速さを掛けて星を進める", () => {
    const model = gameReducer(modelWith({ speed: 3 }), { type: "tick", seconds: 0.5 });
    expect(model.game.star.time).toBeCloseTo(1.5);
  });

  it("点火と発見は知らせとして積み、番号を振る", () => {
    const start = modelWith();
    start.game.star.mass.He = 0.04;
    start.game.star.mass.C = 1; // 灰が重くなってヘリウム燃焼が点火する

    const model = gameReducer(start, { type: "tick", seconds: 0.1 });

    expect(model.notices).toEqual([
      { id: 1, event: { type: "ignite", stage: "He" } },
      { id: 2, event: { type: "discover", element: "C" } },
    ]);
    expect(model.nextNoticeId).toBe(3);
  });

  it("知らせは新しいものから4件まで残す", () => {
    const notices = [1, 2, 3, 4].map((id) => ({
      id,
      event: { type: "ignite" as const, stage: "He" as const },
    }));
    const start = modelWith({ notices, nextNoticeId: 5 });
    start.game.star.mass.C = 1;

    const model = gameReducer(start, { type: "tick", seconds: 0.1 });

    expect(model.notices.map((n) => n.id)).toEqual([3, 4, 5, 6]);
  });

  it("崩壊は知らせに積まない（超新星の画面で見せる）", () => {
    const model = gameReducer(createModel(aboutToCollapse()), { type: "tick", seconds: 1 });
    expect(model.game.star.end).toBe("collapse");
    expect(model.notices).toEqual([]);
  });

  it("終わった星では tick しても同じモデルを返す（再描画しない）", () => {
    const start = createModel(collapsed());
    expect(gameReducer(start, { type: "tick", seconds: 1 })).toBe(start);
  });

  it("dismiss は指定した知らせだけを消す", () => {
    const notices = [1, 2].map((id) => ({
      id,
      event: { type: "ignite" as const, stage: "He" as const },
    }));
    const model = gameReducer(modelWith({ notices }), { type: "dismiss", id: 1 });
    expect(model.notices.map((n) => n.id)).toEqual([2]);
  });

  it("buy / buyMax は燃焼を強化する", () => {
    const start = modelWith();
    start.game.star.energy = 1e46;
    const once = gameReducer(start, { type: "buy", stage: "H" });
    const max = gameReducer(start, { type: "buyMax", stage: "H" });
    expect(once.game.star.levels.H).toBe(2);
    expect(max.game.star.levels.H).toBeGreaterThan(2);
  });

  it("setAuto は段階ごとの自動強化を切り替える", () => {
    const model = gameReducer(modelWith(), { type: "setAuto", stage: "C", on: false });
    expect(model.game.meta.autoOn.C).toBe(false);
  });

  it("buyShopItem は星屑で恒久強化を買う", () => {
    const start = modelWith();
    start.game.meta.dust.O = 3;
    const model = gameReducer(start, { type: "buyShopItem", item: "mass" });
    expect(model.game.meta.shop.mass).toBe(1);
  });

  it("rebirth は終わった星から次の星を生み、その知らせを積む", () => {
    const model = gameReducer(createModel(collapsed()), { type: "rebirth" });
    expect(model.game.star.generation).toBe(2);
    expect(model.notices).toEqual([{ id: 1, event: { type: "born", generation: 2 } }]);
  });

  it("まだ終わっていない星では rebirth しない", () => {
    const start = modelWith();
    expect(gameReducer(start, { type: "rebirth" })).toBe(start);
  });

  it("setSpeed は進める速さを変える", () => {
    expect(gameReducer(modelWith(), { type: "setSpeed", speed: 3 }).speed).toBe(3);
  });
});
