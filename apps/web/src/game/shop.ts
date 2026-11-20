import { LAYER2_AFTER, SHOP } from "./balance";
import type { Currency, Meta, ShopId } from "./types";

/** 恒久強化に払える手持ち */
export function funds(meta: Meta, currency: Currency): number {
  return currency === "heavy" ? meta.sProcess.heavy : meta.dust[currency];
}

/** 手持ちから払う */
export function spend(meta: Meta, currency: Currency, amount: number): Meta {
  return currency === "heavy"
    ? { ...meta, sProcess: { ...meta.sProcess, heavy: meta.sProcess.heavy - amount } }
    : { ...meta, dust: { ...meta.dust, [currency]: meta.dust[currency] - amount } };
}

/** その恒久強化の層が解放されているか */
export function isShopItemOpen(meta: Meta, item: ShopId): boolean {
  const { layer } = SHOP[item];
  if (layer === 2) return meta.supernovae >= LAYER2_AFTER;
  if (layer === 3) return meta.sProcess.unlocked;
  return true;
}
