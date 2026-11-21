import { useId } from "react";
import { MEDALS, medalOf, type Hall } from "../hall";
import { formatDuration } from "../format";

/** 記録への挑戦：完結の回数・最速と、メダルの目安 */
export function HallView({ hall }: { hall: Hall }) {
  const labelId = useId();
  return (
    <section aria-labelledby={labelId} className="bg-card grid gap-1 rounded-xl border p-3 text-sm">
      <h3 id={labelId} className="text-base font-semibold">
        記録への挑戦
      </h3>
      <p>
        {hall.best === null
          ? "まだ完結していない"
          : `完結 ${hall.completions}回・最速 ${formatDuration(hall.best)}（${medalOf(hall.best)}）`}
      </p>
      <MedalTargets />
    </section>
  );
}

/** メダルの目安（金・銀は判断で届く時間） */
export function MedalTargets() {
  return (
    <p className="text-muted-foreground">
      {MEDALS.filter((medal) => medal.within < Infinity)
        .map((medal) => `${medal.name}：${formatDuration(medal.within)}以内`)
        .join("・")}
      。鉄の種を局面で変える・第3層で主星を炭素星にするなど、判断で速くなる。最初からやり直しても記録は残る
    </p>
  );
}
