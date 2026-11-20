import { shopCost } from "./actions";
import { SHOP } from "./balance";
import { funds, isShopItemOpen, isShopItemUseful } from "./shop";
import { heavyRate } from "./sprocess";
import { SHOP_IDS, type Currency, type Meta, type ShopId } from "./types";

export type ShopGoal = { item: ShopId; shortfall: number; affordable: boolean };

/** その通貨を毎秒どれだけ稼げそうか。星屑はこれまでの一番よい1周、重元素の星屑は今の恒星風 */
function incomeRate(meta: Meta, currency: Currency): number {
  return currency === "heavy" ? heavyRate(meta) : meta.bestRate[currency];
}

/**
 * 次に狙う星屑の強化。買えるものがあればそれ。なければ燃焼の自動制御、
 * その次は 不足 ÷ 稼ぎ（次に買えるまでの推定時間）が一番短いもの。
 * 稼いだことのある通貨がなければ、足りない割合（不足 / 費用）が一番小さいもの
 */
export function nextShopGoal(meta: Meta): ShopGoal {
  const goals = SHOP_IDS.filter((item) => {
    const { maxLevel } = SHOP[item];
    return (
      isShopItemOpen(meta, item) &&
      isShopItemUseful(meta, item) &&
      (maxLevel === undefined || meta.shop[item] < maxLevel)
    );
  }).map((item) => {
    const cost = shopCost(meta, item);
    const shortfall = Math.max(0, cost - funds(meta, SHOP[item].currency));
    const rate = incomeRate(meta, SHOP[item].currency);
    return {
      goal: { item, shortfall, affordable: shortfall === 0 },
      ratio: shortfall / cost,
      seconds: rate > 0 ? shortfall / rate : Infinity,
    };
  });
  const affordable = goals.find(({ goal }) => goal.affordable);
  if (affordable) return affordable.goal;
  // 燃焼の自動制御は遊び方を大きく変えるので、交換できるものがなければ真っ先に勧める
  const auto = goals.find(({ goal }) => goal.item === "auto");
  if (auto) return auto.goal;
  const timed = goals.filter((g) => g.seconds < Infinity);
  if (timed.length > 0) return timed.reduce((a, b) => (b.seconds < a.seconds ? b : a)).goal;
  return goals.reduce((a, b) => (b.ratio < a.ratio ? b : a)).goal;
}
