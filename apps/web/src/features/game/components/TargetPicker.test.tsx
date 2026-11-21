import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMeta } from "@/game/star";
import { TargetPicker } from "./TargetPicker";

function midMeta() {
  const meta = createMeta();
  meta.shop = { ...meta.shop, mass: 6, cno: 5, yield: 5, xs: 8, boom: 6, auto: 1 };
  return meta;
}

describe("TargetPicker：狙いごとの見込み", () => {
  it("燃焼の自動制御を持っていれば、狙いごとに次の1周の長さと多く取れる星屑を見せる", () => {
    render(<TargetPicker meta={midMeta()} dispatch={() => {}} />);
    const carbon = screen.getByRole("radio", { name: "炭素" });
    expect(carbon).toHaveAccessibleDescription(/^約\d+秒 C [\d.,×⁰¹²³⁴⁵⁶⁷⁸⁹]+ \w+ /);
    expect(screen.getByRole("radio", { name: "ネオン" })).toHaveAccessibleDescription(/ Ne /);
  });

  it("見込みの「時間」「元素と数」は、それぞれ途中で折り返さない（スマホ幅で O / 3,212 と割れない）", () => {
    render(<TargetPicker meta={midMeta()} dispatch={() => {}} />);
    const id = screen.getByRole("radio", { name: "炭素" }).getAttribute("aria-describedby")!;
    const parts = [...document.getElementById(id)!.children];
    expect(parts.map((part) => part.textContent)).toEqual([
      expect.stringMatching(/^約\d+秒$/),
      expect.stringMatching(/^C \S+$/),
      expect.stringMatching(/^\w+ \S+$/),
    ]);
    for (const part of parts) expect(part).toHaveClass("whitespace-nowrap");
  });

  it("自動制御がなければ見込みは出さない（手で強化するので当てにならない）", () => {
    render(<TargetPicker meta={createMeta()} dispatch={() => {}} />);
    expect(screen.getByRole("radio", { name: "炭素" })).not.toHaveAccessibleDescription();
  });
});
