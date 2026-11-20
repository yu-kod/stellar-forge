import {
  buyAllShopItems,
  buyShopItem,
  buyStage,
  buyStageMax,
  rebirth,
  setAuto,
  setAutoRebirth,
  setNextMass,
  setSeedTarget,
  setTarget,
  triggerIa,
} from "@/game/actions";
import type { SupernovaEvent } from "@/game/advance";
import { advanceAll, setSlotMass, setSlotTarget } from "@/game/cluster";
import { canAutoRebirth } from "@/game/actions";
import { AUTO_REBIRTH_AFTER, LAYER2_AFTER } from "@/game/balance";
import { AWAY_CHUNK_SECONDS, AWAY_LIMIT_SECONDS, advanceAway, isStopped } from "@/game/away";
import { formBinary, type MergerEvent } from "@/game/merger";
import { createGame } from "@/game/star";
import type { GameEvent } from "@/game/step";
import type { GameState, ShopId, StageId, Target } from "@/game/types";

export type Speed = 1 | 3;

/** 画面の上に少しのあいだ出す知らせ */
export type NoticeEvent =
  | Extract<GameEvent, { type: "ignite" | "discover" }>
  | { type: "born"; generation: number }
  | { type: "away"; seconds: number; supernovae: number; whiteDwarfs: number }
  | SupernovaEvent
  | { type: "autoRebirthUnlocked" }
  | { type: "layer3Unlocked" }
  | { type: "sDiscover"; z: number }
  | { type: "sLoop" }
  | { type: "light"; z: number }
  | Extract<MergerEvent, { type: "merger" }>
  | { type: "rDiscover"; z: number }
  | { type: "layer4Unlocked" }
  | { type: "layer2Unlocked" };
export type Notice = { id: number; event: NoticeEvent };

/** 留守の間の進行（長い留守はフレームごとに少しずつ進める） */
export type Away = {
  total: number;
  remaining: number;
  /** 留守の始めの超新星と白色矮星の数（知らせに差を出す） */
  supernovae: number;
  whiteDwarfs: number;
};

export type Model = {
  game: GameState;
  away: Away | null;
  speed: Speed;
  notices: Notice[];
  nextNoticeId: number;
};

export type Action =
  | { type: "tick"; seconds: number }
  | { type: "away"; seconds: number }
  | { type: "buy"; stage: StageId }
  | { type: "buyMax"; stage: StageId }
  | { type: "setAuto"; stage: StageId; on: boolean }
  | { type: "setTarget"; target: Target }
  | { type: "setAutoRebirth"; on: boolean }
  | { type: "setNextMass"; mass: number | null }
  | { type: "setSlotMass"; slot: number; mass: number | null }
  | { type: "setSlotTarget"; slot: number; target: Target }
  | { type: "buyShopItem"; item: ShopId }
  | { type: "buyAllShopItems" }
  | { type: "triggerIa"; count: number }
  | { type: "formBinary"; a: number; b: number }
  | { type: "setSeedTarget"; target: number }
  | { type: "rebirth" }
  | { type: "dismiss"; id: number }
  | { type: "setSpeed"; speed: Speed }
  | { type: "reset" };

const NOTICE_LIMIT = 4;

export function createModel(game: GameState, events: NoticeEvent[] = []): Model {
  return notify({ game, away: null, speed: 1, notices: [], nextNoticeId: 1 }, events);
}

function notify(model: Model, events: NoticeEvent[]): Model {
  if (events.length === 0) return model;
  const added = events.map((event, i) => ({ id: model.nextNoticeId + i, event }));
  return {
    ...model,
    notices: [...model.notices, ...added].slice(-NOTICE_LIMIT),
    nextNoticeId: model.nextNoticeId + events.length,
  };
}

type ShownEvent = Extract<GameEvent, { type: "ignite" | "discover" | "sDiscover" | "sLoop" }>;

function isNotice(event: GameEvent | SupernovaEvent): event is ShownEvent | SupernovaEvent {
  return ["ignite", "discover", "supernova", "sDiscover", "sLoop"].includes(event.type);
}

type ClusterEvent = ReturnType<typeof advanceAll>["clusterEvents"][number];
type ClusterNotice = Extract<
  ClusterEvent,
  { type: "discover" | "sDiscover" | "sLoop" | "merger" | "rDiscover" }
>;

/** 星団の星と連星の出来事のうち、知らせるもの（発見と合体） */
function isClusterNotice(event: ClusterEvent): event is ClusterNotice {
  return ["discover", "sDiscover", "sLoop", "merger", "rDiscover"].includes(event.type);
}

/** 第3層が今回の操作で解放されたら知らせる */
function layer3Notice(before: GameState, after: GameState): NoticeEvent[] {
  return !before.meta.sProcess.unlocked && after.meta.sProcess.unlocked
    ? [{ type: "layer3Unlocked" }]
    : [];
}

/** 第4層が今回の操作で解放されたら知らせる */
function layer4Notice(before: GameState, after: GameState): NoticeEvent[] {
  return !before.meta.rProcess.unlocked && after.meta.rProcess.unlocked
    ? [{ type: "layer4Unlocked" }]
    : [];
}

/** 今回の操作で見つけた軽い元素を知らせる */
function lightNotice(before: GameState, after: GameState): NoticeEvent[] {
  return after.meta.lightFound
    .filter((z) => !before.meta.lightFound.includes(z))
    .map((z) => ({ type: "light", z }));
}

const AWAY_NOTICE_SECONDS = 30;

/** 留守の間を1かたまり進める。終わったら知らせる */
function catchUp(model: Model, away: Away): Model {
  const seconds = Math.min(away.remaining, AWAY_CHUNK_SECONDS);
  const game = advanceAway(model.game, seconds);
  // 途中で星が止まったら（超新星の画面）、それ以上は何も進まないので残りは捨てる
  const remaining = isStopped(game) ? 0 : away.remaining - seconds;
  const next = { ...model, game, away: remaining > 0 ? { ...away, remaining } : null };
  const done: NoticeEvent[] =
    remaining === 0 && away.total >= AWAY_NOTICE_SECONDS
      ? [
          {
            type: "away",
            seconds: away.total,
            supernovae: game.meta.supernovae - away.supernovae,
            whiteDwarfs: game.meta.whiteDwarfs - away.whiteDwarfs,
          },
        ]
      : [];
  return notify(next, [
    ...lightNotice(model.game, game),
    ...layer3Notice(model.game, game),
    ...done,
  ]);
}

export function gameReducer(model: Model, action: Action): Model {
  switch (action.type) {
    case "away": {
      if (action.seconds <= 0 || isStopped(model.game)) return model;
      const { meta } = model.game;
      const away = model.away ?? {
        total: 0,
        remaining: 0,
        supernovae: meta.supernovae,
        whiteDwarfs: meta.whiteDwarfs,
      };
      const total = Math.min(AWAY_LIMIT_SECONDS, away.total + action.seconds);
      return catchUp(model, { ...away, total, remaining: away.remaining + total - away.total });
    }
    case "tick": {
      if (model.away) return catchUp(model, model.away);
      if (model.game.star.end && model.game.meta.cluster.length === 0) return model;
      const { state, events, clusterEvents } = advanceAll(model.game, action.seconds * model.speed);
      const discoveries = clusterEvents.filter(isClusterNotice);
      // 自動で次の星を生むようになったら、毎周の点火は知らせない
      const quiet = canAutoRebirth(state.meta);
      const notices = events.filter(isNotice).filter((e) => !quiet || e.type !== "ignite");
      return notify({ ...model, game: state }, [
        ...notices,
        ...discoveries,
        ...lightNotice(model.game, state),
        ...layer3Notice(model.game, state),
        ...layer4Notice(model.game, state),
      ]);
    }
    case "buy":
      return { ...model, game: buyStage(model.game, action.stage) };
    case "buyMax":
      return { ...model, game: buyStageMax(model.game, action.stage) };
    case "setAuto":
      return { ...model, game: setAuto(model.game, action.stage, action.on) };
    case "setTarget":
      return { ...model, game: setTarget(model.game, action.target) };
    case "setSlotMass":
      return { ...model, game: setSlotMass(model.game, action.slot, action.mass) };
    case "setSlotTarget":
      return { ...model, game: setSlotTarget(model.game, action.slot, action.target) };
    case "setNextMass":
      return { ...model, game: setNextMass(model.game, action.mass) };
    case "setAutoRebirth":
      return { ...model, game: setAutoRebirth(model.game, action.on) };
    case "triggerIa": {
      let game = model.game;
      for (let i = 0; i < action.count; i++) game = triggerIa(game);
      return notify({ ...model, game }, lightNotice(model.game, game));
    }
    case "formBinary":
      return { ...model, game: formBinary(model.game, action.a, action.b) };
    case "setSeedTarget":
      return { ...model, game: setSeedTarget(model.game, action.target) };
    case "buyAllShopItems":
      return { ...model, game: buyAllShopItems(model.game) };
    case "buyShopItem":
      return { ...model, game: buyShopItem(model.game, action.item) };
    case "rebirth": {
      if (!model.game.star.end) return model;
      const game = rebirth(model.game);
      const unlocked = game.meta.supernovae === AUTO_REBIRTH_AFTER && game.meta.autoRebirth;
      const layer2 =
        game.meta.supernovae === LAYER2_AFTER && game.meta.supernovae > model.game.meta.supernovae;
      return notify({ ...model, game }, [
        { type: "born", generation: game.star.generation },
        ...(unlocked ? [{ type: "autoRebirthUnlocked" } as const] : []),
        ...(layer2 ? [{ type: "layer2Unlocked" } as const] : []),
        ...lightNotice(model.game, game),
        ...layer3Notice(model.game, game),
      ]);
    }
    case "dismiss":
      return { ...model, notices: model.notices.filter((n) => n.id !== action.id) };
    case "setSpeed":
      return { ...model, speed: action.speed };
    case "reset":
      return { ...createModel(createGame()), speed: model.speed };
  }
}
