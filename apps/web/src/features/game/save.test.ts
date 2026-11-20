/* eslint-disable @typescript-eslint/no-explicit-any -- 壊れたセーブを作るために型を外す */
import { describe, expect, it } from "vitest";
import { buyShopItem } from "@/game/actions";
import { createGame } from "@/game/star";
import { aboutToCollapse, collapsed } from "@/test-utils/game";
import { OFFLINE_LIMIT_SECONDS, SAVE_VERSION, restoreSave, toSave } from "./save";

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

  it("閉じていた時間だけ星を進める", () => {
    const restored = restoreSave(toSave(createGame(), NOW), NOW + 60_000);
    expect(restored?.awaySeconds).toBe(60);
    expect(restored?.game.star.time).toBeCloseTo(60);
  });

  it("留守中の進行は30分まで", () => {
    const restored = restoreSave(toSave(createGame(), NOW), NOW + 5 * 3600_000);
    expect(OFFLINE_LIMIT_SECONDS).toBe(1800);
    expect(restored?.awaySeconds).toBe(1800);
  });

  it("時計が戻っていても、時間を巻き戻さない", () => {
    const restored = restoreSave(toSave(createGame(), NOW), NOW - 60_000);
    expect(restored?.awaySeconds).toBe(0);
    expect(restored?.game.star.time).toBe(0);
  });

  it("自動で次の星を生めるなら、留守中も周回を続ける", () => {
    const game = aboutToCollapse();
    game.meta.supernovae = 10;
    const restored = restoreSave(toSave(game, NOW), NOW + 600_000);
    expect(restored?.game.meta.supernovae).toBeGreaterThan(10);
    expect(restored?.game.star.end).toBeNull();
  });

  it("終わった星は進めない（超新星の画面から再開する）", () => {
    const game = collapsed();
    const restored = restoreSave(toSave(game, NOW), NOW + 60_000);
    expect(restored?.game).toEqual(game);
    expect(restored?.awaySeconds).toBe(0);
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
    game.meta.supernovae = 5;
    game.meta.dust.N = 30;
    const withCluster = buyShopItem(game, "cluster");
    withCluster.meta.cluster[0]!.nextMass = null;
    const raw = JSON.parse(JSON.stringify(toSave(withCluster, NOW)));
    expect(restoreSave(raw, NOW)?.game.meta.cluster).toEqual(withCluster.meta.cluster);
  });

  it("留守中は星団の星も燃える", () => {
    const game = createGame();
    game.meta.supernovae = 5;
    game.meta.dust.N = 30;
    const withCluster = buyShopItem(game, "cluster");
    const restored = restoreSave(toSave(withCluster, NOW), NOW + 60_000);
    expect(restored?.game.meta.cluster[0]?.star.time).toBeCloseTo(60);
  });

  it("主星が超新星の画面で止まっていても、星団の星は燃え続ける", () => {
    const game = collapsed();
    game.meta.supernovae = 5;
    game.meta.dust.N = 30;
    const withCluster = buyShopItem(game, "cluster");
    const restored = restoreSave(toSave(withCluster, NOW), NOW + 60_000);
    expect(restored?.game.star.end).toBe("collapse");
    expect(restored?.game.meta.cluster[0]?.star.time).toBeCloseTo(60);
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
