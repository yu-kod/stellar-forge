import { createRProcess, type Binary, type RProcess } from "@/game/rprocess";
import { AWAY_LIMIT_SECONDS, isStopped } from "@/game/away";
import { createSProcess, type SProcess } from "@/game/sprocess";
import { createSlot } from "@/game/actions";
import { createMeta } from "@/game/star";
import {
  ELEMENT_IDS,
  type ClusterSlot,
  GALAXY_IDS,
  type Galaxy,
  STAGE_IDS,
  type GameState,
  type Meta,
  type Star,
  type StarEnd,
  type SupernovaRecord,
  type Target,
  TARGET_IDS,
} from "@/game/types";

export const SAVE_KEY = "stellar-forge/save";
export const SAVE_VERSION = 1;
export type SaveData = { version: typeof SAVE_VERSION; savedAt: number; game: GameState };
export type Restored = { game: GameState; awaySeconds: number };

export function toSave(game: GameState, now: number): SaveData {
  return { version: SAVE_VERSION, savedAt: now, game };
}

/**
 * 保存したものを読み、閉じていた時間（12時間まで）を返す。進めるのは画面の側（留守の間の進行）。
 * 形が合わないものは null（新しく始める）。バージョンを上げたら、ここで古い形から移す
 */
export function restoreSave(raw: unknown, now: number): Restored | null {
  try {
    if (!isObject(raw) || raw.version !== SAVE_VERSION) return null;
    const savedAt = requireNumber(raw.savedAt);
    const game = parseGame(raw.game);
    if (isStopped(game)) return { game, awaySeconds: 0 };
    const awaySeconds = Math.min(AWAY_LIMIT_SECONDS, Math.max(0, (now - savedAt) / 1000));
    return { game, awaySeconds };
  } catch {
    return null;
  }
}

type Raw = Record<string, unknown>;

class InvalidSave extends Error {}

function isObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireObject(value: unknown): Raw {
  if (!isObject(value)) throw new InvalidSave();
  return value;
}

function requireNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidSave();
  return value;
}

/** 既定値の各項目を、保存された値があれば置き換える。無い項目は既定値のまま（後から足した項目） */
function withDefaults<T extends Record<string, number | boolean>>(value: unknown, defaults: T): T {
  if (value === undefined) return { ...defaults };
  const raw = requireObject(value);
  const result: Record<string, number | boolean> = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    const saved = raw[key];
    if (saved === undefined) continue;
    if (typeof saved !== typeof fallback) throw new InvalidSave();
    result[key] = typeof saved === "number" ? requireNumber(saved) : saved === true;
  }
  return result as T;
}

function parseEnd(value: unknown): StarEnd {
  if (value === null || value === "collapse" || value === "fizzle" || value === "whiteDwarf") {
    return value;
  }
  throw new InvalidSave();
}

function parseTarget(value: unknown): Target | null {
  if (value === undefined || value === null) return null;
  const target = TARGET_IDS.find((id) => id === value);
  if (!target) throw new InvalidSave();
  return target;
}

function parseStar(value: unknown): Star {
  const raw = requireObject(value);
  const zeros = Object.fromEntries(ELEMENT_IDS.map((id) => [id, 0])) as Star["mass"];
  const noLevels = Object.fromEntries(STAGE_IDS.map((id) => [id, 0])) as Star["levels"];
  const ignitedAt = requireObject(raw.ignitedAt);
  return {
    generation: requireNumber(raw.generation),
    initialMass: requireNumber(raw.initialMass),
    mass: withDefaults(raw.mass, zeros),
    energy: requireNumber(raw.energy),
    time: requireNumber(raw.time),
    temperature: requireNumber(raw.temperature),
    levels: withDefaults(raw.levels, noLevels),
    ignitedAt: Object.fromEntries(
      STAGE_IDS.filter((id) => ignitedAt[id] !== undefined).map((id) => [
        id,
        requireNumber(ignitedAt[id]),
      ])
    ),
    end: parseEnd(raw.end),
    agbStartedAt:
      raw.agbStartedAt === undefined || raw.agbStartedAt === null
        ? null
        : requireNumber(raw.agbStartedAt),
  };
}

function parseRecord(value: unknown): SupernovaRecord {
  const raw = requireObject(value);
  const end = parseEnd(raw.end);
  if (end === null) throw new InvalidSave();
  return {
    generation: requireNumber(raw.generation),
    time: requireNumber(raw.time),
    ejected: requireNumber(raw.ejected),
    gain: withDefaults(raw.gain, createMeta().dust),
    end,
  };
}

function parseSlot(value: unknown): ClusterSlot {
  const raw = requireObject(value);
  const target = parseTarget(raw.target);
  if (target === null) throw new InvalidSave();
  return {
    star: parseStar(raw.star),
    nextMass: raw.nextMass === null ? null : requireNumber(raw.nextMass),
    target,
  };
}

function parseSProcess(value: unknown): SProcess {
  const fresh = createSProcess();
  if (value === undefined) return fresh;
  const raw = requireObject(value);
  const { unlocked, looped } = withDefaults(
    { unlocked: raw.unlocked, looped: raw.looped },
    { unlocked: false, looped: false }
  );
  if (!Array.isArray(raw.amounts) || raw.amounts.length !== fresh.amounts.length) {
    throw new InvalidSave();
  }
  if (!Array.isArray(raw.discovered)) throw new InvalidSave();
  return {
    unlocked,
    looped,
    seedTarget: raw.seedTarget === undefined ? fresh.seedTarget : requireNumber(raw.seedTarget),
    heavy: raw.heavy === undefined ? 0 : requireNumber(raw.heavy),
    amounts: raw.amounts.map(requireNumber),
    // 作った量は後から足した。古いセーブでは、今道の上にある量を作った量とみなす
    produced:
      raw.produced === undefined ? raw.amounts.map(requireNumber) : parseNumbers(raw.produced),
    discovered: raw.discovered.map(requireNumber),
  };
}

function parseRProcess(value: unknown): RProcess {
  const fresh = createRProcess();
  if (value === undefined) return fresh;
  const raw = requireObject(value);
  const { unlocked } = withDefaults({ unlocked: raw.unlocked }, { unlocked: fresh.unlocked });
  const pool = parseNumbers(raw.pool);
  if (pool.length !== fresh.pool.length) throw new InvalidSave();
  const amounts = raw.amounts === undefined ? fresh.amounts : parseNumbers(raw.amounts);
  if (amounts.length !== fresh.amounts.length) throw new InvalidSave();
  if (raw.binaries !== undefined && !Array.isArray(raw.binaries)) throw new InvalidSave();
  return {
    unlocked,
    pool,
    amounts,
    binaries: ((raw.binaries as unknown[] | undefined) ?? []).map(parseBinary),
    discovered: parseNumbers(raw.discovered),
    mergers: raw.mergers === undefined ? 0 : requireNumber(raw.mergers),
    ejecta: raw.ejecta === undefined ? 0 : requireNumber(raw.ejecta),
  };
}

function parseBinary(value: unknown): Binary {
  const raw = requireObject(value);
  return {
    a: requireNumber(raw.a),
    b: requireNumber(raw.b),
    remaining: requireNumber(raw.remaining),
  };
}

function parseNumbers(value: unknown): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new InvalidSave();
  return value.map(requireNumber);
}

function parseMeta(value: unknown): Meta {
  const raw = requireObject(value);
  const defaults = createMeta();
  const discovered = withDefaults(
    raw.discovered,
    Object.fromEntries(ELEMENT_IDS.map((id) => [id, false])) as Record<string, boolean>
  );
  if (raw.log !== undefined && !Array.isArray(raw.log)) throw new InvalidSave();
  if (raw.cluster !== undefined && !Array.isArray(raw.cluster)) throw new InvalidSave();
  const meta: Meta = {
    dust: withDefaults(raw.dust, defaults.dust),
    supernovae: raw.supernovae === undefined ? 0 : requireNumber(raw.supernovae),
    neutronStars: raw.neutronStars === undefined ? 0 : requireNumber(raw.neutronStars),
    blackHoles: raw.blackHoles === undefined ? 0 : requireNumber(raw.blackHoles),
    whiteDwarfs: raw.whiteDwarfs === undefined ? 0 : requireNumber(raw.whiteDwarfs),
    nextMass:
      raw.nextMass === undefined || raw.nextMass === null ? null : requireNumber(raw.nextMass),
    discovered: Object.fromEntries(
      ELEMENT_IDS.filter((id) => discovered[id]).map((id) => [id, true])
    ),
    shop: withDefaults(raw.shop, defaults.shop),
    autoOn: withDefaults(raw.autoOn, defaults.autoOn),
    target: parseTarget(raw.target),
    autoRebirth: withDefaults({ on: raw.autoRebirth }, { on: defaults.autoRebirth }).on,
    autoShop: withDefaults({ on: raw.autoShop }, { on: defaults.autoShop }).on,
    log: ((raw.log as unknown[] | undefined) ?? []).map(parseRecord),
    cluster: ((raw.cluster as unknown[] | undefined) ?? []).map(parseSlot),
    sProcess: parseSProcess(raw.sProcess),
    rProcess: parseRProcess(raw.rProcess),
    bestRate: withDefaults(raw.bestRate, defaults.bestRate),
    elapsed: raw.elapsed === undefined ? 0 : requireNumber(raw.elapsed),
    completedAt:
      raw.completedAt === undefined || raw.completedAt === null
        ? null
        : requireNumber(raw.completedAt),
    milestones: parseMilestones(raw.milestones),
    iaSupernovae: raw.iaSupernovae === undefined ? 0 : requireNumber(raw.iaSupernovae),
    lightFound: parseNumbers(raw.lightFound),
    galaxy: parseGalaxy(raw.galaxy),
  };
  // 星団を買ったのに星が無ければ作り直す
  while (meta.cluster.length < meta.shop.cluster) meta.cluster.push(createSlot(meta));
  return meta;
}

function parseGalaxy(value: unknown): Galaxy {
  if (value === undefined) return "milkyWay";
  if (!GALAXY_IDS.includes(value as Galaxy)) throw new InvalidSave();
  return value as Galaxy;
}

function parseGame(value: unknown): GameState {
  const raw = requireObject(value);
  return { meta: parseMeta(raw.meta), star: parseStar(raw.star) };
}

function parseMilestones(value: unknown): Meta["milestones"] {
  const raw = value === undefined ? {} : requireObject(value);
  const time = (v: unknown) => (v === undefined || v === null ? null : requireNumber(v));
  return { layer2: time(raw.layer2), layer3: time(raw.layer3), layer4: time(raw.layer4) };
}
