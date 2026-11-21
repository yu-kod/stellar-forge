import { useId } from "react";
import { Button } from "@/components/ui/button";
import { CLUSTER_DEFAULT_MASS, LOW_MASS_LIMIT } from "@/game/balance";
import { dustPreview } from "@/game/dust";
import { maxMass } from "@/game/star";
import { DUST_IDS, TARGET_IDS, type ClusterSlot, type Meta, type Target } from "@/game/types";
import { TARGET_NAMES } from "../elements";
import { formatMass, formatNumber } from "../format";
import { lowMassKind } from "../lowMass";
import type { Action } from "../model";
import { ElementChip } from "./ElementChip";

type Props = { meta: Meta; dispatch: (action: Action) => void };

/** 主星と一緒に燃える星団の星。いつも自動で強化し、終わったら自動で次の星を生む */
export function ClusterPanel({ meta, dispatch }: Props) {
  return (
    <section aria-labelledby="cluster-label" className="grid gap-2">
      <h2 id="cluster-label" className="text-base font-semibold">
        星団
      </h2>
      <p className="text-muted-foreground text-sm">
        星団の星は自動で強化し、終わったらすぐ次の星を生む。
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {meta.cluster.map((slot, index) => (
          <SlotCard key={index} meta={meta} slot={slot} index={index} dispatch={dispatch} />
        ))}
      </div>
    </section>
  );
}

function SlotCard({ meta, slot, index, dispatch }: Props & { slot: ClusterSlot; index: number }) {
  const titleId = useId();
  const selectId = useId();
  const { star } = slot;
  const next = Math.min(maxMass(meta), slot.nextMass ?? maxMass(meta));
  const preview = dustPreview(meta, star);
  const setMass = (mass: number | null) => dispatch({ type: "setSlotMass", slot: index, mass });
  return (
    <article aria-labelledby={titleId} className="bg-card grid gap-2 rounded-xl border p-3">
      <h3 id={titleId} className="text-base font-semibold">
        星団の星 {index + 2}
      </h3>
      <p className="text-muted-foreground text-sm">
        <span className="text-foreground font-mono">{formatMass(star.initialMass)}</span>・第
        {star.generation}世代・{Math.floor(star.time)}秒・
        {star.initialMass < LOW_MASS_LIMIT ? "白色矮星になる" : "超新星になる"}
      </p>
      <ul aria-label={`星団の星 ${index + 2} の今の星屑`} className="flex flex-wrap gap-1">
        {DUST_IDS.filter((id) => preview[id] > 0).map((id) => (
          <ElementChip key={id} element={id} value={formatNumber(preview[id])} />
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="text-sm">
          狙う星屑
        </label>
        <select
          id={selectId}
          value={slot.target}
          onChange={(e) =>
            dispatch({ type: "setSlotTarget", slot: index, target: e.target.value as Target })
          }
          className="bg-background h-11 rounded-md border px-2 text-base"
        >
          {TARGET_IDS.map((id) => (
            <option key={id} value={id}>
              {TARGET_NAMES[id]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">
          次は {next} M☉{lowMassKind(next) && `（${lowMassKind(next)}）`}
        </span>
        <Button variant="outline" className="h-11" onClick={() => setMass(3)}>
          3 M☉
        </Button>
        <Button variant="outline" className="h-11" onClick={() => setMass(CLUSTER_DEFAULT_MASS)}>
          {CLUSTER_DEFAULT_MASS} M☉
        </Button>
        <Button variant="outline" className="h-11" onClick={() => setMass(null)}>
          上限
        </Button>
      </div>
    </article>
  );
}
