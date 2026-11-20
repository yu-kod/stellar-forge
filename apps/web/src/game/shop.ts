import { LAYER2_AFTER, SHOP } from "./balance";
import type { Meta, ShopId } from "./types";

/** その恒久強化の層が解放されているか */
export function isShopItemOpen(meta: Meta, item: ShopId): boolean {
  return SHOP[item].layer !== 2 || meta.supernovae >= LAYER2_AFTER;
}
