import { useId } from "react";
import { Button } from "@/components/ui/button";
import { canBuyStage } from "@/game/actions";
import { CHANDRASEKHAR_MASS, MILESTONE_EVERY, STAGES } from "@/game/balance";
import { burnRate, fuelOf, isIgnited, stageCost } from "@/game/rates";
import { secondsToCollapse } from "@/game/step";
import type { GameState, StageId } from "@/game/types";
import { cn } from "@/lib/utils";
import { ELEMENTS } from "../elements";
import { formatMass, formatNumber } from "../format";
import type { Action } from "../model";

type Props = { game: GameState; stage: StageId; dispatch: (action: Action) => void };

/** 段階の色は、その段階が燃やす元素の色 */
const STAGE_COLOR: Record<StageId, string> = {
  H: ELEMENTS.H.bg,
  He: ELEMENTS.He.bg,
  C: ELEMENTS.C.bg,
  Ne: ELEMENTS.Ne.bg,
  O: ELEMENTS.O.bg,
  Si: ELEMENTS.Si.bg,
};

function reaction(stage: StageId): string {
  const { fuel, products } = STAGES[stage];
  return `${fuel.join("+")} → ${Object.keys(products).join(" + ")}`;
}

export function StageCard({ game, stage, dispatch }: Props) {
  const titleId = useId();
  const { meta, star } = game;
  const spec = STAGES[stage];
  const ignited = isIgnited(star, stage);

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "bg-card relative grid gap-2 overflow-hidden rounded-xl border py-3 pr-3 pl-4",
        !ignited && "opacity-60"
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", STAGE_COLOR[stage])} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
          <span id={titleId}>{spec.name}</span>
          <span className="text-muted-foreground font-mono text-sm font-normal">
            {reaction(stage)}
          </span>
        </h3>
        {!spec.final && (
          <div className="ml-auto flex items-center gap-2">
            {meta.shop.auto > 0 && (
              <label className="text-muted-foreground flex h-11 items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  className="accent-ignite size-4"
                  checked={meta.autoOn[stage]}
                  onChange={(e) => dispatch({ type: "setAuto", stage, on: e.target.checked })}
                />
                自動
              </label>
            )}
            <Button
              variant="outline"
              className="h-11 min-w-24 flex-col gap-0 active:scale-[0.97]"
              disabled={!canBuyStage(game, stage)}
              onClick={() => dispatch({ type: "buy", stage })}
            >
              強化
              <small className="text-muted-foreground font-mono text-xs">
                {ignited ? formatNumber(stageCost(meta, star, stage), "J") : "未点火"}
              </small>
            </Button>
            <Button
              variant="outline"
              className="h-11 active:scale-[0.97]"
              aria-label={`${spec.name}を買えるだけ強化`}
              disabled={!canBuyStage(game, stage)}
              onClick={() => dispatch({ type: "buyMax", stage })}
            >
              最大
            </Button>
          </div>
        )}
      </div>
      <StageDetail game={game} stage={stage} />
      {spec.final && ignited && (
        <div
          role="progressbar"
          aria-label="鉄のコア"
          aria-valuemin={0}
          aria-valuemax={CHANDRASEKHAR_MASS}
          aria-valuenow={star.mass.Fe}
          aria-valuetext={`${formatMass(star.mass.Fe)} / ${formatMass(CHANDRASEKHAR_MASS)}`}
          className="bg-muted h-2 overflow-hidden rounded-full"
        >
          <div
            className="bg-ignite h-full"
            style={{ width: `${Math.min(100, (100 * star.mass.Fe) / CHANDRASEKHAR_MASS)}%` }}
          />
        </div>
      )}
      {spec.final && ignited && (
        <p className="text-ignite font-mono text-sm tabular-nums">
          崩壊まで {Math.ceil(secondsToCollapse(star))} 秒
        </p>
      )}
    </article>
  );
}

function StageDetail({ game, stage }: Omit<Props, "dispatch">) {
  const { meta, star } = game;
  const spec = STAGES[stage];
  const value = "text-foreground font-mono tabular-nums";
  if (!isIgnited(star, stage)) {
    return (
      <p className="text-muted-foreground text-sm">
        <span>
          点火温度 <span className={value}>{formatNumber(spec.ignition, "K")}</span>
        </span>
        ・コアが重くなると収縮して熱くなる
      </p>
    );
  }
  if (spec.final) {
    return (
      <p className="text-muted-foreground text-sm">
        鉄のコアが育っている。{formatMass(CHANDRASEKHAR_MASS)} で崩壊する
      </p>
    );
  }
  const level = star.levels[stage];
  return (
    <p className="text-muted-foreground flex flex-wrap gap-x-3 text-sm">
      <span>
        燃料 <span className={value}>{formatMass(fuelOf(star, stage))}</span>
      </span>
      <span>
        燃焼 <span className={value}>{formatNumber(burnRate(meta, star, stage), "M☉/s")}</span>
      </span>
      <span>
        {`強化 Lv${level}`}
        {level % MILESTONE_EVERY !== 0 && `（Lv${nextMilestone(level)}で×2）`}
      </span>
    </p>
  );
}

function nextMilestone(level: number): number {
  return Math.ceil(level / MILESTONE_EVERY) * MILESTONE_EVERY;
}
