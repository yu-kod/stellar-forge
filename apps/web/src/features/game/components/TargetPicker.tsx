import { useId, useMemo } from "react";
import { previewRun, type RunPreview } from "@/game/preview";
import { DUST_IDS, TARGET_IDS, type Meta, type Target } from "@/game/types";
import { cn } from "@/lib/utils";
import { TARGET_NAMES } from "../elements";
import { formatNumber } from "../format";
import type { Action } from "../model";

type Props = { meta: Meta; dispatch: (action: Action) => void };

/** 見込みに出す星屑の数（多い順） */
const PREVIEW_TOP = 2;

function describePreview({ seconds, dust }: RunPreview): string {
  const top = [...DUST_IDS]
    .sort((a, b) => dust[b] - dust[a])
    .slice(0, PREVIEW_TOP)
    .map((id) => `${id} ${formatNumber(dust[id])}`);
  return [`約${Math.round(seconds)}秒`, ...top].join(" ");
}

/** 狙いごとの次の1周の見込み。星屑が変わるたびには計算しない（強化や設定が変わったときだけ） */
function usePreviews(meta: Meta): Record<Target, string> | null {
  const key = JSON.stringify([
    meta.shop,
    meta.nextMass,
    meta.discovered,
    meta.lightFound.length,
    meta.sProcess.discovered.length,
  ]);
  return useMemo(
    () =>
      meta.shop.auto
        ? (Object.fromEntries(
            TARGET_IDS.map((id) => [id, describePreview(previewRun(meta, id))])
          ) as Record<Target, string>)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key に見込みに効く項目をまとめた
    [key]
  );
}

/** 狙う星屑。玉ねぎをどこまで焼くかを決め、自動強化の ON/OFF をまとめて切り替える */
export function TargetPicker({ meta, dispatch }: Props) {
  const { target } = meta;
  const previews = usePreviews(meta);
  const idBase = useId();
  return (
    <fieldset className="bg-card grid gap-2 rounded-xl border p-3">
      <legend id="target-label" className="mb-2 text-sm font-medium">
        狙う星屑
      </legend>
      <div
        role="radiogroup"
        aria-labelledby="target-label"
        className="grid grid-cols-2 gap-1.5 sm:grid-cols-4"
      >
        {TARGET_IDS.map((id) => (
          <label
            key={id}
            className={cn(
              "has-focus-visible:ring-ring/50 flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-md border px-2 py-1 text-sm transition-colors has-focus-visible:ring-[3px]",
              target === id
                ? "bg-accent text-foreground border-foreground/40"
                : "text-muted-foreground"
            )}
          >
            <input
              type="radio"
              name="target"
              className="sr-only"
              checked={target === id}
              aria-label={TARGET_NAMES[id]}
              aria-describedby={previews ? `${idBase}-${id}` : undefined}
              onChange={() => dispatch({ type: "setTarget", target: id })}
            />
            <span aria-hidden>{TARGET_NAMES[id]}</span>
            {previews && (
              <small id={`${idBase}-${id}`} className="text-muted-foreground font-mono text-xs">
                {previews[id]}
              </small>
            )}
          </label>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        {target === null
          ? "自分で決めた配分で強化しています。"
          : "狙いの外の燃焼を強化しないでおくと、その燃料が外層に残って星屑になる。"}
        {previews && " 下の数字は、今の強化のまま次の星を燃やしたときの見込み。"}
      </p>
    </fieldset>
  );
}
