import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canAutoRebirth } from "@/game/actions";
import { CHANDRASEKHAR_MASS, LAYER2_AFTER } from "@/game/balance";
import { dustPreview, ejectedMetals } from "@/game/dust";
import { neutronStarBin } from "@/game/rprocess";
import { DUST_IDS, type GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { ELEMENTS } from "../elements";
import { formatMass } from "../format";
import type { Action } from "../model";
import { ElementChip } from "./ElementChip";
import { MassPicker } from "./MassPicker";

type Props = { game: GameState; onRebirth: () => void; dispatch: (action: Action) => void };

const END_TITLE = { collapse: "超新星", fizzle: "燃え尽きた", whiteDwarf: "白色矮星" } as const;

/** 星が終わったら出る。次の星を生むまで閉じない */
export function SupernovaDialog({ game, onRebirth, dispatch }: Props) {
  const { meta, star } = game;
  // 自動で次の星を生むなら、次の更新で生むので画面は出さない
  const open = star.end !== null && !canAutoRebirth(meta);
  const collapsed = star.end === "collapse";
  const gain = dustPreview(meta, star);
  const largest = Math.max(...DUST_IDS.map((id) => star.mass[id]), 0.01);
  const preventClose = (e: Event) => e.preventDefault();

  return (
    <>
      {open && (
        <div
          aria-hidden
          className="bg-supernova pointer-events-none fixed inset-0 z-40 opacity-0 motion-safe:animate-flash"
        />
      )}
      <Dialog open={open}>
        <DialogContent
          onEscapeKeyDown={preventClose}
          onPointerDownOutside={preventClose}
          onInteractOutside={preventClose}
          className="bg-card border-ignite"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-ignite text-2xl font-normal">
              {`第${star.generation}世代\u3000${END_TITLE[star.end ?? "collapse"]}`}
            </DialogTitle>
            <DialogDescription>
              {collapsed
                ? `鉄のコアが${CHANDRASEKHAR_MASS} M☉を超えて崩壊し、${neutronStarBin(star.initialMass) === null ? "ブラックホール" : "中性子星"}が残った。外層の重元素 ${formatMass(ejectedMetals(star))} が宇宙に放たれる。`
                : star.end === "whiteDwarf"
                  ? `赤色巨星になって外層を惑星状星雲として放ち、白色矮星が残った。重元素 ${formatMass(ejectedMetals(star))} が宇宙に放たれる（星屑 ×2）。`
                  : "燃料が尽きた。放出量は少ない。"}
            </DialogDescription>
          </DialogHeader>
          <h3 id="ejected-label" className="text-sm font-medium">
            放出された元素
          </h3>
          <ul aria-labelledby="ejected-label" className="grid gap-1">
            {DUST_IDS.map((id) => (
              <li
                key={id}
                aria-label={`${ELEMENTS[id].name} ${formatMass(star.mass[id])}`}
                className="grid grid-cols-[6rem_1fr_4rem] items-center gap-2 text-sm"
              >
                <span aria-hidden>{ELEMENTS[id].name}</span>
                <span
                  aria-hidden
                  className={cn("h-2.5 rounded-full", ELEMENTS[id].bg)}
                  style={{ width: `${((100 * star.mass[id]) / largest).toFixed(1)}%` }}
                />
                <span aria-hidden className="text-right font-mono tabular-nums">
                  {star.mass[id].toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <h3 id="gain-label" className="text-sm font-medium">
            得た星屑
          </h3>
          <ul aria-labelledby="gain-label" className="flex flex-wrap gap-1.5">
            {DUST_IDS.map((id) => (
              <ElementChip key={id} element={id} value={`+${gain[id]}`} />
            ))}
          </ul>
          {meta.supernovae >= LAYER2_AFTER && <MassPicker meta={meta} dispatch={dispatch} />}
          <Button className="h-11 text-base font-bold active:scale-[0.97]" onClick={onRebirth}>
            放出された元素から次の星を生む
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
