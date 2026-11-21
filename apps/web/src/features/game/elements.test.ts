import { describe, expect, it } from "vitest";
import { currencyName, targetHint } from "./elements";

describe("通貨の名前と手がかり", () => {
  it("星屑は元素の名前、重元素は s過程の星屑", () => {
    expect(currencyName("Si")).toBe("ケイ素の星屑");
    expect(currencyName("heavy")).toBe("重元素の星屑");
    expect(currencyName("ejecta")).toBe("キロノバの放出物");
  });

  it("星屑は狙いを、重元素は種を手がかりにする", () => {
    expect(targetHint("S")).toBe("（狙い：ケイ素・硫黄）");
    expect(targetHint("heavy")).toBe("（s過程の種を増やすと速く貯まる）");
    expect(targetHint("ejecta")).toBe("（中性子星を合体させると貯まる）");
    // 燃焼の自動制御を持っていれば、答えは書かず見込みで比べさせる（重元素の星屑・放出物はそのまま）
    expect(targetHint("N", true)).toBe("（どの狙いで多く取れるかは、狙う星屑の見込みで比べる）");
    expect(targetHint("heavy", true)).toBe("（s過程の種を増やすと速く貯まる）");
  });
});
