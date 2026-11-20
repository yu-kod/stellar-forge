import { describe, expect, it } from "vitest";
import { ALL_ELEMENTS, foundElements } from "./progress";
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
