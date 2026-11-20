import { shopCost } from "./actions";
import { SHOP } from "./balance";
import { funds, isShopItemOpen } from "./shop";
import { SHOP_IDS, type Meta, type ShopId } from "./types";

export type ShopGoal = { item: ShopId; shortfall: number; affordable: boolean };

/**
 * 次に狙う星屑の強化。足りない割合（不足 / 費用）が一番小さいもの。
 * 何度でも買える強化があるので、必ずどれかが選ばれる
 */
export function nextShopGoal(meta: Meta): ShopGoal {
  const goals = SHOP_IDS.filter((item) => {
    const { maxLevel } = SHOP[item];
    return isShopItemOpen(meta, item) && (maxLevel === undefined || meta.shop[item] < maxLevel);
  }).map((item) => {
    const cost = shopCost(meta, item);
    const shortfall = Math.max(0, cost - funds(meta, SHOP[item].currency));
    return { goal: { item, shortfall, affordable: shortfall === 0 }, ratio: shortfall / cost };
  });
  const best = goals.reduce((a, b) => (b.ratio < a.ratio ? b : a)).goal;
  if (best.affordable) return best;
  // 燃焼の自動制御は遊び方を大きく変えるので、交換できるものがなければ真っ先に勧める
  const auto = goals.find(({ goal }) => goal.item === "auto");
  return auto ? auto.goal : best;
}
