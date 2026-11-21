import { useId } from "react";
import { GALAXIES } from "@/game/balance";
import { GALAXY_IDS, type Galaxy } from "@/game/types";

type Props = { value: Galaxy; onChange: (galaxy: Galaxy) => void };

/** 次の周の銀河を選ぶ（名前と、物理の説明） */
export function GalaxyPicker({ value, onChange }: Props) {
  const labelId = useId();
  return (
    <fieldset className="grid gap-2">
      <legend id={labelId} className="mb-1 text-sm font-medium">
        次の周の銀河
      </legend>
      <div role="radiogroup" aria-labelledby={labelId} className="grid gap-2">
        {GALAXY_IDS.map((id) => (
          <label
            key={id}
            className="has-focus-visible:ring-ring/50 has-checked:border-foreground/40 has-checked:bg-accent flex min-h-11 cursor-pointer items-start gap-2 rounded-md border p-3 text-sm has-focus-visible:ring-[3px]"
          >
            <input
              type="radio"
              name={labelId}
              className="accent-ignite mt-1"
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <span>
              <b>{GALAXIES[id].name}</b>
              <span className="text-muted-foreground block">{GALAXIES[id].description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
