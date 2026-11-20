import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ORIGINS, originOf, type Origin } from "@/game/progress";
import type { GameState } from "@/game/types";
import { cn } from "@/lib/utils";
import { formatDuration, formatNumber } from "../format";
import { PERIODIC_TABLE } from "../periodicTable";

type Props = { game: GameState; open: boolean; onClose: () => void };

const ORIGIN_COLOR: Record<Origin, string> = {
  bigBang: "bg-el-h",
  cosmicRay: "bg-el-light",
  massive: "bg-el-o",
  lowMass: "bg-el-heavy",
  typeIa: "bg-el-fe",
  merger: "bg-el-he",
};

/** 83マスが埋まったときの画面。元素ごとの起源で塗り分けた周期表を見せる */
export function EndingDialog({ game, open, onClose }: Props) {
  const { meta, star } = game;
  const stats: [string, number][] = [
    ["星", star.generation],
    ["超新星", meta.supernovae],
    ["白色矮星", meta.whiteDwarfs],
    ["Ia型超新星", meta.iaSupernovae],
    ["中性子星合体", meta.rProcess.mergers],
  ];
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="bg-card border-ignite max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-ignite text-2xl font-normal">
            周期表が埋まった
          </DialogTitle>
          <DialogDescription>
            水素からビスマスまで、83の元素をすべて星の中で作った（
            {formatDuration(meta.completedAt ?? 0)}）。
            宇宙の元素は、ビッグバンのあと、こうしていくつもの世代の星が少しずつ作ってきた。
          </DialogDescription>
        </DialogHeader>
        <ul aria-label="ここまでの星" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {stats.map(([label, value]) => (
            <li key={label}>
              {label}
              <b className="ml-1 font-mono">{formatNumber(value)}</b>
              {label === "星" && "世代"}
            </li>
          ))}
        </ul>
        <ol
          aria-label="元素の起源の周期表"
          className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-0.5"
        >
          {PERIODIC_TABLE.map((cell) => {
            const origin = originOf(cell.number);
            return (
              <li
                key={cell.number}
                aria-label={`${cell.number} ${cell.symbol} ${cell.name}：${ORIGINS[origin]}`}
                style={{ gridRow: cell.row, gridColumn: cell.column }}
                className={cn(
                  "text-background grid aspect-square place-items-center rounded-sm text-[0.55rem] font-bold sm:text-xs",
                  ORIGIN_COLOR[origin],
                  cell.row === 7 && "mt-1"
                )}
              >
                <span aria-hidden>{cell.symbol}</span>
              </li>
            );
          })}
        </ol>
        <ul aria-label="元素の起源" className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {(Object.keys(ORIGINS) as Origin[]).map((origin) => (
            <li key={origin} className="flex items-center gap-1.5">
              <span aria-hidden className={cn("size-3 rounded-sm", ORIGIN_COLOR[origin])} />
              {ORIGINS[origin]}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-sm">
          このあとも星は燃え続ける。中性子の多い合体を重ねれば、周期表の先のトリウムやウランも作れる。
        </p>
        <Button className="h-11 justify-self-end" onClick={onClose}>
          宇宙を見続ける
        </Button>
      </DialogContent>
    </Dialog>
  );
}
