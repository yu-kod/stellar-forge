import { describe, expect, it } from "vitest";
import { createSProcess, S_DISCOVERY_THRESHOLD, nextSDiscovery, S_PATH_START } from "./sprocess";

const index = (z: number) => z - S_PATH_START;

describe("s過程で次に見つかる元素", () => {
  it("まだの元素のうち、発見の量に一番近いものと、その割合", () => {
    const sp = createSProcess();
    sp.discovered = [27];
    sp.produced[index(38)] = S_DISCOVERY_THRESHOLD / 2;
    sp.produced[index(28)] = S_DISCOVERY_THRESHOLD / 4;
    expect(nextSDiscovery(sp)).toEqual({ z: 38, progress: 0.5 });
  });

  it("どれも量がなければ、まだの一番軽い元素（割合 0）", () => {
    const sp = createSProcess();
    sp.discovered = [27, 28];
    expect(nextSDiscovery(sp)).toEqual({ z: 29, progress: 0 });
  });

  it("r過程だけの元素は数えない", () => {
    const sp = createSProcess();
    sp.produced[index(79)] = 1;
    expect(nextSDiscovery(sp)?.z).not.toBe(79);
  });

  it("すべて見つけていれば null", () => {
    const sp = createSProcess();
    sp.discovered = Array.from({ length: 57 }, (_, i) => 27 + i);
    expect(nextSDiscovery(sp)).toBeNull();
  });
});
