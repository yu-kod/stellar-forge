import { useId } from "react";
import { GALAXIES } from "@/game/balance";
import { GALAXY_IDS, type Galaxy } from "@/game/types";
import { FASTER_MOVES, MEDALS, bestOf, medalOf, type Hall } from "../hall";
import { formatDuration } from "../format";

/** 記録への挑戦：完結の回数・銀河ごとの最速と、メダルの目安 */
export function HallView({ hall, galaxy }: { hall: Hall; galaxy: Galaxy }) {
  const labelId = useId();
  const bests = GALAXY_IDS.flatMap((id) => {
    const best = bestOf(hall, id);
    return best
      ? [
          `${GALAXIES[id].name} 最速 ${formatDuration(best.complete)}（${medalOf(best.complete, id)}）`,
        ]
      : [];
  });
  return (
    <section aria-labelledby={labelId} className="bg-card grid gap-1 rounded-xl border p-3 text-sm">
      <h3 id={labelId} className="text-base font-semibold">
        記録への挑戦
      </h3>
      <p>
        {hall.completions === 0
          ? "まだ完結していない"
          : [`完結 ${hall.completions}回`, ...bests].join("・")}
      </p>
      <MedalTargets galaxy={galaxy} hall={hall} />
    </section>
  );
}

/**
 * その銀河のメダルの目安（金・銀は判断で届く時間）。作戦の目安は、その銀河で完結して金を取れなかった後にだけ出す
 * （はじめから答えを書かず、気づいた人の得にする）
 */
export function MedalTargets({ galaxy, hall }: { galaxy: Galaxy; hall: Hall }) {
  const { name, par } = GALAXIES[galaxy];
  const best = bestOf(hall, galaxy);
  const tips = best !== null && medalOf(best.complete, galaxy) !== "金";
  return (
    <p className="text-muted-foreground">
      {galaxy !== "milkyWay" && `${name}：`}
      {MEDALS.filter((medal) => medal.within < Infinity)
        .map((medal) => `${medal.name}：${formatDuration(medal.within * par)}以内`)
        .join("・")}
      。{tips && `${FASTER_MOVES[galaxy].join("・")}と速くなる（両方で金に届く）。`}
      最初からやり直しても記録は残る
    </p>
  );
}
