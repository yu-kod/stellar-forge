import { describe, expect, it } from "vitest";
import { ALL_ELEMENTS, foundElements, missingHint, nextMissing } from "./progress";
import { createMeta } from "./star";

describe("見つけた元素（水素〜ビスマスの83）", () => {
  it("最初は水素だけ", () => {
    expect(foundElements(createMeta())).toEqual([1]);
    expect(ALL_ELEMENTS).toBe(83);
  });

  it("燃焼・軽い元素・s過程・r過程で見つけたものを原子番号の順に数える（周期表の先のおまけは数えない）", () => {
    const meta = createMeta();
    meta.discovered = { He: true, Fe: true };
    meta.lightFound = [11, 3];
    meta.sProcess.discovered = [38];
    meta.rProcess.discovered = [79, 92];
    expect(foundElements(meta)).toEqual([1, 2, 3, 11, 26, 38, 79]);
  });
});

describe("まだ見つけていない元素と、その手がかり", () => {
  it("一番軽い未発見の元素と、どこで作るか", () => {
    const meta = createMeta();
    meta.discovered = {
      He: true,
      C: true,
      N: true,
      O: true,
      Ne: true,
      Mg: true,
      Si: true,
      S: true,
      Fe: true,
    };
    meta.lightFound = [3, 4, 5, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24];
    expect(nextMissing(meta)).toEqual({ z: 9, hint: expect.stringContaining("炭素星") });
  });

  it("Ia型超新星で作る元素は、あと何回かを添える", () => {
    const meta = createMeta();
    meta.iaSupernovae = 24;
    const hint = missingHint(meta, 25);
    expect(hint).toContain("あと 26 回");
  });

  it("s過程の元素は、種を少なくすると遠くまで進むと添える", () => {
    expect(missingHint(createMeta(), 80)).toContain("種を少なく");
  });

  it("軽い元素は、その作り方を添える", () => {
    expect(missingHint(createMeta(), 11)).toContain("炭素燃焼");
  });

  it("燃焼で作る元素は、第1層の燃焼と添える", () => {
    expect(missingHint(createMeta(), 2)).toContain("第1層の燃焼");
  });

  it("r過程だけで作る元素は、中性子星合体と添える", () => {
    expect(missingHint(createMeta(), 79)).toContain("中性子星合体");
  });

  it("すべて見つけていれば null", () => {
    const meta = createMeta();
    meta.discovered = Object.fromEntries(
      ["He", "C", "N", "O", "Ne", "Mg", "Si", "S", "Fe"].map((id) => [id, true])
    );
    meta.lightFound = [3, 4, 5, 9, 11, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    meta.sProcess.discovered = Array.from({ length: 57 }, (_, i) => 27 + i);
    expect(nextMissing(meta)).toBeNull();
  });
});
