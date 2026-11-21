/** やり直しても残る記録（完結の回数と最速）。進行のセーブとは別に保存する */
export const HALL_KEY = "stellar-forge/hall";

export type Hall = { completions: number; best: number | null };
export const EMPTY_HALL: Hall = { completions: 0, best: null };

export type MedalName = "金" | "銀" | "銅";
/** 完結までの時間 [秒] のメダル（画面の初期設定で案内に従うと銀。金は炭素星と種の切り替えなどの判断で届く。medals.test.ts） */
export const MEDALS: readonly { name: MedalName; within: number }[] = [
  { name: "金", within: 170 * 60 },
  { name: "銀", within: 180 * 60 },
  { name: "銅", within: Infinity },
];

export function medalOf(seconds: number): MedalName {
  return MEDALS.find((medal) => seconds <= medal.within)!.name;
}

export function recordCompletion(hall: Hall, seconds: number): Hall {
  return {
    completions: hall.completions + 1,
    best: hall.best === null ? seconds : Math.min(hall.best, seconds),
  };
}

export function parseHall(raw: unknown): Hall {
  if (typeof raw !== "object" || raw === null) return EMPTY_HALL;
  const { completions, best } = raw as Record<string, unknown>;
  if (typeof completions !== "number" || completions < 1 || typeof best !== "number") {
    return EMPTY_HALL;
  }
  return { completions, best };
}
