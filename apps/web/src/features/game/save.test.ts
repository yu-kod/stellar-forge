/* eslint-disable @typescript-eslint/no-explicit-any -- 壊れたセーブを作るために型を外す */
import { describe, expect, it } from "vitest";
import { buyShopItem } from "@/game/actions";
import { createGame } from "@/game/star";
import { AWAY_LIMIT_SECONDS } from "@/game/away";
import { SAVE_VERSION, restoreSave, toSave } from "./save";
import { LAYER2_AFTER } from "@/game/balance";

const NOW = Date.UTC(2026, 10, 20, 12, 0, 0);

describe("toSave", () => {
  it("バージョンと保存した時刻を付ける", () => {
    const game = createGame();
    expect(toSave(game, NOW)).toEqual({ version: SAVE_VERSION, savedAt: NOW, game });
  });
});

describe("restoreSave", () => {
  it("保存したものをそのまま戻す（すぐ開き直したとき）", () => {
    const game = createGame();
    game.star.energy = 123;
    const restored = restoreSave(toSave(game, NOW), NOW);
    expect(restored?.game).toEqual(game);
    expect(restored?.awaySeconds).toBe(0);
  });

  it("JSON を通しても戻せる", () => {
    const game = createGame();
    const raw = JSON.parse(JSON.stringify(toSave(game, NOW)));
    expect(restoreSave(raw, NOW)?.game).toEqual(game);
  });

  it("漸近巨星分枝星になった時刻も戻す。古いセーブに無ければ null", () => {
    const game = createGame();
    game.star.agbStartedAt = 12;
    const raw = JSON.parse(JSON.stringify(toSave(game, NOW)));
    expect(restoreSave(raw, NOW)?.game.star.agbStartedAt).toBe(12);
    delete raw.game.star.agbStartedAt;
    expect(restoreSave(raw, NOW)?.game.star.agbStartedAt).toBeNull();
  });

  it("閉じていた時間を返す（進めるのは画面の側で少しずつ）", () => {
    const restored = restoreSave(toSave(createGame(), NOW), NOW + 60_000);
    expect(restored?.awaySeconds).toBe(60);
    expect(restored?.game.star.time).toBe(0);
  });

  it("留守は12時間まで数える", () => {
    const restored = restoreSave(toSave(createGame(), NOW), NOW + 20 * 3600_000);
    expect(restored?.awaySeconds).toBe(AWAY_LIMIT_SECONDS);
  });

  it("終わった星で止まっていれば、留守の時間は数えない（超新星の画面から再開する）", () => {
    const game = createGame();
    game.star.end = "collapse";
    const restored = restoreSave(toSave(game, NOW), NOW + 60_000);
    expect(restored?.awaySeconds).toBe(0);
  });

  it("星団の星の次の質量も戻す", () => {
    const game = createGame();
    game.meta.supernovae = LAYER2_AFTER;
    game.meta.dust.N = 30;
    const withCluster = buyShopItem(game, "cluster");
    const raw = JSON.parse(JSON.stringify(toSave(withCluster, NOW)));
    expect(restoreSave(raw, NOW)?.game.meta.cluster[0]?.nextMass).toBe(7);
  });

  it("時計が戻っていても、時間を巻き戻さない", () => {
    const restored = restoreSave(toSave(createGame(), NOW), NOW - 60_000);
    expect(restored?.awaySeconds).toBe(0);
    expect(restored?.game.star.time).toBe(0);
  });

  it("後から足した項目が古いセーブに無ければ、初期値で埋める", () => {
    const save = JSON.parse(JSON.stringify(toSave(createGame(), NOW)));
    delete save.game.meta.shop.pre;
    delete save.game.meta.autoOn;
    delete save.game.meta.supernovae;
    delete save.game.meta.neutronStars;
    delete save.game.meta.log;
    delete save.game.meta.target;
    delete save.game.meta.whiteDwarfs;
    delete save.game.meta.nextMass;
    const restored = restoreSave(save, NOW);
    expect(restored?.game.meta.target).toBeNull();
    expect(restored?.game.meta).toMatchObject({ whiteDwarfs: 0, nextMass: null });
    expect(restored?.game.meta).toMatchObject({ supernovae: 0, neutronStars: 0, log: [] });
    expect(restored?.game.meta.shop.pre).toBe(0);
    expect(restored?.game.meta.autoOn.H).toBe(true);
  });

  it("発見した元素と、これまでの超新星の記録も戻す", () => {
    const game = createGame();
    game.meta.discovered = { He: true, C: true };
    game.meta.target = null;
    game.meta.autoRebirth = false;
    game.meta.whiteDwarfs = 2;
    game.meta.nextMass = 3;
    game.meta.log = [
      {
        generation: 1,
        time: 120,
        ejected: 10,
        gain: { C: 1, N: 0, O: 2, Ne: 0, Mg: 0, Si: 0, S: 0 },
        end: "collapse",
      },
    ];
    const raw = JSON.parse(JSON.stringify(toSave(game, NOW)));
    expect(restoreSave(raw, NOW)?.game.meta).toEqual(game.meta);
  });

  it("星団の星も戻す", () => {
    const game = createGame();
    game.meta.supernovae = LAYER2_AFTER;
    game.meta.dust.N = 30;
    const withCluster = buyShopItem(game, "cluster");
    withCluster.meta.cluster[0]!.nextMass = null;
    const raw = JSON.parse(JSON.stringify(toSave(withCluster, NOW)));
    expect(restoreSave(raw, NOW)?.game.meta.cluster).toEqual(withCluster.meta.cluster);
  });

  it("s過程の道も戻す", () => {
    const game = createGame();
    game.meta.sProcess = {
      unlocked: true,
      amounts: game.meta.sProcess.amounts.map((_, i) => i / 100),
      produced: game.meta.sProcess.amounts.map((_, i) => i / 50),
      discovered: [27, 38],
      looped: true,
      seedTarget: 7,
      heavy: 12.5,
    };
    const raw = JSON.parse(JSON.stringify(toSave(game, NOW)));
    expect(restoreSave(raw, NOW)?.game.meta.sProcess).toEqual(game.meta.sProcess);
  });

  it("自動交換の設定が古いセーブに無ければ OFF", () => {
    const save = JSON.parse(JSON.stringify(toSave(createGame(), NOW)));
    delete save.game.meta.autoShop;
    expect(restoreSave(save, NOW)?.game.meta.autoShop).toBe(false);
    save.game.meta.autoShop = true;
    expect(restoreSave(save, NOW)?.game.meta.autoShop).toBe(true);
  });

  it("鉄の種の目標の量が古いセーブに無ければ初期値", () => {
    const save = JSON.parse(JSON.stringify(toSave(createGame(), NOW)));
    delete save.game.meta.sProcess.seedTarget;
    delete save.game.meta.sProcess.heavy;
    expect(restoreSave(save, NOW)?.game.meta.sProcess).toMatchObject({ seedTarget: 10, heavy: 0 });
  });

  it("作った量が古いセーブに無ければ、今道の上にある量とみなす", () => {
    const game = createGame();
    game.meta.sProcess.amounts[3] = 0.5;
    const save = JSON.parse(JSON.stringify(toSave(game, NOW)));
    delete save.game.meta.sProcess.produced;
    expect(restoreSave(save, NOW)?.game.meta.sProcess.produced[3]).toBe(0.5);
  });

  it("s過程の道がなければ、空の道で始める", () => {
    const save = JSON.parse(JSON.stringify(toSave(createGame(), NOW)));
    delete save.game.meta.sProcess;
    expect(restoreSave(save, NOW)?.game.meta.sProcess).toEqual(createGame().meta.sProcess);
  });

  it("軽い元素と Ia型超新星の数も戻し、古いセーブに無ければ空で始める", () => {
    const game = createGame();
    game.meta.lightFound = [3, 11];
    game.meta.iaSupernovae = 12;
    const raw = JSON.parse(JSON.stringify(toSave(game, NOW)));
    expect(restoreSave(raw, NOW)?.game.meta).toMatchObject({
      lightFound: [3, 11],
      iaSupernovae: 12,
    });
    delete raw.game.meta.lightFound;
    delete raw.game.meta.iaSupernovae;
    expect(restoreSave(raw, NOW)?.game.meta).toMatchObject({ lightFound: [], iaSupernovae: 0 });
  });

  it("中性子星の在庫も戻し、古いセーブに無ければ空で始める", () => {
    const game = createGame();
    game.meta.rProcess = {
      ...game.meta.rProcess,
      unlocked: true,
      pool: [1, 0, 0, 0, 0, 0, 0, 0, 5],
      binaries: [{ a: 0, b: 8, remaining: 120 }],
      discovered: [63],
      mergers: 4,
    };
    game.meta.rProcess.amounts[3] = 2.5;
    const raw = JSON.parse(JSON.stringify(toSave(game, NOW)));
    expect(restoreSave(raw, NOW)?.game.meta.rProcess).toEqual(game.meta.rProcess);
    delete raw.game.meta.rProcess;
    expect(restoreSave(raw, NOW)?.game.meta.rProcess).toEqual(createGame().meta.rProcess);
  });

  it("r過程の道・連星・合体の回数が古いセーブに無ければ、空で始める", () => {
    const game = createGame();
    game.meta.rProcess.unlocked = true;
    const raw = JSON.parse(JSON.stringify(toSave(game, NOW)));
    delete raw.game.meta.rProcess.amounts;
    delete raw.game.meta.rProcess.binaries;
    delete raw.game.meta.rProcess.discovered;
    delete raw.game.meta.rProcess.mergers;
    expect(restoreSave(raw, NOW)?.game.meta.rProcess).toEqual({
      ...createGame().meta.rProcess,
      unlocked: true,
    });
  });

  it("遊んだ時間と、83マスが埋まった時を戻す。古いセーブに無ければ 0 と null", () => {
    const game = createGame();
    game.meta.elapsed = 5000;
    game.meta.blackHoles = 9;
    game.meta.completedAt = 4000;
    const raw = JSON.parse(JSON.stringify(toSave(game, NOW)));
    expect(restoreSave(raw, NOW)?.game.meta).toMatchObject({
      elapsed: 5000,
      completedAt: 4000,
      blackHoles: 9,
    });
    raw.game.meta.completedAt = null;
    expect(restoreSave(raw, NOW)?.game.meta.completedAt).toBeNull();
    delete raw.game.meta.completedAt;
    delete raw.game.meta.elapsed;
    delete raw.game.meta.blackHoles;
    expect(restoreSave(raw, NOW)?.game.meta).toMatchObject({
      elapsed: 0,
      completedAt: null,
      blackHoles: 0,
    });
  });

  it("星団を持っているのに星が保存されていなければ、作り直す", () => {
    const save = JSON.parse(JSON.stringify(toSave(createGame(), NOW)));
    save.game.meta.shop.cluster = 1;
    delete save.game.meta.cluster;
    expect(restoreSave(save, NOW)?.game.meta.cluster).toHaveLength(1);
  });

  function saveWith(change: (game: Record<string, any>) => void) {
    const save = JSON.parse(JSON.stringify(toSave(createGame(), NOW)));
    change(save.game);
    return save;
  }

  it.each([
    ["星の終わり方が知らない値", saveWith((g) => (g.star.end = "exploded"))],
    ["記録が配列でない", saveWith((g) => (g.meta.log = {}))],
    [
      "記録の終わり方が空",
      saveWith((g) => (g.meta.log = [{ generation: 1, time: 1, ejected: 1, gain: {}, end: null }])),
    ],
    ["自動の切り替えが真偽値でない", saveWith((g) => (g.meta.autoOn.H = 1))],
    ["狙いが知らない値", saveWith((g) => (g.meta.target = "Au"))],
    ["星団が配列でない", saveWith((g) => (g.meta.cluster = {}))],
    ["s過程の道の長さが違う", saveWith((g) => (g.meta.sProcess.amounts = [1, 2]))],
    ["s過程の発見が数でない", saveWith((g) => (g.meta.sProcess.discovered = ["Sr"]))],
    ["s過程の発見が配列でない", saveWith((g) => (g.meta.sProcess.discovered = 38))],
    ["s過程の解放が真偽値でない", saveWith((g) => (g.meta.sProcess.unlocked = "yes"))],
    ["軽い元素が配列でない", saveWith((g) => (g.meta.lightFound = 3))],
    ["中性子星の在庫の段の数が違う", saveWith((g) => (g.meta.rProcess.pool = [1]))],
    ["中性子星の在庫が配列でない", saveWith((g) => (g.meta.rProcess.pool = 1))],
    ["第4層の解放が真偽値でない", saveWith((g) => (g.meta.rProcess.unlocked = 1))],
    ["r過程の道の長さが違う", saveWith((g) => (g.meta.rProcess.amounts = [1]))],
    ["連星が配列でない", saveWith((g) => (g.meta.rProcess.binaries = {}))],
    [
      "連星の時間が数でない",
      saveWith((g) => (g.meta.rProcess.binaries = [{ a: 0, b: 1, remaining: "x" }])),
    ],
    ["軽い元素が数でない", saveWith((g) => (g.meta.lightFound = ["Li"]))],
    [
      "星団の星の狙いがない",
      saveWith((g) => (g.meta.cluster = [{ star: g.star, nextMass: 7, target: null }])),
    ],
  ])("壊れたセーブは読まない：%s", (_, raw) => {
    expect(restoreSave(raw, NOW)).toBeNull();
  });

  it.each([
    ["空", null],
    ["文字列", "broken"],
    ["知らないバージョン", { version: 999, savedAt: NOW, game: createGame() }],
    ["game が無い", { version: SAVE_VERSION, savedAt: NOW }],
    ["star が無い", { version: SAVE_VERSION, savedAt: NOW, game: { meta: createGame().meta } }],
    [
      "質量が数でない",
      (() => {
        const game = createGame();
        (game.star.mass as Record<string, unknown>).H = "many";
        return { version: SAVE_VERSION, savedAt: NOW, game };
      })(),
    ],
    ["時刻が数でない", { version: SAVE_VERSION, savedAt: "yesterday", game: createGame() }],
  ])("壊れたセーブは読まない：%s", (_, raw) => {
    expect(restoreSave(raw, NOW)).toBeNull();
  });
});
