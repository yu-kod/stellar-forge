import { cn } from "@/lib/utils";
import type { ElementId } from "@/game/types";
import { ELEMENTS } from "../elements";

type Props = { element: ElementId; value: string };

/** 元素の色の丸と数。読み上げは「炭素 12」 */
export function ElementChip({ element, value }: Props) {
  const { name, bg } = ELEMENTS[element];
  return (
    <li
      aria-label={`${name} ${value}`}
      className="inline-flex items-center gap-1 rounded-full border py-0.5 pr-2 pl-1 text-sm"
    >
      <span
        aria-hidden
        className={cn(
          "text-background inline-grid size-5 place-items-center rounded-full text-xs font-bold",
          bg
        )}
      >
        {element}
      </span>
      <span aria-hidden className="font-mono tabular-nums">
        {value}
      </span>
    </li>
  );
}
