import { TARGET_IDS, type Target } from "@/game/types";
import { cn } from "@/lib/utils";
import { TARGET_NAMES } from "../elements";
import type { Action } from "../model";

type Props = { target: Target | null; dispatch: (action: Action) => void };

/** 狙う星屑。玉ねぎをどこまで焼くかを決め、自動強化の ON/OFF をまとめて切り替える */
export function TargetPicker({ target, dispatch }: Props) {
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
              "has-focus-visible:ring-ring/50 flex h-11 cursor-pointer items-center justify-center rounded-md border px-2 text-sm transition-colors has-focus-visible:ring-[3px]",
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
              onChange={() => dispatch({ type: "setTarget", target: id })}
            />
            {TARGET_NAMES[id]}
          </label>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">
        {target === null
          ? "自分で決めた配分で強化しています。"
          : "狙いの外の燃焼を強化しないでおくと、その燃料が外層に残って星屑になる。"}
      </p>
    </fieldset>
  );
}
