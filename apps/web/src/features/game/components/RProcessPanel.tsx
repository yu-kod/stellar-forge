import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ACTINIDES,
  R_ELEMENTS,
  usefulPair,
  R_PATH_START,
  bestPair,
  rGoal,
  yieldOf,
  binarySlots,
  mergerSeconds,
  predictMerger,
  rThreshold,
  reachName,
} from "@/game/merger";
import { NEUTRON_STAR_MASSES } from "@/game/rprocess";
import type { Meta } from "@/game/types";
import { formatNumber } from "../format";
import type { Action } from "../model";
import { elementOf } from "../periodicTable";

type Props = { meta: Meta; dispatch: (action: Action) => void };

const massOf = (bin: number) => `${NEUTRON_STAR_MASSES[bin]!.toFixed(1)} M☉`;

/** 「9分59秒」の形（切り上げ） */
function countdown(seconds: number): string {
  const total = Math.ceil(seconds);
  return `${Math.floor(total / 60)}分${total % 60}秒`;
}

/** はじめに選んでおく組：いま作りたい元素を一番速く作る組。なければ在庫の一番軽いものと一番重いもの */
function defaultPair(meta: Meta): [number, number] {
  const best = bestPair(meta, rGoal(meta));
  if (best) return best;
  const held = meta.rProcess.pool.flatMap((n, bin) => (n > 0 ? [bin] : []));
  return held.length === 0 ? [0, 0] : [held[0]!, held.at(-1)!];
}

/** 第4層：中性子星を2つずつ連星にし、合体させて r過程で重い元素を作る */
export function RProcessPanel({ meta, dispatch }: Props) {
  const { pool, binaries, amounts, discovered, mergers } = meta.rProcess;
  const goal = rGoal(meta);
  const goalElement = elementOf(goal);
  // 自分で選ぶまでは、在庫に合わせてはじめの組を選び直す
  const [choice, setChoice] = useState<[number, number] | null>(null);
  const [a, b] = choice ?? defaultPair(meta);
  const setA = (value: number) => setChoice([value, b]);
  const setB = (value: number) => setChoice([a, value]);
  const ids = useId();
  const preview = predictMerger(meta, a, b);
  const enough = a === b ? pool[a]! >= 2 : pool[a]! >= 1 && pool[b]! >= 1;
  const useful = usefulPair(meta, a, b);
  const free = binaries.length < binarySlots(meta);
  const total = NEUTRON_STAR_MASSES[a]! + NEUTRON_STAR_MASSES[b]!;
  return (
    <section aria-labelledby={`${ids}-label`} className="bg-card grid gap-3 rounded-xl border p-4">
      <h2 id={`${ids}-label`} className="text-base font-semibold">
        中性子星合体
      </h2>
      <details className="text-muted-foreground text-sm">
        <summary className="text-foreground cursor-pointer py-2">しくみ</summary>
        <p>
          超新星の後に残った中性子星を2つずつ連星にする。重力波を出して近づき、合体すると中性子の多い物質が飛び散って、
          原子核が中性子を一気に捕まえる（r過程）。放出物は2つ：潮汐で飛ぶもの（質量の差が大きい組ほど多く、中性子が多い＝Ye
          が低いので重い元素まで届く。赤いキロノバ）と、合体後に残る星の円盤風（合計が軽い組ほど多く、Ye
          が高く第2ピークまで。青いキロノバ）。重い組ほど重力波で早く合体する。金は中性子星合体で作る。
        </p>
      </details>
      <ul aria-label="中性子星の在庫" className="grid grid-cols-3 gap-1.5 font-mono text-sm">
        {pool.map((n, bin) => (
          <li
            key={bin}
            className={n > 0 ? "rounded-md border px-2 py-1" : "text-muted-foreground px-2 py-1"}
          >
            {massOf(bin)}×{formatNumber(n)}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        中性子星の質量は親の星で決まる：8〜11 M☉ の星から 1.2 M☉、40 M☉ の星から 2.0 M☉。 40 M☉
        より重い星はブラックホールになり、中性子星を残さない。星団の星の「次に生む質量」で作り分ける。
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["1つ目", a, setA],
            ["2つ目", b, setB],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="grid gap-1 text-sm">
            {label}
            <select
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="bg-background h-11 rounded-md border px-2 text-base"
            >
              {pool.map((n, bin) => (
                <option key={bin} value={bin}>
                  {massOf(bin)}（{formatNumber(n)}個）
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p role="status" aria-label="合体の見込み" className="bg-muted rounded-lg px-3 py-2 text-sm">
        {preview.blackHole ? (
          <>
            合計 {total.toFixed(1)} M☉：すぐブラックホールになり、円盤風は吹かない。潮汐の放出物{" "}
            {preview.dynamical.amount.toFixed(2)}
          </>
        ) : (
          <>
            潮汐（赤）{preview.dynamical.amount.toFixed(2)}：Ye {preview.dynamical.ye.toFixed(2)} →{" "}
            {reachName(preview.dynamical.to)}
            <br />
            円盤風（青）{preview.disk.amount.toFixed(2)}：Ye {preview.disk.ye.toFixed(2)} →{" "}
            {reachName(preview.disk.to)}
          </>
        )}
        <br />
        合体まで {countdown(mergerSeconds(meta, a, b))}・1回で{goalElement.name}（
        {goalElement.symbol}）+{yieldOf(meta, a, b, goal).toFixed(2)}
        {!useful && (
          <>
            <br />
            この組では、まだの元素に届かない
          </>
        )}
      </p>
      <Button
        className="h-11 w-fit active:scale-[0.97]"
        disabled={!enough || !free || !useful}
        onClick={() => dispatch({ type: "formBinary", a, b })}
      >
        連星にする
      </Button>
      <ul aria-label="合体を待つ連星" className="grid gap-1.5 text-sm">
        {binaries.map((binary, i) => (
          <li key={i} className="grid gap-1 rounded-md border px-3 py-2">
            <span className="font-mono">
              {NEUTRON_STAR_MASSES[binary.a]!.toFixed(1)} + {massOf(binary.b)} 合体まで{" "}
              {countdown(binary.remaining)}
            </span>
            <span aria-hidden className="bg-muted h-1.5 overflow-hidden rounded-full">
              <span
                className="bg-ignite block h-full"
                style={{
                  width: `${Math.max(0, 1 - binary.remaining / mergerSeconds(meta, binary.a, binary.b)) * 100}%`,
                }}
              />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">
        連星の枠 {binaries.length} / {binarySlots(meta)}・合体 {formatNumber(mergers)} 回
      </p>
      <ul aria-label="r過程で作る元素" className="grid gap-1 text-sm sm:grid-cols-2">
        {[...R_ELEMENTS, ...ACTINIDES].map((z) => {
          const element = elementOf(z);
          const amount = amounts[z - R_PATH_START]!;
          return (
            <li
              key={z}
              className={discovered.includes(z) ? "text-foreground" : "text-muted-foreground"}
            >
              {element.name}（{element.symbol}）
              <span className="font-mono">
                {amount.toFixed(2)} / {formatNumber(rThreshold(z))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
