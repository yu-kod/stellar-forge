import { GALAXIES } from "@/game/balance";
import { GALAXY_IDS, type Galaxy, type Milestones } from "@/game/types";

/** やり直しても残る記録（完結の回数と最速）。進行のセーブとは別に保存する */
export const HALL_KEY = "stellar-forge/hall";

/** 1周の各層の解放と完結の時刻 [秒] */
export type Splits = {
  layer2: number | null;
  layer3: number | null;
  layer4: number | null;
  complete: number;
  /** その周の銀河 */
  galaxy: Galaxy;
};

export type Hall = {
  completions: number;
  /** 銀河ごとの最速の周の層ごとの時刻（遊んでいる間に比べる） */
  bests: Partial<Record<Galaxy, Splits>>;
  /** 今回（一番最近の完結）と、その前の周の層ごとの時刻 */
  last: Splits | null;
  previous: Splits | null;
};
export const EMPTY_HALL: Hall = { completions: 0, bests: {}, last: null, previous: null };

/** その銀河の最速の周（なければ null） */
export function bestOf(hall: Hall, galaxy: Galaxy): Splits | null {
  return hall.bests[galaxy] ?? null;
}

export type MedalName = "金" | "銀" | "銅";
/** 完結までの時間 [秒] のメダル（画面の初期設定で案内に従うと銅、種の切り替えで銀、炭素星を組み合わせると金。medals.test.ts） */
export const MEDALS: readonly { name: MedalName; within: number }[] = [
  { name: "金", within: 135 * 60 },
  { name: "銀", within: 158 * 60 },
  { name: "銅", within: Infinity },
];

/** 記録タブで挙げる、単独でも速くなる手（銀河ごと。それぞれ初期設定より3分以上速い。medals.test.ts・galaxy-strategy.test.ts） */
export const FASTER_MOVES: Record<Galaxy, readonly string[]> = {
  milkyWay: ["鉄の種を局面で変える", "第3層で主星を炭素星にする"],
  metalRich: ["第3層で主星を炭素星にする", "鉄の種を30のまま保つ"],
};

/** 完結までの時間のメダル。基準には銀河の目安の倍率を掛ける */
export function medalOf(seconds: number, galaxy: Galaxy = "milkyWay"): MedalName {
  const par = GALAXIES[galaxy].par;
  return MEDALS.find((medal) => seconds <= medal.within * par)!.name;
}

export function recordCompletion(hall: Hall, splits: Splits): Hall {
  const best = bestOf(hall, splits.galaxy);
  const faster = best === null || splits.complete < best.complete;
  return {
    completions: hall.completions + 1,
    bests: faster ? { ...hall.bests, [splits.galaxy]: splits } : hall.bests,
    last: splits,
    previous: hall.last,
  };
}

export function parseHall(raw: unknown): Hall {
  if (typeof raw !== "object" || raw === null) return EMPTY_HALL;
  const { completions, bests, best, bestSplits, last, previous } = raw as Record<string, unknown>;
  if (typeof completions !== "number" || completions < 1) return EMPTY_HALL;
  const lastSplits = parseSplits(last);
  const parsed = { completions, last: lastSplits, previous: parseSplits(previous) };
  if (typeof best === "number") return { ...parsed, bests: { milkyWay: oldBest(best) } };
  if (typeof bests !== "object" || bests === null) return EMPTY_HALL;
  const entries = GALAXY_IDS.flatMap((galaxy) => {
    const splits = parseSplits((bests as Record<string, unknown>)[galaxy]);
    return splits ? [[galaxy, splits] as const] : [];
  });
  return { ...parsed, bests: Object.fromEntries(entries) };

  /** 古い記録（最速の時間だけ）：最速の周の時刻があればそれ、今回が最速なら今回の時刻、なければ完結の時間だけ */
  function oldBest(complete: number): Splits {
    return (
      parseSplits(bestSplits) ??
      (lastSplits?.complete === complete ? lastSplits : null) ?? {
        layer2: null,
        layer3: null,
        layer4: null,
        complete,
        galaxy: "milkyWay",
      }
    );
  }
}

function parseSplits(raw: unknown): Splits | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { layer2, layer3, layer4, complete, galaxy = "milkyWay" } = raw as Record<string, unknown>;
  if (
    typeof complete !== "number" ||
    [layer2, layer3, layer4].some((v) => v !== null && typeof v !== "number") ||
    !GALAXY_IDS.includes(galaxy as Galaxy)
  ) {
    return null;
  }
  // ここまでで、各層の時刻は数か null と分かっている
  return {
    layer2: layer2 as number | null,
    layer3: layer3 as number | null,
    layer4: layer4 as number | null,
    complete,
    galaxy: galaxy as Galaxy,
  };
}

const LAYERS = [4, 3, 2] as const;

/** 遊んでいる周の、最後に解放した層の時刻と、最速の周の同じ層との差 [秒]（最速の周にその層の時刻がなければ null） */
export function paceAgainstBest(
  milestones: Milestones,
  best: Splits | null
): { layer: 2 | 3 | 4; diff: number } | null {
  const layer = LAYERS.find((n) => milestones[`layer${n}`] !== null);
  if (layer === undefined || best === null) return null;
  const mine = milestones[`layer${layer}`]!;
  const theirs = best[`layer${layer}`];
  return theirs === null ? null : { layer, diff: mine - theirs };
}
