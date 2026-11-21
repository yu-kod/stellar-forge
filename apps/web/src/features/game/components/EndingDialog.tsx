import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ORIGINS, originOf, type Origin } from "@/game/progress";
import { whiteDwarfsMade } from "@/game/star";
import type { Galaxy, GameState } from "@/game/types";
import { useState } from "react";
import { GalaxyPicker } from "./GalaxyPicker";
import { cn } from "@/lib/utils";
import { formatDiff, formatDuration, formatNumber } from "../format";
import { PERIODIC_TABLE } from "../periodicTable";
import { GALAXIES } from "@/game/balance";
import { bestOf, medalOf, type Hall, type Splits } from "../hall";
import { MedalTargets } from "./HallView";

type Props = {
  game: GameState;
  hall: Hall;
  open: boolean;
  onClose: () => void;
  /** 銀河を選んで次の周を始める（いまの周の進み具合は消え、記録は残る） */
  onNextRun?: (galaxy: Galaxy) => void;
};

const ORIGIN_COLOR: Record<Origin, string> = {
  bigBang: "bg-el-h",
  cosmicRay: "bg-el-light",
  massive: "bg-el-o",
  lowMass: "bg-el-heavy",
  typeIa: "bg-el-fe",
  merger: "bg-el-he",
};

/** 前回との差（「+5分」「−5分」「±0分」） */
const diff = (now: number, before: number) => formatDiff(now - before);

/** 層ごとの解放と完結の時刻と、前回との差 */
function SplitsTable({ game, previous }: { game: GameState; previous: Splits | null }) {
  const { milestones, completedAt } = game.meta;
  const rows: [string, number | null, number | null][] = [
    ["第2層", milestones.layer2, previous?.layer2 ?? null],
    ["第3層", milestones.layer3, previous?.layer3 ?? null],
    ["第4層", milestones.layer4, previous?.layer4 ?? null],
    ["完結", completedAt, previous?.complete ?? null],
  ];
  return (
    <table aria-label="層ごとの時刻" className="w-full text-left text-sm">
      <thead className="text-muted-foreground">
        <tr>
          <th className="py-1 font-medium">解放</th>
          <th className="py-1 font-medium">今回</th>
          <th className="py-1 font-medium">前回との差</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {rows.map(([label, now, before]) => (
          <tr key={label}>
            <td className="py-0.5 font-sans">{label}</td>
            <td className="py-0.5">{now === null ? "—" : formatDuration(now)}</td>
            <td className="py-0.5">{now === null || before === null ? "—" : diff(now, before)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 83マスが埋まったときの画面。元素ごとの起源で塗り分けた周期表を見せる */
export function EndingDialog({ game, hall, open, onClose, onNextRun }: Props) {
  const [galaxy, setGalaxy] = useState<Galaxy>(game.meta.galaxy);
  const { meta, star } = game;
  const best = bestOf(hall, meta.galaxy);
  const stats: [string, number][] = [
    ["星", star.generation],
    ["超新星", meta.supernovae],
    ["白色矮星", whiteDwarfsMade(meta)],
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
        <div className="grid gap-1 text-sm">
          <p>
            今回のメダル：
            <b className="text-ignite">{medalOf(meta.completedAt ?? 0, meta.galaxy)}</b>
            {meta.galaxy !== "milkyWay" && `（${GALAXIES[meta.galaxy].name}）`}
            {best && `（最速 ${formatDuration(best.complete)}・完結 ${hall.completions}回）`}
          </p>
          <MedalTargets galaxy={meta.galaxy} hall={hall} />
        </div>
        <SplitsTable
          game={game}
          previous={hall.previous?.galaxy === meta.galaxy ? hall.previous : null}
        />
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
        <p className="text-muted-foreground text-xs">主な起源（簡略化）</p>
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
        {onNextRun && (
          <section aria-label="次の周" className="grid gap-2 border-t pt-3">
            <GalaxyPicker value={galaxy} onChange={setGalaxy} />
            <p className="text-muted-foreground text-sm">
              いまの周の進み具合は消え、記録への挑戦（完結の回数と最速）は残る。
            </p>
            <Button variant="outline" className="h-11" onClick={() => onNextRun(galaxy)}>
              この銀河で次の周を始める
            </Button>
          </section>
        )}
        <Button className="h-11 justify-self-end" onClick={onClose}>
          宇宙を見続ける
        </Button>
      </DialogContent>
    </Dialog>
  );
}
