import { describe, expect, it } from "vitest";
import { currencyName, targetHint } from "./elements";

describe("通貨の名前と手がかり", () => {
  it("星屑は元素の名前、重元素は s過程の星屑", () => {
    expect(currencyName("Si")).toBe("ケイ素の星屑");
    expect(currencyName("heavy")).toBe("重元素の星屑");
  });

  it("星屑は狙いを、重元素は種を手がかりにする", () => {
    expect(targetHint("S")).toBe("（狙い：ケイ素・硫黄）");
    expect(targetHint("heavy")).toBe("（s過程の種を増やすと速く貯まる）");
  });
});
