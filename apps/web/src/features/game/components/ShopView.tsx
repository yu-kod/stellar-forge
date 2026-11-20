import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { canBuyShopItem, shopCost } from "@/game/actions";
import { isShopItemOpen, isShopItemUseful } from "@/game/shop";
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
      <Fold folded={meta.rProcess.unlocked} summary="第1・2層の強化（まとめて交換で買える）">
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
        )}
      </Fold>
      {isShopItemOpen(meta, "pocket") && (
        <>
          <h3 className="mt-2 text-base font-semibold">第3層（s過程）</h3>
          {isShopItemUseful(meta, "pocket") ? (
            <>
              <p className="text-muted-foreground text-sm">
                恒星風で得た重元素の星屑で、中性子と s元素の価値を増やす。
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SHOP_IDS.filter((item) => SHOP[item].layer === 3).map((item) => (
                  <ShopItem key={item} meta={meta} item={item} dispatch={dispatch} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              s過程は終えた。ここの強化はもう効かないので畳んだ。重元素の星屑は第4層の強化に使う。
            </p>
          )}
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

/** folded なら閉じた details に入れる（第4層では第1・2層の強化を畳んで、星屑タブを短くする） */
function Fold({
  folded,
  summary,
  children,
}: {
  folded: boolean;
  summary: string;
  children: ReactNode;
}) {
  if (!folded) return <>{children}</>;
  return (
    <details>
      <summary className="cursor-pointer py-2 text-base font-semibold">{summary}</summary>
      <div className="grid gap-3">{children}</div>
    </details>
  );
}

function ShopItem({ meta, item, dispatch }: Omit<Props, "meta"> & { meta: Meta; item: ShopId }) {
  const titleId = useId();
  const spec = SHOP[item];
  const level = meta.shop[item];
  const owned = spec.maxLevel !== undefined && level >= spec.maxLevel;
  // 取り終えた強化は1行に畳む（スマホで星屑タブが長くならないように）
  if (owned) {
    return (
      <article
        aria-labelledby={titleId}
        className="text-muted-foreground flex justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
      >
        <span id={titleId}>{spec.name}</span>
        <span>取得済み</span>
      </article>
    );
  }
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
        交換
        <small className="text-muted-foreground font-mono text-xs">
          {currencyName(spec.currency)} {formatNumber(shopCost(meta, item))}
        </small>
      </Button>
    </article>
  );
}
