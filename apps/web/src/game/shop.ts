import { LAYER2_AFTER, SHOP } from "./balance";
import type { Meta, ShopId } from "./types";

/** その恒久強化の層が解放されているか */
export function isShopItemOpen(meta: Meta, item: ShopId): boolean {
  const { layer } = SHOP[item];
  if (layer === 2) return meta.supernovae >= LAYER2_AFTER;
  if (layer === 3) return meta.sProcess.unlocked;
  return true;
}
