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
import { createGame } from "@/game/star";
import type { GameEvent } from "@/game/step";
import type { GameState, ShopId, StageId, Target } from "@/game/types";

export type Speed = 1 | 3;

/** 画面の上に少しのあいだ出す知らせ */
export type NoticeEvent =
  | Extract<GameEvent, { type: "ignite" | "discover" }>
  | { type: "born"; generation: number }
  | { type: "away"; seconds: number }
  | SupernovaEvent
  | { type: "autoRebirthUnlocked" }
  | { type: "layer3Unlocked" }
  | { type: "sDiscover"; z: number }
  | { type: "sLoop" }
  | { type: "layer2Unlocked" };
export type Notice = { id: number; event: NoticeEvent };

export type Model = {
  game: GameState;
  speed: Speed;
  notices: Notice[];
  nextNoticeId: number;
};

export type Action =
  | { type: "tick"; seconds: number }
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
  | { type: "setSeedTarget"; target: number }
  | { type: "rebirth" }
  | { type: "dismiss"; id: number }
  | { type: "setSpeed"; speed: Speed }
  | { type: "reset" };

const NOTICE_LIMIT = 4;

export function createModel(game: GameState, events: NoticeEvent[] = []): Model {
  return notify({ game, speed: 1, notices: [], nextNoticeId: 1 }, events);
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

/** 第3層が今回の操作で解放されたら知らせる */
function layer3Notice(before: GameState, after: GameState): NoticeEvent[] {
  return !before.meta.sProcess.unlocked && after.meta.sProcess.unlocked
    ? [{ type: "layer3Unlocked" }]
    : [];
}

export function gameReducer(model: Model, action: Action): Model {
  switch (action.type) {
    case "tick": {
      if (model.game.star.end && model.game.meta.cluster.length === 0) return model;
      const { state, events, clusterEvents } = advanceAll(model.game, action.seconds * model.speed);
      const discoveries = clusterEvents.filter(
        (e) => e.type === "discover" || e.type === "sDiscover" || e.type === "sLoop"
      );
      // 自動で次の星を生むようになったら、毎周の点火は知らせない
      const quiet = canAutoRebirth(state.meta);
      const notices = events.filter(isNotice).filter((e) => !quiet || e.type !== "ignite");
      return notify({ ...model, game: state }, [
        ...notices,
        ...discoveries,
        ...layer3Notice(model.game, state),
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
      return { ...model, game };
    }
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
