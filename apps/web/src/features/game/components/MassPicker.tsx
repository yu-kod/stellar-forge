import { useId } from "react";
import { Button } from "@/components/ui/button";
import { LOW_MASS_LIMIT } from "@/game/balance";
import { HEAVIEST_PROGENITOR } from "@/game/rprocess";
import { maxMass } from "@/game/star";
import type { Meta } from "@/game/types";
import type { Action } from "../model";

type Props = { meta: Meta; dispatch: (action: Action) => void };

/** これより重い星は、実際には対不安定型超新星になると考えられている [M☉] */
const PAIR_INSTABILITY = 130;

/** 軽い星の例（白色矮星になる） */
const LIGHT = 3;

/** 次に生む星の質量。8 M☉ 未満は白色矮星、それ以上は超新星になる */
export function MassPicker({ meta, dispatch }: Props) {
  const legendId = useId();
  const max = maxMass(meta);
  const mass = Math.min(max, meta.nextMass ?? max);
  const choose = (value: number | null) => dispatch({ type: "setNextMass", mass: value });
  return (
    <fieldset aria-labelledby={legendId} className="bg-card grid gap-2 rounded-xl border p-3">
      <legend id={legendId} className="mb-2 text-sm font-medium">
        次に生む星の質量
      </legend>
      <input
        type="range"
        min={1}
        max={max}
        step={1}
        value={mass}
        aria-valuetext={`${mass} M☉`}
        onChange={(e) => choose(Number(e.target.value) >= max ? null : Number(e.target.value))}
        className="accent-ignite h-11 w-full"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="h-11" onClick={() => choose(LIGHT)}>
          {LIGHT} M☉
        </Button>
        <Button variant="outline" className="h-11" onClick={() => choose(LOW_MASS_LIMIT)}>
          {LOW_MASS_LIMIT} M☉
        </Button>
        <Button variant="outline" className="h-11" onClick={() => choose(null)}>
          上限 {max} M☉
        </Button>
      </div>
      <p className="text-sm">
        <span className="font-mono">{mass} M☉</span>：
        {mass < LOW_MASS_LIMIT ? "白色矮星になる（超新星にならない）" : "超新星になる"}
        {mass > HEAVIEST_PROGENITOR &&
          `（${HEAVIEST_PROGENITOR} M☉ を超えるとブラックホールが残る）`}
        {mass >= PAIR_INSTABILITY &&
          "。実際には130 M☉ を超える星は、芯で電子と陽電子の対ができて支えを失い、対不安定型超新星で跡形もなく吹き飛ぶと考えられている（このゲームではブラックホールにまとめた）"}
      </p>
    </fieldset>
  );
}
