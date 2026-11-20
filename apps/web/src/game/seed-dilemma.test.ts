import { beforeAll, describe, expect, it } from "vitest";
import { playIdle, type IdleReport } from "@/test-utils/simulate";

const HOURS = 4;

/** 第3層の判断：鉄の種を少なく保つと遠くまで進み、多く保つと重元素の星屑を稼げる */
describe("鉄の種の目標の板挟み（4時間、画面を開いたまま遊ぶ）", () => {
  let few: IdleReport;
  let many: IdleReport;
  beforeAll(() => {
    few = playIdle(HOURS * 3600, { seedTarget: 1 });
    many = playIdle(HOURS * 3600, { seedTarget: 30 });
  }, 600_000);

  it("種が少ないほど早く循環に届く（多いと4時間では届かない）", () => {
    expect(few.marks.loop).toBeDefined();
    expect(many.marks.loop).toBeUndefined();
  });

  it("種が多いほど重元素の星屑を稼ぐ", () => {
    expect(many.heavyEarned).toBeGreaterThan(3 * few.heavyEarned);
  });

  it("種が多いほど白色矮星を使う（たまるだけにならない）", () => {
    expect(many.state.meta.iaSupernovae).toBeGreaterThan(50);
    expect(many.state.meta.iaSupernovae).toBeGreaterThan(5 * few.state.meta.iaSupernovae);
  });

  it("種を少なく保つほど、多くの s元素を見つける（多いと重い元素まで届かない）", () => {
    const found = (r: IdleReport) => r.state.meta.sProcess.discovered.length;
    expect(found(few)).toBeGreaterThanOrEqual(40);
    expect(found(many)).toBeLessThan(found(few) - 15);
  });
});
