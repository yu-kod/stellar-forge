import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMeta } from "@/game/star";
import { PeriodicTableView } from "./PeriodicTableView";

describe("PeriodicTableView", () => {
  it("はじめは水素だけを発見済みにし、83マスすべてを並べる", () => {
    render(<PeriodicTableView meta={createMeta()} />);
    expect(screen.getByText(/発見した元素/)).toHaveTextContent("発見した元素 1 / 83");
    const table = screen.getByRole("list", { name: "周期表" });
    expect(within(table).getAllByRole("listitem")).toHaveLength(83);
    expect(within(table).getByRole("listitem", { name: "1 H 水素：最初からある" })).toBeVisible();
  });

  it("発見した元素は、その効果を見せる", () => {
    const meta = createMeta();
    meta.discovered.C = true;
    render(<PeriodicTableView meta={meta} />);

    expect(screen.getByText(/発見した元素/)).toHaveTextContent("発見した元素 2 / 83");
    expect(
      screen.getByRole("listitem", { name: "6 C 炭素：ヘリウム燃焼の速度 ×2" })
    ).toBeInTheDocument();
    const effects = screen.getByRole("list", { name: "発見の効果" });
    expect(within(effects).getByText(/炭素：/)).toHaveTextContent("炭素：ヘリウム燃焼の速度 ×2");
    expect(within(effects).getByText(/ネオン：/)).toHaveTextContent("ネオン：未発見");
  });

  it.each([
    ["8 O まだ作っていない"],
    ["3 Li 軽い元素：第2層以降で作れる"],
    ["29 Cu 鉄より重い元素：中性子捕獲で作る（第3・4層）"],
    ["79 Au 金：中性子星合体のr過程（第4層のゴール）"],
    ["83 Bi ビスマス：s過程の終点（第3層のゴール）"],
  ])("まだのマスには、どこで作れるかを添える：%s", (name) => {
    render(<PeriodicTableView meta={createMeta()} />);
    expect(screen.getByRole("listitem", { name })).toBeInTheDocument();
  });
});
