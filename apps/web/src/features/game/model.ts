import { buyShopItem, buyStage, buyStageMax, rebirth, setAuto } from "@/game/actions";
import { advance } from "@/game/advance";
import type { GameEvent } from "@/game/step";
import type { GameState, ShopId, StageId } from "@/game/types";

export type Speed = 1 | 3;

/** 画面の上に少しのあいだ出す知らせ */
export type NoticeEvent =
  Extract<GameEvent, { type: "ignite" | "discover" }> | { type: "born"; generation: number };
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
  | { type: "buyShopItem"; item: ShopId }
  | { type: "rebirth" }
  | { type: "dismiss"; id: number }
  | { type: "setSpeed"; speed: Speed };

const NOTICE_LIMIT = 4;

export function createModel(game: GameState): Model {
  return { game, speed: 1, notices: [], nextNoticeId: 1 };
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

function isNotice(event: GameEvent): event is Extract<GameEvent, { type: "ignite" | "discover" }> {
  return event.type === "ignite" || event.type === "discover";
}

export function gameReducer(model: Model, action: Action): Model {
  switch (action.type) {
    case "tick": {
      if (model.game.star.end) return model;
      const { state, events } = advance(model.game, action.seconds * model.speed);
      return notify({ ...model, game: state }, events.filter(isNotice));
    }
    case "buy":
      return { ...model, game: buyStage(model.game, action.stage) };
    case "buyMax":
      return { ...model, game: buyStageMax(model.game, action.stage) };
    case "setAuto":
      return { ...model, game: setAuto(model.game, action.stage, action.on) };
    case "buyShopItem":
      return { ...model, game: buyShopItem(model.game, action.item) };
    case "rebirth": {
      if (!model.game.star.end) return model;
      const game = rebirth(model.game);
      return notify({ ...model, game }, [{ type: "born", generation: game.star.generation }]);
    }
    case "dismiss":
      return { ...model, notices: model.notices.filter((n) => n.id !== action.id) };
    case "setSpeed":
      return { ...model, speed: action.speed };
  }
}
