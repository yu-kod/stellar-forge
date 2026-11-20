import { rebirth, setNextMass, setTarget } from "./actions";
export { createSlot } from "./actions";
import { advance, advanceRuns, type RunsResult } from "./advance";
import { MAX_STEP_SECONDS } from "./balance";
import { dustPreview } from "./dust";
import type { ClusterSlot, GameState, Meta, Target } from "./types";

/** 星団の星を、主星と同じ形（meta と star）で見る。狙いと次の質量はその星のもの */
function slotView(meta: Meta, slot: ClusterSlot): GameState {
  const view = setTarget({ meta, star: slot.star }, slot.target);
  return setNextMass(view, slot.nextMass);
}

/** 星団の星を進めた結果を、主星の設定を変えずに戻す */
function mergeSlot(meta: Meta, index: number, result: GameState, slot: ClusterSlot): Meta {
  const cluster = meta.cluster.map((s, i) => (i === index ? { ...slot, star: result.star } : s));
  return {
    ...result.meta,
    nextMass: meta.nextMass,
    target: meta.target,
    autoOn: meta.autoOn,
    cluster,
  };
}

/** 星団の星を進める。終わったら（超新星の回数にかかわらず）すぐ次の星を生む */
function advanceSlot(view: GameState, seconds: number, maxStep: number): RunsResult {
  let current = view;
  let remaining = seconds;
  const events: RunsResult["events"] = [];
  for (;;) {
    const before = current.star.time;
    const result = advance(current, remaining, maxStep);
    current = result.state;
    events.push(...result.events);
    remaining -= current.star.time - before;
    if (!current.star.end || remaining <= 0) break;
    const gain = dustPreview(current.meta, current.star);
    events.push({
      type: "supernova",
      generation: current.star.generation,
      gain,
      end: current.star.end,
    });
    current = rebirth(current);
  }
  return { state: current, events };
}

/** 主星と星団の星をすべて進める。events は主星のもの、clusterEvents は星団の星のもの */
export function advanceAll(
  state: GameState,
  seconds: number,
  maxStep: number = MAX_STEP_SECONDS
): RunsResult & { clusterEvents: RunsResult["events"] } {
  const main = advanceRuns(state, seconds, maxStep);
  let meta = main.state.meta;
  const clusterEvents: RunsResult["events"] = [];
  meta.cluster.forEach((slot, index) => {
    const result = advanceSlot(slotView(meta, slot), seconds, maxStep);
    clusterEvents.push(...result.events);
    meta = mergeSlot(meta, index, result.state, slot);
  });
  return { state: { meta, star: main.state.star }, events: main.events, clusterEvents };
}

function updateSlot(
  state: GameState,
  index: number,
  change: (slot: ClusterSlot) => ClusterSlot
): GameState {
  if (!state.meta.cluster[index]) return state;
  const cluster = state.meta.cluster.map((slot, i) => (i === index ? change(slot) : slot));
  return { ...state, meta: { ...state.meta, cluster } };
}

/** 星団の星の、次に生む質量を決める */
export function setSlotMass(state: GameState, index: number, mass: number | null): GameState {
  return updateSlot(state, index, (slot) => ({
    ...slot,
    nextMass: setNextMass(state, mass).meta.nextMass,
  }));
}

/** 星団の星の狙う星屑を決める */
export function setSlotTarget(state: GameState, index: number, target: Target): GameState {
  return updateSlot(state, index, (slot) => ({ ...slot, target }));
}
