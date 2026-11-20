import { useId } from "react";
import { Button } from "@/components/ui/button";
import { canBuyShopItem, shopCost } from "@/game/actions";
import { isShopItemOpen } from "@/game/shop";
import { SHOP } from "@/game/balance";
import { DUST_IDS, SHOP_IDS, type Meta, type ShopId } from "@/game/types";
import { currencyName } from "../elements";
import { formatNumber } from "../format";
import type { Action } from "../model";
import { ElementChip } from "./ElementChip";

type Props = { meta: Meta; dispatch: (action: Action) => void };

export function ShopView({ meta, dispatch }: Props) {
  return (
    <div className="grid gap-3">
      <h3 id="dust-label" className="sr-only">
        手持ちの星屑
      </h3>
      <ul aria-labelledby="dust-label" className="flex flex-wrap gap-2">
        {DUST_IDS.map((id) => (
          <ElementChip key={id} element={id} value={formatNumber(meta.dust[id])} />
        ))}
      </ul>
      <Button
        variant="outline"
        className="h-11 justify-self-start active:scale-[0.97]"
        onClick={() => dispatch({ type: "buyAllShopItems" })}
      >
        まとめて交換
      </Button>
      <p className="text-muted-foreground text-sm">
        欲しい星屑に合わせて、どの燃焼を強化するかを変えよう。例：炭素が欲しいなら炭素燃焼を強化しない。ケイ素が欲しいなら酸素燃焼まで強化する。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SHOP_IDS.filter((item) => SHOP[item].layer === undefined).map((item) => (
          <ShopItem key={item} meta={meta} item={item} dispatch={dispatch} />
        ))}
      </div>
      {isShopItemOpen(meta, "recycle") && (
        <>
          <h3 className="mt-2 text-base font-semibold">第2層（窒素）</h3>
          <p className="text-muted-foreground text-sm">
            窒素は主に軽い星（8 M☉ 未満）が白色矮星になるときに手に入る。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHOP_IDS.filter((item) => SHOP[item].layer === 2).map((item) => (
              <ShopItem key={item} meta={meta} item={item} dispatch={dispatch} />
            ))}
          </div>
        </>
      )}{" "}
      {isShopItemOpen(meta, "pocket") && (
        <>
          <h3 className="mt-2 text-base font-semibold">第3層（s過程）</h3>
          <p className="text-muted-foreground text-sm">
            溜まった星屑で中性子を増やし、白色矮星を鉄の種に変える。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHOP_IDS.filter((item) => SHOP[item].layer === 3).map((item) => (
              <ShopItem key={item} meta={meta} item={item} dispatch={dispatch} />
            ))}
          </div>
        </>
      )}
      {isShopItemOpen(meta, "envelope") && (
        <>
          <h3 className="mt-2 text-base font-semibold">第4層（中性子星合体）</h3>
          <p className="text-muted-foreground text-sm">
            合体を速く・多く・中性子の多いものにする。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHOP_IDS.filter((item) => SHOP[item].layer === 4).map((item) => (
              <ShopItem key={item} meta={meta} item={item} dispatch={dispatch} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ShopItem({ meta, item, dispatch }: Omit<Props, "meta"> & { meta: Meta; item: ShopId }) {
  const titleId = useId();
  const spec = SHOP[item];
  const level = meta.shop[item];
  const owned = spec.maxLevel !== undefined && level >= spec.maxLevel;
  return (
    <article aria-labelledby={titleId} className="grid content-start gap-2 rounded-xl border p-3">
      <h4 className="flex justify-between gap-2 text-base font-semibold">
        <span id={titleId}>{spec.name}</span>
        {spec.maxLevel === undefined && (
          <span className="text-muted-foreground font-mono font-normal">Lv{level}</span>
        )}
      </h4>
      <p className="text-muted-foreground text-sm">{spec.description}</p>
      <Button
        variant="outline"
        className="h-11 flex-col gap-0 enabled:border-foreground/40 active:scale-[0.97] disabled:opacity-35"
        disabled={!canBuyShopItem(meta, item)}
        onClick={() => dispatch({ type: "buyShopItem", item })}
      >
        {owned ? (
          "取得済み"
        ) : (
          <>
            交換
            <small className="text-muted-foreground font-mono text-xs">
              {currencyName(spec.currency)} {formatNumber(shopCost(meta, item))}
            </small>
          </>
        )}
      </Button>
    </article>
  );
}
