import {
  buyShopItem,
  buyStage,
  buyStageMax,
  rebirth,
  setAuto,
  setAutoRebirth,
  setNextMass,
  setTarget,
} from "@/game/actions";
import { advanceRuns, type SupernovaEvent } from "@/game/advance";
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
  | { type: "buyShopItem"; item: ShopId }
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

function isNotice(
  event: GameEvent | SupernovaEvent
): event is Extract<GameEvent, { type: "ignite" | "discover" }> | SupernovaEvent {
  return event.type === "ignite" || event.type === "discover" || event.type === "supernova";
}

export function gameReducer(model: Model, action: Action): Model {
  switch (action.type) {
    case "tick": {
      if (model.game.star.end) return model;
      const { state, events } = advanceRuns(model.game, action.seconds * model.speed);
      return notify({ ...model, game: state }, events.filter(isNotice));
    }
    case "buy":
      return { ...model, game: buyStage(model.game, action.stage) };
    case "buyMax":
      return { ...model, game: buyStageMax(model.game, action.stage) };
    case "setAuto":
      return { ...model, game: setAuto(model.game, action.stage, action.on) };
    case "setTarget":
      return { ...model, game: setTarget(model.game, action.target) };
    case "setNextMass":
      return { ...model, game: setNextMass(model.game, action.mass) };
    case "setAutoRebirth":
      return { ...model, game: setAutoRebirth(model.game, action.on) };
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
