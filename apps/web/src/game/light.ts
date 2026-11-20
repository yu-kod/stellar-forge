import { LAYER3_LIGHT_DUST } from "./balance";
import type { Meta, Star } from "./types";

/**
 * 燃焼の段階では作らない軽い元素（リチウム〜マンガン）。実際の元素合成の場に合わせて、
 * 超新星・白色矮星・Ia型超新星・宇宙線（超新星の回数）で見つける（docs/design.md「軽い元素」）
 */
export type LightElement = {
  z: number;
  /** どこで作られるか（画面の説明） */
  site: string;
  /** 見つける条件。star は今終わった星（Ia型超新星のときは null） */
  found: (meta: Meta, star: Star | null) => boolean;
};

const collapsed = (star: Star | null): star is Star => star?.end === "collapse";

/** 爆発的元素合成：外層にその元素を残し、爆発エネルギーが足りる崩壊 */
const explosive =
  (element: "O" | "Si", mass: number, boom: number) => (meta: Meta, star: Star | null) =>
    collapsed(star) && star.mass[element] >= mass && meta.shop.boom >= boom;

export const LIGHT_ELEMENTS: readonly LightElement[] = [
  { z: 3, site: "宇宙線の核破砕（超新星30回）", found: (meta) => meta.supernovae >= 30 },
  { z: 4, site: "宇宙線の核破砕（超新星60回）", found: (meta) => meta.supernovae >= 60 },
  { z: 5, site: "宇宙線の核破砕（超新星120回）", found: (meta) => meta.supernovae >= 120 },
  {
    z: 9,
    site: "漸近巨星分枝星（第3層の解放後、炭素星が白色矮星になる）",
    found: (meta, star) =>
      meta.sProcess.unlocked && star?.end === "whiteDwarf" && star.initialMass < 4,
  },
  {
    z: 11,
    site: "炭素燃焼（外層にネオンを 1 M☉ 残して崩壊）",
    found: (_, star) => collapsed(star) && star.mass.Ne >= 1,
  },
  {
    z: 13,
    site: "Mg-Al サイクル（外層にマグネシウムを 1 M☉ 残して崩壊）",
    found: (_, star) => collapsed(star) && star.mass.Mg >= 1,
  },
  { z: 15, site: "爆発的酸素燃焼（酸素 3 M☉・爆発エネルギー Lv1）", found: explosive("O", 3, 1) },
  { z: 17, site: "爆発的酸素燃焼（酸素 5 M☉・爆発エネルギー Lv3）", found: explosive("O", 5, 3) },
  {
    z: 18,
    site: "爆発的ケイ素燃焼（ケイ素 1 M☉・爆発エネルギー Lv2）",
    found: explosive("Si", 1, 2),
  },
  {
    z: 19,
    site: "爆発的ケイ素燃焼（ケイ素 2 M☉・爆発エネルギー Lv4）",
    found: explosive("Si", 2, 4),
  },
  {
    z: 20,
    site: "爆発的ケイ素燃焼（ケイ素 3 M☉・爆発エネルギー Lv5）",
    found: explosive("Si", 3, 5),
  },
  {
    z: 21,
    site: "α過程の凍結（爆発エネルギー Lv6 で崩壊）",
    found: (meta, star) => collapsed(star) && meta.shop.boom >= 6,
  },
  {
    z: 22,
    site: "α過程の凍結の ⁴⁴Ti（爆発エネルギー Lv7 で崩壊）",
    found: (meta, star) => collapsed(star) && meta.shop.boom >= 7,
  },
  { z: 23, site: "Ia型超新星（5回）", found: (meta) => meta.iaSupernovae >= 5 },
  { z: 24, site: "Ia型超新星（20回）", found: (meta) => meta.iaSupernovae >= 20 },
  { z: 25, site: "Ia型超新星の目印（50回）", found: (meta) => meta.iaSupernovae >= 50 },
];

/** 原子番号から、その軽い元素を作る場所 */
export const LIGHT_SITES: Readonly<Record<number, string>> = Object.fromEntries(
  LIGHT_ELEMENTS.map((e) => [e.z, e.site])
);

/** 今の状態で新しく見つかる軽い元素（原子番号の順） */
export function findLightElements(meta: Meta, star: Star | null): number[] {
  return LIGHT_ELEMENTS.filter((e) => !meta.lightFound.includes(e.z) && e.found(meta, star)).map(
    (e) => e.z
  );
}

/** 軽い元素の効果：1つにつきすべての星屑 +5%（足し算） */
export function lightDustMultiplier(meta: Meta): number {
  return 1 + LAYER3_LIGHT_DUST * meta.lightFound.length;
}
