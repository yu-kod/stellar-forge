import { LAYER2_AFTER, SHOP } from "./balance";
import { S_DISCOVERABLE } from "./sprocess";
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
  if (layer === 4) return meta.rProcess.unlocked;
  return true;
}

/** その強化に、まだ効き目があるか。s過程を終えたら（循環を見て元素がそろったら）s過程の強化は効かない */
/** r過程で作るランタノイド */
const LANTHANIDES = [63, 64, 65, 66, 67, 68, 69];

export function isShopItemUseful(meta: Meta, item: ShopId): boolean {
  const sDone = meta.sProcess.looped && meta.sProcess.discovered.length === S_DISCOVERABLE;
  // 遮蔽で Ye が下がると、はじめの組（1.4 + 2.0 M☉）がランタノイドに届かなくなる
  if (item === "shield" && !LANTHANIDES.every((z) => meta.rProcess.discovered.includes(z))) {
    return false;
  }
  return !(SHOP[item].layer === 3 && sDone);
}
