import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMeta } from "@/game/star";
import type { SupernovaRecord } from "@/game/types";
import { RecordsView } from "./RecordsView";

function record(overrides: Partial<SupernovaRecord> = {}): SupernovaRecord {
  return {
    generation: 1,
    time: 132.4,
    ejected: 12.34,
    gain: { C: 3, N: 0, O: 5, Ne: 0, Mg: 0, Si: 2, S: 0 },
    end: "collapse",
    ...overrides,
  };
}

describe("RecordsView", () => {
  it("超新星が5回に満たないうちは、第1層がいまの層で、第2層は回数だけ見せる", () => {
    const meta = createMeta();
    meta.supernovae = 4;
    render(<RecordsView meta={meta} />);
    const layers = screen.getByRole("list", { name: "層" });
    expect(within(layers).getByRole("listitem", { name: /第1層/ })).toHaveTextContent("いまの層");
    expect(within(layers).getByText(/超新星 4\/5 回/)).toBeInTheDocument();
    expect(within(layers).getAllByText("？？？")).toHaveLength(3);
  });

  it("超新星5回で第2層がいまの層になり、第3層は白色矮星の数で予告する", () => {
    const meta = createMeta();
    meta.supernovae = 5;
    meta.whiteDwarfs = 2;
    render(<RecordsView meta={meta} />);
    const layers = screen.getByRole("list", { name: "層" });
    expect(within(layers).getByRole("listitem", { name: /第2層/ })).toHaveTextContent("いまの層");
    expect(within(layers).getByText(/白色矮星 2\/3 個/)).toBeInTheDocument();
    expect(within(layers).getAllByText("？？？")).toHaveLength(2);
  });

  it("白色矮星3つで第3層と第4層の予告を見せる", () => {
    const meta = createMeta();
    meta.supernovae = 5;
    meta.whiteDwarfs = 3;
    meta.neutronStars = 4;
    render(<RecordsView meta={meta} />);
    expect(screen.queryByText("？？？")).not.toBeInTheDocument();
    expect(screen.getByText(/いま 4 個/)).toBeInTheDocument();
  });

  it("これまでの超新星・白色矮星・中性子星の数を見せる", () => {
    const meta = createMeta();
    meta.supernovae = 12;
    meta.whiteDwarfs = 3;
    meta.neutronStars = 10;
    render(<RecordsView meta={meta} />);
    const counts = screen.getByRole("list", { name: "これまでに残したもの" });
    expect(counts).toHaveTextContent("超新星12");
    expect(counts).toHaveTextContent("白色矮星3");
    expect(counts).toHaveTextContent("中性子星10");
  });

  it("まだ超新星がなければ、記録が空だと伝える", () => {
    render(<RecordsView meta={createMeta()} />);
    expect(screen.getByRole("cell", { name: "まだ超新星は起きていない" })).toBeInTheDocument();
  });

  it("これまでの星の寿命・放出した重元素・得た星屑を並べる", () => {
    const meta = createMeta();
    meta.log = [
      record({ generation: 2, gain: { C: 0, N: 0, O: 0, Ne: 0, Mg: 0, Si: 0, S: 0 } }),
      record(),
    ];
    render(<RecordsView meta={meta} />);
    const rows = within(screen.getByRole("table", { name: "これまでの星" })).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("第2世代132秒12.3 M☉—");
    expect(rows[2]).toHaveTextContent("第1世代132秒12.3 M☉");
    const gain = within(rows[2]!).getByRole("list", { name: "第1世代で得た星屑" });
    expect(
      within(gain)
        .getAllByRole("listitem")
        .map((li) => li.getAttribute("aria-label"))
    ).toEqual(["炭素 3", "酸素 5", "ケイ素 2"]);
  });
});
