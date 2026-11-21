import { describe, expect, it } from "vitest";
import { SHOP } from "./balance";
import { nextShopGoal } from "./goal";
import { createMeta } from "./star";

describe("nextShopGoal：次に狙う星屑の強化", () => {
  it("足りない割合が一番小さい強化を選び、あといくつかを返す", () => {
    const meta = createMeta();
    meta.dust = { C: 2, N: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 1 };
    // 金属量（炭素 3）はあと 1、自動制御（硫黄 2）はあと 1。交換できるものがなければ自動制御を先に勧める
    expect(nextShopGoal(meta)).toEqual({ item: "auto", shortfall: 1, affordable: false });
  });

  it("もう買えるものがあれば、それを返す", () => {
    const meta = createMeta();
    meta.dust.O = 5;
    expect(nextShopGoal(meta)).toEqual({ item: "mass", shortfall: 0, affordable: true });
  });

  it("1回きりの強化を取得済みなら選ばない", () => {
    const meta = createMeta();
    meta.shop.auto = 1;
    meta.dust.S = 3;
    expect(nextShopGoal(meta)?.item).not.toBe("auto");
  });
});

describe("nextShopGoal と層", () => {
  it("まだ解放されていない層の強化は選ばない", () => {
    const meta = createMeta();
    meta.dust.N = 9;
    expect(SHOP[nextShopGoal(meta).item].layer).toBeUndefined();
  });
});

describe("nextShopGoal と自動制御", () => {
  it("燃焼の自動制御をまだ持っていなければ、それを最初に勧める", () => {
    const meta = createMeta();
    meta.dust.O = 2;
    expect(nextShopGoal(meta).item).toBe("auto");
  });
});

describe("nextShopGoal：次に買えるまでの推定時間", () => {
  function autoOwned() {
    const meta = createMeta();
    meta.shop.auto = 1;
    meta.dust = { C: 0, N: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 0 };
    return meta;
  }

  it("不足 ÷ これまでの一番よい1周の稼ぎ が一番短い強化を選ぶ（手持ちが 0 でも選ぶ）", () => {
    const meta = autoOwned();
    meta.bestRate = { C: 0.01, N: 0, O: 0.01, Ne: 0.01, Mg: 0.01, Si: 10, S: 0.01 };
    expect(SHOP[nextShopGoal(meta).item].currency).toBe("Si");
  });

  it("稼いだことのない星屑は、稼げる星屑があれば選ばない", () => {
    const meta = autoOwned();
    meta.bestRate = { C: 0, N: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 0.001 };
    expect(SHOP[nextShopGoal(meta).item].currency).toBe("S");
  });

  it("どれも稼いだことがなければ、足りない割合で選ぶ", () => {
    const meta = autoOwned();
    meta.dust.C = 2;
    expect(nextShopGoal(meta).item).toBe("cno");
  });
});
