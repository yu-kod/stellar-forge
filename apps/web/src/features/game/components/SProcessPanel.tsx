import { Button } from "@/components/ui/button";
import {
  S_DISCOVERABLE,
  S_PATH_START,
  crossSection,
  neutronMultiplier,
  seedsPerIa,
} from "@/game/sprocess";
import type { Meta } from "@/game/types";
import { cn } from "@/lib/utils";
import { formatNumber } from "../format";
import type { Action } from "../model";

type Props = { meta: Meta; dispatch: (action: Action) => void };

/** 組成グラフで名前を出す元素（ピークと終点） */
const LABELED = new Map([
  [26, "Fe"],
  [38, "Sr"],
  [56, "Ba"],
  [82, "Pb"],
]);

/** 第3層：Ia型超新星で鉄の種を入れ、軽い星の中性子で一歩ずつ重くする */
export function SProcessPanel({ meta, dispatch }: Props) {
  if (!meta.sProcess.unlocked) return null;
  const { amounts, discovered } = meta.sProcess;
  const total = amounts.reduce((sum, a) => sum + a, 0);
  return (
    <section aria-labelledby="sprocess-label" className="bg-card grid gap-3 rounded-xl border p-4">
      <h2 id="sprocess-label" className="text-base font-semibold">
        s過程
      </h2>
      <p className="text-muted-foreground text-sm">
        漸近巨星分枝星になった軽い星の熱パルスが中性子を出し、鉄の種がそれをゆっくり捕まえて重い元素になる。
        種に対して中性子が多いほど遠くまで進む。
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">白色矮星</dt>
        <dd className="text-right font-mono tabular-nums">{formatNumber(meta.whiteDwarfs)}</dd>
        <dt className="text-muted-foreground">道の上の原子核</dt>
        <dd className="text-right font-mono tabular-nums">{total.toFixed(2)}</dd>
        <dt className="text-muted-foreground">中性子の倍率</dt>
        <dd className="text-right font-mono tabular-nums">×{neutronMultiplier(meta).toFixed(2)}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          className="h-11 active:scale-[0.97]"
          disabled={meta.whiteDwarfs < 1}
          onClick={() => dispatch({ type: "triggerIa", count: 1 })}
        >
          Ia型超新星を起こす
        </Button>
        <Button
          variant="outline"
          className="h-11 active:scale-[0.97]"
          disabled={meta.whiteDwarfs < 1}
          onClick={() => dispatch({ type: "triggerIa", count: 10 })}
        >
          10回起こす
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        白色矮星1つで鉄の種 +{seedsPerIa(meta)}。s過程で発見した元素{" "}
        <b className="text-foreground font-mono">{discovered.length}</b> / {S_DISCOVERABLE}
      </p>
      <AbundanceChart amounts={amounts} discovered={discovered} />
    </section>
  );
}

/** 原子番号ごとの量（対数）。魔法数のピーク（Sr・Ba・Pb）が見える */
function AbundanceChart({ amounts, discovered }: { amounts: number[]; discovered: number[] }) {
  const width = 580;
  const height = 120;
  const barWidth = width / amounts.length;
  const floor = -4;
  const top = Math.max(1, ...amounts);
  const scale = (a: number) =>
    a <= 0 ? 0 : Math.max(0, (Math.log10(a) - floor) / (Math.log10(top) - floor));
  return (
    <svg
      viewBox={`0 0 ${width} ${height + 16}`}
      role="img"
      aria-label="s過程の道の組成（鉄〜ビスマス）"
      className="w-full"
    >
      {amounts.map((amount, i) => {
        const z = S_PATH_START + i;
        const h = scale(amount) * height;
        const found = z === S_PATH_START || discovered.includes(z);
        return (
          <g key={z}>
            <rect
              x={i * barWidth + 1}
              y={height - h}
              width={barWidth - 2}
              height={h}
              className={cn(
                found ? "fill-el-heavy" : "fill-muted-foreground",
                crossSection(z) < 0.2 && "fill-el-s"
              )}
            />
            {LABELED.has(z) && (
              <text
                x={i * barWidth + barWidth / 2}
                y={height + 12}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {LABELED.get(z)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
