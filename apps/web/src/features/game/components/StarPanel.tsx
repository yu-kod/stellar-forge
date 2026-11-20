import { CHANDRASEKHAR_MASS, STAGES } from "@/game/balance";
import { dustPreview } from "@/game/dust";
import { energyRate } from "@/game/step";
import { DUST_IDS, STAGE_IDS, type GameState, type Star } from "@/game/types";
import { cn } from "@/lib/utils";
import { ELEMENTS } from "../elements";
import { formatMass, formatNumber } from "../format";
import { ElementChip } from "./ElementChip";

/** 中心から外へ。鉄のコアを芯に、外側ほど軽い元素 */
const ONION = ["Fe", "S", "Si", "Mg", "Ne", "O", "C", "He", "H"] as const;

/** 内側の層から順に、その層までの質量の割合で半径を決める（面積が質量に比例する） */
function onionRings(star: Star) {
  const total = ONION.reduce((sum, id) => sum + star.mass[id], 0);
  const rings: { id: (typeof ONION)[number]; radius: number }[] = [];
  let cumulative = 0;
  for (const id of ONION) {
    cumulative += star.mass[id];
    rings.push({ id, radius: 100 * Math.sqrt(cumulative / total) });
  }
  return rings;
}

function CrossSection({ star }: { star: Star }) {
  const rings = onionRings(star);
  return (
    <svg
      viewBox="-105 -105 210 210"
      role="img"
      aria-label="星の断面（玉ねぎ構造）"
      className="mx-auto block aspect-square w-full max-w-40 sm:max-w-72"
    >
      {rings
        .filter((ring) => ring.radius > 0.2)
        .reverse()
        .map((ring) => (
          <circle
            key={ring.id}
            r={ring.radius.toFixed(2)}
            className={cn(ELEMENTS[ring.id].fill, "stroke-background")}
            fillOpacity={ring.id === "H" ? 0.35 : 0.85}
            strokeWidth={0.6}
          />
        ))}
    </svg>
  );
}

const T_MIN = Math.log10(1e7);
const T_MAX = Math.log10(3.2e9);
const gaugePosition = (t: number) =>
  Math.min(100, ((Math.log10(t) - T_MIN) / (T_MAX - T_MIN)) * 100);

function TemperatureGauge({ temperature }: { temperature: number }) {
  const text = formatNumber(temperature, "K");
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-sm">
        <span id="gauge-label" className="text-muted-foreground">
          コア温度
        </span>
        <span className="font-mono tabular-nums">{text}</span>
      </div>
      <div
        role="meter"
        aria-labelledby="gauge-label"
        aria-valuemin={1e7}
        aria-valuemax={3.2e9}
        aria-valuenow={temperature}
        aria-valuetext={text}
        className="relative h-10"
      >
        <div className="bg-muted absolute inset-x-0 top-2 h-1.5 rounded-full" />
        <div
          className="bg-gauge absolute top-2 left-0 h-1.5 rounded-full"
          style={{ width: `${gaugePosition(temperature).toFixed(1)}%` }}
        />
        {STAGE_IDS.filter((id) => id !== "H").map((id, i) => {
          const lit = temperature >= STAGES[id].ignition;
          return (
            <div
              key={id}
              aria-hidden
              className={cn("absolute top-0.5 h-4 w-px", lit ? "bg-ignite" : "bg-muted-foreground")}
              style={{ left: `${gaugePosition(STAGES[id].ignition).toFixed(1)}%` }}
            >
              <span
                className={cn(
                  "absolute -translate-x-1/2 text-xs",
                  i % 2 === 0 ? "top-4" : "top-6",
                  lit ? "text-ignite" : "text-muted-foreground"
                )}
              >
                {id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StarPanel({ game }: { game: GameState }) {
  const { meta, star } = game;
  const preview = dustPreview(meta, star);
  return (
    <section
      aria-label="星の状態"
      className="bg-card grid gap-3 rounded-xl border p-4 md:sticky md:top-3"
    >
      <CrossSection star={star} />
      <TemperatureGauge temperature={star.temperature} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">エネルギー</dt>
        <dd className="text-right font-mono tabular-nums">{formatNumber(star.energy, "J")}</dd>
        <dt className="text-muted-foreground">放射</dt>
        <dd className="text-right font-mono tabular-nums">
          {formatNumber(energyRate(game), "J/s")}
        </dd>
        <dt className="text-muted-foreground">星の質量</dt>
        <dd className="text-right font-mono tabular-nums">{formatMass(star.initialMass)}</dd>
        <dt className="text-muted-foreground">鉄のコア</dt>
        <dd className="text-right font-mono tabular-nums">
          {star.mass.Fe.toFixed(2)} / {CHANDRASEKHAR_MASS.toFixed(2)} M☉
        </dd>
      </dl>
      <div className="grid gap-2 border-t border-dashed pt-3">
        <h2 id="preview-label" className="text-sm font-medium">
          今コアが崩壊したら得られる星屑
        </h2>
        <ul aria-labelledby="preview-label" className="flex flex-wrap gap-1.5">
          {DUST_IDS.map((id) => (
            <ElementChip key={id} element={id} value={formatNumber(preview[id])} />
          ))}
        </ul>
      </div>
    </section>
  );
}
