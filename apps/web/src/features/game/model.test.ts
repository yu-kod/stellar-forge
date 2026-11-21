import { buyShopItem } from "@/game/actions";
import { describe, expect, it } from "vitest";
import { createGame } from "@/game/star";
import { aboutToCollapse, collapsed } from "@/test-utils/game";
import {
  PROJECTION_REFRESH,
  PROJECTION_SECONDS_PER_TICK,
  createModel,
  gameReducer,
  type Model,
} from "./model";
import { LAYER2_AFTER } from "@/game/balance";

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

  it("setTarget は狙う星屑を変え、自動強化をそれに合わせる", () => {
    const model = gameReducer(modelWith(), { type: "setTarget", target: "C" });
    expect(model.game.meta.target).toBe("C");
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
    expect(model.notices[0]).toEqual({ id: 1, event: { type: "born", generation: 2 } });
  });

  it("まだ終わっていない星では rebirth しない", () => {
    const start = modelWith();
    expect(gameReducer(start, { type: "rebirth" })).toBe(start);
  });

  it("setSpeed は進める速さを変える", () => {
    expect(gameReducer(modelWith(), { type: "setSpeed", speed: 3 }).speed).toBe(3);
  });
});

describe("createModel", () => {
  it("始めるときの知らせを持たせられる", () => {
    const model = createModel(createGame(), [
      { type: "away", seconds: 120, supernovae: 0, whiteDwarfs: 0 },
    ]);
    expect(model.notices).toEqual([
      { id: 1, event: { type: "away", seconds: 120, supernovae: 0, whiteDwarfs: 0 } },
    ]);
    expect(model.nextNoticeId).toBe(2);
  });
});

describe("gameReducer：reset", () => {
  it("最初の星からやり直し、知らせを消す", () => {
    const start = createModel(collapsed(), [
      { type: "away", seconds: 120, supernovae: 0, whiteDwarfs: 0 },
    ]);
    start.game.meta.dust.C = 50;
    const model = gameReducer(start, { type: "reset" });
    expect(model.game).toEqual(createGame());
    expect(model.notices).toEqual([]);
  });

  it("銀河を選んでやり直せる（選ばなければ天の川）", () => {
    const start = createModel(createGame("metalRich"));
    expect(gameReducer(start, { type: "reset", galaxy: "metalRich" }).game).toEqual(
      createGame("metalRich")
    );
    expect(gameReducer(start, { type: "reset" }).game.meta.galaxy).toBe("milkyWay");
  });
});

describe("gameReducer：星団", () => {
  it("星団の星が見つけた元素は知らせるが、星団の星の超新星は知らせない", () => {
    const start = modelWith();
    start.game.meta.supernovae = LAYER2_AFTER;
    start.game.meta.dust.N = 30;
    const game = buyShopItem(start.game, "cluster");
    game.meta.cluster[0]!.star.mass.Mg = 0.06;
    game.meta.cluster[0]!.star.mass.H = 0.69;
    game.meta.cluster[0]!.star.agbStartedAt = -20;
    const model = gameReducer({ ...start, game }, { type: "tick", seconds: 0.1 });
    expect(model.notices.map((n) => n.event)).toEqual([{ type: "discover", element: "Mg" }]);
    expect(model.game.meta.whiteDwarfs).toBe(1);
  });

  it("setSlotMass と setSlotTarget は星団の星の設定を変える", () => {
    const start = modelWith();
    start.game.meta.supernovae = LAYER2_AFTER;
    start.game.meta.dust.N = 30;
    const withSlot = { ...start, game: buyShopItem(start.game, "cluster") };
    const massed = gameReducer(withSlot, { type: "setSlotMass", slot: 0, mass: 3 });
    const targeted = gameReducer(massed, { type: "setSlotTarget", slot: 0, target: "Si" });
    expect(targeted.game.meta.cluster[0]).toMatchObject({ nextMass: 3, target: "Si" });
  });
});

describe("gameReducer：自動で次の星を生む設定で、終わった星から始まったとき", () => {
  it("次の更新で次の星を生む（超新星の画面で止まらない）", () => {
    const game = collapsed();
    game.meta.supernovae = 20;
    game.meta.autoRebirth = true;
    const model = gameReducer(createModel(game), { type: "tick", seconds: 0.1 });
    expect(model.game.star.end).toBeNull();
    expect(model.game.star.generation).toBeGreaterThan(game.star.generation);
  });
});

describe("gameReducer：s過程の次の発見の追跡", () => {
  it("進めるたびに、次に見つける元素の進み具合を追う（画面のタブによらず続く）", () => {
    const game = createGame();
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, discovered: [27] };
    let model = createModel(game);
    expect(model.sTrack).toBeNull();
    model = gameReducer(model, { type: "tick", seconds: 1 });
    expect(model.sTrack).toMatchObject({ z: 28, since: model.game.meta.elapsed });
    model = gameReducer(model, { type: "tick", seconds: 1 });
    expect(model.sTrack?.t).toBe(model.game.meta.elapsed);
    expect(model.sTrack?.since).toBe(model.game.meta.elapsed - 1);
  });

  it("第3層の前は追わない", () => {
    const model = gameReducer(createModel(createGame()), { type: "tick", seconds: 1 });
    expect(model.sTrack).toBeNull();
  });
});

describe("gameReducer：種ごとの見込み", () => {
  const layer3 = () => {
    const game = createGame();
    game.meta.shop.auto = 1;
    game.meta.sProcess = { ...game.meta.sProcess, unlocked: true, discovered: [27] };
    return game;
  };

  it("第3層の間、進めるたびに見込みを少しずつ進める", () => {
    let model = gameReducer(createModel(layer3()), { type: "tick", seconds: 0.25 });
    expect(model.seedProjection?.jobs.map((job) => job.seeds)).toEqual([1, 3, 10, 30]);
    expect(model.seedProjection?.startedAt).toBe(model.game.meta.elapsed);
    model = gameReducer(model, { type: "tick", seconds: 0.25 });
    expect(model.seedProjection?.jobs[0]?.elapsed).toBe(PROJECTION_SECONDS_PER_TICK);
    expect(
      gameReducer(createModel(createGame()), { type: "tick", seconds: 0.25 }).seedProjection
    ).toBeNull();
  });

  it("見込みが出たら、1分ごとに今の状態から出し直す", () => {
    let model = gameReducer(createModel(layer3()), { type: "tick", seconds: 0.25 });
    const done = model.seedProjection!.jobs.map((job) => ({ ...job, reachedAt: 600 }));
    model = { ...model, seedProjection: { jobs: done, startedAt: model.game.meta.elapsed } };
    const kept = gameReducer(model, { type: "tick", seconds: 1 });
    expect(kept.seedProjection?.jobs).toBe(done);
    const later = gameReducer(
      {
        ...kept,
        game: {
          ...kept.game,
          meta: { ...kept.game.meta, elapsed: kept.game.meta.elapsed + PROJECTION_REFRESH },
        },
      },
      { type: "tick", seconds: 0.25 }
    );
    expect(later.seedProjection?.jobs[0]?.reachedAt).toBeNull();
    expect(later.seedProjection?.startedAt).toBe(later.game.meta.elapsed);
  });
});

describe("gameReducer：放出物の使い道", () => {
  it("追観測に切り替えると、貯めた放出物をいま作りたい元素の発見に回し、見つけたら知らせる", () => {
    const game = createGame();
    game.meta.rProcess = { ...game.meta.rProcess, unlocked: true, ejecta: 100 };
    game.meta.rProcess.pool[2] = 4;
    const model = gameReducer(createModel(game), { type: "setObserving", on: true });
    expect(model.game.meta.rProcess.observing).toBe(true);
    expect(model.game.meta.rProcess.ejecta).toBe(0);
    expect(model.game.meta.rProcess.discovered).toContain(52);
    expect(model.notices.map((n) => n.event)).toContainEqual({ type: "rDiscover", z: 52 });
    const back = gameReducer(model, { type: "setObserving", on: false });
    expect(back.game.meta.rProcess.observing).toBe(false);
  });
});
